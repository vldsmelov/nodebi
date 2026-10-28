from uuid import uuid4

from tests.test_boxplot_stats_api import prepare_boxplot
from tests.test_report_editing import save_workflow
from tests.test_waterfall_api import freeze


def prepare_pareto(db_engine, tmp_path, csv=None):
    client, root, graph, ids, node_id = prepare_boxplot(
        db_engine,
        tmp_path,
        "dataset",
        csv=csv or b"group,value,segment\nB,3,keep\nA,3,keep\nC,4,omit\nZero,0,keep\n",
    )
    node = next(n for n in graph["nodes"] if n["id"] == node_id)
    category = node["config"]["group_column_id"]
    value = node["config"]["value_column_id"]
    node.update(type="pareto", config={"category_column_id": category, "value_column_id": value})
    graph = save_workflow(client, graph)
    url = f"/api/v1/workflows/{graph['id']}/nodes/{node_id}/preview"
    result = client.post(url, json={"limit": 1})
    assert result.status_code == 200, result.text
    fields = [c["column_id"] for c in result.json()["columns"] if c["engine_name"] != "point_id"]
    saved = client.put(
        f"/api/v1/visualizations/{ids['visualization_id']}",
        json={
            "workflow_id": graph["id"],
            "publication_id": ids["publication_id"],
            "expected_workflow_revision": graph["revision"],
            "expected_revision": 1,
            "name": "Pareto audit",
            "type": "table",
            "config": {"column_ids": fields},
        },
    )
    assert saved.status_code == 200, saved.text
    return client, root, graph, ids, node_id


def test_pareto_preview_named_summary_freeze_restore_and_filtered_population(db_engine, tmp_path):
    client, root, graph, ids, node_id = prepare_pareto(db_engine, tmp_path)
    url = f"/api/v1/workflows/{graph['id']}/nodes/{node_id}/preview"
    preview = client.post(url, json={"limit": 1}).json()
    assert preview["total_rows"] == 4
    assert preview["rows"][0]["category"] == "C"
    assert preview["rows"][0]["share_exact"] == "0.4"
    summary = client.post(url, json={"output_port": "summary"})
    assert summary.status_code == 200, summary.text
    assert summary.json()["rows"] == [{"input_count": 4, "zero_count": 1, "total_value": "10"}]
    visual_url = f"/api/v1/visualizations/{ids['visualization_id']}/result"
    live = client.post(visual_url, json={}).json()
    release_id, frozen_url = freeze(client, root, ids)
    assert client.get(frozen_url).json()["rows"] == live["rows"]
    restored = client.post(
        f"/api/v1/releases/{release_id}/restore", json={"name": "Restored Pareto"}
    )
    assert restored.status_code == 200, restored.text
    restored_visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()[
        "items"
    ][0]
    after = client.post(f"/api/v1/visualizations/{restored_visual['id']}/result", json={})
    assert after.status_code == 200, after.text
    assert after.json()["rows"] == live["rows"]
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    source_data = client.post(
        f"/api/v1/workflows/{graph['id']}/nodes/{source['id']}/preview", json={}
    ).json()
    segment = next(c["column_id"] for c in source_data["columns"] if c["display_name"] == "segment")
    context_id = str(uuid4())
    graph["result_catalog"]["outputs"][0]["context_ids"] = [context_id]
    graph["result_catalog"]["contexts"] = [
        {
            "id": context_id,
            "name": "Segment",
            "roles": [{"name": "segment", "logical_type": "string"}],
            "points": [
                {
                    "node_id": source["id"],
                    "port": "dataset",
                    "role": "segment",
                    "column_id": segment,
                }
            ],
        }
    ]
    graph = save_workflow(client, graph)
    filtered = client.post(visual_url, json={"context": {"values": {"segment": "keep"}}})
    assert filtered.status_code == 200, filtered.text
    assert [r["share_exact"] for r in filtered.json()["rows"]] == ["0.5", "0.5", "0"]
    assert client.get(frozen_url).json()["rows"] == live["rows"]
    node = next(n for n in graph["nodes"] if n["id"] == node_id)
    node["config"]["value_column_id"] = "gone"
    save_workflow(client, graph)
    failed = client.post(url, json={})
    assert failed.status_code == 422 and node_id in failed.text and "unavailable" in failed.text


def test_pareto_release_preserves_tail_and_complete_denominator(db_engine, tmp_path):
    csv = ("group,value\n" + "".join(f"P{i:04d},1\n" for i in range(1201))).encode()
    client, root, _, ids, _ = prepare_pareto(db_engine, tmp_path, csv)
    _, frozen_url = freeze(client, root, ids)
    tail = client.get(frozen_url, params={"offset": 1200, "limit": 100}).json()
    assert tail["total_rows"] == 1201 and len(tail["rows"]) == 1
    assert tail["rows"][0]["cumulative_value"] == "1201"
    assert tail["rows"][0]["cumulative_percent"] == "100.000000000000"
    assert tail["rows"][0]["share_exact"] == "1/1201"
