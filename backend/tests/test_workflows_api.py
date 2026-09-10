import uuid
from io import BytesIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.infrastructure.database import get_session
from app.infrastructure.storage import LocalStorageProvider, get_storage_provider
from app.main import app
from app.models import Project


@pytest.mark.parametrize("foreign_kind", ["node", "edge"])
def test_foreign_graph_ids_are_rejected_without_mutating_either_graph(
    db_engine: Engine, foreign_kind: str
) -> None:
    project_id = uuid.uuid4()
    with Session(db_engine) as session:
        session.add(Project(id=project_id, name="Ownership"))
        session.commit()
    client = client_for(db_engine)
    try:
        graphs = []
        for name in ("A", "B"):
            workflow = client.post(
                f"/api/v1/projects/{project_id}/workflows", json={"name": name}
            ).json()
            nodes = [
                {
                    "id": str(uuid.uuid4()),
                    "type": "select_columns",
                    "version": 1,
                    "position": {"x": 0, "y": 0},
                    "config": {},
                }
                for _ in range(2)
            ]
            saved = client.put(
                f"/api/v1/workflows/{workflow['id']}",
                json={
                    "name": name,
                    "expected_revision": 1,
                    "nodes": nodes,
                    "edges": [
                        {
                            "id": str(uuid.uuid4()),
                            "source_node_id": nodes[0]["id"],
                            "source_port": "dataset",
                            "target_node_id": nodes[1]["id"],
                            "target_port": "input",
                        }
                    ],
                },
            )
            assert saved.status_code == 200
            graphs.append(saved.json())
        a, b = graphs
        payload = {
            "expected_revision": b["revision"],
            "name": "Attempted rename",
            "nodes": b["nodes"],
            "edges": b["edges"],
        }
        if foreign_kind == "node":
            payload["nodes"][0]["id"] = a["nodes"][0]["id"]
            payload["edges"][0]["source_node_id"] = a["nodes"][0]["id"]
        else:
            payload["edges"][0]["id"] = a["edges"][0]["id"]
        before = [client.get(f"/api/v1/workflows/{g['id']}").json() for g in graphs]
        rejected = client.put(f"/api/v1/workflows/{b['id']}", json=payload)
        assert rejected.status_code == 422
        assert [client.get(f"/api/v1/workflows/{g['id']}").json() for g in graphs] == before
    finally:
        app.dependency_overrides.clear()


def client_for(engine: Engine, tmp_path: Path | None = None) -> TestClient:
    def sessions():  # type: ignore[no-untyped-def]
        with Session(engine, expire_on_commit=False) as session:
            yield session

    app.dependency_overrides[get_session] = sessions
    if tmp_path is not None:
        app.dependency_overrides[get_storage_provider] = lambda: LocalStorageProvider(tmp_path)
        app.dependency_overrides[get_settings] = lambda: Settings(
            database_url="sqlite://", storage_root=tmp_path, max_preview_rows=1
        )
    return TestClient(app)


def test_stale_save_is_a_conflict_and_format_version_does_not_change(db_engine: Engine) -> None:
    project_id = uuid.uuid4()
    with Session(db_engine) as session:
        session.add(Project(id=project_id, name="Concurrent edits"))
        session.commit()
    client = client_for(db_engine)
    try:
        created = client.post(
            f"/api/v1/projects/{project_id}/workflows", json={"name": "Initial"}
        ).json()
        path = f"/api/v1/workflows/{created['id']}"
        payload = {"name": "First tab", "nodes": [], "edges": [], "expected_revision": 1}
        first = client.put(path, json=payload)
        assert first.status_code == 200
        second = client.put(path, json={**payload, "name": "Second tab"})
        assert second.status_code == 409
        assert second.json()["detail"]["code"] == "WORKFLOW_CONFLICT"
        saved = client.get(path).json()
        assert saved["name"] == "First tab"
        assert saved["version"] == 1
        assert saved["revision"] == 2
        assert client.get(path + "/schema").json()["revision"] == 2
    finally:
        app.dependency_overrides.clear()


def test_workflow_persist_reload_catalog_and_delete(db_engine: Engine) -> None:
    project_id = uuid.uuid4()
    source_id = uuid.uuid4()
    node_id = uuid.uuid4()
    with Session(db_engine) as session:
        session.add(Project(id=project_id, name="Sales Analysis"))
        session.commit()
    client = client_for(db_engine)
    created = client.post(f"/api/v1/projects/{project_id}/workflows", json={"name": "Main"})
    workflow_id = created.json()["id"]
    graph = {
        "name": "Sales flow",
        "expected_revision": 1,
        "nodes": [
            {
                "id": str(node_id),
                "type": "excel_source",
                "version": 1,
                "position": {"x": 100, "y": 200},
                "config": {"source_id": str(source_id), "sheet_name": "Sales"},
                "ui": {"collapsed": False},
            }
        ],
        "edges": [],
    }

    saved = client.put(f"/api/v1/workflows/{workflow_id}", json=graph)
    reloaded = client.get(f"/api/v1/workflows/{workflow_id}")
    schemas = client.get(f"/api/v1/workflows/{workflow_id}/schema")
    catalog = client.get("/api/v1/node-catalog")

    assert created.status_code == 201
    assert saved.status_code == 200
    assert saved.json()["version"] == 1
    assert saved.json()["revision"] == 2
    assert reloaded.json()["nodes"][0]["config"]["sheet_name"] == "Sales"
    assert schemas.status_code == 200
    assert schemas.json()["valid"] is False
    assert schemas.json()["issues"][0]["node_id"] == str(node_id)
    assert (
        client.get(f"/api/v1/projects/{project_id}/workflows").json()["items"][0]["name"]
        == "Sales flow"
    )
    excel = next(item for item in catalog.json()["items"] if item["type"] == "excel_source")
    assert excel["output_ports"][0]["id"] == "dataset"
    assert client.delete(f"/api/v1/workflows/{workflow_id}").status_code == 204
    assert client.get(f"/api/v1/workflows/{workflow_id}").status_code == 404
    app.dependency_overrides.clear()


def test_excel_rename_and_filter_execute_through_generic_preview_api(
    db_engine: Engine, tmp_path: Path
) -> None:
    project_id = uuid.uuid4()
    with Session(db_engine) as session:
        session.add(Project(id=project_id, name="Preview"))
        session.commit()
    client = client_for(db_engine, tmp_path)
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Sales"
    sheet.append(["country", "amount"])
    sheet.append(["Korea", 10])
    sheet.append(["Japan", 20])
    stream = BytesIO()
    workbook.save(stream)
    workbook.close()
    uploaded = client.post(
        f"/api/v1/projects/{project_id}/sources/excel",
        files={"file": ("sales.xlsx", stream.getvalue())},
    ).json()
    workflow = client.post(f"/api/v1/projects/{project_id}/workflows", json={"name": "Main"}).json()
    node_id = uuid.uuid4()
    rename_id = uuid.uuid4()
    filter_id = uuid.uuid4()
    client.put(
        f"/api/v1/workflows/{workflow['id']}",
        json={
            "name": "Main",
            "expected_revision": 1,
            "nodes": [
                {
                    "id": str(node_id),
                    "type": "excel_source",
                    "version": 1,
                    "position": {"x": 0, "y": 0},
                    "config": {"source_id": uploaded["id"], "sheet_name": "Sales"},
                },
                {
                    "id": str(rename_id),
                    "type": "rename_columns",
                    "version": 1,
                    "position": {"x": 300, "y": 0},
                    "config": {"renames": [{"column_id": "col_2", "new_name": "Net Amount"}]},
                },
                {
                    "id": str(filter_id),
                    "type": "filter",
                    "version": 1,
                    "position": {"x": 600, "y": 0},
                    "config": {
                        "mode": "and",
                        "conditions": [
                            {"column_id": "col_2", "operator": "greater_than", "value": 10}
                        ],
                    },
                },
            ],
            "edges": [
                {
                    "id": str(uuid.uuid4()),
                    "source_node_id": str(node_id),
                    "source_port": "dataset",
                    "target_node_id": str(rename_id),
                    "target_port": "input",
                },
                {
                    "id": str(uuid.uuid4()),
                    "source_node_id": str(rename_id),
                    "source_port": "dataset",
                    "target_node_id": str(filter_id),
                    "target_port": "input",
                },
            ],
        },
    )

    preview = client.post(
        f"/api/v1/workflows/{workflow['id']}/nodes/{filter_id}/preview",
        json={"limit": 500},
    )

    assert preview.status_code == 200
    assert preview.json()["rows"] == [{"country": "Japan", "Net Amount": 20}]
    assert preview.json()["total_rows"] == 1
    assert preview.json()["truncated"] is False
    assert preview.json()["metadata"]["executed_nodes"] == 3
    app.dependency_overrides.clear()


def test_invalid_graph_does_not_replace_saved_graph(db_engine: Engine) -> None:
    project_id = uuid.uuid4()
    with Session(db_engine) as session:
        session.add(Project(id=project_id, name="Project"))
        session.commit()
    client = client_for(db_engine)
    workflow_id = client.post(
        f"/api/v1/projects/{project_id}/workflows", json={"name": "Main"}
    ).json()["id"]
    invalid = {
        "name": "Broken",
        "expected_revision": 1,
        "nodes": [
            {
                "id": str(uuid.uuid4()),
                "type": "unknown",
                "version": 1,
                "position": {"x": 0, "y": 0},
                "config": {},
            }
        ],
        "edges": [],
    }

    response = client.put(f"/api/v1/workflows/{workflow_id}", json=invalid)

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_NODE"
    assert client.get(f"/api/v1/workflows/{workflow_id}").json()["name"] == "Main"
    app.dependency_overrides.clear()


def test_known_unconfigured_node_is_saved_as_a_draft(db_engine: Engine) -> None:
    project_id = uuid.uuid4()
    with Session(db_engine) as session:
        session.add(Project(id=project_id, name="Drafts"))
        session.commit()
    client = client_for(db_engine)
    workflow_id = client.post(
        f"/api/v1/projects/{project_id}/workflows", json={"name": "Draft"}
    ).json()["id"]
    node_id = uuid.uuid4()

    saved = client.put(
        f"/api/v1/workflows/{workflow_id}",
        json={
            "name": "Draft",
            "expected_revision": 1,
            "nodes": [
                {
                    "id": str(node_id),
                    "type": "select_columns",
                    "version": 1,
                    "position": {"x": 0, "y": 0},
                    "config": {},
                }
            ],
            "edges": [],
        },
    )
    schema = client.get(f"/api/v1/workflows/{workflow_id}/schema")

    assert saved.status_code == 200
    assert schema.json()["valid"] is False
    assert {issue["code"] for issue in schema.json()["issues"]} == {
        "INVALID_NODE_CONFIGURATION",
        "MISSING_REQUIRED_INPUT",
    }
    app.dependency_overrides.clear()
