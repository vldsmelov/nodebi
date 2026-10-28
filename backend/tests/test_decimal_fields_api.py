from uuid import uuid4

from tests.test_report_editing import example, save_workflow


def test_field_wire_precision_survives_report_and_release_restore(db_engine, tmp_path):
    client, project, ids, body = example(db_engine, tmp_path)
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    aggregate = next(n for n in graph["nodes"] if n["type"] == "group_by")
    exact_id, formula_id, append_id = [str(uuid4()) for _ in range(3)]
    for identity, kind, version, config in (
        (
            exact_id,
            "calculated_column",
            2,
            {
                "name": "Precise",
                "expression": f"[{body['measures'][0]['column_id']}] + 0.00000001",
                "scale": 8,
            },
        ),
        (formula_id, "field_formula", 1, {"expression": "coalesce(a, None)"}),
        (append_id, "append_field", 1, {"name": "Copy"}),
    ):
        graph["nodes"].append(
            {
                "id": identity,
                "type": kind,
                "version": version,
                "position": {"x": 100, "y": 100},
                "config": config,
            }
        )
    incoming = next(e for e in graph["edges"] if e["target_node_id"] == aggregate["id"])
    incoming["source_node_id"] = append_id
    aggregate["config"]["aggregations"][0]["column_id"] = f"calc_{append_id.replace('-', '')}"
    for start, end, port, output, column in (
        (source["id"], exact_id, "input", "dataset", None),
        (exact_id, formula_id, "a", "dataset", f"calc_{exact_id.replace('-', '')}"),
        (exact_id, append_id, "table", "dataset", None),
        (formula_id, append_id, "value", "value", None),
    ):
        graph["edges"].append(
            {
                "id": str(uuid4()),
                "source_node_id": start,
                "source_port": output,
                "target_node_id": end,
                "target_port": port,
                "source_column_id": column,
            }
        )
    save_workflow(client, graph)
    preview = client.post(
        f"/api/v1/workflows/{ids['workflow_id']}/nodes/{formula_id}/preview", json={}
    )
    assert preview.status_code == 200, preview.text
    assert preview.json()["columns"][0]["metadata"]["scale"] == 8
    assert preview.json()["rows"][0]["value"] == "0.10000001"
    result = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert result.status_code == 200, result.text
    assert [row["Revenue"] for row in result.json()["rows"]] == ["0.30000002", "0.50000001"]
    root = f"/api/v1/projects/{project}"
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    created = client.post(
        f"{root}/releases",
        json={
            "name": "Exact field wires",
            "period": "October",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert created.status_code == 200, created.text
    release = client.get(f"{root}/releases").json()[0]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored fields"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    again = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert again.status_code == 200, again.text
    assert again.json()["rows"] == result.json()["rows"]
