"""Timezone identity survives staged file remapping, failed checks and rollback."""

import uuid
from datetime import UTC
from pathlib import Path

import pytest
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.infrastructure.storage import LocalStorageProvider
from app.services.dataset_access import ProjectDatasetAccess
from app.services.source_access import ProjectSourceAccess
from tests.test_dataset_updates import build_report, check, stage_update
from tests.test_sources_api import create_project, make_client


@pytest.mark.parametrize("invalid_time", ["2026-10-25T02:30:00", "2026-03-29T02:30:00"])
def test_timezone_fold_survives_failed_refresh_rename_and_rollback(
    db_engine: Engine, tmp_path: Path, invalid_time: str
) -> None:
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    uploaded = client.post(
        f"/api/v1/projects/{project}/imports",
        data={"connector": "csv"},
        files={
            "file": (
                "times.csv",
                b"when,amount\n2026-10-25T02:30:00+02:00,0.10\n2026-10-25T02:30:00+01:00,0.20\n",
            )
        },
    )
    assert uploaded.status_code == 201, uploaded.text
    source = uploaded.json()
    profile = client.post(
        f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": "table"}
    ).json()["profile"]
    profile["fields"][0].update(logical_type="datetime", timezone="Europe/Berlin")
    applied = client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={"profile": profile, "expected_revision": 1, "request_id": str(uuid.uuid4())},
    )
    assert applied.status_code == 200, applied.text
    snapshot = applied.json()
    report = build_report(client, project, source, snapshot)
    result_url = f"/api/v1/visualizations/{report['visualization_id']}/result"
    original = client.post(result_url, json={}).json()
    assert sorted(row["Revenue"] for row in original["rows"]) == ["0.10", "0.20"]

    def read_active():
        with Session(db_engine) as session:
            return ProjectDatasetAccess(
                ProjectSourceAccess(uuid.UUID(project), session, LocalStorageProvider(tmp_path))
            ).load(uuid.UUID(source["id"]), "table")

    field_id = profile["fields"][0]["field_id"]
    before = read_active()
    instants = [value.astimezone(UTC).isoformat() for value in before.frame[field_id]]
    assert instants == ["2026-10-25T00:30:00+00:00", "2026-10-25T01:30:00+00:00"]
    assert before.schema.by_id(field_id).metadata["timezone"] == "Europe/Berlin"
    invalid = check(
        client,
        project,
        stage_update(client, project, source, f"when,amount\n{invalid_time},999.99\n".encode()),
    )
    assert any(issue["severity"] == "error" for issue in invalid["check"]["issues"])
    refused = client.post(
        f"/api/v1/updates/{invalid['id']}/apply",
        json={"expected_revision": invalid["revision"], "acknowledge_warnings": True},
    )
    assert refused.json()["detail"]["code"] == "CHECK_FAILED"
    assert read_active().frame.equals(before.frame)
    assert client.post(result_url, json={}).json() == original

    update = stage_update(
        client,
        project,
        source,
        b"money,timestamp\n0.40,2026-10-25T00:30:00Z\n0.50,2026-10-25T01:30:00Z\n",
    )
    item = update["items"][0]
    item["dataset_bindings"] = [
        {
            "resource_id": "table",
            "target_resource_id": "table",
            "columns": [
                {"logical_id": field_id, "physical_id": "col_2"},
                {"logical_id": profile["fields"][1]["field_id"], "physical_id": "col_1"},
            ],
        }
    ]
    saved = client.put(
        f"/api/v1/updates/{update['id']}",
        json={"expected_revision": update["revision"], "items": [item]},
    )
    assert saved.status_code == 200, saved.text
    update = check(client, project, saved.json())
    applied = client.post(
        f"/api/v1/updates/{update['id']}/apply",
        json={"expected_revision": update["revision"], "acknowledge_warnings": True},
    )
    assert applied.status_code == 200, applied.text
    current = read_active()
    assert [value.astimezone(UTC).isoformat() for value in current.frame[field_id]] == instants
    assert current.schema.by_id(field_id).metadata["timezone"] == "Europe/Berlin"
    assert [column.column_id for column in current.schema.columns] == [
        column.column_id for column in before.schema.columns
    ]
    assert sorted(row["Revenue"] for row in client.post(result_url, json={}).json()["rows"]) == [
        "0.40",
        "0.50",
    ]
    rollback = client.post(
        f"/api/v1/updates/{update['id']}/rollback",
        json={"expected_revision": applied.json()["revision"]},
    )
    assert rollback.status_code == 200, rollback.text
    rollback = check(client, project, rollback.json())
    restored = client.post(
        f"/api/v1/updates/{rollback['id']}/apply",
        json={"expected_revision": rollback["revision"], "acknowledge_warnings": True},
    )
    assert restored.status_code == 200, restored.text
    assert read_active().frame.equals(before.frame)
    assert read_active().schema == before.schema
    restored_report = client.post(result_url, json={}).json()
    assert restored_report["rows"] == original["rows"]
    assert restored_report["columns"] == original["columns"]
    assert restored_report["revision"] > original["revision"]
