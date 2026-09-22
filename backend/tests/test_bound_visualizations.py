from dataclasses import replace
from pathlib import Path
from uuid import uuid4

import polars as pl
import pytest
from sqlalchemy.engine import Engine
from test_dashboards import analytical_graph
from test_typed_execution import edge, node, setup
from test_workflows_api import client_for

from app.domain.datasets import Dataset
from app.domain.parameters import ParameterDefinition
from app.domain.visualizations import bound_column_id
from app.main import app
from app.nodes import get_node_registry
from app.services.execution import ExecutionFailure, WorkflowExecutionService
from app.services.workflow_validation import WorkflowSchemaResolver


def chart_graph():  # type: ignore[no-untyped-def]
    graph, context, access = setup()
    source, multiply, _, _ = graph.nodes
    chart = replace(node("bar_chart", title="Revenue"), version=2)
    graph = replace(
        graph,
        nodes=(*graph.nodes, chart),
        edges=(
            *graph.edges,
            edge(source, chart, "table"),
            edge(source, chart, "category", "q"),
            edge(multiply, chart, "value", output="value"),
        ),
    )
    return graph, context, access, chart


def test_chart_materializes_fields_without_aggregation_and_reuses_cache() -> None:
    graph, context, access, chart = chart_graph()
    # Repeated categories must stay repeated; empty/negative amounts are not dropped.
    access.dataset = Dataset(
        pl.DataFrame({"quantity": [2, 2, None], "price": [10, -20, 30]}), access.dataset.schema
    )
    schema = WorkflowSchemaResolver(get_node_registry()).resolve(graph, context)
    assert schema.valid, schema.issues
    assert access.loads == 0
    runner = WorkflowExecutionService(get_node_registry())
    for _ in range(2):
        result = runner.execute(graph, chart.id, context)
        assert result.output.row_count == 3
        category = result.schema.by_id(bound_column_id(chart, "category"))
        value = result.schema.by_id(bound_column_id(chart, "value"))
        assert result.output.frame[category.engine_name].to_list() == [2, 2, None]
        assert result.output.frame[value.engine_name].to_list() == [20, -40, None]
        assert value.metadata["source_columns"] == ["q", "p"]
    assert access.loads == 1
    access.dataset = Dataset(access.dataset.frame.head(0), access.dataset.schema)
    context.cache.clear()
    assert runner.execute(graph, chart.id, context).output.row_count == 0


def test_chart_rejects_foreign_rows_before_loading_and_attributes_wire() -> None:
    graph, context, access, chart = chart_graph()
    foreign = replace(graph.nodes[0], id=uuid4())
    wires = tuple(
        e for e in graph.edges if not (e.target_node_id == chart.id and e.target_port == "category")
    )
    bad = edge(foreign, chart, "category", "q")
    graph = replace(graph, nodes=(*graph.nodes, foreign), edges=(*wires, bad))
    with pytest.raises(ExecutionFailure) as caught:
        WorkflowExecutionService(get_node_registry()).execute(graph, chart.id, context)
    assert caught.value.issues[0].edge_id == bad.id
    assert caught.value.issues[0].field == "category"
    assert access.loads == 0


@pytest.mark.parametrize("value", [42, "Class A", None, -1.5])
def test_scalar_kpi_preserves_one_value(value: object) -> None:
    graph, context, _ = setup()
    constant = node("scalar_constant", value=value)
    kpi = replace(node("kpi"), version=2)
    graph = replace(
        graph, nodes=(constant, kpi), edges=(edge(constant, kpi, "value", output="value"),)
    )
    result = WorkflowExecutionService(get_node_registry()).execute(graph, kpi.id, context)
    assert result.output.frame.item() == value
    assert result.output.row_count == 1


def test_kpi_parameter_changes_invalidate_the_bound_result() -> None:
    graph, context, _ = setup()
    parameter = node("scalar_parameter", name="coefficient")
    kpi = replace(node("kpi", title="Value {coefficient}", title_template=True), version=2)
    graph = replace(
        graph, nodes=(parameter, kpi), edges=(edge(parameter, kpi, "value", output="value"),)
    )
    context.parameter_definitions = (ParameterDefinition(name="coefficient", logical_type="float"),)
    runner = WorkflowExecutionService(get_node_registry())
    for amount in (2.5, 3.5, 2.5):
        context.parameters = {"coefficient": amount}
        assert runner.execute(graph, kpi.id, context).output.frame.item() == amount


def test_kpi_rejects_boolean_and_bar_rejects_duplicate_config_binding() -> None:
    graph, context, _ = setup()
    constant, kpi = node("scalar_constant", value=True), replace(node("kpi"), version=2)
    graph = replace(
        graph, nodes=(constant, kpi), edges=(edge(constant, kpi, "value", output="value"),)
    )
    with pytest.raises(ExecutionFailure) as caught:
        WorkflowExecutionService(get_node_registry()).execute(graph, kpi.id, context)
    assert caught.value.issues[0].field == "value"
    graph, context, access, chart = chart_graph()
    graph = replace(
        graph,
        nodes=tuple(
            replace(n, config={"value_column_id": "p"}) if n.id == chart.id else n
            for n in graph.nodes
        ),
    )
    with pytest.raises(ExecutionFailure):
        WorkflowExecutionService(get_node_registry()).execute(graph, chart.id, context)
    assert access.loads == 0


def test_chart_limit_and_deferred_division_error_are_explicit() -> None:
    graph, context, access, chart = chart_graph()
    access.dataset = Dataset(
        pl.DataFrame({"quantity": [1] * 2001, "price": [2] * 2001}), access.dataset.schema
    )
    runner = WorkflowExecutionService(get_node_registry())
    with pytest.raises(ExecutionFailure) as caught:
        runner.execute(graph, chart.id, context)
    assert caught.value.issues[0].field == "table"
    assert "2000" in str(caught.value)
    context.cache.clear()
    access.dataset = Dataset(pl.DataFrame({"quantity": [1], "price": [0]}), access.dataset.schema)
    graph = replace(
        graph,
        nodes=tuple(
            replace(n, config={"operation": "divide"}) if n.type == "field_arithmetic" else n
            for n in graph.nodes
        ),
    )
    with pytest.raises(ExecutionFailure) as caught:
        runner.execute(graph, chart.id, context)
    assert caught.value.issues[0].field == "value"
    assert "non-finite" in str(caught.value)


def test_bound_charts_render_and_restore_alongside_legacy_dashboards(
    db_engine: Engine, tmp_path: Path
) -> None:
    client = client_for(db_engine, tmp_path)
    try:
        project = client.post("/api/v1/projects", json={"name": "Bound charts"}).json()
        graph = analytical_graph(client, project["id"])
        group = next(
            n for n in graph["nodes"] if n["type"] == "group_by" and n["config"]["dimensions"]
        )
        legacy = next(n for n in graph["nodes"] if n["type"] == "bar_chart")
        legacy_result = client.get(f"/api/v1/visualizations/{legacy['id']}/result").json()
        bar, total, kpi = [str(uuid4()) for _ in range(3)]
        nodes = [
            *graph["nodes"],
            *[
                {
                    "id": ident,
                    "type": kind,
                    "version": version,
                    "position": {"x": 0, "y": 0},
                    "config": config,
                }
                for ident, kind, version, config in [
                    (bar, "bar_chart", 2, {"title": "Bound revenue", "orientation": "horizontal"}),
                    (total, "field_sum", 1, {}),
                    (kpi, "kpi", 2, {"title": "Total"}),
                ]
            ],
        ]
        amount = legacy["config"]["value_column_id"]
        edges = [
            *graph["edges"],
            *[
                {
                    "id": str(uuid4()),
                    "source_node_id": origin,
                    "source_port": output,
                    "target_node_id": target,
                    "target_port": port,
                    "source_column_id": column,
                }
                for origin, output, target, port, column in [
                    (group["id"], "dataset", bar, "table", None),
                    (group["id"], "dataset", bar, "category", "col_1"),
                    (group["id"], "dataset", bar, "value", amount),
                    (group["id"], "dataset", total, "table", None),
                    (group["id"], "dataset", total, "value", amount),
                    (total, "value", kpi, "value", None),
                ]
            ],
        ]
        path = f"/api/v1/workflows/{graph['id']}"
        payload = {
            "name": graph["name"],
            "nodes": nodes,
            "edges": edges,
            "expected_revision": graph["revision"],
            "format_version": 2,
        }
        payload["presentation"] = {
            "blocks": [
                {
                    "id": str(uuid4()),
                    "label": "Grouped chart",
                    "node_ids": [group["id"], bar],
                    "position": {"x": 0, "y": 0},
                    "collapsed": True,
                    "inputs": [
                        {
                            "id": str(uuid4()),
                            "label": "Rows",
                            "node_id": group["id"],
                            "port": "input",
                        }
                    ],
                    "outputs": [
                        {
                            "id": str(uuid4()),
                            "label": "Totals",
                            "node_id": group["id"],
                            "port": "dataset",
                            "column_id": column,
                        }
                        for column in (None, amount)
                    ],
                }
            ]
        }
        saved = client.put(path, json=payload)
        assert saved.status_code == 200, saved.text
        assert client.get(path).json() == saved.json()
        assert client.get(path + "/schema").json()["valid"]
        result = client.get(f"/api/v1/visualizations/{bar}/result")
        assert result.status_code == 200, result.text
        data = result.json()
        assert [
            (row[data["category_field"]], row[data["value_field"]]) for row in data["rows"]
        ] == [("A", 50), ("B", 10)]
        assert data["orientation"] == "horizontal"
        total_result = client.get(f"/api/v1/visualizations/{kpi}/result").json()
        assert total_result["rows"][0][total_result["value_field"]] == 60
        assert (
            client.get(f"/api/v1/visualizations/{legacy['id']}/result").json()["rows"]
            == legacy_result["rows"]
        )
        dashboard = client.post(
            f"/api/v1/projects/{project['id']}/dashboards", json={"name": "Bound dashboard"}
        ).json()
        widgets = [
            {
                "id": str(uuid4()),
                "visualization_id": ident,
                "x": i * 6,
                "y": 0,
                "width": 6,
                "height": 8,
            }
            for i, ident in enumerate((bar, kpi))
        ]
        old_category = f"viz_{bar.replace('-', '')}_category"
        widgets[0]["config"] = {
            "action": {
                "dashboard_id": dashboard["id"],
                "values": {"country": {"source": "field", "name": old_category}},
            }
        }
        response = client.put(
            f"/api/v1/dashboards/{dashboard['id']}",
            json={
                "name": dashboard["name"],
                "expected_revision": dashboard["revision"],
                "widgets": widgets,
                "configuration": {"parameters": [{"name": "country", "logical_type": "string"}]},
            },
        )
        assert response.status_code == 200, response.text
        assert client.get(f"/api/v1/dashboards/{dashboard['id']}").json() == response.json()
        copied_id = str(uuid4())
        copy = client.post(
            f"/api/v1/dashboards/{dashboard['id']}/visualizations",
            json={
                "workflow_id": graph["id"],
                "expected_workflow_revision": saved.json()["revision"],
                "expected_dashboard_revision": response.json()["revision"],
                "source_node_id": bar,
                "node_id": copied_id,
                "edge_id": str(uuid4()),
                "widget_id": widgets[0]["id"],
                "replace_existing": True,
                "type": "bar_chart",
                "config": {"title": "Independent"},
            },
        )
        assert copy.status_code == 201, copy.text
        copied_graph = client.get(path).json()
        copied_node = next(n for n in copied_graph["nodes"] if n["id"] == copied_id)
        assert copied_node["version"] == 2
        assert copied_node["config"] == {"title": "Independent"}
        copied_wires = [e for e in copied_graph["edges"] if e["target_node_id"] == copied_id]
        assert len(copied_wires) == 3
        assert {e["source_node_id"] for e in copied_wires} == {group["id"]}
        assert {e["column_id"] for e in copied_graph["presentation"]["blocks"][0]["outputs"]} == {
            None,
            amount,
            "col_1",
        }
        copied_widget = next(w for w in copy.json()["widgets"] if w["id"] == widgets[0]["id"])
        assert (
            copied_widget["config"]["action"]["values"]["country"]["name"]
            == f"viz_{copied_id.replace('-', '')}_category"
        )
        copy_result = client.get(f"/api/v1/visualizations/{copied_id}/result").json()
        assert copy_result["rows"] == data["rows"]
        assert client.get(f"/api/v1/visualizations/{bar}/result").json()["rows"] == data["rows"]
        navigation = client.post(
            f"/api/v1/dashboards/{dashboard['id']}/navigation",
            json={
                "workflow_id": graph["id"],
                "widget_id": widgets[0]["id"],
                "expected_workflow_revision": copied_graph["revision"],
                "expected_dashboard_revision": copy.json()["revision"],
                "expected_target_revision": copy.json()["revision"],
                "add_context_column_ids": ["col_1"],
                "action": {
                    "dashboard_id": dashboard["id"],
                    "values": {"country": {"source": "field", "name": "col_1"}},
                },
            },
        )
        assert navigation.status_code == 200, navigation.text
        context_result = client.get(f"/api/v1/visualizations/{copied_id}/result").json()
        assert context_result["context_column_ids"] == ["col_1"]
        assert [row["category"] for row in context_result["rows"]] == ["A", "B"]
        assert client.get(path).json()["version"] == 2
        assert client.get(path).json()["presentation"] == copied_graph["presentation"]
    finally:
        app.dependency_overrides.clear()
        client.close()
