"""Guided R5 charts share graph execution, atomic receipts and release lifecycle."""

import copy
import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Dashboard, ReportDocument, Visualization, Workflow
from tests.test_report_editing import save_workflow
from tests.test_statistical_reports import imported

KINDS = ["pareto", "funnel_steps", "treemap_chart", "sunburst_chart"]


@pytest.mark.parametrize("kind", KINDS)
def test_prepared_branch_revision_and_preservation(db_engine, tmp_path, kind):
    client, root, request, profile = example(db_engine, tmp_path, kind)
    fields = [f["field_id"] for f in profile["fields"]]
    base = {k: v for k, v in request.items() if k not in {"analysis", "request_id"}}
    base.update(
        request_id=str(uuid.uuid4()),
        dimensions=[fields[i] for i in [0, 2, 3]],
        measures=[{"name": "Amount", "operation": "sum", "column_id": fields[1]}],
    )
    saved = client.post(f"{root}/report-builder/apply", json=base)
    assert saved.status_code == 200, saved.text
    ids = saved.json()
    input_url = f"{root}/report-builder/inputs/{ids['workflow_id']}/{ids['publication_id']}"
    detail = client.get(input_url).json()
    columns = {c["display_name"]: c["column_id"] for c in detail["columns"]}
    analysis = request["analysis"]
    if kind == "pareto":
        analysis.update(category_column_id=columns["stage"], value_column_id=columns["Amount"])
    elif kind == "funnel_steps":
        analysis.update(
            stage_column_id=columns["stage"],
            order_column_id=columns["order"],
            value_column_id=columns["Amount"],
        )
    else:
        analysis["dimensions"] = [columns["region"], columns["stage"]]
        analysis["measures"][0]["column_id"] = columns["Amount"]
    request = {
        "request_id": request["request_id"],
        "name": "Prepared",
        "analysis": analysis,
        "published_input": {
            k: detail[k] for k in ["workflow_id", "publication_id", "expected_token"]
        },
    }
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    before = client.get(graph_url).json()
    old_visual = client.get(f"/api/v1/visualizations/{ids['visualization_id']}").json()
    preview = client.post(f"{root}/statistical-reports/preview", json=request)
    assert preview.status_code == 200, preview.text
    assert client.get(graph_url).json() == before
    before["name"] = "Other tab"
    before = save_workflow(client, before)
    assert client.post(f"{root}/statistical-reports/apply", json=request).status_code == 409
    assert client.get(graph_url).json() == before
    request["published_input"]["expected_token"] = client.get(input_url).json()["expected_token"]
    applied = client.post(f"{root}/statistical-reports/apply", json=request)
    assert applied.status_code == 200, applied.text
    assert applied.json()["workflow_id"] == ids["workflow_id"]
    after = client.get(graph_url).json()
    assert after["nodes"][:-1] == before["nodes"]
    assert after["edges"][:-1] == before["edges"]
    assert after["result_catalog"]["outputs"][:-1] == before["result_catalog"]["outputs"]
    assert client.get(f"/api/v1/visualizations/{ids['visualization_id']}").json() == old_visual
    assert client.post(f"{root}/statistical-reports/apply", json=request).json() == applied.json()
    assert client.get(graph_url).json() == after


def example(db_engine, tmp_path, kind, content=None):
    client, root, request, profile = imported(
        db_engine,
        tmp_path,
        content=content
        or b"stage,value,order,region\nA,100.00,1,North\nB,60.00,2,North\nC,20.00,3,South\n",
    )
    stage, value, order, region = [f["field_id"] for f in profile["fields"]]
    if kind == "pareto":
        analysis = {"type": kind, "category_column_id": stage, "value_column_id": value}
    elif kind == "funnel_steps":
        analysis = {
            "type": kind,
            "stage_column_id": stage,
            "order_column_id": order,
            "value_column_id": value,
        }
    else:
        analysis = {
            "type": kind,
            "dimensions": [region, stage],
            "measures": [
                {
                    "output_id": str(uuid.uuid4()),
                    "name": "Amount",
                    "operation": "sum",
                    "column_id": value,
                }
            ],
            "subtotals": True,
            "grand_total": True,
        }
    request["analysis"] = analysis
    return client, root, request, profile


@pytest.mark.parametrize("kind", KINDS)
def test_guided_preview_apply_retry_and_release(db_engine, tmp_path, kind):
    client, root, request, _ = example(db_engine, tmp_path, kind)
    preview = client.post(f"{root}/statistical-reports/preview", json=request)
    assert preview.status_code == 200, preview.text
    data = preview.json()
    terminal = "table_rollup" if kind.endswith("_chart") else kind
    assert data["steps"] == ["dataset_source", terminal]
    with Session(db_engine) as session:
        for model in (Workflow, Visualization, Dashboard, ReportDocument):
            assert not list(session.scalars(select(model)))
    saved = client.post(f"{root}/statistical-reports/apply", json=request)
    assert saved.status_code == 200, saved.text
    ids = saved.json()
    assert client.post(f"{root}/statistical-reports/apply", json=request).json() == ids
    visual_url = f"/api/v1/visualizations/{ids['visualization_id']}"
    live = client.post(f"{visual_url}/result", json={})
    assert live.status_code == 200, live.text
    assert live.json()["datasets"] == data["result"]["datasets"]
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    assert [n["type"] for n in graph["nodes"]] == ["dataset_source", terminal]
    assert (
        client.post(
            f"{root}/statistical-reports/apply", json={**request, "name": "Changed"}
        ).status_code
        == 409
    )
    editing = client.get(f"{root}/statistical-reports/{ids['visualization_id']}")
    assert editing.status_code == 200, editing.text
    assert editing.json()["editable"], editing.text
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    freeze = client.post(
        f"{root}/releases",
        json={
            "name": "Frozen",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert freeze.status_code == 200, freeze.text
    release = client.get(f"{root}/releases").json()[0]
    restored = client.post(f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored"})
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    result = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert result.status_code == 200, result.text
    for name, dataset in live.json()["datasets"].items():

        def business(rows):
            return [{k: v for k, v in row.items() if not k.endswith("_id")} for row in rows]

        assert business(result.json()["datasets"][name]["rows"]) == business(dataset["rows"])


@pytest.mark.parametrize("kind", ["pareto", "funnel_steps"])
def test_duplicate_prepared_rows_do_not_silently_aggregate(db_engine, tmp_path, kind):
    client, root, request, _ = example(
        db_engine, tmp_path, kind, b"stage,value,order,region\nA,100,1,North\nA,60,2,North\n"
    )
    for action in ["preview", "apply"]:
        response = client.post(f"{root}/statistical-reports/{action}", json=request)
        assert response.status_code == 422, response.text
    assert client.get(f"{root}/workflows").json()["items"] == []
    assert client.get(f"{root}/visualizations").json()["items"] == []


@pytest.mark.parametrize("invalid", ["average", "no_totals", "no_dimensions", "two_measures"])
def test_hierarchy_requires_additive_complete_rollup(db_engine, tmp_path, invalid):
    client, root, request, _ = example(db_engine, tmp_path, "treemap_chart")
    analysis = request["analysis"]
    if invalid == "average":
        analysis["measures"][0]["operation"] = "average"
    elif invalid == "no_totals":
        analysis["subtotals"] = False
    elif invalid == "no_dimensions":
        analysis["dimensions"] = []
    else:
        measure = copy.deepcopy(analysis["measures"][0])
        measure.update(output_id=str(uuid.uuid4()), name="Another")
        analysis["measures"].append(measure)
    assert client.post(f"{root}/statistical-reports/apply", json=request).status_code == 422
    assert client.get(f"{root}/workflows").json()["items"] == []
