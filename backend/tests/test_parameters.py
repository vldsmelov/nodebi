import uuid
from pathlib import Path

import pytest
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from test_dashboards import analytical_graph
from test_execution import CountingExecutor, make_definition, make_edge, make_node
from test_workflows_api import client_for

from app.domain.nodes import ExecutionContext, NodeRegistry
from app.domain.parameters import ParameterDefinition, resolve_parameters
from app.domain.workflows import NodeInstance, Position, WorkflowGraph
from app.main import app
from app.models import Project
from app.nodes.filter import filter_definition
from app.services.execution import (
    ExecutionFailure,
    InMemoryExecutionCache,
    WorkflowExecutionService,
)


@pytest.mark.parametrize(
    "kind,value",
    [
        ("integer", True),
        ("integer", 1.5),
        ("float", "2"),
        ("float", float("inf")),
        ("float", 10**400),
        ("date", "2026-02-30"),
        ("boolean", 1),
        ("string", 1),
    ],
)
def test_parameter_types_are_explicit(kind: str, value: object) -> None:
    with pytest.raises(ValueError):
        ParameterDefinition.model_validate(
            {"name": "chosen", "logical_type": kind, "default": value}
        )


def test_parameter_defaults_preserve_zero_false_and_explicit_null() -> None:
    definitions = (
        ParameterDefinition(name="count", logical_type="integer", default=0),
        ParameterDefinition(name="active", logical_type="boolean", default=False),
    )
    assert resolve_parameters(definitions, {}) == {"count": 0, "active": False}
    assert resolve_parameters(definitions, {"count": None})["count"] is None
    with pytest.raises(ValueError, match="undeclared"):
        resolve_parameters(definitions, {"unknown": 0})


def test_only_dependent_branch_cache_changes_and_missing_parameter_cannot_hit_cache() -> None:
    registry = NodeRegistry()
    source = CountingExecutor()
    downstream = CountingExecutor()
    registry.register(make_definition("source", source))
    registry.register(make_definition("after", downstream, ("input",)))
    registry.register(filter_definition())
    filtered = NodeInstance(
        uuid.UUID(int=2),
        "filter",
        1,
        Position(0, 0),
        {"conditions": [{"column_id": "value", "operator": "equals", "parameter": "chosen"}]},
    )
    after = make_node(3, "after")
    edge = make_edge(11, 2, 3)
    from dataclasses import replace

    edge = replace(edge, source_port="dataset")
    graph = WorkflowGraph(
        uuid.uuid4(),
        uuid.uuid4(),
        "Parameters",
        1,
        (make_node(1, "source"), filtered, after),
        (make_edge(10, 1, 2), edge),
    )
    definitions = (
        ParameterDefinition(name="chosen", logical_type="integer"),
        ParameterDefinition(name="unrelated", logical_type="string"),
    )
    context = ExecutionContext(
        graph.project_id,
        graph.id,
        uuid.uuid4(),
        cache=InMemoryExecutionCache(),
        parameter_definitions=definitions,
    )
    service = WorkflowExecutionService(registry)
    for value, other in [(1, "a"), (2, "a"), (1, "b")]:
        context.parameters = resolve_parameters(definitions, {"chosen": value, "unrelated": other})
        result = service.execute(graph, after.id, context)
        assert result.output.frame["value"].to_list() == [value]
    assert source.calls == 1
    assert downstream.calls == 2
    context.parameters = {}
    with pytest.raises(ExecutionFailure, match="required") as failure:
        service.execute(graph, after.id, context)
    assert failure.value.node_id == filtered.id


def test_parameter_save_preview_and_visualization_keep_global_branch_independent(
    db_engine: Engine,
    tmp_path: Path,
) -> None:
    project_id = uuid.uuid4()
    with Session(db_engine) as session:
        session.add(Project(id=project_id, name="Parameter scope"))
        session.commit()
    client = client_for(db_engine, tmp_path)
    try:
        graph = analytical_graph(client, project_id)
        original_revision = graph["revision"]
        filtered = str(uuid.uuid4())
        chart = next(item for item in graph["nodes"] if item["type"] == "bar_chart")
        kpi = next(item for item in graph["nodes"] if item["type"] == "kpi")
        upstream = next(edge for edge in graph["edges"] if edge["target_node_id"] == chart["id"])
        graph["edges"].append({**upstream, "id": str(uuid.uuid4()), "target_node_id": filtered})
        upstream["source_node_id"] = filtered
        graph["nodes"].append(
            {
                "id": filtered,
                "type": "filter",
                "version": 1,
                "position": {"x": 0, "y": 0},
                "config": {
                    "conditions": [
                        {"column_id": "col_1", "operator": "equals", "parameter": "category"}
                    ]
                },
            }
        )
        graph["parameters"] = [{"name": "category", "logical_type": "string"}]
        graph["expected_revision"] = original_revision
        saved = client.put(f"/api/v1/workflows/{graph['id']}", json=graph)
        assert saved.status_code == 200, saved.text
        assert client.get(f"/api/v1/workflows/{graph['id']}/schema").json()["valid"]
        for category, total in [("A", 50), ("B", 10), ("A", 50)]:
            payload = {"parameters": {"category": category}}
            response = client.post(f"/api/v1/visualizations/{chart['id']}/result", json=payload)
            assert response.status_code == 200, response.text
            result = response.json()
            assert len(result["rows"]) == 1
            assert result["rows"][0][result["value_field"]] == total
            global_result = client.post(
                f"/api/v1/visualizations/{kpi['id']}/result", json=payload
            ).json()
            assert global_result["rows"][0][global_result["value_field"]] == 60
            preview = client.post(
                f"/api/v1/workflows/{graph['id']}/nodes/{filtered}/preview", json=payload
            )
            assert preview.json()["total_rows"] == 1
        missing = client.get(f"/api/v1/visualizations/{chart['id']}/result")
        assert missing.status_code == 422
        assert missing.json()["detail"]["node_id"] == filtered
        invalid = client.post(
            f"/api/v1/visualizations/{chart['id']}/result", json={"parameters": {"category": 7}}
        )
        assert invalid.status_code == 422
        assert invalid.json()["detail"]["code"] == "INVALID_PARAMETER"
        current = client.get(f"/api/v1/workflows/{graph['id']}").json()
        assert current["revision"] == original_revision + 1
        assert current["parameters"][0]["name"] == "category"
        # Old clients omitting the new field preserve it; stale clients cannot replace it.
        current["expected_revision"] = current["revision"]
        current.pop("parameters")
        response = client.put(f"/api/v1/workflows/{graph['id']}", json=current)
        assert response.json()["parameters"][0]["name"] == "category"
        current["parameters"] = []
        assert client.put(f"/api/v1/workflows/{graph['id']}", json=current).status_code == 409
        assert client.get(f"/api/v1/workflows/{graph['id']}").json()["parameters"]
    finally:
        app.dependency_overrides.clear()
