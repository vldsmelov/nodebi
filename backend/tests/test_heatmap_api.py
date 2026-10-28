from uuid import uuid4

from tests.test_boxplot_stats_api import prepare_boxplot
from tests.test_report_editing import save_workflow


def test_heatmap_full_cells_paging_schema_release_and_restore(db_engine, tmp_path):
    client, root, graph, ids, stats_id = prepare_boxplot(
        db_engine,
        tmp_path,
        "dataset",
        csv=b"group,value,period\nA,2,Jan\nA,4,Jan\nA,,Jan\nB,0,Jan\nB,,Feb\n",
    )
    stats = next(n for n in graph["nodes"] if n["id"] == stats_id)
    upstream = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    source_preview = client.post(
        f"/api/v1/workflows/{graph['id']}/nodes/{upstream['id']}/preview", json={"limit": 1}
    ).json()
    period = next(
        c["column_id"] for c in source_preview["columns"] if c["display_name"] == "period"
    )
    stats["type"] = "heatmap_stats"
    stats["config"] = {
        "x_column_id": stats["config"]["group_column_id"],
        "y_column_id": period,
        "value_column_id": stats["config"]["value_column_id"],
        "aggregation": "sum",
    }
    graph = save_workflow(client, graph)
    url = f"/api/v1/workflows/{graph['id']}/nodes/{stats_id}/preview"
    preview = client.post(url, json={"limit": 1})
    assert preview.status_code == 200, preview.text
    assert preview.json()["total_rows"] == 4
    complete = client.post(url, json={"limit": 10}).json()
    rows = {(r["x"], r["y"]): r for r in complete["rows"]}
    assert rows["A", "Jan"]["value"] == "6"
    assert rows["B", "Jan"]["value"] == "0"
    assert rows["A", "Feb"]["present"] is False and rows["A", "Feb"]["value"] is None
    assert rows["B", "Feb"]["present"] is True and rows["B", "Feb"]["value"] is None
    assert rows["A", "Jan"]["row_count"] == 3
    selected = [
        c["column_id"]
        for c in complete["columns"]
        if c["engine_name"] in {"x", "y", "value", "present", "row_count", "missing_count"}
    ]
    saved = client.put(
        f"/api/v1/visualizations/{ids['visualization_id']}",
        json={
            "workflow_id": graph["id"],
            "publication_id": ids["publication_id"],
            "expected_workflow_revision": graph["revision"],
            "expected_revision": 1,
            "name": "Cell audit",
            "type": "table",
            "config": {"column_ids": selected},
        },
    )
    assert saved.status_code == 200, saved.text
    visual_url = f"/api/v1/visualizations/{ids['visualization_id']}/result"
    live = client.post(visual_url, json={"limit": 10})
    assert live.status_code == 200, live.text
    assert client.post(visual_url, json={"limit": 1}).json()["total_rows"] == 4
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Cell audit",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release = client.get(f"{root}/releases").json()[0]
    board = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    frozen_url = f"/api/v1/releases/{release['id']}/widgets/{board['widgets'][0]['id']}/result"
    frozen = client.get(frozen_url)
    assert frozen.status_code == 200, frozen.text
    assert frozen.json()["rows"] == live.json()["rows"]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored cells"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert after.status_code == 200, after.text
    assert after.json()["rows"] == live.json()["rows"]
    assert [c["column_id"] for c in after.json()["columns"]] != selected

    # A context on the source alters the aggregation population, not just displayed cells.
    context_id = str(uuid4())
    graph["result_catalog"]["outputs"][0]["context_ids"] = [context_id]
    graph["result_catalog"]["contexts"] = [
        {
            "id": context_id,
            "name": "Period",
            "roles": [{"name": "selected_period", "logical_type": "string"}],
            "points": [
                {
                    "node_id": upstream["id"],
                    "port": "dataset",
                    "role": "selected_period",
                    "column_id": period,
                }
            ],
        }
    ]
    graph = save_workflow(client, graph)
    filtered = client.post(visual_url, json={"context": {"values": {"selected_period": "Jan"}}})
    assert filtered.status_code == 200, filtered.text
    assert [r["value"] for r in filtered.json()["rows"]] == ["6", "0"]
    assert client.get(frozen_url).json()["rows"] == live.json()["rows"]
    # Unavailable fields must produce a node-attributed error, not an unhandled exception.
    stats = next(n for n in graph["nodes"] if n["id"] == stats_id)
    stats["config"]["value_column_id"] = "removed"
    save_workflow(client, graph)
    failed = client.post(url, json={})
    assert failed.status_code == 422, failed.text
    assert "unavailable" in failed.text and stats_id in failed.text
