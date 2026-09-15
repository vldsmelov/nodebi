import uuid
from io import BytesIO
from pathlib import Path

import polars as pl
import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from test_workflows_api import client_for

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.nodes import ExecutionContext
from app.domain.workflows import NodeInstance, Position
from app.main import app
from app.models import Project, Visualization
from app.nodes.visualization import VisualizationExecutor


def test_text_kpi_keeps_original_value_and_still_requires_one_row() -> None:
    executor = VisualizationExecutor()
    schema = DatasetSchema((ColumnSchema("name", "name", "Name", LogicalType.STRING, False),))
    context = ExecutionContext(uuid.uuid4(), uuid.uuid4(), uuid.uuid4())
    node = NodeInstance(uuid.uuid4(), "kpi", 1, Position(0, 0), {"value_column_id": "name"})
    result = executor.execute(
        node, {"input": Dataset(pl.DataFrame({"name": ["Class A"]}), schema)}, context
    )
    assert result.frame.item() == "Class A"
    with pytest.raises(NodeExecutionError, match="exactly one row"):
        executor.execute(
            node, {"input": Dataset(pl.DataFrame({"name": ["A", "B"]}), schema)}, context
        )


def analytical_graph(client: TestClient, project_id: uuid.UUID) -> dict:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Sales"
    sheet.append(["category", "quantity", "price"])
    sheet.append(["A", 2, 10])
    sheet.append(["A", 3, 10])
    sheet.append(["B", 1, 10])
    stream = BytesIO()
    workbook.save(stream)
    workbook.close()
    uploaded = client.post(
        f"/api/v1/projects/{project_id}/sources/excel",
        files={"file": ("sales.xlsx", stream.getvalue())},
    ).json()
    workflow = client.post(
        f"/api/v1/projects/{project_id}/workflows", json={"name": "Sales"}
    ).json()
    ids = [uuid.uuid4() for _ in range(6)]
    definitions = [
        ("excel_source", {"source_id": uploaded["id"], "sheet_name": "Sales"}),
        ("calculated_column", {"name": "revenue", "expression": "quantity * price"}),
        (
            "group_by",
            {
                "dimensions": ["col_1"],
                "aggregations": [
                    {"column_id": f"calc_{ids[1].hex}", "operation": "sum", "name": "total"}
                ],
            },
        ),
        (
            "bar_chart",
            {
                "title": "Revenue by category",
                "value_column_id": f"agg_{ids[2].hex}_0",
                "category_column_id": "col_1",
            },
        ),
        (
            "group_by",
            {
                "dimensions": [],
                "aggregations": [
                    {"column_id": f"calc_{ids[1].hex}", "operation": "sum", "name": "total"}
                ],
            },
        ),
        ("kpi", {"title": "Total revenue", "value_column_id": f"agg_{ids[4].hex}_0"}),
    ]
    graph = {
        "name": "Sales",
        "expected_revision": 1,
        "nodes": [
            {
                "id": str(identity),
                "type": kind,
                "version": 1,
                "position": {"x": index * 100, "y": 0},
                "config": config,
            }
            for index, (identity, (kind, config)) in enumerate(zip(ids, definitions, strict=True))
        ],
        "edges": [
            {
                "id": str(uuid.uuid4()),
                "source_node_id": str(ids[source]),
                "source_port": "dataset",
                "target_node_id": str(ids[target]),
                "target_port": "input",
            }
            for source, target in [(0, 1), (1, 2), (2, 3), (1, 4), (4, 5)]
        ],
    }
    response = client.put(f"/api/v1/workflows/{workflow['id']}", json=graph)
    assert response.status_code == 200, response.text
    return response.json()


def test_chart_kpi_dashboard_persistence_and_atomic_conflicts(
    db_engine: Engine, tmp_path: Path
) -> None:
    project_id = uuid.uuid4()
    with Session(db_engine) as session:
        session.add(Project(id=project_id, name="Sales Analysis"))
        session.commit()
    client = client_for(db_engine, tmp_path)
    try:
        graph = analytical_graph(client, project_id)
        charts = client.get(f"/api/v1/projects/{project_id}/visualizations").json()["items"]
        bar = next(v for v in charts if v["type"] == "bar_chart")
        kpi = next(v for v in charts if v["type"] == "kpi")
        result = client.get(f"/api/v1/visualizations/{bar['id']}/result")
        assert result.status_code == 200, result.text
        assert result.json()["rows"] == [
            {"category": "A", "total": 50.0},
            {"category": "B", "total": 10.0},
        ]
        assert client.get(f"/api/v1/visualizations/{kpi['id']}/result").json()["rows"] == [
            {"total": 60.0}
        ]
        chart_node = next(node for node in graph["nodes"] if node["id"] == bar["node_id"])
        chart_node["config"]["orientation"] = "horizontal"
        chart_node["config"]["column_formats"] = {
            chart_node["config"]["value_column_id"]: {
                "number_format": "percent",
                "decimals": 1,
                "currency": "USD",
            }
        }
        graph["expected_revision"] = graph["revision"]
        updated = client.put(f"/api/v1/workflows/{graph['id']}", json=graph)
        assert updated.status_code == 200, updated.text
        graph = updated.json()
        formatted = client.get(f"/api/v1/visualizations/{bar['id']}/result").json()
        assert formatted["orientation"] == "horizontal"
        assert formatted["column_formats"] == chart_node["config"]["column_formats"]
        assert formatted["rows"] == result.json()["rows"]
        dashboard = client.post(
            f"/api/v1/projects/{project_id}/dashboards", json={"name": "Sales"}
        ).json()
        payload = {
            "name": "Revenue dashboard",
            "expected_revision": 1,
            "widgets": [
                {
                    "id": str(uuid.uuid4()),
                    "visualization_id": bar["id"],
                    "x": 0,
                    "y": 0,
                    "width": 6,
                    "height": 8,
                },
                {
                    "id": str(uuid.uuid4()),
                    "visualization_id": kpi["id"],
                    "x": 6,
                    "y": 0,
                    "width": 6,
                    "height": 8,
                },
            ],
        }
        saved = client.put(f"/api/v1/dashboards/{dashboard['id']}", json=payload)
        assert saved.status_code == 200, saved.text
        assert saved.json()["revision"] == 2
        assert client.get(f"/api/v1/dashboards/{dashboard['id']}").json() == saved.json()
        assert client.put(f"/api/v1/dashboards/{dashboard['id']}", json=payload).status_code == 409
        assert client.get(f"/api/v1/dashboards/{dashboard['id']}").json() == saved.json()
        second = client.post(
            f"/api/v1/projects/{project_id}/dashboards", json={"name": "Second"}
        ).json()
        assert client.put(f"/api/v1/dashboards/{second['id']}", json=payload).status_code == 422
        assert client.get(f"/api/v1/dashboards/{second['id']}").json()["widgets"] == []
        # Deleting the chart node removes its index/widget, while the KPI stays usable.
        graph["nodes"] = [n for n in graph["nodes"] if n["id"] != bar["node_id"]]
        graph["edges"] = [e for e in graph["edges"] if e["target_node_id"] != bar["node_id"]]
        graph["expected_revision"] = graph["revision"]
        assert client.put(f"/api/v1/workflows/{graph['id']}", json=graph).status_code == 200
        assert client.get(f"/api/v1/visualizations/{bar['id']}/result").status_code == 404
        remaining = client.get(f"/api/v1/dashboards/{dashboard['id']}").json()["widgets"]
        assert len(remaining) == 1 and remaining[0]["visualization_id"] == kpi["id"]
        assert client.get(f"/api/v1/visualizations/{kpi['id']}/result").status_code == 200
        with Session(db_engine) as session:
            assert session.get(Visualization, uuid.UUID(kpi["id"])).config == {}
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize(
    "kind", ["table", "line_chart", "area_chart", "pie_chart", "donut_chart", "scatter_chart"]
)
def test_all_chart_types_use_node_config_and_table_pagination(
    db_engine: Engine, tmp_path: Path, kind: str
) -> None:
    project_id = uuid.uuid4()
    with Session(db_engine) as session:
        session.add(Project(id=project_id, name="Charts"))
        session.commit()
    client = client_for(db_engine, tmp_path)
    try:
        graph = analytical_graph(client, project_id)
        chart = next(n for n in graph["nodes"] if n["type"] == "bar_chart")
        chart["type"] = kind
        if kind == "scatter_chart":
            chart["config"]["category_column_id"] = chart["config"]["value_column_id"]
        if kind == "table":
            chart["config"] = {"title": "Paged table"}
        graph["expected_revision"] = graph["revision"]
        saved = client.put(f"/api/v1/workflows/{graph['id']}", json=graph)
        assert saved.status_code == 200, saved.text
        result = client.get(f"/api/v1/visualizations/{chart['id']}/result?offset=1&limit=1")
        assert result.status_code == 200, result.text
        data = result.json()
        assert data["type"] == kind
        assert data["revision"] == saved.json()["revision"]
        assert data["total_rows"] == 2
        if kind == "table":
            assert data["rows"] == [{"category": "B", "total": 10.0}]
            assert data["offset"] == 1 and data["limit"] == 1
        else:
            # Pagination cannot truncate a chart's analytical series.
            assert len(data["rows"]) == 2 and data["offset"] == 0
        assert not data["truncated"]
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize(
    ("kind", "rows", "message"), [("kpi", 2, "exactly one row"), ("bar_chart", 2001, "2000 points")]
)
def test_visualizations_reject_ambiguous_totals_and_silent_truncation(
    kind: str, rows: int, message: str
) -> None:
    schema = DatasetSchema((ColumnSchema("value", "value", "Value", LogicalType.INTEGER, False),))
    data = Dataset(pl.DataFrame({"value": range(rows)}), schema)
    node = NodeInstance(
        uuid.uuid4(),
        kind,
        1,
        Position(0, 0),
        {"value_column_id": "value", "category_column_id": "value"},
    )
    with pytest.raises(NodeExecutionError, match=message):
        VisualizationExecutor().execute(
            node, {"input": data}, ExecutionContext(uuid.uuid4(), uuid.uuid4(), uuid.uuid4())
        )


@pytest.mark.parametrize("invalid", [float("inf"), float("nan")])
def test_scatter_rejects_nonfinite_x(invalid: float) -> None:
    schema = DatasetSchema(
        tuple(ColumnSchema(name, name, name, LogicalType.FLOAT, False) for name in ("x", "y"))
    )
    data = Dataset(pl.DataFrame({"x": [invalid], "y": [1.0]}), schema)
    node = NodeInstance(
        uuid.uuid4(),
        "scatter_chart",
        1,
        Position(0, 0),
        {"value_column_id": "y", "category_column_id": "x"},
    )
    with pytest.raises(NodeExecutionError, match="Scatter X values"):
        VisualizationExecutor().execute(
            node, {"input": data}, ExecutionContext(uuid.uuid4(), uuid.uuid4(), uuid.uuid4())
        )


@pytest.mark.parametrize(
    "kind",
    ["bar_chart", "line_chart", "area_chart", "scatter_chart", "pie_chart", "donut_chart", "table"],
)
def test_charts_preserve_empty_and_nullable_inputs(kind: str) -> None:
    schema = DatasetSchema((ColumnSchema("value", "value", "Value", LogicalType.FLOAT, True),))
    node = NodeInstance(
        uuid.uuid4(),
        kind,
        1,
        Position(0, 0),
        {"value_column_id": "value", "category_column_id": "value"},
    )
    context = ExecutionContext(uuid.uuid4(), uuid.uuid4(), uuid.uuid4())
    for values in ([], [1.0, None]):
        data = Dataset(pl.DataFrame({"value": pl.Series(values, dtype=pl.Float64)}), schema)
        result = VisualizationExecutor().execute(node, {"input": data}, context)
        assert result.frame.to_dicts() == data.frame.to_dicts()


@pytest.mark.parametrize("kind", ["bar_chart", "pie_chart", "donut_chart"])
def test_negative_values_are_explicitly_supported_or_rejected(kind: str) -> None:
    schema = DatasetSchema((ColumnSchema("value", "value", "Value", LogicalType.FLOAT, False),))
    data = Dataset(pl.DataFrame({"value": [-1.0]}), schema)
    node = NodeInstance(
        uuid.uuid4(),
        kind,
        1,
        Position(0, 0),
        {"value_column_id": "value", "category_column_id": "value"},
    )
    context = ExecutionContext(uuid.uuid4(), uuid.uuid4(), uuid.uuid4())
    if kind == "bar_chart":
        assert (
            VisualizationExecutor().execute(node, {"input": data}, context).frame["value"][0] == -1
        )
    else:
        with pytest.raises(NodeExecutionError, match="non-negative"):
            VisualizationExecutor().execute(node, {"input": data}, context)


def test_invalid_chart_field_remains_editable_and_reports_node(
    db_engine: Engine, tmp_path: Path
) -> None:
    project_id = uuid.uuid4()
    with Session(db_engine) as session:
        session.add(Project(id=project_id, name="Chart validation"))
        session.commit()
    client = client_for(db_engine, tmp_path)
    try:
        graph = analytical_graph(client, project_id)
        chart = next(n for n in graph["nodes"] if n["type"] == "bar_chart")
        chart["config"]["value_column_id"] = "removed_field"
        graph["expected_revision"] = graph["revision"]
        assert client.put(f"/api/v1/workflows/{graph['id']}", json=graph).status_code == 200
        result = client.get(f"/api/v1/visualizations/{chart['id']}/result")
        assert result.status_code == 422
        assert any(issue["node_id"] == chart["id"] for issue in result.json()["detail"]["issues"])
        chart["config"]["number_format"] = "arbitrary_formatter"
        graph["expected_revision"] += 1
        assert client.put(f"/api/v1/workflows/{graph['id']}", json=graph).status_code == 200
        result = client.get(f"/api/v1/visualizations/{chart['id']}/result")
        assert result.status_code == 422
        assert "number_format" in result.text
    finally:
        app.dependency_overrides.clear()
