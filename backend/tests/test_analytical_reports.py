import copy
import hashlib
import json
import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Dashboard, ReportDocument, Visualization, Workflow
from tests.test_report_editing import save_workflow
from tests.test_statistical_reports import imported


def example(db_engine, tmp_path, kind, content=None):
    client, root, request, profile = imported(
        db_engine,
        tmp_path,
        content=content
        or (
            b"region,value,period,plan\nA,10.00,Jan,5.00\nA,20.00,Jan,15.00\n"
            b"A,0.00,Feb,0.00\nB,,Jan,10.00\n"
        ),
    )
    x, value, y, plan = [f["field_id"] for f in profile["fields"]]
    if kind == "heatmap_stats":
        request["analysis"] = {
            "type": kind,
            "x_column_id": x,
            "y_column_id": y,
            "value_column_id": value,
            "aggregation": "sum",
        }
    else:
        request["analysis"] = {
            "type": kind,
            "dimensions": [x, y],
            "measures": [
                {
                    "output_id": str(uuid.uuid4()),
                    "name": "Revenue",
                    "operation": "sum",
                    "column_id": value,
                },
                {
                    "output_id": str(uuid.uuid4()),
                    "name": "Mean",
                    "operation": "average",
                    "column_id": value,
                },
                {
                    "output_id": str(uuid.uuid4()),
                    "name": "Attainment",
                    "operation": "ratio_of_sums",
                    "column_id": value,
                    "denominator_column_id": plan,
                },
            ],
        }
    return client, root, request, profile


def business_rows(result):
    # Restored graphs intentionally remap technical field/row/measure identities.
    fields = {
        c["engine_name"]: c["display_name"]
        for c in result["columns"]
        if not c["engine_name"].endswith("_id")
    }
    return [{fields[k]: v for k, v in row.items() if k in fields} for row in result["rows"]]


@pytest.mark.parametrize("kind", ["heatmap_stats", "table_rollup"])
def test_prepared_analytical_report_preserves_graph_and_checks_revision(db_engine, tmp_path, kind):
    client, root, request, profile = example(db_engine, tmp_path, kind)
    base = {k: v for k, v in request.items() if k not in {"analysis", "request_id"}}
    base.update(
        request_id=str(uuid.uuid4()),
        dimensions=[profile["fields"][i]["field_id"] for i in [0, 2]],
        measures=[
            {
                "name": "Revenue",
                "operation": "sum",
                "column_id": profile["fields"][1]["field_id"],
            }
        ],
    )
    saved = client.post(f"{root}/report-builder/apply", json=base)
    assert saved.status_code == 200, saved.text
    ids = saved.json()
    path = f"{root}/report-builder/inputs/{ids['workflow_id']}/{ids['publication_id']}"
    detail = client.get(path).json()
    fields = {c["display_name"]: c["column_id"] for c in detail["columns"]}
    request = {
        "request_id": request["request_id"],
        "name": "Prepared analysis",
        "published_input": {
            k: detail[k] for k in ("workflow_id", "publication_id", "expected_token")
        },
        "analysis": {
            "type": kind,
            "x_column_id": fields["region"],
            "y_column_id": fields["period"],
            "value_column_id": fields["Revenue"],
            "aggregation": "sum",
        }
        if kind == "heatmap_stats"
        else {
            "type": kind,
            "dimensions": [fields["region"]],
            "measures": [
                {
                    "output_id": str(uuid.uuid4()),
                    "name": "Total",
                    "operation": "sum",
                    "column_id": fields["Revenue"],
                }
            ],
        },
    }
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    visual_url = f"/api/v1/visualizations/{ids['visualization_id']}"
    before, old_visual = client.get(graph_url).json(), client.get(visual_url).json()
    preview = client.post(f"{root}/statistical-reports/preview", json=request)
    assert preview.status_code == 200, preview.text
    assert client.get(graph_url).json() == before
    before["name"] = "Changed in another tab"
    before = save_workflow(client, before)
    assert client.post(f"{root}/statistical-reports/apply", json=request).status_code == 409
    request["published_input"]["expected_token"] = client.get(path).json()["expected_token"]
    applied = client.post(f"{root}/statistical-reports/apply", json=request)
    assert applied.status_code == 200, applied.text
    assert applied.json()["workflow_id"] == ids["workflow_id"]
    after = client.get(graph_url).json()
    assert after["nodes"][:-1] == before["nodes"]
    assert after["edges"][:-1] == before["edges"]
    assert after["result_catalog"]["outputs"][:-1] == before["result_catalog"]["outputs"]
    assert client.get(visual_url).json() == old_visual
    assert client.post(f"{root}/statistical-reports/apply", json=request).json() == applied.json()
    assert client.get(graph_url).json() == after


@pytest.mark.parametrize("kind", ["heatmap_stats", "table_rollup"])
def test_guided_analytical_preview_save_freeze_restore(db_engine, tmp_path, kind):
    client, root, request, _ = example(db_engine, tmp_path, kind)
    preview = client.post(f"{root}/statistical-reports/preview", json=request)
    assert preview.status_code == 200, preview.text
    data = preview.json()["result"]
    assert preview.json()["steps"] == ["dataset_source", kind]
    if kind == "heatmap_stats":
        cells = {(r["x"], r["y"]): r for r in data["rows"]}
        assert cells["A", "Jan"]["value"] == "30.00"
        assert cells["A", "Jan"]["row_count"] == 2
        assert cells["A", "Feb"]["value"] == "0.00"
        assert cells["B", "Jan"]["present"] and cells["B", "Jan"]["value"] is None
        assert not cells["B", "Feb"]["present"] and cells["B", "Feb"]["value"] is None
    else:
        kind_field = next(
            c["engine_name"]
            for c in data["columns"]
            if c["column_id"] == data["spec"]["rows"]["kind"]
        )
        grand = next(r for r in data["rows"] if r[kind_field] == "grand_total")
        fields = {c["display_name"]: c["engine_name"] for c in data["columns"]}
        assert grand[fields["Revenue"]] == "30.00"
        assert grand[fields["Mean"]] == "10.000000"  # Not the mean of subgroup means (7.5).
        assert grand[fields["Attainment"]] == "1.000000"  # Independent sums: 30 / 30.
        assert grand["source_count"] == 4
        assert data["spec"]["pinned_columns"] == 1
    with Session(db_engine) as session:
        assert not list(session.scalars(select(Workflow)))
        assert not list(session.scalars(select(ReportDocument)))
    saved = client.post(f"{root}/statistical-reports/apply", json=request)
    assert saved.status_code == 200, saved.text
    ids = saved.json()
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    assert client.post(f"{root}/statistical-reports/apply", json=request).json() == ids
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == graph
    live = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert live.status_code == 200, live.text
    assert live.json()["rows"] == data["rows"]
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    release = client.post(
        f"{root}/releases",
        json={
            "name": "Analytics",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert release.status_code == 200, release.text
    release_id = client.get(f"{root}/releases").json()[0]["id"]
    restored = client.post(
        f"/api/v1/releases/{release_id}/restore", json={"name": "Restored analytics"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    restored_result = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert restored_result.status_code == 200, restored_result.text
    assert business_rows(restored_result.json()) == business_rows(data)
    with Session(db_engine) as session:
        assert len(list(session.scalars(select(Visualization)))) == 2
        assert len(list(session.scalars(select(Dashboard)))) == 2


def test_rollup_page_has_global_totals_and_compatible_offset_alias(db_engine, tmp_path):
    content = (
        "region,value,period,plan\n" + "".join(f"A{i},1.00,Jan,2.00\n" for i in range(150))
    ).encode()
    client, root, request, _ = example(db_engine, tmp_path, "table_rollup", content)
    request["analysis"]["dimensions"] = request["analysis"]["dimensions"][:1]
    first = client.post(f"{root}/statistical-reports/preview", json=request)
    assert first.status_code == 200, first.text
    assert first.json()["result"]["total_rows"] == 151
    assert len(first.json()["result"]["rows"]) == 100
    second = client.post(f"{root}/statistical-reports/preview?offset=100", json=request)
    assert second.status_code == 200, second.text
    result = second.json()["result"]
    assert len(result["rows"]) == 51 and result["offset"] == 100
    grand = business_rows(result)[-1]
    assert grand["Revenue"] == "150.00" and grand["Attainment"] == "0.500000"
    alias = client.post(f"{root}/statistical-reports/preview?outlier_offset=100", json=request)
    assert alias.json()["result"] == result
    for query in ["offset=-1", f"offset={10**40}", "offset=100&outlier_offset=200"]:
        assert (
            client.post(f"{root}/statistical-reports/preview?{query}", json=request).status_code
            == 422
        )


@pytest.mark.parametrize("kind", ["heatmap_stats", "table_rollup"])
def test_analytical_filters_change_population_before_aggregation(db_engine, tmp_path, kind):
    client, root, request, profile = example(db_engine, tmp_path, kind)
    request["filters"] = [
        {"column_id": profile["fields"][0]["field_id"], "operator": "equals", "value": "A"}
    ]
    result = client.post(f"{root}/statistical-reports/preview", json=request)
    assert result.status_code == 200, result.text
    assert result.json()["steps"] == ["dataset_source", "filter", kind]
    if kind == "heatmap_stats":
        assert len(result.json()["result"]["rows"]) == 2
        assert all(r["x"] == "A" for r in result.json()["result"]["rows"])
    else:
        grand = business_rows(result.json()["result"])[-1]
        assert grand["Attainment"] == "1.500000"  # B's denominator excluded before summing.


@pytest.mark.parametrize(
    "invalid", ["aggregation", "same_axes", "measure_id", "denominator", "no_measures"]
)
def test_invalid_analytical_settings_fail_without_writes(db_engine, tmp_path, invalid):
    kind = "heatmap_stats" if invalid in {"aggregation", "same_axes"} else "table_rollup"
    client, root, request, _ = example(db_engine, tmp_path, kind)
    a = request["analysis"]
    if invalid == "aggregation":
        del a["aggregation"]
    elif invalid == "same_axes":
        a["y_column_id"] = a["x_column_id"]
    elif invalid == "measure_id":
        a["measures"][1]["output_id"] = a["measures"][0]["output_id"]
    elif invalid == "denominator":
        del a["measures"][-1]["denominator_column_id"]
    else:
        a["measures"] = []
    response = client.post(f"{root}/statistical-reports/apply", json=request)
    assert response.status_code == 422, response.text
    with Session(db_engine) as session:
        assert not list(session.scalars(select(Workflow)))
        assert not list(session.scalars(select(ReportDocument)))


def test_previous_distribution_receipt_fingerprint_remains_unchanged(db_engine, tmp_path):
    client, root, request, _ = imported(db_engine, tmp_path)
    saved = client.post(f"{root}/statistical-reports/apply", json=request)
    assert saved.status_code == 200, saved.text
    # The exact ADR-146 normalized payload, independent of the newly extended request union.
    old_payload = {**copy.deepcopy(request), "published_input": None, "filters": []}
    expected = hashlib.sha256(json.dumps(old_payload, sort_keys=True).encode()).hexdigest()
    with Session(db_engine) as session:
        receipt = session.get(ReportDocument, uuid.UUID(request["request_id"]))
        assert receipt.payload["fingerprint"] == expected
    assert client.post(f"{root}/statistical-reports/apply", json=request).json() == saved.json()
