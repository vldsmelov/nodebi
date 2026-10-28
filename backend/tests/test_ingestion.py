import hashlib
import json
import uuid
from collections.abc import Iterator
from decimal import Decimal
from io import BytesIO
from pathlib import Path

import polars as pl
import pytest
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.ingestion import (
    ConnectorDefinition,
    ImportField,
    ImportProfile,
    ReadOptions,
    SourceAdapter,
    SourceResource,
)
from app.infrastructure.connectors import FileAdapter
from app.infrastructure.storage import LocalStorageProvider
from app.models import DatasetSnapshot, DataSource, Project
from app.services.dataset_access import ProjectDatasetAccess
from app.services.normalization import normalize, suggest_profile
from app.services.report_releases import snapshot
from app.services.source_access import ProjectSourceAccess
from app.services.sources import SourceService
from tests.test_dataset_updates import check, stage_update
from tests.test_sources_api import create_project, make_client


def raw(values: list[str | None]) -> Dataset:
    return Dataset(
        pl.DataFrame({"amount": values}, schema={"amount": pl.String}),
        DatasetSchema((ColumnSchema("input", "amount", "Amount", LogicalType.STRING, True),)),
    )


def profile(**kwargs: object) -> ImportProfile:
    field = ImportField.model_validate(
        {
            "field_id": "amount",
            "source_field": "input",
            "name": "Amount",
            "logical_type": "decimal",
            "precision": 38,
            "scale": 2,
            **kwargs,
        }
    )
    return ImportProfile(resource_id="table", name="Sales", fields=[field])


def test_exact_values_nulls_and_rejected_rounding() -> None:
    data, preview = normalize(raw(["9007199254740993.11", "0", None, "1.001", "bad"]), profile())
    assert data.frame["amount"][0] == Decimal("9007199254740993.11")
    assert preview.rows[:3] == [
        {"amount": "9007199254740993.11"},
        {"amount": "0.00"},
        {"amount": None},
    ]
    assert preview.checked_rows == 5 and not preview.can_apply and preview.issue_count == 2
    assert [issue.row for issue in preview.issues] == [4, 5]
    _, allowed = normalize(raw(["bad"]), profile(error_policy="null"))
    assert allowed.can_apply and allowed.rows == [{"amount": None}]
    assert allowed.issues[0].severity == "warning"


@pytest.mark.parametrize("invalid", [b"001,A,0.40\n001,A,0.50\n", b"001,A,0.40\n,B,0.50\n"])
def test_composite_key_persists_and_blocks_bad_refresh(
    db_engine: Engine, tmp_path: Path, invalid: bytes
) -> None:
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    uploaded = client.post(
        f"/api/v1/projects/{project}/imports",
        data={"connector": "csv"},
        files={"file": ("keys.csv", b"code,branch,amount\n001,A,0.10\n001,B,0.20\n")},
    )
    assert uploaded.status_code == 201, uploaded.text
    source = uploaded.json()
    inspected = client.post(
        f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": "table"}
    )
    assert inspected.status_code == 200, inspected.text
    settings = inspected.json()["profile"]
    keys = [field["field_id"] for field in settings["fields"][:2]]
    settings["key_fields"] = keys[:1]
    rejected = client.post(f"/api/v1/imports/{source['id']}/preview", json=settings)
    assert rejected.status_code == 200, rejected.text
    assert not rejected.json()["can_apply"]
    assert rejected.json()["issues"][0]["code"] == "INVALID_KEY"
    settings["key_fields"] = keys
    settings["fields"][2]["logical_type"] = "decimal"
    accepted = client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={"profile": settings, "expected_revision": 1, "request_id": str(uuid.uuid4())},
    )
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["profile"]["key_fields"] == keys
    update = check(
        client, project, stage_update(client, project, source, b"code,branch,amount\n" + invalid)
    )
    assert any(
        issue["message"] == "Key fields must be non-null and unique."
        for issue in update["check"]["issues"]
    )
    refused = client.post(
        f"/api/v1/updates/{update['id']}/apply",
        json={"expected_revision": update["revision"], "acknowledge_warnings": True},
    )
    assert refused.status_code == 422, refused.text
    active = client.get(f"/api/v1/projects/{project}/datasets").json()
    assert active[0]["id"] == accepted.json()["id"]
    assert active[0]["profile"]["key_fields"] == keys
    with Session(db_engine) as session:
        data = ProjectDatasetAccess(
            ProjectSourceAccess(uuid.UUID(project), session, LocalStorageProvider(tmp_path))
        ).load(uuid.UUID(source["id"]), "table")
        assert data.frame[settings["fields"][2]["field_id"]].to_list() == [
            Decimal("0.10"),
            Decimal("0.20"),
        ]


def test_suggestions_keep_codes_and_transport_large_integers() -> None:
    suggested = suggest_profile(uuid.uuid4(), "table", "Sales", ReadOptions(), raw(["001", "002"]))
    assert suggested.name == "Sales"
    assert suggested.fields[0].logical_type == LogicalType.STRING
    _, preview = normalize(
        raw(["9007199254740993", "-9007199254740993"]), profile(logical_type="integer")
    )
    assert preview.rows == [{"amount": "9007199254740993"}, {"amount": "-9007199254740993"}]


def test_future_1c_adapter_uses_the_same_contract_without_excel_layout() -> None:
    class Fake1CAdapter:
        definition = ConnectorDefinition(
            type="1c_test",
            name="1C test double",
            capabilities=["resources", "schema", "batch_read"],
        )

        def discover(self, storage_key: str, options: ReadOptions) -> list[SourceResource]:
            return [SourceResource(id="Sales", name="Sales", kind="entity")]

        def schema(self, storage_key: str, resource_id: str, options: ReadOptions) -> DatasetSchema:
            return raw(["12.50"]).schema

        def read_batches(
            self, storage_key: str, resource_id: str, options: ReadOptions, batch_size: int = 10000
        ) -> Iterator[Dataset]:
            yield raw(["12.50"])

    adapter: SourceAdapter = Fake1CAdapter()
    resources = adapter.discover("test-reference", ReadOptions())
    data = next(adapter.read_batches("test-reference", resources[0].id, ReadOptions()))
    result, preview = normalize(data, profile())
    assert preview.can_apply and result.frame["amount"][0] == Decimal("12.50")


def test_datetime_requires_explicit_zone_and_rejects_dst_ambiguity() -> None:
    _, preview = normalize(
        raw(["2026-10-25T02:30:00", "2026-10-25T02:30:00+02:00"]),
        profile(logical_type="datetime", timezone="Europe/Berlin"),
    )
    assert preview.issue_count == 1
    assert preview.issues[0].row == 1
    assert preview.rows[1]["amount"] == "2026-10-25T02:30:00+02:00"


def test_quality_checks_cover_full_data_and_keys() -> None:
    _, preview = normalize(raw(["1"] * 100 + ["bad"]), profile(), limit=2)
    assert preview.returned_rows == 2 and preview.checked_rows == 101
    assert not preview.can_apply and preview.issues[0].row == 101
    key_profile = profile(logical_type="integer")
    key_profile.key_fields = ["amount"]
    assert not normalize(raw(["1", "1"]), key_profile)[1].can_apply


def test_csv_options_and_excel_have_same_explicit_normalization(tmp_path: Path) -> None:
    storage = LocalStorageProvider(tmp_path)
    csv_key = storage.save(BytesIO("Код;Сумма\n001;12,50\n002;0\n".encode("cp1251")), suffix=".csv")
    options = ReadOptions(encoding="cp1251", delimiter=";")
    csv_data = list(FileAdapter("csv", storage).read_batches(csv_key, "table", options))[0]
    workbook = Workbook()
    sheet = workbook.active
    assert sheet is not None
    sheet.append(["Код", "Сумма"])
    sheet.append(["001", "12,50"])
    sheet.append(["002", "0"])
    stream = BytesIO()
    workbook.save(stream)
    stream.seek(0)
    excel_key = storage.save(stream, suffix=".xlsx")
    excel_data = list(
        FileAdapter("excel", storage).read_batches(excel_key, sheet.title, ReadOptions())
    )[0]
    workbook.close()
    common = ImportProfile(
        resource_id="table",
        name="Sales",
        fields=[
            ImportField(
                field_id="code", source_field="col_1", name="Code", logical_type=LogicalType.STRING
            ),
            ImportField(
                field_id="money",
                source_field="col_2",
                name="Amount",
                logical_type=LogicalType.DECIMAL,
                decimal_separator=",",
            ),
        ],
    )
    left, right = normalize(csv_data, common)[0], normalize(excel_data, common)[0]
    assert left.schema == right.schema and left.frame.equals(right.frame)


@pytest.mark.parametrize("connector", ["excel", "csv"])
def test_reading_options_exclude_notes_and_totals(tmp_path: Path, connector: str) -> None:
    storage = LocalStorageProvider(tmp_path)
    rows = [["Report"], ["Amount"], ["Note"], ["0.10"], ["0.20"], ["Total"]]
    stream = BytesIO()
    if connector == "excel":
        workbook = Workbook()
        sheet = workbook.active
        assert sheet is not None
        for row in rows:
            sheet.append(row)
        workbook.save(stream)
        workbook.close()
        resource = sheet.title
        suffix = ".xlsx"
    else:
        stream.write("\n".join(row[0] for row in rows).encode())
        resource = "table"
        suffix = ".csv"
    stream.seek(0)
    original = stream.getvalue()
    key = storage.save(stream, suffix=suffix)
    options = ReadOptions(header_row=2, skip_data_rows=1, drop_tail_rows=1)
    batches = list(FileAdapter(connector, storage).read_batches(key, resource, options))
    mapping = profile()
    mapping.options = options
    mapping.fields[0].source_field = "col_1"
    result, checked = normalize(batches[0], mapping)
    assert checked.can_apply and checked.checked_rows == 2
    assert result.frame["amount"].to_list() == [Decimal("0.10"), Decimal("0.20")]
    with storage.open(key) as stored:
        assert stored.read() == original


def test_import_api_snapshot_idempotency_isolation_and_cleanup(
    db_engine: Engine, tmp_path: Path
) -> None:
    project_id = create_project(db_engine)
    client = make_client(db_engine, tmp_path)
    response = client.post(
        f"/api/v1/projects/{project_id}/imports",
        data={"connector": "csv"},
        files={"file": ("sales.csv", b"code,amount\n001,12.50\n002,15.25\n")},
    )
    assert response.status_code == 201, response.text
    source_id = response.json()["id"]
    preview = client.post(f"/api/v1/imports/{source_id}/inspect", json={"resource_id": "table"})
    assert preview.status_code == 200, preview.text
    request = {
        "profile": preview.json()["profile"],
        "expected_revision": 1,
        "request_id": str(uuid.uuid4()),
    }
    applied = client.post(f"/api/v1/imports/{source_id}/apply", json=request)
    assert applied.status_code == 200, applied.text
    assert (
        client.post(f"/api/v1/imports/{source_id}/apply", json=request).json()["id"]
        == applied.json()["id"]
    )
    request["request_id"] = str(uuid.uuid4())
    assert client.post(f"/api/v1/imports/{source_id}/apply", json=request).status_code == 409
    assert client.get(f"/api/v1/projects/{project_id}/sources").json() == {"items": []}
    assert len(client.get(f"/api/v1/projects/{project_id}/datasets").json()) == 1
    with Session(db_engine) as session:
        storage = LocalStorageProvider(tmp_path)
        access = ProjectDatasetAccess(ProjectSourceAccess(project_id, session, storage))
        assert access.load(uuid.UUID(source_id), "table").row_count == 2
        documents = snapshot(session, project_id)
        assert len(documents["dataset_snapshots"]) == 1
        assert len(list(session.scalars(select(DatasetSnapshot)))) == 1
        stored_snapshot = session.scalar(select(DatasetSnapshot))
        assert stored_snapshot is not None
        legacy_profile = applied.json()["profile"]
        legacy_profile["options"].pop("cell_range", None)
        assert (
            stored_snapshot.request_hash
            == hashlib.sha256(json.dumps(legacy_profile, sort_keys=True).encode()).hexdigest()
        )
        other = Project(id=uuid.uuid4(), name="Other")
        session.add(other)
        session.commit()
        with pytest.raises(Exception, match="does not exist in this project"):
            ProjectDatasetAccess(ProjectSourceAccess(other.id, session, storage)).load(
                uuid.UUID(source_id), "table"
            )
        project = session.get(Project, project_id)
        assert project
        SourceService(session, storage).delete_project(project)
        assert not list(tmp_path.rglob("*.parquet")) and not list(tmp_path.rglob("*.csv"))


def test_import_failures_do_not_leave_raw_artifacts(db_engine: Engine, tmp_path: Path) -> None:
    project_id = create_project(db_engine)
    client = make_client(db_engine, tmp_path)
    for connector, filename, content in [
        ("excel", "bad.xlsx", b"bad"),
        ("csv", "bad.csv", b"a,b\n1\n"),
    ]:
        result = client.post(
            f"/api/v1/projects/{project_id}/imports",
            data={"connector": connector},
            files={"file": (filename, content)},
        )
        assert result.status_code == 422, result.text
    with Session(db_engine) as session:
        assert not list(session.scalars(select(DataSource)))
    assert not [p for p in tmp_path.rglob("*") if p.is_file()]
