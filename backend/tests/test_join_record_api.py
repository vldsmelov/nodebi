from pathlib import Path
from uuid import uuid4

from sqlalchemy.engine import Engine
from test_workflows_api import client_for

from app.main import app


def test_diagnostic_pages_and_invalid_field_are_explicit(db_engine: Engine, tmp_path: Path) -> None:
    client = client_for(db_engine, tmp_path)
    try:
        project = client.post("/api/v1/projects", json={"name": "Diagnostic"}).json()
        graph = client.post(
            f"/api/v1/projects/{project['id']}/workflows", json={"name": "Dates"}
        ).json()
        left, right, join = [uuid4() for _ in range(3)]
        nodes = [
            {
                "id": str(identity),
                "type": "calendar",
                "version": 1,
                "position": {"x": 0, "y": 0},
                "config": {"start": start, "end": "2026-01-03"},
            }
            for identity, start in [(left, "2026-01-01"), (right, "2026-01-03")]
        ]
        nodes.append(
            {
                "id": str(join),
                "type": "join",
                "version": 2,
                "position": {"x": 0, "y": 0},
                "config": {
                    "keys": [
                        {"left_key": f"calendar_{left.hex}", "right_key": f"calendar_{right.hex}"}
                    ]
                },
            }
        )
        edges = [
            {
                "id": str(uuid4()),
                "source_node_id": str(identity),
                "source_port": "dataset",
                "target_node_id": str(join),
                "target_port": port,
            }
            for identity, port in [(left, "left"), (right, "right")]
        ]
        path = f"/api/v1/workflows/{graph['id']}"
        saved = client.put(
            path,
            json={
                "name": graph["name"],
                "expected_revision": graph["revision"],
                "nodes": nodes,
                "edges": edges,
            },
        )
        assert saved.status_code == 200, saved.text
        endpoint = f"{path}/nodes/{join}/preview"
        response = client.post(
            endpoint, json={"diagnostic": "left_unmatched", "limit": 1, "offset": 1}
        )
        assert response.status_code == 200, response.text
        result = response.json()
        assert result["rows"] == [{"Date": "2026-01-02"}]
        assert result["total_rows"] == 2 and not result["truncated"]
        assert client.post(endpoint, json={"diagnostic": "bad"}).status_code == 422
        assert (
            client.post(
                f"{path}/nodes/{left}/preview", json={"diagnostic": "left_unmatched"}
            ).status_code
            == 422
        )
        nodes[-1]["config"]["keys"][0]["left_key"] = "missing"
        assert (
            client.put(
                path,
                json={
                    "name": graph["name"],
                    "expected_revision": saved.json()["revision"],
                    "nodes": nodes,
                    "edges": edges,
                },
            ).status_code
            == 200
        )
        assert client.post(endpoint, json={"diagnostic": "left_unmatched"}).status_code == 422
    finally:
        app.dependency_overrides.clear()
