from tests.test_report_editing import save_workflow
from tests.test_report_formulas import example


def test_exact_window_graph_report_and_frozen_restore(db_engine, tmp_path):
    client, project, body = example(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}"
    created = client.post(f"{root}/report-builder/apply", json=body)
    assert created.status_code == 200, created.text
    ids = created.json()
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    calculation = next(n for n in graph["nodes"] if n["id"] == body["row_formulas"][0]["node_id"])
    calculation.update(
        type="window",
        version=3,
        ui={},
        config={
            "name": "Row ratio",
            "operation": "sum",
            "column_id": body["measures"][0]["column_id"],
            "partitions": body["dimensions"],
        },
    )
    aggregate = next(n for n in graph["nodes"] if n["type"] == "group_by")
    aggregate["config"]["aggregations"][2]["column_id"] = "window_" + calculation["id"].replace(
        "-", ""
    )
    save_workflow(client, graph)
    result = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert result.status_code == 200, result.text
    assert result.json()["rows"][0]["Mean of ratios"] == "10.0000"
    assert result.json()["rows"][0]["Ratio of totals"] == "2.5000"
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    release = client.post(
        f"{root}/releases",
        json={
            "name": "Exact windows",
            "period": "October",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert release.status_code == 200, release.text
    release_id = client.get(f"{root}/releases").json()[0]["id"]
    restored = client.post(
        f"/api/v1/releases/{release_id}/restore", json={"name": "Restored windows"}
    )
    assert restored.status_code == 200, restored.text
    target = restored.json()["id"]
    visual = client.get(f"/api/v1/projects/{target}/visualizations").json()["items"][0]
    again = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert again.status_code == 200, again.text
    assert again.json()["rows"] == result.json()["rows"]
