import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from sqlalchemy.engine import Engine
from test_dashboards import analytical_graph
from test_workflows_api import client_for

from app.main import app


def test_navigation_fields_atomic_conflicts_ownership_and_shared_use(
    db_engine: Engine, tmp_path: Path
) -> None:
    client = client_for(db_engine, tmp_path)
    try:
        project = client.post("/api/v1/projects", json={"name": "Navigation authoring"}).json()
        graph = analytical_graph(client, uuid.UUID(project["id"]))
        source = next(node for node in graph["nodes"] if node["type"] == "excel_source")
        chart_id = str(uuid.uuid4())
        graph["nodes"].append(
            {
                "id": chart_id,
                "type": "table",
                "version": 1,
                "position": {"x": 300, "y": 0},
                "config": {"title": "Shared", "column_ids": ["col_1"]},
            }
        )
        graph["edges"].append(
            {
                "id": str(uuid.uuid4()),
                "source_node_id": source["id"],
                "source_port": "dataset",
                "target_node_id": chart_id,
                "target_port": "input",
            }
        )
        graph["expected_revision"] = graph["revision"]
        response = client.put(f"/api/v1/workflows/{graph['id']}", json=graph)
        assert response.status_code == 200, response.text
        graph = response.json()
        boards = []
        for name in ("Overview", "Shared view", "Detail"):
            board = client.post(
                f"/api/v1/projects/{project['id']}/dashboards", json={"name": name}
            ).json()
            payload = {**board, "expected_revision": board["revision"]}
            if name == "Detail":
                payload["configuration"] = {
                    "parameters": [
                        {"name": "quantity", "logical_type": "integer", "required": True}
                    ]
                }
            else:
                payload["widgets"] = [
                    {
                        "id": str(uuid.uuid4()),
                        "visualization_id": chart_id,
                        "title": "Preserved",
                        "x": 2,
                        "y": 1,
                        "width": 6,
                        "height": 8,
                    }
                ]
            saved = client.put(f"/api/v1/dashboards/{board['id']}", json=payload)
            assert saved.status_code == 200, saved.text
            boards.append(saved.json())
        board, shared, target = boards
        endpoint = f"/api/v1/dashboards/{board['id']}/navigation"
        payload = {
            "workflow_id": graph["id"],
            "widget_id": board["widgets"][0]["id"],
            "expected_workflow_revision": graph["revision"],
            "expected_dashboard_revision": board["revision"],
            "expected_target_revision": target["revision"],
            "add_context_column_ids": ["col_2"],
            "action": {
                "dashboard_id": target["id"],
                "values": {"quantity": {"source": "field", "name": "col_2"}},
            },
        }
        assert client.post(endpoint, json=payload).status_code == 422  # Shared-use acknowledgement.
        payload["acknowledge_shared"] = True
        for patch in [
            {"expected_target_revision": target["revision"] + 1},
            {"expected_workflow_revision": graph["revision"] + 1},
            {"expected_dashboard_revision": board["revision"] + 1},
        ]:
            assert client.post(endpoint, json=payload | patch).status_code == 409
        for patch in [
            {"widget_id": str(uuid.uuid4())},
            {"add_context_column_ids": ["col_1"]},  # Must not hide an existing visible field.
            {"add_context_column_ids": ["missing"]},
            {
                "action": {
                    "dashboard_id": target["id"],
                    "values": {"quantity": {"source": "field", "name": "col_1"}},
                }
            },
            {
                "action": {
                    "dashboard_id": target["id"],
                    "values": {"quantity": {"source": "field", "name": "col_3"}},
                }
            },
            {
                "action": {"dashboard_id": target["id"], "values": {}}
            },  # Late required-value rejection.
        ]:
            assert client.post(endpoint, json=payload | patch).status_code == 422
            assert client.get(f"/api/v1/workflows/{graph['id']}").json() == graph
            assert client.get(f"/api/v1/dashboards/{board['id']}").json() == board
        other = client.post("/api/v1/projects", json={"name": "Other"}).json()
        foreign = client.post(
            f"/api/v1/projects/{other['id']}/dashboards", json={"name": "Foreign"}
        ).json()
        foreign_flow = client.post(
            f"/api/v1/projects/{other['id']}/workflows", json={"name": "Foreign"}
        ).json()
        assert (
            client.post(endpoint, json=payload | {"workflow_id": foreign_flow["id"]}).status_code
            == 422
        )
        assert (
            client.post(
                endpoint,
                json=payload
                | {
                    "action": {"dashboard_id": foreign["id"], "values": {}},
                    "expected_target_revision": foreign["revision"],
                },
            ).status_code
            == 422
        )
        with ThreadPoolExecutor(max_workers=2) as pool:
            responses = (
                list(pool.map(lambda _: client.post(endpoint, json=payload), range(2)))
                if db_engine.dialect.name == "postgresql"
                else [client.post(endpoint, json=payload), client.post(endpoint, json=payload)]
            )
        assert sorted(response.status_code for response in responses) == [200, 409]
        saved = next(response.json() for response in responses if response.status_code == 200)
        assert saved["revision"] == board["revision"] + 1
        assert saved["widgets"][0] == {
            **board["widgets"][0],
            "config": {
                **board["widgets"][0]["config"],
                "action": {
                    "dashboard_id": target["id"],
                    "values": {"quantity": {"source": "field", "name": "col_2", "value": None}},
                },
            },
        }
        updated = client.get(f"/api/v1/workflows/{graph['id']}").json()
        assert updated["revision"] == graph["revision"] + 1
        assert next(node for node in updated["nodes"] if node["id"] == chart_id)["config"][
            "context_column_ids"
        ] == ["col_2"]
        assert updated["edges"] == graph["edges"]
        assert client.get(f"/api/v1/dashboards/{shared['id']}").json() == shared
        result = client.get(f"/api/v1/visualizations/{chart_id}/result").json()
        assert result["context_column_ids"] == ["col_2"]
        assert result["rows"][0] == {"category": "A", "quantity": 2}
    finally:
        app.dependency_overrides.clear()
