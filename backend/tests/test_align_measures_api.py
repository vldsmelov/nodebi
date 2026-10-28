from uuid import uuid4

from tests.test_report_editing import example, save_workflow


def aligned_example(db_engine, tmp_path):
    client, project, ids, request = example(db_engine, tmp_path)
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    group = next(n for n in graph["nodes"] if n["type"] == "group_by")
    visual = client.get(f"/api/v1/visualizations/{ids['visualization_id']}").json()
    value = visual["config"]["value_column_id"]
    key = request["dimensions"][0]
    calc_id, filter_id, align_id = (str(uuid4()) for _ in range(3))
    calculated = f"calc_{calc_id.replace('-', '')}"
    nodes = [
        (
            calc_id,
            "calculated_column",
            2,
            {"name": "Plan", "expression": f"[{value}]*2", "scale": 2},
        ),
        (
            filter_id,
            "filter",
            1,
            {"conditions": [{"column_id": key, "operator": "equals", "value": "A"}]},
        ),
        (
            align_id,
            "align_measures",
            1,
            {
                "keys": [{"left_key": key, "right_key": key}],
                "left_value": value,
                "right_value": calculated,
                "left_name": "Actual",
                "right_name": "Plan",
            },
        ),
    ]
    for index, (identity, kind, version, config) in enumerate(nodes):
        graph["nodes"].append(
            {
                "id": identity,
                "type": kind,
                "version": version,
                "config": config,
                "position": {"x": 300 + index * 250, "y": 200},
            }
        )
    for source, target, port in [
        (group["id"], calc_id, "input"),
        (calc_id, filter_id, "input"),
        (group["id"], align_id, "left"),
        (filter_id, align_id, "right"),
    ]:
        graph["edges"].append(
            {
                "id": str(uuid4()),
                "source_node_id": source,
                "source_port": "dataset",
                "target_node_id": target,
                "target_port": port,
            }
        )
    publication = graph["result_catalog"]["outputs"][0]
    publication["node_id"] = align_id
    graph = save_workflow(client, graph)
    return client, project, ids, graph, align_id


def test_alignment_preview_and_release_restore(db_engine, tmp_path):
    client, project, ids, graph, align_id = aligned_example(db_engine, tmp_path)
    preview_url = f"/api/v1/workflows/{graph['id']}/nodes/{align_id}/preview"
    response = client.post(preview_url, json={"limit": 1})
    assert response.status_code == 200, response.text
    preview = response.json()
    assert len(preview["rows"]) == 1
    assert preview["total_rows"] == 2
    assert preview["alignment_diagnostics"] == {
        "node_id": align_id,
        "matched_rows": 1,
        "left_only_rows": 1,
        "right_only_rows": 0,
        "result_rows": 2,
    }
    full = client.post(preview_url, json={}).json()
    assert [list(row.values()) for row in full["rows"]] == [
        ["A", "0.30", "0.60", True, True],
        ["B", "0.50", None, True, False],
    ]
    columns = [c["column_id"] for c in preview["columns"]]
    updated = client.put(
        f"/api/v1/visualizations/{ids['visualization_id']}",
        json={
            "workflow_id": graph["id"],
            "publication_id": graph["result_catalog"]["outputs"][0]["id"],
            "expected_workflow_revision": graph["revision"],
            "expected_revision": 1,
            "name": "Aligned",
            "type": "table",
            "config": {"column_ids": columns},
        },
    )
    assert updated.status_code == 200, updated.text
    before = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={}).json()
    root = f"/api/v1/projects/{project}"
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Aligned",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release = client.get(f"{root}/releases").json()[0]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored alignment"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert after.status_code == 200, after.text
    assert [list(row.values()) for row in after.json()["rows"]] == [
        list(row.values()) for row in before["rows"]
    ]
    assert after.json()["columns"][0]["column_id"] != columns[0]


def test_alignment_errors_identify_node_without_changing_graph(db_engine, tmp_path):
    client, _, _, graph, align_id = aligned_example(db_engine, tmp_path)
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    group = next(n for n in graph["nodes"] if n["type"] == "group_by")
    for edge in graph["edges"]:
        if edge["target_node_id"] == align_id and edge["target_port"] == "left":
            edge["source_node_id"] = source["id"]
    node = next(n for n in graph["nodes"] if n["id"] == align_id)
    node["config"]["left_value"] = group["config"]["aggregations"][0]["column_id"]
    graph = save_workflow(client, graph)
    root = f"/api/v1/workflows/{graph['id']}"
    failed = client.post(f"{root}/nodes/{align_id}/preview", json={"limit": 1})
    assert failed.status_code == 400, failed.text
    issue = failed.json()["detail"]
    assert issue["node_id"] == align_id
    assert "not unique" in issue["message"]
    assert client.get(root).json() == graph
