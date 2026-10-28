from tests.test_report_editing import example, save_workflow


def test_pivot_dynamic_preview_report_and_release_restore(db_engine, tmp_path):
    client, project, ids, body = example(db_engine, tmp_path)
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    pivot = next(n for n in graph["nodes"] if n["type"] == "group_by")
    pivot.update(
        type="pivot",
        version=2,
        config={
            "index_column_id": body["dimensions"][0],
            "pivot_column_id": body["measures"][0]["column_id"],
            "value_column_id": body["measures"][0]["column_id"],
            "operation": "average",
            "average_scale": 8,
        },
    )
    saved = save_workflow(client, graph)
    preview = client.post(
        f"/api/v1/workflows/{ids['workflow_id']}/nodes/{pivot['id']}/preview", json={}
    )
    assert preview.status_code == 200, preview.text
    visual = client.get(f"/api/v1/visualizations/{ids['visualization_id']}").json()
    rebound = client.put(
        f"/api/v1/visualizations/{visual['id']}",
        json={
            "workflow_id": ids["workflow_id"],
            "publication_id": visual["publication_id"],
            "expected_workflow_revision": saved["revision"],
            "expected_revision": visual["revision"],
            "name": "Exact Pivot",
            "type": "table",
            "config": {"column_ids": [c["column_id"] for c in preview.json()["columns"]]},
        },
    )
    assert rebound.status_code == 200, rebound.text
    result = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert result.status_code == 200, result.text
    assert result.json()["rows"][0]["pivot_0.10"] == "0.10000000"
    assert result.json()["rows"][1]["pivot_0.10"] is None
    root = f"/api/v1/projects/{project}"
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    created = client.post(
        f"{root}/releases",
        json={
            "name": "Exact Pivot",
            "period": "October",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert created.status_code == 200, created.text
    release = client.get(f"{root}/releases").json()[0]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored Pivot"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    again = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert again.status_code == 200, again.text
    assert again.json()["rows"] == result.json()["rows"]
