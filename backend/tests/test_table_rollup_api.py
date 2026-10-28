from uuid import uuid4

from tests.test_boxplot_stats_api import prepare_boxplot
from tests.test_report_editing import save_workflow


def prepare(db_engine, tmp_path, csv=None):
    client, root, graph, ids, node_id = prepare_boxplot(
        db_engine,
        tmp_path,
        "dataset",
        csv=csv or b"group,value,branch\nNorth,10,A\nNorth,20,B\nNorth,30,B\nSouth,,C\n",
    )
    node = next(n for n in graph["nodes"] if n["id"] == node_id)
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    columns = client.post(
        f"/api/v1/workflows/{graph['id']}/nodes/{source['id']}/preview", json={"limit": 1}
    ).json()["columns"]
    fields = {c["display_name"]: c["column_id"] for c in columns}
    node.update(
        type="table_rollup",
        config={
            "dimensions": [fields["group"], fields["branch"]],
            "measures": [
                {
                    "output_id": str(uuid4()),
                    "name": "Mean",
                    "operation": "average",
                    "column_id": fields["value"],
                    "scale": 6,
                },
                {
                    "output_id": str(uuid4()),
                    "name": "Total",
                    "operation": "sum",
                    "column_id": fields["value"],
                },
            ],
        },
    )
    graph = save_workflow(client, graph)
    url = f"/api/v1/workflows/{graph['id']}/nodes/{node_id}/preview"
    return client, root, graph, ids, node_id, url, fields


def test_rollup_schema_full_data_freeze_restore_and_context(db_engine, tmp_path):
    client, root, graph, ids, node_id, url, fields = prepare(db_engine, tmp_path)
    complete = client.post(url, json={"limit": 100})
    assert complete.status_code == 200, complete.text
    result = complete.json()
    measures = {c["display_name"]: c["engine_name"] for c in result["columns"]}
    assert result["total_rows"] == 6
    assert result["rows"][-1][measures["Mean"]] == "20.000000"
    assert result["rows"][-1][measures["Total"]] == "60"
    assert client.post(url, json={"limit": 1}).json()["total_rows"] == 6
    payload = {
        "workflow_id": graph["id"],
        "publication_id": ids["publication_id"],
        "expected_workflow_revision": graph["revision"],
        "expected_revision": 1,
        "name": "Rollup audit",
        "type": "table",
        "config": {"column_ids": [c["column_id"] for c in result["columns"]]},
    }
    visual_url = f"/api/v1/visualizations/{ids['visualization_id']}"
    saved = client.put(visual_url, json=payload)
    assert saved.status_code == 200, saved.text
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Rollup",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release_id = client.get(f"{root}/releases").json()[0]["id"]
    board = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    frozen_url = f"/api/v1/releases/{release_id}/widgets/{board['widgets'][0]['id']}/result"
    frozen = client.get(frozen_url).json()
    assert frozen["rows"] == result["rows"]
    restored = client.post(
        f"/api/v1/releases/{release_id}/restore", json={"name": "Restored rollup"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert after.status_code == 200, after.text
    assert after.json()["rows"][-1][measures["Mean"]] == "20.000000"
    assert after.json()["rows"][0]["row_id"] != result["rows"][0]["row_id"]
    assert after.json()["rows"][0]["parent_id"] == after.json()["rows"][2]["row_id"]
    assert [c["column_id"] for c in after.json()["columns"]] != payload["config"]["column_ids"]
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    context_id = str(uuid4())
    graph["result_catalog"]["outputs"][0]["context_ids"] = [context_id]
    graph["result_catalog"]["contexts"] = [
        {
            "id": context_id,
            "name": "Branch",
            "roles": [{"name": "branch", "logical_type": "string"}],
            "points": [
                {
                    "node_id": source["id"],
                    "port": "dataset",
                    "role": "branch",
                    "column_id": fields["branch"],
                }
            ],
        }
    ]
    graph = save_workflow(client, graph)
    filtered = client.post(f"{visual_url}/result", json={"context": {"values": {"branch": "B"}}})
    assert filtered.status_code == 200, filtered.text
    assert filtered.json()["rows"][-1][measures["Mean"]] == "25.000000"
    assert filtered.json()["rows"][-1]["source_count"] == 2
    assert client.get(frozen_url).json()["rows"] == result["rows"]
    node = next(n for n in graph["nodes"] if n["id"] == node_id)
    node["config"]["measures"][0]["column_id"] = "removed"
    save_workflow(client, graph)
    failed = client.post(url, json={})
    assert failed.status_code == 422 and node_id in failed.text and "unavailable" in failed.text


def test_rollup_1101_groups_total_beyond_preview(db_engine, tmp_path):
    csv = ("group,value,branch\n" + "".join(f"North,{i},B{i}\n" for i in range(1101))).encode()
    client, root, graph, ids, _, url, _ = prepare(db_engine, tmp_path, csv)
    page = client.post(url, json={"offset": 1100, "limit": 3})
    assert page.status_code == 200, page.text
    assert page.json()["total_rows"] == 1103
    assert [r["kind"] for r in page.json()["rows"]] == ["detail", "subtotal", "grand_total"]
    mean = next(c["engine_name"] for c in page.json()["columns"] if c["display_name"] == "Mean")
    assert page.json()["rows"][-1][mean] == "550.000000"
    assert page.json()["rows"][-1]["source_count"] == 1101
    saved = client.put(
        f"/api/v1/visualizations/{ids['visualization_id']}",
        json={
            "workflow_id": graph["id"],
            "publication_id": ids["publication_id"],
            "expected_workflow_revision": graph["revision"],
            "expected_revision": 1,
            "name": "Full rollup",
            "type": "table",
            "config": {},
        },
    )
    assert saved.status_code == 200, saved.text
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Full rollup",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release_id = client.get(f"{root}/releases").json()[0]["id"]
    board = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    frozen = client.get(
        f"/api/v1/releases/{release_id}/widgets/{board['widgets'][0]['id']}/result",
        params={"offset": 1100, "limit": 3},
    )
    assert frozen.status_code == 200, frozen.text
    assert frozen.json()["total_rows"] == 1103
    assert frozen.json()["rows"] == page.json()["rows"]
