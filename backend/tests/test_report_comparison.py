import copy
import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Workflow
from tests.test_report_editing import save_workflow
from tests.test_sources_api import create_project, make_client


def example(db_engine, tmp_path):
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}"
    source = client.post(
        f"{root}/imports",
        data={"connector": "csv"},
        files={
            "file": (
                "periods.csv",
                b"date,actual,plan\n2026-01-10,1.00,1.00\n2026-01-20,9.00,3.00\n2026-02-15,15.00,5.00\n2026-04-01,20.00,5.00\n",
            )
        },
    ).json()
    profile = client.post(
        f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": "table"}
    ).json()["profile"]
    profile["fields"][0]["logical_type"] = "date"
    snapshot = client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={
            "profile": profile,
            "expected_revision": 1,
            "request_id": str(uuid.uuid4()),
        },
    )
    assert snapshot.status_code == 200, snapshot.text
    date_id, actual, plan = [f["field_id"] for f in profile["fields"]]
    actual_id, plan_id, formula_id = [uuid.uuid4() for _ in range(3)]
    body = {
        "request_id": str(uuid.uuid4()),
        "source_id": source["id"],
        "resource_id": "table",
        "expected_snapshot_id": snapshot.json()["id"],
        "name": "Monthly attainment",
        "dimensions": [date_id],
        "measures": [
            {
                "output_id": str(actual_id),
                "column_id": actual,
                "operation": "sum",
                "name": "Actual",
            },
            {"output_id": str(plan_id), "column_id": plan, "operation": "sum", "name": "Plan"},
        ],
        "summary_formulas": [
            {
                "node_id": str(formula_id),
                "name": "Attainment",
                "expression": f"[measure_{actual_id.hex}] / [measure_{plan_id.hex}]",
                "scale": 4,
            }
        ],
        "comparison": {
            "date_column_id": date_id,
            "value_column_id": f"calc_{formula_id.hex}",
            "unit": "month",
            "name": "Change",
        },
    }
    return client, root, body


def test_wizard_comparison_uses_ratio_of_totals_and_ordinary_nodes(db_engine, tmp_path):
    client, root, body = example(db_engine, tmp_path)
    preview = client.post(f"{root}/report-builder/preview", json=body)
    assert preview.status_code == 200, preview.text
    rows = preview.json()["rows"]
    assert [r["Attainment"] for r in rows] == ["2.5000", "3.0000", "4.0000"]
    assert [r["Change · previous"] for r in rows] == [None, "2.5000", None]
    assert rows[1]["Change · difference"] == "0.5000"
    assert rows[1]["Change · change %"] == "20.000000"
    assert [n["type"] for n in preview.json()["graph"]["nodes"]] == [
        "dataset_source",
        "calendar_period",
        "group_by",
        "calculated_column",
        "period_comparison",
    ]
    with Session(db_engine) as session:
        assert not list(session.scalars(select(Workflow)))
    saved = client.post(f"{root}/report-builder/apply", json=body)
    assert saved.status_code == 200, saved.text
    assert client.post(f"{root}/report-builder/apply", json=body).json() == saved.json()
    ids = saved.json()
    result = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert result.json()["rows"] == rows
    assert client.get(f"{root}/report-builder/{ids['visualization_id']}").json()["editable"]
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    next(n for n in graph["nodes"] if n["type"] == "period_comparison")["config"]["compare_to"] = (
        "previous_year"
    )
    save_workflow(client, graph)
    result = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert all(r["Change · previous"] is None for r in result.json()["rows"])


def test_filters_apply_to_raw_dates_and_can_remove_the_baseline(db_engine, tmp_path):
    client, root, body = example(db_engine, tmp_path)
    body["filters"] = [
        {"column_id": body["dimensions"][0], "operator": "greater_or_equal", "value": "2026-02-10"}
    ]
    result = client.post(f"{root}/report-builder/preview", json=body)
    assert result.status_code == 200, result.text
    assert len(result.json()["rows"]) == 2
    assert all(not r["Change · baseline exists"] for r in result.json()["rows"])


def test_invalid_comparison_is_not_partially_saved(db_engine, tmp_path):
    client, root, body = example(db_engine, tmp_path)
    for patch in (
        {"presentation": "kpi"},
        {"dimensions": []},
        {"comparison": {**body["comparison"], "value_column_id": "deleted"}},
    ):
        response = client.post(
            f"{root}/report-builder/apply", json={**copy.deepcopy(body), **patch}
        )
        assert response.status_code == 422, response.text
    with Session(db_engine) as session:
        assert not list(session.scalars(select(Workflow)))


@pytest.mark.parametrize("presentation", ["table", "bar_chart", "line_chart"])
def test_comparison_release_restores_dynamic_field_ids_and_results(
    db_engine, tmp_path, presentation
):
    client, root, body = example(db_engine, tmp_path)
    body["presentation"] = presentation
    created = client.post(f"{root}/report-builder/apply", json=body)
    assert created.status_code == 200, created.text
    ids = created.json()
    before = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={}).json()
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Compared",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release = client.get(f"{root}/releases").json()[0]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored comparison"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    result = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert result.status_code == 200, result.text
    assert result.json()["rows"] == before["rows"]
    assert result.json().get("additional_series") == before.get("additional_series")
