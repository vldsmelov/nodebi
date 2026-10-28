from copy import deepcopy
from uuid import uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import DashboardWidget, Workflow
from tests.test_combo_reports import example as combo_example


def example(
    db_engine, tmp_path, rows=b"month,actual,plan\nA,0.10,0.20\nA,0.20,0.30\nB,0.70,0.60\n"
):
    client, project, request = combo_example(db_engine, tmp_path, rows)
    request.pop("combo")
    request.update(presentation="radar_chart", decimal_average_scale=2)
    request["measures"].append(
        {
            **request["measures"][0],
            "output_id": str(uuid4()),
            "name": "Average",
            "operation": "average",
        }
    )
    request["radar"] = {
        "type": "radar_chart",
        "profile_column_id": request["dimensions"][0],
        "normalization": "shared",
        "axes": [
            {
                "column_id": "measure_" + m["output_id"].replace("-", ""),
                "minimum": "0",
                "maximum": "1",
            }
            for m in request["measures"]
        ],
    }
    return client, project, request


def test_radar_report_preview_apply_edit_retry_and_explicit_rebinding(db_engine, tmp_path):
    client, project, request = example(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}/report-builder"
    preview = client.post(root + "/preview", json=request)
    assert preview.status_code == 200, preview.text
    data = preview.json()
    profile_field = data["columns"][0]["engine_name"]
    assert data["rows"][0] == {
        profile_field: "A",
        "Actual": "0.30",
        "Plan": "0.50",
        "Average": "0.15",
    }
    assert data["visualization"]["radar"]["profiles"][0]["positions"] == [0.3, 0.5, 0.15]
    assert data["steps"] == ["dataset_source", "group_by"]
    with Session(db_engine) as session:
        assert session.scalar(select(func.count()).select_from(Workflow)) == 0
    applied = client.post(root + "/apply", json=request)
    assert applied.status_code == 200, applied.text
    with Session(db_engine) as session:
        widget = session.scalar(select(DashboardWidget))
        assert widget is not None
        assert widget.height == 12
        # Editing a calculation must not reapply creation defaults to an author's layout.
        widget.height = 6
        session.commit()
    assert client.post(root + "/apply", json=request).json() == applied.json()
    changed = deepcopy(request)
    changed["radar"]["axes"].reverse()
    assert client.post(root + "/apply", json=changed).status_code == 409
    visual = f"/api/v1/visualizations/{applied.json()['visualization_id']}"
    assert client.post(visual + "/result", json={}).json()["rows"] == data["rows"]
    edit_url = root + "/" + applied.json()["visualization_id"]
    read = client.get(edit_url).json()
    assert read["editable"], read
    edit = {
        "request_id": str(uuid4()),
        "expected_token": read["expected_token"],
        "settings": read["settings"],
    }
    edit["settings"]["measures"][0]["operation"] = "average"
    response = client.post(edit_url + "/preview", json=edit)
    assert response.status_code == 200, response.text
    assert response.json()["rows"][0]["Actual"] == "0.15"
    assert client.post(edit_url + "/apply", json=edit).status_code == 200
    assert client.post(edit_url + "/apply", json=edit).status_code == 200
    assert client.get(visual).json()["config"]["spec"] == read["settings"]["radar"]
    with Session(db_engine) as session:
        assert session.scalar(select(DashboardWidget.height)) == 6
    assert (
        client.post(edit_url + "/apply", json={**edit, "request_id": str(uuid4())}).status_code
        == 409
    )
    read = client.get(edit_url).json()
    edit = {
        "request_id": str(uuid4()),
        "expected_token": read["expected_token"],
        "settings": read["settings"],
    }
    edit["settings"]["radar"]["axes"].reverse()
    assert client.post(edit_url + "/preview", json=edit).status_code == 422
    edit["settings"]["rebind_fields"] = True
    assert client.post(edit_url + "/apply", json=edit).status_code == 200
    assert client.get(visual).json()["config"]["spec"] == edit["settings"]["radar"]


@pytest.mark.parametrize(
    "mutation",
    [
        "missing_axis",
        "few_axes",
        "duplicate_axis",
        "no_bounds",
        "outside_bounds",
        "wrong_profile",
        "implicit_normalization",
        "wrong_presentation",
    ],
)
def test_invalid_radar_reports_do_not_save(db_engine, tmp_path, mutation):
    client, project, request = example(db_engine, tmp_path)
    spec = request["radar"]
    if mutation == "missing_axis":
        spec["axes"][0]["column_id"] = "missing"
    elif mutation == "few_axes":
        spec["axes"].pop()
    elif mutation == "duplicate_axis":
        spec["axes"][0] = spec["axes"][1]
    elif mutation == "no_bounds":
        spec["axes"][0]["minimum"] = ""
    elif mutation == "outside_bounds":
        for axis in spec["axes"]:
            axis["maximum"] = "0.2"
    elif mutation == "wrong_profile":
        spec["profile_column_id"] = "missing"
    elif mutation == "implicit_normalization":
        del spec["normalization"]
    else:
        request["presentation"] = "table"
    response = client.post(f"/api/v1/projects/{project}/report-builder/apply", json=request)
    assert response.status_code == 422, response.text
    with Session(db_engine) as session:
        assert session.scalar(select(func.count()).select_from(Workflow)) == 0


def test_radar_formula_axis_requires_explicit_normalization(db_engine, tmp_path):
    client, project, request = example(db_engine, tmp_path)
    actual, plan = [axis["column_id"] for axis in request["radar"]["axes"][:2]]
    formula = str(uuid4())
    request["summary_formulas"] = [
        {
            "node_id": formula,
            "name": "Achievement",
            "expression": f"safe_divide([{actual}], [{plan}], None)",
            "precision": 38,
            "scale": 4,
        }
    ]
    request["radar"]["axes"][2]["column_id"] = "calc_" + formula.replace("-", "")
    for axis in request["radar"]["axes"]:
        axis["maximum"] = "2"
    url = f"/api/v1/projects/{project}/report-builder/preview"
    assert client.post(url, json=request).status_code == 422
    request["radar"]["normalization"] = "min_max"
    result = client.post(url, json=request)
    assert result.status_code == 200, result.text
    assert result.json()["rows"][0]["Achievement"] == "0.6000"
    assert result.json()["visualization"]["radar"]["profiles"][0]["positions"][2] == 0.3


def test_radar_profile_limit_is_not_a_silent_sample(db_engine, tmp_path):
    rows = b"month,actual,plan\n" + b"".join(f"P{i},0.10,0.20\n".encode() for i in range(21))
    client, project, request = example(db_engine, tmp_path, rows)
    url = f"/api/v1/projects/{project}/report-builder/preview"
    result = client.post(url, json=request)
    assert result.status_code == 422, result.text
    assert "20 profiles" in result.text
    request["filters"] = [
        {"column_id": request["dimensions"][0], "operator": "not_equals", "value": "P20"}
    ]
    result = client.post(url, json=request)
    assert result.status_code == 200, result.text
    assert len(result.json()["visualization"]["radar"]["profiles"]) == 20


def test_radar_aggregates_all_100000_source_rows(db_engine, tmp_path):
    rows = b"month,actual,plan\n" + b"A,0.10,0.20\nB,0.10,0.20\n" * 50000
    client, project, request = example(db_engine, tmp_path, rows)
    for axis in request["radar"]["axes"]:
        axis["maximum"] = "20000"
    result = client.post(f"/api/v1/projects/{project}/report-builder/preview", json=request)
    assert result.status_code == 200, result.text
    assert result.json()["total_rows"] == 2
    assert [row["Actual"] for row in result.json()["rows"]] == ["5000.00", "5000.00"]
    assert [row["Plan"] for row in result.json()["rows"]] == ["10000.00", "10000.00"]
    assert [row["Average"] for row in result.json()["rows"]] == ["0.10", "0.10"]
    assert result.json()["visualization"]["radar"]["profiles"][0]["positions"] == [
        0.25,
        0.5,
        0.000005,
    ]


@pytest.mark.parametrize("empty", [False, True])
def test_radar_empty_and_missing_profiles_are_not_zero_filled(db_engine, tmp_path, empty):
    client, project, request = example(db_engine, tmp_path, b"month,actual,plan\nA,,0.20\n")
    if empty:
        request["filters"] = [
            {"column_id": request["dimensions"][0], "operator": "equals", "value": "absent"}
        ]
    response = client.post(f"/api/v1/projects/{project}/report-builder/preview", json=request)
    assert response.status_code == 200, response.text
    radar = response.json()["visualization"]["radar"]
    if empty:
        assert radar["profiles"] == []
    else:
        assert radar["incomplete_count"] == 1
        assert radar["profiles"][0]["positions"] == [None, 0.2, None]
        assert response.json()["rows"][0]["Actual"] is None
        assert response.json()["rows"][0]["Average"] is None


def test_radar_rebinding_to_table_drops_old_typed_axes(db_engine, tmp_path):
    client, project, request = example(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}/report-builder"
    applied = client.post(root + "/apply", json=request)
    assert applied.status_code == 200, applied.text
    visual_id = applied.json()["visualization_id"]
    edit_url = root + "/" + visual_id
    read = client.get(edit_url).json()
    settings = read["settings"]
    settings.pop("radar")
    settings.update(presentation="table", rebind_fields=True)
    response = client.post(
        edit_url + "/apply",
        json={
            "request_id": str(uuid4()),
            "expected_token": read["expected_token"],
            "settings": settings,
        },
    )
    assert response.status_code == 200, response.text
    result = client.post(f"/api/v1/visualizations/{visual_id}/result", json={})
    assert result.status_code == 200, result.text
    assert result.json()["type"] == "table"
    assert result.json()["spec"]["type"] == "table"
    read = client.get(edit_url).json()
    assert read["editable"]
    assert "radar" not in read["settings"]


def test_radar_large_decimals_release_restore_and_edit(db_engine, tmp_path):
    client, project, request = example(
        db_engine, tmp_path, b"month,actual,plan\nA,9007199254740993.12,9007199254740993.13\n"
    )
    for axis in request["radar"]["axes"]:
        axis.update(minimum="9007199254740993.00", maximum="9007199254740994.00")
    root = f"/api/v1/projects/{project}"
    applied = client.post(root + "/report-builder/apply", json=request)
    assert applied.status_code == 200, applied.text
    ids = applied.json()
    client.post(root + "/checks")
    check = client.get(root + "/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    response = client.post(
        root + "/releases",
        json={
            "name": "Profiles",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert response.status_code == 200, response.text
    release = client.get(root + "/releases").json()[0]
    board = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    frozen = client.get(
        f"/api/v1/releases/{release['id']}/widgets/{board['widgets'][0]['id']}/result"
    ).json()
    assert frozen["radar"]["profiles"][0]["positions"] == [0.12, 0.13, 0.12]
    assert frozen["rows"][0]["Actual"] == "9007199254740993.12"
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored radar"}
    )
    assert restored.status_code == 200, restored.text
    new_project = restored.json()["id"]
    visual = client.get(f"/api/v1/projects/{new_project}/visualizations").json()["items"][0]
    result = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert result.status_code == 200, result.text
    assert result.json()["rows"] == frozen["rows"]
    read = client.get(f"/api/v1/projects/{new_project}/report-builder/{visual['id']}").json()
    assert read["editable"], read
    assert read["settings"]["radar"] == result.json()["spec"]
