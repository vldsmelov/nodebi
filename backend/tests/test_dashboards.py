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
