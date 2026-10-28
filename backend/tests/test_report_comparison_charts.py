import uuid

import pytest

from tests.test_report_comparison import example


@pytest.mark.parametrize("presentation", ["bar_chart", "line_chart"])
def test_chart_binds_only_compared_value_and_calendar_baseline(db_engine, tmp_path, presentation):
    client, root, body = example(db_engine, tmp_path)
    body["presentation"] = presentation
    # Primary selection from a former table must not override the compared measure.
    body["value_field_id"] = f"measure_{uuid.UUID(body['measures'][0]['output_id']).hex}"
    preview = client.post(f"{root}/report-builder/preview", json=body)
    assert preview.status_code == 200, preview.text
    saved = client.post(f"{root}/report-builder/apply", json=body)
    assert saved.status_code == 200, saved.text
    assert client.post(f"{root}/report-builder/apply", json=body).json() == saved.json()
    ids = saved.json()
    visual_url = f"/api/v1/visualizations/{ids['visualization_id']}"
    visual = client.get(visual_url).json()
    node = preview.json()["graph"]["nodes"][-1]
    previous_id = f"comparison_{uuid.UUID(node['id']).hex}_previous"
    assert visual["config"]["value_column_id"] == body["comparison"]["value_column_id"]
    assert visual["config"]["category_column_id"] == body["dimensions"][0]
    assert visual["config"]["additional_series"] == [{"column_id": previous_id, "name": ""}]
    rendered = client.post(f"{visual_url}/result", json={})
    assert rendered.status_code == 200, rendered.text
    result = rendered.json()
    assert result["value_field"] == "Attainment"
    assert result["additional_series"] == [
        {"field": "Change · previous", "name": "Change · previous"}
    ]
    assert [r["Change · previous"] for r in result["rows"]] == [None, "2.5000", None]
    visible = {body["dimensions"][0], "Attainment", "Change · previous"}
    assert result["rows"] == [
        {key: value for key, value in row.items() if key in visible}
        for row in preview.json()["rows"]
    ]
    editor = f"{root}/report-builder/{ids['visualization_id']}"
    projection = client.get(editor).json()
    assert projection["editable"], projection
    request = {
        "request_id": str(uuid.uuid4()),
        "expected_token": projection["expected_token"],
        "settings": projection["settings"],
    }
    request["settings"]["comparison"]["name"] = "Renamed"
    edited = client.post(f"{editor}/apply", json=request)
    assert edited.status_code == 200, edited.text
    assert client.get(visual_url).json()["config"] == visual["config"]
    result = client.post(f"{visual_url}/result", json={}).json()
    assert result["additional_series"][0]["name"] == "Renamed · previous"


def test_change_compared_value_requires_rebinding_and_table_conversion_preserves_graph(
    db_engine, tmp_path
):
    client, root, body = example(db_engine, tmp_path)
    body["presentation"] = "line_chart"
    created = client.post(f"{root}/report-builder/apply", json=body)
    assert created.status_code == 200, created.text
    ids = created.json()
    editor = f"{root}/report-builder/{ids['visualization_id']}"
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    graph = client.get(graph_url).json()
    projection = client.get(editor).json()
    request = {
        "request_id": str(uuid.uuid4()),
        "expected_token": projection["expected_token"],
        "settings": projection["settings"],
    }
    request["settings"]["comparison"]["value_column_id"] = (
        f"measure_{uuid.UUID(body['measures'][0]['output_id']).hex}"
    )
    rejected = client.post(f"{editor}/apply", json=request)
    assert rejected.status_code == 422, rejected.text
    assert client.get(graph_url).json() == graph
    request["settings"]["rebind_fields"] = True
    assert client.post(f"{editor}/apply", json=request).status_code == 200
    projection = client.get(editor).json()
    request = {
        "request_id": str(uuid.uuid4()),
        "expected_token": projection["expected_token"],
        "settings": projection["settings"],
    }
    request["settings"].update(presentation="table", rebind_fields=True)
    saved = client.post(f"{editor}/apply", json=request)
    assert saved.status_code == 200, saved.text
    after = client.get(graph_url).json()
    assert [n["id"] for n in after["nodes"]] == [n["id"] for n in graph["nodes"]]
    rendered = client.post(
        f"/api/v1/visualizations/{ids['visualization_id']}/result", json={}
    ).json()
    assert rendered["type"] == "table" and not rendered.get("additional_series")
    assert [r["Change · previous"] for r in rendered["rows"]] == [None, "10.00", None]


def test_comparison_chart_rejects_partitions_without_partial_creation(db_engine, tmp_path):
    client, root, body = example(db_engine, tmp_path)
    body["presentation"] = "bar_chart"
    body["dimensions"].append(body["measures"][1]["column_id"])
    rejected = client.post(f"{root}/report-builder/apply", json=body)
    assert rejected.status_code == 422, rejected.text
    assert client.get(f"{root}/workflows").json()["items"] == []
