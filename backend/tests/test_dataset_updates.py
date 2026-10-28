import io
import json
import uuid
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.infrastructure.storage import LocalStorageProvider
from app.models import DatasetSnapshot, DataSource, ReportDocument, Workflow
from app.services.artifact_intents import adopt_artifact, discard_artifact, reserve_artifact
from app.services.dataset_access import ProjectDatasetAccess
from app.services.source_access import ProjectSourceAccess
from tests.test_sources_api import create_project, make_client


def import_data(
    client: TestClient, project: str, content: bytes, filename: str = "sales.csv"
) -> tuple[dict[str, Any], dict[str, Any]]:
    response = client.post(
        f"/api/v1/projects/{project}/imports",
        data={"connector": "csv" if filename.endswith("csv") else "excel"},
        files={"file": (filename, content)},
    )
    assert response.status_code == 201, response.text
    source = response.json()
    profile = client.post(
        f"/api/v1/imports/{source['id']}/inspect",
        json={"resource_id": source["resources"][0]["id"]},
    ).json()["profile"]
    response = client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={"profile": profile, "expected_revision": 1, "request_id": str(uuid.uuid4())},
    )
    assert response.status_code == 200, response.text
    return source, response.json()


def build_report(
    client: TestClient, project: str, source: dict[str, Any], snapshot: dict[str, Any]
) -> dict[str, Any]:
    profile = snapshot["profile"]
    response = client.post(
        f"/api/v1/projects/{project}/report-builder/apply",
        json={
            "request_id": str(uuid.uuid4()),
            "source_id": source["id"],
            "resource_id": snapshot["resource_id"],
            "expected_snapshot_id": snapshot["id"],
            "name": "Revenue",
            "presentation": "table",
            "dimensions": [profile["fields"][0]["field_id"]],
            "measures": [
                {
                    "column_id": profile["fields"][1]["field_id"],
                    "operation": "sum",
                    "name": "Revenue",
                }
            ],
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def stage_update(
    client: TestClient,
    project: str,
    source: dict[str, Any],
    content: bytes,
    filename: str = "next.csv",
) -> dict[str, Any]:
    version = client.post(
        f"/api/v1/sources/{source['id']}/versions", files={"file": (filename, content)}
    )
    assert version.status_code == 200, version.text
    row = client.post(f"/api/v1/projects/{project}/updates").json()
    saved = client.put(
        f"/api/v1/updates/{row['id']}",
        json={
            "expected_revision": row["revision"],
            "items": [{"source_id": source["id"], "version_id": version.json()["id"]}],
        },
    )
    assert saved.status_code == 200, saved.text
    return saved.json()


def check(client: TestClient, project: str, row: dict[str, Any]) -> dict[str, Any]:
    response = client.post(
        f"/api/v1/updates/{row['id']}/check", json={"expected_revision": row["revision"]}
    )
    assert response.status_code == 200, response.text
    jobs = client.get(f"/api/v1/projects/{project}/report-jobs").json()
    job = next(j for j in jobs if j["id"] == response.json()["id"])
    assert job["status"] == "succeeded", job
    return next(
        r for r in client.get(f"/api/v1/projects/{project}/updates").json() if r["id"] == row["id"]
    )


def test_refresh_is_staged_exact_idempotent_and_rollback_revisions_never_rewind(
    db_engine: Engine, tmp_path: Path
) -> None:
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    source, snapshot = import_data(client, project, b"code,amount\n001,0.10\n001,0.20\n")
    report = build_report(client, project, source, snapshot)
    result_url = f"/api/v1/visualizations/{report['visualization_id']}/result"
    assert client.post(result_url, json={}).json()["rows"][0]["Revenue"] == "0.30"
    row = stage_update(client, project, source, b"amount,code\n9007199254740993.11,001\n0.01,001\n")
    row = check(client, project, row)
    assert not row["check"]["issues"], row
    assert report["workflow_id"] in row["check"]["affected_workflows"]
    assert row["check"]["dataset_profiles"][0]["suggestions"][0]["physical_id"] == "col_2"
    # Checks are repeatable and never replace active pointers or duplicate artifacts.
    with Session(db_engine) as session:
        count = len(list(session.scalars(select(DatasetSnapshot))))
        revision = session.get(Workflow, uuid.UUID(report["workflow_id"])).revision
    row = check(client, project, row)
    with Session(db_engine) as session:
        assert len(list(session.scalars(select(DatasetSnapshot)))) == count
        assert not list(
            session.scalars(select(ReportDocument).where(ReportDocument.kind == "artifact"))
        )
    assert client.post(result_url, json={}).json()["rows"][0]["Revenue"] == "0.30"
    request = {"expected_revision": row["revision"], "acknowledge_warnings": False}
    pinned_session = Session(db_engine)
    pinned = ProjectDatasetAccess(
        ProjectSourceAccess(uuid.UUID(project), pinned_session, LocalStorageProvider(tmp_path))
    )
    applied = client.post(f"/api/v1/updates/{row['id']}/apply", json=request)
    assert applied.status_code == 200, applied.text
    assert client.post(f"/api/v1/updates/{row['id']}/apply", json=request).json() == applied.json()
    assert client.post(result_url, json={}).json()["rows"][0]["Revenue"] == "9007199254740993.12"
    assert (
        str(
            pinned.load(uuid.UUID(source["id"]), "table").frame[
                snapshot["profile"]["fields"][1]["field_id"]
            ][0]
        )
        == "0.10"
    )
    pinned_session.close()
    with Session(db_engine) as session:
        assert session.get(Workflow, uuid.UUID(report["workflow_id"])).revision == revision + 1
        assert session.get(DataSource, uuid.UUID(source["id"])).source_metadata["revision"] == 3
    restored = client.post(
        f"/api/v1/updates/{row['id']}/rollback",
        json={"expected_revision": applied.json()["revision"]},
    ).json()
    restored = check(client, project, restored)
    assert not restored["check"]["issues"], restored
    response = client.post(
        f"/api/v1/updates/{restored['id']}/apply", json={"expected_revision": restored["revision"]}
    )
    assert response.status_code == 200, response.text
    assert client.post(result_url, json={}).json()["rows"][0]["Revenue"] == "0.30"
    with Session(db_engine) as session:
        assert session.get(Workflow, uuid.UUID(report["workflow_id"])).revision == revision + 2
        assert session.get(DataSource, uuid.UUID(source["id"])).source_metadata["revision"] == 4
    stale = client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={
            "profile": snapshot["profile"],
            "expected_revision": 2,
            "request_id": str(uuid.uuid4()),
        },
    )
    assert stale.status_code == 409


def test_error_beyond_warning_sample_limit_still_blocks_update(
    db_engine: Engine, tmp_path: Path
) -> None:
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    source, snapshot = import_data(client, project, b"code,amount\n1,0.10\n")
    profile = snapshot["profile"]
    profile["fields"][0]["error_policy"] = "null"
    client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={"profile": profile, "expected_revision": 2, "request_id": str(uuid.uuid4())},
    )
    incoming = b"code,amount\n" + b"bad,0.10\n" * 100 + b"1,0.123\n"
    row = check(client, project, stage_update(client, project, source, incoming))
    assert len([i for i in row["check"]["issues"] if i["severity"] == "warning"]) == 100
    assert any(i["severity"] == "error" for i in row["check"]["issues"])
    response = client.post(
        f"/api/v1/updates/{row['id']}/apply",
        json={"expected_revision": row["revision"], "acknowledge_warnings": True},
    )
    assert response.json()["detail"]["code"] == "CHECK_FAILED"


def test_two_sources_apply_atomically_and_cancel_preserves_current_data(
    db_engine: Engine, tmp_path: Path
) -> None:
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    first, first_snapshot = import_data(client, project, b"code,amount\n001,0.10\n")
    second, second_snapshot = import_data(client, project, b"code,amount\n002,0.20\n")
    row = stage_update(client, project, first, b"code,amount\n001,0.50\n")
    other = stage_update(client, project, second, b"code,amount\n002,wrong\n")
    row = client.put(
        f"/api/v1/updates/{row['id']}",
        json={"expected_revision": row["revision"], "items": row["items"] + other["items"]},
    ).json()
    row = check(client, project, row)
    assert any(i["severity"] == "error" for i in row["check"]["issues"])
    assert (
        client.post(
            f"/api/v1/updates/{row['id']}/apply", json={"expected_revision": row["revision"]}
        ).status_code
        == 422
    )
    assert {d["id"] for d in client.get(f"/api/v1/projects/{project}/datasets").json()} == {
        first_snapshot["id"],
        second_snapshot["id"],
    }
    assert (
        client.post(
            f"/api/v1/updates/{row['id']}/cancel", json={"expected_revision": row["revision"]}
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/v1/updates/{row['id']}/apply", json={"expected_revision": row["revision"] + 1}
        ).status_code
        == 409
    )


def test_partial_version_write_has_durable_intent_and_is_cleaned(
    db_engine: Engine, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    source, _ = import_data(client, project, b"code,amount\n001,0.10\n")
    before = {p for p in tmp_path.rglob("*") if p.is_file()}
    original_save = LocalStorageProvider.save_reserved

    def fail(storage: LocalStorageProvider, key: str, content: Any) -> None:
        with Session(db_engine) as tracking:
            intent = tracking.scalar(
                select(ReportDocument).where(ReportDocument.kind == "artifact")
            )
            assert intent is not None and intent.payload["artifact_keys"] == [key]
        original_save(storage, key, content)
        raise OSError("simulated disk failure")

    monkeypatch.setattr(LocalStorageProvider, "save_reserved", fail)
    with pytest.raises(OSError, match="simulated disk failure"):
        client.post(
            f"/api/v1/sources/{source['id']}/versions",
            files={"file": ("new.csv", b"code,amount\n001,0.20\n")},
        )
    assert {p for p in tmp_path.rglob("*") if p.is_file()} == before
    with Session(db_engine) as session:
        assert not list(
            session.scalars(select(ReportDocument).where(ReportDocument.kind == "artifact"))
        )


def test_adopted_artifact_is_not_deleted_by_late_error_cleanup(
    db_engine: Engine, tmp_path: Path
) -> None:
    project = create_project(db_engine)
    storage = LocalStorageProvider(tmp_path)
    with Session(db_engine) as session:
        key, intent = reserve_artifact(session, storage, project, ".csv")
        storage.save_reserved(key, io.BytesIO(b"synthetic"))
        adopt_artifact(session, intent)
        session.commit()
        discard_artifact(session, storage, key, intent)
        assert storage.exists(key)


def test_csv_replacement_uses_explicit_read_options(db_engine: Engine, tmp_path: Path) -> None:
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    source, _ = import_data(client, project, b"code,amount\n001,0.10\n")
    version = client.post(
        f"/api/v1/sources/{source['id']}/versions",
        data={"read_options": json.dumps({"delimiter": ";", "header_row": 2})},
        files={"file": ("next.csv", b"Title\namount;code\n0.20;001\n")},
    )
    assert version.status_code == 200, version.text
    row = client.post(f"/api/v1/projects/{project}/updates").json()
    row = client.put(
        f"/api/v1/updates/{row['id']}",
        json={
            "expected_revision": row["revision"],
            "items": [{"source_id": source["id"], "version_id": version.json()["id"]}],
        },
    ).json()
    row = check(client, project, row)
    assert not row["check"]["issues"], row
    assert row["check"]["dataset_profiles"][0]["options"]["delimiter"] == ";"


def test_missing_staged_file_blocks_apply_without_changing_pointers(
    db_engine: Engine, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    source, initial = import_data(client, project, b"code,amount\n001,0.10\n")
    row = check(client, project, stage_update(client, project, source, b"code,amount\n001,0.20\n"))
    with Session(db_engine) as session:
        staged = session.scalar(
            select(DatasetSnapshot).where(
                DatasetSnapshot.source_id == uuid.UUID(source["id"]),
                DatasetSnapshot.id != uuid.UUID(initial["id"]),
            )
        )
        assert staged is not None
        missing_key = staged.storage_key
    exists = LocalStorageProvider.exists
    monkeypatch.setattr(
        LocalStorageProvider,
        "exists",
        lambda storage, key: key != missing_key and exists(storage, key),
    )
    response = client.post(
        f"/api/v1/updates/{row['id']}/apply", json={"expected_revision": row["revision"]}
    )
    assert response.status_code == 409, response.text
    assert response.json()["detail"]["code"] == "CHECK_STALE"
    assert client.get(f"/api/v1/projects/{project}/datasets").json()[0]["id"] == initial["id"]


@pytest.mark.parametrize(
    "incoming",
    [
        b"code,amount\n001,oops\n",
        b"code,amount\n001,0.123\n",
        b"code\n001\n",
        b"code,code\n001,1.00\n",
    ],
)
def test_bad_refresh_never_changes_current_dataset(
    db_engine: Engine, tmp_path: Path, incoming: bytes
) -> None:
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    source, snapshot = import_data(client, project, b"code,amount\n001,0.10\n")
    row = check(client, project, stage_update(client, project, source, incoming))
    assert any(i["severity"] == "error" for i in row["check"]["issues"]), row
    response = client.post(
        f"/api/v1/updates/{row['id']}/apply", json={"expected_revision": row["revision"]}
    )
    assert response.status_code == 422, response.text
    assert response.json()["detail"]["code"] == "CHECK_FAILED"
    assert client.get(f"/api/v1/projects/{project}/datasets").json()[0]["id"] == snapshot["id"]


def test_explicit_rename_mapping_and_stale_check(db_engine: Engine, tmp_path: Path) -> None:
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    source, snapshot = import_data(client, project, b"code,amount\n001,0.10\n")
    row = check(
        client, project, stage_update(client, project, source, b"money,product,extra\n0.50,001,x\n")
    )
    assert row["check"]["issues"]
    item = row["items"][0]
    item["dataset_bindings"] = [
        {
            "resource_id": "table",
            "target_resource_id": "table",
            "columns": [
                {
                    "logical_id": snapshot["profile"]["fields"][0]["field_id"],
                    "physical_id": "col_2",
                },
                {
                    "logical_id": snapshot["profile"]["fields"][1]["field_id"],
                    "physical_id": "col_1",
                },
            ],
        }
    ]
    row = client.put(
        f"/api/v1/updates/{row['id']}", json={"expected_revision": row["revision"], "items": [item]}
    ).json()
    row = check(client, project, row)
    assert all(i["severity"] == "warning" for i in row["check"]["issues"]), row
    assert (
        client.post(
            f"/api/v1/updates/{row['id']}/apply", json={"expected_revision": row["revision"]}
        ).json()["detail"]["code"]
        == "WARNINGS_NOT_ACKNOWLEDGED"
    )
    # A concurrent profile publication invalidates an otherwise successful check.
    client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={
            "profile": snapshot["profile"],
            "expected_revision": 2,
            "request_id": str(uuid.uuid4()),
        },
    )
    response = client.post(
        f"/api/v1/updates/{row['id']}/apply",
        json={"expected_revision": row["revision"], "acknowledge_warnings": True},
    )
    assert response.status_code == 409, response.text
    row = check(client, project, row)
    response = client.post(
        f"/api/v1/updates/{row['id']}/apply",
        json={"expected_revision": row["revision"], "acknowledge_warnings": True},
    )
    assert response.status_code == 200, response.text
    current = client.get(f"/api/v1/projects/{project}/datasets").json()[0]
    assert [c["column_id"] for c in current["columns"]] == [
        c["column_id"] for c in snapshot["columns"]
    ]
    assert current["profile"]["fields"][0]["source_field"] == "col_2"


def workbook(sheet: str, rows: list[list[str]]) -> bytes:
    book = Workbook()
    page = book.active
    assert page is not None
    page.title = sheet
    for row in rows:
        page.append(row)
    stream = io.BytesIO()
    book.save(stream)
    return stream.getvalue()


def test_excel_sheet_rename_keeps_logical_resource_and_next_mapping(
    db_engine: Engine, tmp_path: Path
) -> None:
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    source, snapshot = import_data(
        client, project, workbook("Sales", [["code", "amount"], ["001", "0.10"]]), "sales.xlsx"
    )
    report = build_report(client, project, source, snapshot)
    row = stage_update(
        client,
        project,
        source,
        workbook("Renamed", [["amount", "code"], ["0.20", "001"]]),
        "next.xlsx",
    )
    item = row["items"][0]
    item["dataset_bindings"] = [{"resource_id": "Sales", "target_resource_id": "Renamed"}]
    row = client.put(
        f"/api/v1/updates/{row['id']}", json={"expected_revision": row["revision"], "items": [item]}
    ).json()
    row = check(client, project, row)
    assert not row["check"]["issues"], row
    assert (
        client.post(
            f"/api/v1/updates/{row['id']}/apply", json={"expected_revision": row["revision"]}
        ).status_code
        == 200
    )
    current = client.get(f"/api/v1/projects/{project}/datasets").json()[0]
    assert current["resource_id"] == "Sales"
    assert current["profile"]["resource_id"] == "Renamed"
    row = check(
        client,
        project,
        stage_update(
            client,
            project,
            source,
            workbook("Renamed", [["code", "amount"], ["001", "0.30"]]),
            "third.xlsx",
        ),
    )
    assert not row["check"]["issues"], row
    assert (
        client.post(
            f"/api/v1/updates/{row['id']}/apply", json={"expected_revision": row["revision"]}
        ).status_code
        == 200
    )
    assert (
        client.post(f"/api/v1/visualizations/{report['visualization_id']}/result", json={}).json()[
            "rows"
        ][0]["Revenue"]
        == "0.30"
    )
