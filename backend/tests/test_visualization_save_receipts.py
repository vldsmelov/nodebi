from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from test_workflows_api import client_for

from app.main import app
from app.models import Visualization
from app.models.reporting import ReportDocument
from app.schemas.dashboards import IndependentVisualizationSave
from app.services.independent_visualizations import IndependentVisualizationService


@pytest.fixture
def setup_visualization(db_engine: Engine, tmp_path: Path):
    client = client_for(db_engine, tmp_path)
    try:
        project = client.post("/api/v1/projects", json={"name": "Save receipts"}).json()
        workflow = client.post(
            f"/api/v1/projects/{project['id']}/workflows", json={"name": "Constant"}
        ).json()
        node, publication = str(uuid4()), str(uuid4())
        response = client.put(
            f"/api/v1/workflows/{workflow['id']}",
            json={
                "name": "Constant",
                "format_version": 3,
                "expected_revision": 1,
                "nodes": [
                    {
                        "id": node,
                        "type": "scalar_constant",
                        "version": 1,
                        "position": {"x": 0, "y": 0},
                        "config": {"value": 42},
                    }
                ],
                "edges": [],
                "result_catalog": {
                    "outputs": [
                        {
                            "id": publication,
                            "name": "Total",
                            "node_id": node,
                            "port": "value",
                            "kind": "scalar",
                        }
                    ]
                },
            },
        )
        assert response.status_code == 200, response.text
        graph = response.json()
        body = {
            "request_id": str(uuid4()),
            "workflow_id": workflow["id"],
            "publication_id": publication,
            "expected_workflow_revision": graph["revision"],
            "expected_revision": 1,
            "name": "Total",
            "type": "kpi",
            "config": {},
        }
        yield client, project["id"], graph, body
    finally:
        client.close()
        app.dependency_overrides.clear()


@pytest.mark.parametrize("operation", ["create", "copy", "update"])
def test_retry_survives_new_session_and_changed_revisions(setup_visualization, operation):
    client, project, graph, body = setup_visualization
    prefix = f"/api/v1/projects/{project}/visualizations"
    original = client.post(prefix, json={**body, "request_id": None}).json()
    path = prefix if operation == "create" else f"/api/v1/visualizations/{original['id']}"
    if operation == "copy":
        path += "/copy"
    send = client.put if operation == "update" else client.post
    first = send(path, json=body)
    assert first.status_code in (200, 201), first.text
    # Every API request uses a fresh session. Retry must precede workflow/source CAS checks.
    changed = client.put(
        f"/api/v1/workflows/{graph['id']}",
        json={
            "nodes": graph["nodes"],
            "edges": graph["edges"],
            "result_catalog": graph["result_catalog"],
            "format_version": 3,
            "expected_revision": graph["revision"],
            "name": "Renamed",
        },
    )
    assert changed.status_code == 200, changed.text
    repeated = send(path, json=body)
    assert repeated.status_code == first.status_code, repeated.text
    assert repeated.json() == first.json()
    assert len(client.get(prefix).json()["items"]) == (1 if operation == "update" else 2)
    mismatch = send(path, json={**body, "name": "Different"})
    assert mismatch.status_code == 409
    assert mismatch.json()["detail"]["code"] == "VISUALIZATION_REQUEST_CONFLICT"


def test_receipt_does_not_recreate_deleted_result_or_revert_later_edits(setup_visualization):
    client, project, _, body = setup_visualization
    prefix = f"/api/v1/projects/{project}/visualizations"
    original = client.post(prefix, json=body).json()
    path = f"/api/v1/visualizations/{original['id']}"
    edited = client.put(path, json={**body, "request_id": str(uuid4()), "name": "Later"})
    assert edited.status_code == 200, edited.text
    assert client.post(prefix, json=body).json() == edited.json()
    assert (
        client.delete(path, params={"expected_revision": edited.json()["revision"]}).status_code
        == 204
    )
    retry = client.post(prefix, json=body)
    assert retry.status_code == 410, retry.text
    assert client.get(prefix).json()["items"] == []


def test_failed_validation_and_failed_commit_leave_no_receipt(
    setup_visualization, db_engine: Engine, monkeypatch
):
    client, project, _, body = setup_visualization
    prefix = f"/api/v1/projects/{project}/visualizations"
    assert client.post(prefix, json={**body, "type": "table"}).status_code == 422
    with Session(db_engine) as session:
        assert session.scalar(select(func.count()).select_from(ReportDocument)) == 0

        def fail_commit():
            raise RuntimeError("simulated commit failure")

        monkeypatch.setattr(session, "commit", fail_commit)
        with pytest.raises(RuntimeError, match="simulated"):
            IndependentVisualizationService(session).save(
                UUID(project), IndependentVisualizationSave.model_validate(body)
            )
        session.rollback()
    with Session(db_engine) as session:
        assert session.scalar(select(func.count()).select_from(Visualization)) == 0
        assert session.scalar(select(func.count()).select_from(ReportDocument)) == 0
    assert client.post(prefix, json=body).status_code == 201


def test_receipt_is_bound_to_operation_and_old_clients_still_work(setup_visualization):
    client, project, _, body = setup_visualization
    prefix = f"/api/v1/projects/{project}/visualizations"
    original = client.post(prefix, json=body).json()
    mismatch = client.post(f"/api/v1/visualizations/{original['id']}/copy", json=body)
    assert mismatch.status_code == 409
    old = {key: value for key, value in body.items() if key != "request_id"}
    assert client.post(prefix, json=old).status_code == 201
    assert client.post(prefix, json=old).status_code == 201
    assert len(client.get(prefix).json()["items"]) == 3


def test_concurrent_identical_requests_create_once(setup_visualization, db_engine: Engine):
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Concurrent project locks require PostgreSQL")
    _, project, _, body = setup_visualization
    barrier = Barrier(2)

    def save(_):
        with Session(db_engine) as session:
            barrier.wait(timeout=5)
            return IndependentVisualizationService(session).save(
                UUID(project), IndependentVisualizationSave.model_validate(body)
            )

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(save, range(2)))
    assert results[0] == results[1]
    with Session(db_engine) as session:
        assert session.scalar(select(func.count()).select_from(Visualization)) == 1
        assert session.scalar(select(func.count()).select_from(ReportDocument)) == 1
