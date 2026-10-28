from copy import deepcopy
from uuid import uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Workflow
from tests.test_sources_api import create_project, make_client


def example(
    db_engine,
    tmp_path,
    rows=b"month,actual,plan\nJan,0.10,0.20\nJan,0.20,0.30\nFeb,9007199254740993.12,9007199254740993.11\n",
):
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path, max_bytes=max(1_000_000, len(rows)))
    uploaded = client.post(
        f"/api/v1/projects/{project}/imports",
        data={"connector": "csv"},
        files={"file": ("plan.csv", rows)},
    )
    assert uploaded.status_code == 201, uploaded.text
    source = uploaded.json()
    profile = client.post(
        f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": "table"}
    ).json()["profile"]
    for field in profile["fields"][1:]:
        field.update(logical_type="decimal", precision=38, scale=2, currency="RUB")
    applied = client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={"profile": profile, "expected_revision": 1, "request_id": str(uuid4())},
    )
    assert applied.status_code == 200, applied.text
    ids = [str(uuid4()), str(uuid4())]
    measure_ids = ["measure_" + identity.replace("-", "") for identity in ids]
    request = {
        "request_id": str(uuid4()),
        "name": "Plan and actual",
        "source_id": source["id"],
        "resource_id": "table",
        "expected_snapshot_id": applied.json()["id"],
        "dimensions": [profile["fields"][0]["field_id"]],
        "measures": [
            {
                "column_id": profile["fields"][i + 1]["field_id"],
                "name": name,
                "operation": "sum",
                "output_id": ids[i],
            }
            for i, name in enumerate(["Actual", "Plan"])
        ],
        "presentation": "combo_chart",
        "combo": {
            "type": "combo_chart",
            "category_column_id": profile["fields"][0]["field_id"],
            "series": [
                {"column_id": measure_ids[0], "kind": "bar", "name": "Actual bars"},
                {"column_id": measure_ids[1], "kind": "line", "name": "Plan line"},
            ],
        },
    }
    return client, project, request


def test_combo_preview_apply_retry_edit_preserves_graph_and_appearance(db_engine, tmp_path):
    client, project, request = example(db_engine, tmp_path)
    endpoint = f"/api/v1/projects/{project}/report-builder"
    preview = client.post(endpoint + "/preview", json=request)
    assert preview.status_code == 200, preview.text
    page = preview.json()
    assert page["rows"][0]["Actual"] == "0.30"
    assert page["rows"][1]["Actual"] == "9007199254740993.12"
    assert page["visualization"]["type"] == "combo_chart"
    assert page["visualization"]["datasets"]["observations"]["total_rows"] == 2
    assert [n["type"] for n in page["graph"]["nodes"]] == ["dataset_source", "group_by"]
    with Session(db_engine) as session:
        assert session.scalar(select(func.count()).select_from(Workflow)) == 0
    applied = client.post(endpoint + "/apply", json=request)
    assert applied.status_code == 200, applied.text
    ids = applied.json()
    assert client.post(endpoint + "/apply", json=request).json() == ids
    changed = deepcopy(request)
    changed["combo"]["series"][0]["name"] = "Different retry"
    assert client.post(endpoint + "/apply", json=changed).status_code == 409
    visual_url = f"/api/v1/visualizations/{ids['visualization_id']}"
    actual = client.post(visual_url + "/result", json={})
    assert actual.status_code == 200, actual.text
    assert actual.json()["rows"] == page["rows"]
    edit_url = endpoint + "/" + ids["visualization_id"]
    read = client.get(edit_url).json()
    assert read["editable"], read
    assert read["settings"]["combo"] == actual.json()["spec"]
    edit = {
        "request_id": str(uuid4()),
        "expected_token": read["expected_token"],
        "settings": read["settings"],
    }
    edit["settings"]["measures"][0]["operation"] = "average"
    edit["settings"]["decimal_average_scale"] = 2
    result = client.post(edit_url + "/preview", json=edit)
    assert result.status_code == 200, result.text
    assert result.json()["rows"][0]["Actual"] == "0.15"
    assert client.post(edit_url + "/apply", json=edit).status_code == 200
    assert client.post(edit_url + "/apply", json=edit).status_code == 200
    assert client.get(visual_url).json()["config"]["spec"] == actual.json()["spec"]
    stale = {**edit, "request_id": str(uuid4())}
    assert client.post(edit_url + "/apply", json=stale).status_code == 409
    read = client.get(edit_url).json()
    edit = {
        "request_id": str(uuid4()),
        "expected_token": read["expected_token"],
        "settings": read["settings"],
    }
    edit["settings"]["combo"]["series"][0]["kind"] = "line"
    edit["settings"]["combo"]["series"][1]["kind"] = "bar"
    assert client.post(edit_url + "/preview", json=edit).status_code == 422
    edit["settings"]["rebind_fields"] = True
    assert client.post(edit_url + "/apply", json=edit).status_code == 200
    assert client.get(visual_url).json()["config"]["spec"] == edit["settings"]["combo"]


@pytest.mark.parametrize(
    "mutation", ["two_dimensions", "missing_field", "all_bars", "implicit_axis", "missing_combo"]
)
def test_invalid_combo_reports_do_not_save(db_engine, tmp_path, mutation):
    client, project, request = example(db_engine, tmp_path)
    if mutation == "two_dimensions":
        request["dimensions"].append(request["measures"][0]["column_id"])
    elif mutation == "missing_field":
        request["combo"]["series"][0]["column_id"] = "unavailable"
    elif mutation == "all_bars":
        request["combo"]["series"][1]["kind"] = "bar"
    elif mutation == "implicit_axis":
        request["combo"]["series"][1]["axis"] = "secondary"
    else:
        del request["combo"]
    response = client.post(f"/api/v1/projects/{project}/report-builder/apply", json=request)
    assert response.status_code == 422, response.text
    with Session(db_engine) as session:
        assert session.scalar(select(func.count()).select_from(Workflow)) == 0


def test_combo_dual_axis_is_explicit_and_units_are_checked(db_engine, tmp_path):
    client, project, request = example(db_engine, tmp_path)
    request["measures"][1].update(operation="count", column_id=None, name="Rows")
    endpoint = f"/api/v1/projects/{project}/report-builder/preview"
    rejected = client.post(endpoint, json=request)
    assert rejected.status_code == 422, rejected.text
    request["combo"]["secondary_axis"] = True
    request["combo"]["series"][1]["axis"] = "secondary"
    accepted = client.post(endpoint, json=request)
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["visualization"]["combo"]["secondary"] is not None
    assert accepted.json()["rows"][0]["Rows"] == 2


def test_combo_release_and_restore_remap_measure_bindings(db_engine, tmp_path):
    client, project, request = example(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}"
    created = client.post(root + "/report-builder/apply", json=request)
    assert created.status_code == 200, created.text
    ids = created.json()
    client.post(root + "/checks")
    check = client.get(root + "/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        root + "/releases",
        json={
            "name": "Plan actual",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release = client.get(root + "/releases").json()[0]
    board = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    frozen = client.get(
        f"/api/v1/releases/{release['id']}/widgets/{board['widgets'][0]['id']}/result"
    ).json()
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored combo"}
    )
    assert restored.status_code == 200, restored.text
    new_project = restored.json()["id"]
    visual = client.get(f"/api/v1/projects/{new_project}/visualizations").json()["items"][0]
    result = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert result.status_code == 200, result.text
    assert result.json()["rows"] == frozen["rows"]
    read = client.get(f"/api/v1/projects/{new_project}/report-builder/{visual['id']}").json()
    assert read["editable"], read
    assert read["settings"]["combo"] == result.json()["spec"]


def test_combo_validation_and_chart_population_are_not_limited_to_table_preview(
    db_engine, tmp_path
):
    rows = b"month,actual,plan\n" + b"".join(f"M{i},1.00,2.00\n".encode() for i in range(60))
    client, project, request = example(db_engine, tmp_path, rows)
    response = client.post(f"/api/v1/projects/{project}/report-builder/preview", json=request)
    assert response.status_code == 200, response.text
    assert len(response.json()["rows"]) == 50
    assert len(response.json()["visualization"]["rows"]) == 60


def test_combo_limit_is_checked_before_saving(db_engine, tmp_path):
    rows = b"month,actual,plan\n" + b"".join(f"M{i},1.00,2.00\n".encode() for i in range(2001))
    client, project, request = example(db_engine, tmp_path, rows)
    response = client.post(f"/api/v1/projects/{project}/report-builder/apply", json=request)
    assert response.status_code == 422, response.text
    with Session(db_engine) as session:
        assert session.scalar(select(func.count()).select_from(Workflow)) == 0


def test_combo_after_total_formula_uses_ratio_of_sums_not_mean_of_ratios(db_engine, tmp_path):
    client, project, request = example(db_engine, tmp_path)
    formula_id = str(uuid4())
    actual, plan = [series["column_id"] for series in request["combo"]["series"]]
    request["summary_formulas"] = [
        {
            "node_id": formula_id,
            "name": "Achievement",
            "expression": f"safe_divide([{actual}], [{plan}], None) * 100",
            "precision": 38,
            "scale": 4,
        }
    ]
    request["combo"]["secondary_axis"] = True
    request["combo"]["series"][1].update(
        column_id="calc_" + formula_id.replace("-", ""), name="Achievement %", axis="secondary"
    )
    response = client.post(f"/api/v1/projects/{project}/report-builder/preview", json=request)
    assert response.status_code == 200, response.text
    assert response.json()["rows"][0]["Achievement"] == "60.0000"
    assert response.json()["visualization"]["rows"][0]["Achievement"] == "60.0000"
    assert response.json()["steps"][-1] == "calculated_column"
