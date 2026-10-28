from test_exact_field_operations_api import prepare_exact_fields
from test_report_editing import save_workflow


def prepare(db_engine, tmp_path):
    client, project, ids, graph, total = prepare_exact_fields(db_engine, tmp_path, formula=True)
    parameter = next(n for n in graph["nodes"] if n["type"] == "scalar_constant")
    parameter.update(type="scalar_parameter", version=1, config={"name": "adjustment"})
    graph["parameters"] = [
        {
            "name": "adjustment",
            "logical_type": "decimal",
            "precision": 38,
            "scale": 8,
            "default": "0.00000001",
        }
    ]
    graph = save_workflow(client, graph)
    return client, project, ids, graph, total


def test_decimal_parameter_preview_choices_binding_release_and_restore(db_engine, tmp_path):
    client, project, ids, graph, total = prepare(db_engine, tmp_path)
    endpoint = f"/api/v1/workflows/{graph['id']}/nodes/{total}/preview"
    for value, expected in [("0.00000001", "0.80000003"), ("0.00000002", "0.80000006")]:
        result = client.post(endpoint, json={"parameters": {"adjustment": value}})
        assert result.status_code == 200, result.text
        assert result.json()["rows"] == [{"value": expected}]
    for value in (0.1, "1.000000001", "NaN"):
        assert client.post(endpoint, json={"parameters": {"adjustment": value}}).status_code == 422
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    column = next(e["source_column_id"] for e in graph["edges"] if e.get("source_column_id"))
    choices = client.post(
        f"/api/v1/workflows/{graph['id']}/nodes/{source['id']}/values",
        json={"column_id": column, "selected_value": "0.2", "limit": 1},
    )
    assert choices.status_code == 200, choices.text
    assert choices.json()["values"] == ["0.10"]
    assert choices.json()["selected"] == {"value": "0.20", "label": "0.20"}
    board_url = f"/api/v1/dashboards/{ids['dashboard_id']}"
    board = client.get(board_url).json()
    board["configuration"]["parameters"] = [{**graph["parameters"][0], "name": "chosen"}]
    board["configuration"]["bindings"] = [
        {
            "workflow_id": graph["id"],
            "workflow_parameter": "adjustment",
            "dashboard_parameter": "chosen",
        }
    ]
    saved = client.put(
        board_url,
        json={
            "name": board["name"],
            "expected_revision": board["revision"],
            "widgets": board["widgets"],
            "configuration": board["configuration"],
        },
    )
    assert saved.status_code == 200, saved.text
    board = saved.json()
    incompatible = {
        **board["configuration"],
        "parameters": [{**board["configuration"]["parameters"][0], "scale": 9}],
    }
    rejected = client.put(
        board_url,
        json={
            "name": board["name"],
            "expected_revision": board["revision"],
            "widgets": board["widgets"],
            "configuration": incompatible,
        },
    )
    assert rejected.status_code == 422, rejected.text
    assert client.get(board_url).json()["revision"] == board["revision"]
    root = f"/api/v1/projects/{project}"
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Parameterized exact result",
            "period": "2026",
            "dashboard_ids": [board["id"]],
            "expected_token": check["check"]["token"],
            "dashboard_contexts": {board["id"]: {"values": {"chosen": "0.00000002"}}},
        },
    )
    assert released.status_code == 200, released.text
    release = client.get(f"{root}/releases").json()[0]
    frozen = client.get(
        f"/api/v1/releases/{release['id']}/widgets/{board['widgets'][0]['id']}/result"
    )
    assert frozen.json()["rows"] == [{"value": "0.80000006"}]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored decimal parameters"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(
        f"/api/v1/visualizations/{visual['id']}/result",
        json={"parameters": {"adjustment": "0.00000002"}},
    )
    assert after.status_code == 200, after.text
    assert after.json()["rows"] == frozen.json()["rows"]


def test_large_decimal_scalar_choices_remain_strings_and_exact(db_engine, tmp_path):
    client, _, _, graph, _ = prepare(db_engine, tmp_path)
    parameter = next(n for n in graph["nodes"] if n["type"] == "scalar_parameter")
    identity = f"value_{parameter['id'].replace('-', '')}"
    value = "9007199254740993.12345678"
    response = client.post(
        f"/api/v1/workflows/{graph['id']}/nodes/{parameter['id']}/values",
        json={
            "column_id": identity,
            "output_port": "value",
            "selected_value": value,
            "parameters": {"adjustment": value},
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["values"] == [value]
    assert response.json()["selected"] == {"value": value, "label": value}
