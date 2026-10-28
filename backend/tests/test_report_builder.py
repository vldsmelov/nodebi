import uuid
from decimal import Decimal
from pathlib import Path

import polars as pl
import pytest
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.workflows import NodeInstance, Position
from app.models import Dashboard, ReportDocument, Visualization, Workflow
from app.nodes.exact_group_by import ExactGroupByExecutor
from tests.test_sources_api import create_project, make_client


def test_decimal_aggregate_does_not_round_through_float() -> None:
    source = Dataset(
        pl.DataFrame({"amount": [Decimal("9007199254740993.11"), Decimal("0.01")]}),
        DatasetSchema(
            (ColumnSchema("amount", "amount", "Amount", LogicalType.DECIMAL, False, {"scale": 2}),)
        ),
    )
    node = NodeInstance(
        uuid.uuid4(),
        "group_by",
        2,
        Position(0, 0),
        {
            "dimensions": [],
            "aggregations": [
                {"column_id": "amount", "operation": "sum", "name": "Total"},
                {"column_id": "amount", "operation": "average", "name": "Mean"},
            ],
        },
    )
    context = ExecutionContext(uuid.uuid4(), uuid.uuid4(), uuid.uuid4())
    result = ExactGroupByExecutor().execute(node, {"input": source}, context)
    assert result.frame["Total"][0] == Decimal("9007199254740993.12")
    assert result.frame["Mean"][0] == Decimal("4503599627370496.560000")


@pytest.mark.parametrize("presentation", ["table", "bar_chart", "kpi"])
def test_builder_preview_apply_retry_and_real_visualization(
    db_engine: Engine, tmp_path: Path, presentation: str
) -> None:
    project_id = create_project(db_engine)
    client = make_client(db_engine, tmp_path)
    source = client.post(
        f"/api/v1/projects/{project_id}/imports",
        data={"connector": "csv"},
        files={"file": ("sales.csv", b"category,amount\nA,0.10\nA,0.20\nB,0.50\n")},
    ).json()
    profile = client.post(
        f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": "table"}
    ).json()["profile"]
    applied = client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={"profile": profile, "request_id": str(uuid.uuid4()), "expected_revision": 1},
    ).json()
    request = {
        "request_id": str(uuid.uuid4()),
        "source_id": source["id"],
        "resource_id": "table",
        "expected_snapshot_id": applied["id"],
        "name": "Revenue",
        "dimensions": [] if presentation == "kpi" else [profile["fields"][0]["field_id"]],
        "measures": [
            {"column_id": profile["fields"][1]["field_id"], "operation": "sum", "name": "Revenue"}
        ],
        "presentation": presentation,
    }
    endpoint = f"/api/v1/projects/{project_id}/report-builder"
    preview = client.post(f"{endpoint}/preview", json=request)
    assert preview.status_code == 200, preview.text
    assert preview.json()["rows"][0]["Revenue"] == ("0.80" if presentation == "kpi" else "0.30")
    with Session(db_engine) as session:
        assert not list(session.scalars(select(Workflow)))
        assert not list(session.scalars(select(ReportDocument)))
    saved = client.post(f"{endpoint}/apply", json=request)
    assert saved.status_code == 200, saved.text
    assert client.post(f"{endpoint}/apply", json=request).json() == saved.json()
    ids = saved.json()
    rendered = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert rendered.status_code == 200, rendered.text
    assert rendered.json()["rows"][0]["Revenue"] == ("0.80" if presentation == "kpi" else "0.30")
    if presentation == "table":
        client.post(f"/api/v1/projects/{project_id}/checks")
        checked = client.get(f"/api/v1/projects/{project_id}/report-jobs").json()[0]
        assert checked["status"] == "succeeded", checked
        release_request = client.post(
            f"/api/v1/projects/{project_id}/releases",
            json={
                "name": "Frozen",
                "period": "October",
                "dashboard_ids": [ids["dashboard_id"]],
                "expected_token": checked["check"]["token"],
            },
        )
        assert release_request.status_code == 200, release_request.text
        release = client.get(f"/api/v1/projects/{project_id}/releases").json()[0]
        restored = client.post(
            f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored universal data"}
        )
        assert restored.status_code == 200, restored.text
        restored_id = restored.json()["id"]
        restored_visual = client.get(f"/api/v1/projects/{restored_id}/visualizations").json()[
            "items"
        ][0]
        restored_result = client.post(
            f"/api/v1/visualizations/{restored_visual['id']}/result", json={}
        )
        assert restored_result.status_code == 200, restored_result.text
        assert restored_result.json()["rows"] == rendered.json()["rows"]
        assert client.delete(f"/api/v1/projects/{restored_id}?confirm=true").status_code == 204
    request["name"] = "Changed"
    assert client.post(f"{endpoint}/apply", json=request).status_code == 409
    with Session(db_engine) as session:
        assert len(list(session.scalars(select(Workflow)))) == 1
        assert len(list(session.scalars(select(Visualization)))) == 1
        assert len(list(session.scalars(select(Dashboard)))) == 1
