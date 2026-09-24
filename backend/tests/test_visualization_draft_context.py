from pathlib import Path
from uuid import uuid4

from sqlalchemy.engine import Engine
from test_workflows_api import client_for

from app.main import app


def test_draft_context_matches_saved_result_without_persisting(
    db_engine: Engine, tmp_path: Path
) -> None:
    client = client_for(db_engine, tmp_path)
    try:
        project = client.post("/api/v1/projects", json={"name": "Draft context"}).json()
        workflow = client.post(
            f"/api/v1/projects/{project['id']}/workflows", json={"name": "Dates"}
        ).json()
        node, publication, context_id = uuid4(), uuid4(), uuid4()
        response = client.put(
            f"/api/v1/workflows/{workflow['id']}",
            json={
                "name": "Dates",
                "format_version": 3,
                "expected_revision": 1,
                "nodes": [
                    {
                        "id": str(node),
                        "type": "calendar",
                        "version": 1,
                        "position": {"x": 0, "y": 0},
                        "config": {"start": "2026-01-01", "end": "2026-02-02"},
                    }
                ],
                "edges": [],
                "result_catalog": {
                    "outputs": [
                        {
                            "id": str(publication),
                            "name": "Dates",
                            "node_id": str(node),
                            "port": "dataset",
                            "kind": "dataset",
                            "context_ids": [str(context_id)],
                        }
                    ],
                    "contexts": [
                        {
                            "id": str(context_id),
                            "name": "Calendar dates",
                            "points": [
                                {
                                    "node_id": str(node),
                                    "port": "dataset",
                                    "column_id": f"calendar_{node.hex}",
                                    "role": "period",
                                }
                            ],
                        }
                    ],
                },
            },
        )
        assert response.status_code == 200, response.text
        workflow = response.json()
        prefix = f"/api/v1/projects/{project['id']}/visualizations"
        body = {
            "workflow_id": workflow["id"],
            "publication_id": str(publication),
            "expected_workflow_revision": workflow["revision"],
            "name": "Dates",
            "type": "table",
            "config": {},
        }
        created = client.post(prefix, json=body)
        assert created.status_code == 201, created.text
        visual = created.json()
        view = {"period": {"start": "2026-01-31", "end": "2026-02-01"}}
        preview = client.post(prefix + "/preview", json={**body, "context": view})
        assert preview.status_code == 200, preview.text
        saved = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={"context": view})
        assert (
            preview.json()["rows"]
            == saved.json()["rows"]
            == [{"Date": "2026-01-31"}, {"Date": "2026-02-01"}]
        )
        assert preview.json()["applied_context"] == saved.json()["applied_context"]
        invalid = client.post(
            prefix + "/preview",
            json={**body, "context": {"period": {"start": "2026-02-01", "end": "2026-01-01"}}},
        )
        assert invalid.status_code == 422
        assert client.get(prefix).json()["items"] == [visual]
        assert client.get(f"/api/v1/workflows/{workflow['id']}").json() == workflow
    finally:
        client.close()
        app.dependency_overrides.clear()
