from uuid import uuid4

from tests.test_boxplot_stats_api import prepare_boxplot
from tests.test_report_editing import save_workflow


def prepare_waterfall(db_engine, tmp_path, csv=None):
    client, root, graph, ids, node_id = prepare_boxplot(
        db_engine,
        tmp_path,
        "dataset",
        csv=csv
        or (
            b"group,value,kind,segment\nOpening,100,initial,keep\nSales,20,change,keep\n"
            b"Cost,-150,change,omit\nSubtotal,,subtotal,keep\n"
            b"Recovery,40,change,keep\nClosing,,total,keep\n"
        ),
    )
    source = next(node for node in graph["nodes"] if node["type"] == "dataset_source")
    source_preview = client.post(
        f"/api/v1/workflows/{graph['id']}/nodes/{source['id']}/preview", json={"limit": 1}
    ).json()
    columns = {column["display_name"]: column["column_id"] for column in source_preview["columns"]}
    node = next(node for node in graph["nodes"] if node["id"] == node_id)
    node["type"] = "waterfall_steps"
    node["config"] = {
        "category_column_id": columns["group"],
        "value_column_id": columns["value"],
        "kind_column_id": columns.get("kind"),
        "append_total": "kind" not in columns,
    }
    graph = save_workflow(client, graph)
    return client, root, graph, ids, node_id, columns


def publish_table(client, graph, ids, node_id):
    preview = client.post(
        f"/api/v1/workflows/{graph['id']}/nodes/{node_id}/preview", json={"limit": 1}
    )
    assert preview.status_code == 200, preview.text
    fields = [
        column["column_id"]
        for column in preview.json()["columns"]
        if column["engine_name"] != "step_id"
    ]
    saved = client.put(
        f"/api/v1/visualizations/{ids['visualization_id']}",
        json={
            "workflow_id": graph["id"],
            "publication_id": ids["publication_id"],
            "expected_workflow_revision": graph["revision"],
            "expected_revision": 1,
            "name": "Waterfall audit",
            "type": "table",
            "config": {"column_ids": fields},
        },
    )
    assert saved.status_code == 200, saved.text
    return fields


def freeze(client, root, ids):
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Waterfall",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release = client.get(f"{root}/releases").json()[0]
    board = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    return release[
        "id"
    ], f"/api/v1/releases/{release['id']}/widgets/{board['widgets'][0]['id']}/result"


def test_waterfall_table_preview_context_release_restore_and_node_errors(db_engine, tmp_path):
    client, root, graph, ids, node_id, columns = prepare_waterfall(db_engine, tmp_path)
    fields = publish_table(client, graph, ids, node_id)
    preview_url = f"/api/v1/workflows/{graph['id']}/nodes/{node_id}/preview"
    last = client.post(preview_url, json={"offset": 5, "limit": 1}).json()
    assert last["total_rows"] == 6 and last["rows"][0]["balance"] == "10"
    visual_url = f"/api/v1/visualizations/{ids['visualization_id']}/result"
    live = client.post(visual_url, json={}).json()
    assert [row["balance"] for row in live["rows"]] == ["100", "120", "-30", "-30", "10", "10"]
    release_id, frozen_url = freeze(client, root, ids)
    assert client.get(frozen_url).json()["rows"] == live["rows"]
    restored = client.post(
        f"/api/v1/releases/{release_id}/restore", json={"name": "Restored waterfall"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    result = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert result.status_code == 200, result.text
    assert result.json()["rows"] == live["rows"]
    assert [column["column_id"] for column in result.json()["columns"]] != fields

    source = next(node for node in graph["nodes"] if node["type"] == "dataset_source")
    context_id = str(uuid4())
    graph["result_catalog"]["outputs"][0]["context_ids"] = [context_id]
    graph["result_catalog"]["contexts"] = [
        {
            "id": context_id,
            "name": "Segment",
            "roles": [{"name": "selected_segment", "logical_type": "string"}],
            "points": [
                {
                    "node_id": source["id"],
                    "port": "dataset",
                    "role": "selected_segment",
                    "column_id": columns["segment"],
                }
            ],
        }
    ]
    graph = save_workflow(client, graph)
    filtered = client.post(visual_url, json={"context": {"values": {"selected_segment": "keep"}}})
    assert filtered.status_code == 200, filtered.text
    assert filtered.json()["rows"][-1]["balance"] == "160"
    assert client.get(frozen_url).json()["rows"] == live["rows"]
    node = next(node for node in graph["nodes"] if node["id"] == node_id)
    node["config"]["value_column_id"] = "removed"
    save_workflow(client, graph)
    failed = client.post(preview_url, json={})
    assert failed.status_code == 422 and "unavailable" in failed.text and node_id in failed.text


def test_frozen_waterfall_preserves_steps_beyond_one_thousand_rows(db_engine, tmp_path):
    csv = ("group,value\n" + "".join(f"Step{i},1\n" for i in range(1100))).encode()
    client, root, graph, ids, node_id, _ = prepare_waterfall(db_engine, tmp_path, csv)
    publish_table(client, graph, ids, node_id)
    _, frozen_url = freeze(client, root, ids)
    page = client.get(frozen_url, params={"offset": 1000, "limit": 200})
    assert page.status_code == 200, page.text
    assert page.json()["total_rows"] == 1101
    assert len(page.json()["rows"]) == 101
    assert page.json()["rows"][-1]["kind"] == "total"
    assert page.json()["rows"][-1]["balance"] == "1100"
