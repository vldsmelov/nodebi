import uuid
from pathlib import Path

import pytest
from sqlalchemy.engine import Engine
from test_dashboards import analytical_graph
from test_workflows_api import client_for

from app.main import app


def test_text_kpi_result_keeps_extra_navigation_identity(db_engine: Engine, tmp_path: Path) -> None:
    client = client_for(db_engine, tmp_path)
    try:
        project = client.post("/api/v1/projects", json={"name": "Context fields"}).json()
        graph = analytical_graph(client, uuid.UUID(project["id"]))
        source = next(node for node in graph["nodes"] if node["type"] == "excel_source")
        endpoint = f"/api/v1/workflows/{graph['id']}/nodes/{source['id']}/values"
        choices = client.post(endpoint, json={"column_id": "col_1", "limit": 1}).json()
        assert choices["values"] == ["A"]
        assert choices["truncated"] is True
        assert choices["revision"] == graph["revision"]
        assert client.post(endpoint, json={"column_id": "col_1", "search": "b"}).json()[
            "values"
        ] == ["B"]
        invalid = client.post(endpoint, json={"column_id": "missing"})
        assert invalid.status_code == 422
        assert invalid.json()["detail"]["node_id"] == source["id"]
        limit_id, kpi_id = str(uuid.uuid4()), str(uuid.uuid4())
        for identity, kind, config in [
            (limit_id, "limit", {"limit": 1}),
            (kpi_id, "kpi", {"value_column_id": "col_1", "context_column_ids": ["col_2"]}),
        ]:
            graph["nodes"].append(
                {
                    "id": identity,
                    "type": kind,
                    "version": 1,
                    "position": {"x": 0, "y": 0},
                    "config": config,
                }
            )
        for start, end in [(source["id"], limit_id), (limit_id, kpi_id)]:
            graph["edges"].append(
                {
                    "id": str(uuid.uuid4()),
                    "source_node_id": start,
                    "source_port": "dataset",
                    "target_node_id": end,
                    "target_port": "input",
                }
            )
        graph["expected_revision"] = graph["revision"]
        assert client.put(f"/api/v1/workflows/{graph['id']}", json=graph).status_code == 200
        response = client.get(f"/api/v1/visualizations/{kpi_id}/result")
        assert response.status_code == 200, response.text
        result = response.json()
        assert result["context_column_ids"] == ["col_2"]
        assert {column["column_id"] for column in result["columns"]} == {"col_1", "col_2"}
        assert result["rows"] == [{"category": "A", "quantity": 2}]
    finally:
        app.dependency_overrides.clear()


def test_dashboard_bindings_navigation_and_legacy_save_are_atomic(
    db_engine: Engine, tmp_path: Path
) -> None:
    client = client_for(db_engine, tmp_path)
    try:
        project = client.post("/api/v1/projects", json={"name": "Navigation"}).json()
        other = client.post("/api/v1/projects", json={"name": "Other"}).json()
        graph = analytical_graph(client, uuid.UUID(project["id"]))
        graph["expected_revision"] = graph["revision"]
        graph["parameters"] = [{"name": "category", "logical_type": "string"}]
        assert client.put(f"/api/v1/workflows/{graph['id']}", json=graph).status_code == 200
        target = client.post(
            f"/api/v1/projects/{project['id']}/dashboards", json={"name": "Detail"}
        ).json()
        target["expected_revision"] = target["revision"]
        target["configuration"] = {
            "parameters": [{"name": "selected", "logical_type": "string", "required": True}],
            "bindings": [
                {
                    "workflow_id": graph["id"],
                    "workflow_parameter": "category",
                    "dashboard_parameter": "selected",
                }
            ],
        }
        response = client.put(f"/api/v1/dashboards/{target['id']}", json=target)
        assert response.status_code == 200, response.text
        target = response.json()
        source = client.post(
            f"/api/v1/projects/{project['id']}/dashboards", json={"name": "Overview"}
        ).json()
        foreign = client.post(
            f"/api/v1/projects/{other['id']}/dashboards", json={"name": "Foreign"}
        ).json()
        chart = next(node for node in graph["nodes"] if node["type"] == "bar_chart")
        source["expected_revision"] = source["revision"]
        source["widgets"] = [
            {
                "id": str(uuid.uuid4()),
                "visualization_id": chart["id"],
                "x": 0,
                "y": 0,
                "width": 6,
                "height": 8,
                "config": {
                    "action": {
                        "dashboard_id": target["id"],
                        "values": {"selected": {"source": "field", "name": "col_1"}},
                    }
                },
            }
        ]
        response = client.put(f"/api/v1/dashboards/{source['id']}", json=source)
        assert response.status_code == 200, response.text
        saved = response.json()
        assert saved["widgets"][0]["config"]["action"]["values"]["selected"]["name"] == "col_1"
        source = saved | {"expected_revision": saved["revision"]}
        source["configuration"] = {
            "links": [{"label": "Other", "action": {"dashboard_id": foreign["id"]}}]
        }
        assert client.put(f"/api/v1/dashboards/{source['id']}", json=source).status_code == 422
        assert client.get(f"/api/v1/dashboards/{source['id']}").json() == saved
        # A navigation link has no row: field bindings cannot be silently interpreted as literals.
        source["configuration"]["links"][0]["action"] = source["widgets"][0]["config"]["action"]
        assert client.put(f"/api/v1/dashboards/{source['id']}", json=source).status_code == 422
        # Omitted new config is compatible, but stale revisions still reject writes.
        target["expected_revision"] = target["revision"]
        target.pop("configuration")
        kept = client.put(f"/api/v1/dashboards/{target['id']}", json=target)
        assert kept.status_code == 200
        assert kept.json()["configuration"]["bindings"][0]["workflow_id"] == graph["id"]
        assert client.put(f"/api/v1/dashboards/{target['id']}", json=target).status_code == 409
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize(
    "kind", ["foreign_workflow", "type_mismatch", "unknown_parameter", "duplicate_binding"]
)
def test_invalid_dashboard_binding_does_not_change_saved_state(
    db_engine: Engine, tmp_path: Path, kind: str
) -> None:
    client = client_for(db_engine, tmp_path)
    try:
        project = client.post("/api/v1/projects", json={"name": "Bindings"}).json()
        other = client.post("/api/v1/projects", json={"name": "Other"}).json()
        owner = other["id"] if kind == "foreign_workflow" else project["id"]
        workflow = client.post(
            f"/api/v1/projects/{owner}/workflows",
            json={"name": "Filter"},
        ).json()
        workflow.update(
            expected_revision=workflow["revision"],
            parameters=[{"name": "chosen", "logical_type": "integer"}],
        )
        assert client.put(f"/api/v1/workflows/{workflow['id']}", json=workflow).status_code == 200
        saved = client.post(
            f"/api/v1/projects/{project['id']}/dashboards", json={"name": "Dashboard"}
        ).json()
        binding = {
            "workflow_id": workflow["id"],
            "workflow_parameter": "missing" if kind == "unknown_parameter" else "chosen",
            "dashboard_parameter": "value",
        }
        payload = saved | {
            "expected_revision": saved["revision"],
            "configuration": {
                "parameters": [
                    {
                        "name": "value",
                        "logical_type": "string" if kind == "type_mismatch" else "integer",
                    }
                ],
                "bindings": [binding, binding] if kind == "duplicate_binding" else [binding],
            },
        }
        assert client.put(f"/api/v1/dashboards/{saved['id']}", json=payload).status_code == 422
        assert client.get(f"/api/v1/dashboards/{saved['id']}").json() == saved
    finally:
        app.dependency_overrides.clear()
