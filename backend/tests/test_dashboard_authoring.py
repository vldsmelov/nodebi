import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from sqlalchemy.engine import Engine
from test_dashboards import analytical_graph
from test_workflows_api import client_for

from app.main import app


def test_atomic_creation_copy_conflicts_and_late_rollback(
    db_engine: Engine, tmp_path: Path
) -> None:
    client = client_for(db_engine, tmp_path)
    try:
        project = client.post("/api/v1/projects", json={"name": "Authoring"}).json()
        graph = analytical_graph(client, uuid.UUID(project["id"]))
        chart = next(node for node in graph["nodes"] if node["type"] == "bar_chart")
        source = next(
            edge["source_node_id"]
            for edge in graph["edges"]
            if edge["target_node_id"] == chart["id"]
        )
        dashboard = client.post(
            f"/api/v1/projects/{project['id']}/dashboards", json={"name": "Board"}
        ).json()
        path = f"/api/v1/dashboards/{dashboard['id']}/visualizations"
        payload = dict(
            workflow_id=graph["id"],
            expected_workflow_revision=graph["revision"],
            expected_dashboard_revision=dashboard["revision"],
            source_node_id=source,
            node_id=str(uuid.uuid4()),
            edge_id=str(uuid.uuid4()),
            widget_id=str(uuid.uuid4()),
            type="bar_chart",
            config={**chart["config"], "title": "Created"},
        )
        # Two clients with the same acknowledged revisions: exactly one atomic operation wins.
        with ThreadPoolExecutor(max_workers=2) as pool:
            if db_engine.dialect.name == "postgresql":
                responses = list(pool.map(lambda _: client.post(path, json=payload), range(2)))
            else:
                responses = [client.post(path, json=payload), client.post(path, json=payload)]
        assert sorted(response.status_code for response in responses) == [201, 409]
        dashboard = next(response.json() for response in responses if response.status_code == 201)
        updated = client.get(f"/api/v1/workflows/{graph['id']}").json()
        stale = client.post(
            path, json={**payload, "expected_dashboard_revision": dashboard["revision"]}
        )
        assert stale.status_code == 409
        assert stale.json()["detail"]["code"] == "WORKFLOW_CONFLICT"
        assert updated["revision"] == graph["revision"] + 1
        assert len(updated["nodes"]) == len(graph["nodes"]) + 1
        assert dashboard["widgets"][0]["visualization_id"] == payload["node_id"]
        assert client.get(f"/api/v1/visualizations/{payload['node_id']}/result").status_code == 200
        # A late duplicate-widget failure must roll back the staged graph and index.
        failed_payload = {
            **payload,
            "expected_workflow_revision": updated["revision"],
            "expected_dashboard_revision": dashboard["revision"],
            "node_id": str(uuid.uuid4()),
            "edge_id": str(uuid.uuid4()),
        }
        failed = client.post(path, json=failed_payload)
        assert failed.status_code == 422, failed.text
        assert client.get(f"/api/v1/workflows/{graph['id']}").json() == updated
        assert client.get(f"/api/v1/dashboards/{dashboard['id']}").json() == dashboard
        assert not any(
            visual["id"] == failed_payload["node_id"]
            for visual in client.get(f"/api/v1/projects/{project['id']}/visualizations").json()[
                "items"
            ]
        )
        copied = client.post(
            path,
            json={
                **failed_payload,
                "replace_existing": True,
                "config": {**chart["config"], "title": "Independent"},
            },
        )
        assert copied.status_code == 201, copied.text
        copy = copied.json()["widgets"][0]
        assert copy == {**dashboard["widgets"][0], "visualization_id": failed_payload["node_id"]}
        final = client.get(f"/api/v1/workflows/{graph['id']}").json()
        assert (
            next(node for node in final["nodes"] if node["id"] == payload["node_id"])["config"][
                "title"
            ]
            == "Created"
        )
        # Cross-project workflows and non-dataset input nodes cannot be attached.
        foreign_project = client.post("/api/v1/projects", json={"name": "Other"}).json()
        foreign = client.post(
            f"/api/v1/projects/{foreign_project['id']}/workflows", json={"name": "Other"}
        ).json()
        rejected = client.post(
            path,
            json={
                **failed_payload,
                "expected_dashboard_revision": copied.json()["revision"],
                "workflow_id": foreign["id"],
                "expected_workflow_revision": foreign["revision"],
            },
        )
        assert rejected.status_code == 422
        rejected = client.post(
            path,
            json={
                **failed_payload,
                "expected_dashboard_revision": copied.json()["revision"],
                "expected_workflow_revision": final["revision"],
                "source_node_id": chart["id"],
            },
        )
        assert rejected.status_code == 422
        assert client.get(f"/api/v1/workflows/{graph['id']}").json() == final
    finally:
        app.dependency_overrides.clear()
