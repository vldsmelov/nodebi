from copy import deepcopy

import pytest

from tests.test_boxplot_stats_api import prepare_boxplot
from tests.test_report_editing import save_workflow


def test_box_plot_upstream_context_filters_both_outputs_including_all_missing_group(
    db_engine, tmp_path
):
    from uuid import uuid4

    client, root, graph, ids, stats_id = prepare_boxplot(db_engine, tmp_path, "dataset")
    identity = str(uuid4())
    source = next(node for node in graph["nodes"] if node["type"] == "dataset_source")
    stats = next(node for node in graph["nodes"] if node["id"] == stats_id)
    graph["result_catalog"]["outputs"][0]["context_ids"] = [identity]
    graph["result_catalog"]["contexts"] = [
        {
            "id": identity,
            "name": "Group",
            "roles": [{"name": "group", "logical_type": "string"}],
            "points": [
                {
                    "node_id": source["id"],
                    "port": "dataset",
                    "column_id": stats["config"]["group_column_id"],
                    "role": "group",
                }
            ],
        }
    ]
    graph = save_workflow(client, graph)
    request = box_request(client, graph, ids)
    request["context"] = {"values": {"group": "B"}}
    response = client.post(f"{root}/visualizations/preview", json=request)
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["applied_context"]
    assert result["datasets"]["outliers"]["total_rows"] == 0
    assert len(result["rows"]) == 1
    assert result["rows"][0]["group"] == "B"
    assert result["rows"][0]["count"] == 0
    assert result["rows"][0]["missing_count"] == 1
    assert result["rows"][0]["median"] is None
    request["context"] = {"values": {"group": "missing"}}
    empty = client.post(f"{root}/visualizations/preview", json=request)
    assert empty.status_code == 200, empty.text
    assert empty.json()["rows"] == []
    assert empty.json()["datasets"]["outliers"]["total_rows"] == 0


def box_request(client, graph, ids):
    response = client.get(
        f"/api/v1/workflows/{graph['id']}/publications/{ids['publication_id']}/schema"
    )
    assert response.status_code == 200, response.text
    return {
        "workflow_id": graph["id"],
        "publication_id": ids["publication_id"],
        "expected_workflow_revision": graph["revision"],
        "expected_revision": 1,
        "name": "Distribution",
        "type": "box_plot",
        "config": {"spec": response.json()["suggested_specs"][0]},
    }


def test_box_plot_contract_paging_copy_and_frozen_restore(db_engine, tmp_path, monkeypatch):
    from app.nodes.boxplot_stats import BoxPlotStatsExecutor

    executions = []
    original = BoxPlotStatsExecutor.execute_outputs

    def counted(self, *args, **kwargs):
        executions.append(1)
        return original(self, *args, **kwargs)

    monkeypatch.setattr(BoxPlotStatsExecutor, "execute_outputs", counted)
    # More outliers than a preview AND release page; statistics still use every observation.
    data = b"group,value\n" + b"A,0\n" * 5000 + b"A,100\n" * 1100 + b"B,\n"
    client, root, graph, ids, stats_id = prepare_boxplot(db_engine, tmp_path, "dataset", data)
    request = box_request(client, graph, ids)
    registry = client.get("/api/v1/visualization-types").json()
    assert registry[0]["datasets"] == {"summary": "dataset", "outliers": "outliers"}
    preview = client.post(f"{root}/visualizations/preview", json=request)
    assert preview.status_code == 200, preview.text
    assert len(executions) == 1
    # Separate request: the old table still selects obsolete fields, not a server crash.
    obsolete = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert obsolete.status_code == 422, obsolete.text
    assert obsolete.json()["detail"]["code"] == "INVALID_VISUALIZATION"
    assert preview.json()["datasets"]["outliers"]["truncated"]
    assert preview.json()["datasets"]["outliers"]["total_rows"] == 1100
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    saved = client.put(url, json=request)
    assert saved.status_code == 200, saved.text
    result = client.post(f"{url}/result", json={"offset": 1099, "limit": 1}).json()
    summary, points = result["datasets"]["summary"], result["datasets"]["outliers"]
    assert len(summary["rows"]) == 2 and summary["rows"][0]["count"] == 6100
    assert summary["rows"][0]["median"] == "0.00"
    assert summary["rows"][1]["median"] is None
    assert points["rows"][0]["value"] == 100 and not points["truncated"]
    assert points["rows"][0]["group_id"] == summary["rows"][0]["group_id"]
    # Appearance-only old clients must retain the typed bindings when copying/updating.
    request["expected_revision"] = 2
    request["config"] = {"title": "Copy"}
    copied = client.post(f"{url}/copy", json=request)
    assert copied.status_code == 201, copied.text
    assert copied.json()["config"]["spec"] == result["spec"]
    updated = client.put(url, json=request)
    assert updated.status_code == 200, updated.text
    stale = client.put(url, json=request)
    assert stale.status_code == 409
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Distribution",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release = client.get(f"{root}/releases").json()[0]
    board = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    frozen_url = f"/api/v1/releases/{release['id']}/widgets/{board['widgets'][0]['id']}/result"
    frozen = client.get(frozen_url, params={"offset": 1099, "limit": 1})
    assert frozen.status_code == 200, frozen.text
    assert frozen.json()["datasets"] == result["datasets"]
    restored = client.post(f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored"})
    assert restored.status_code == 200, restored.text
    visuals = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"]
    after = client.post(f"/api/v1/visualizations/{visuals[0]['id']}/result", json={"limit": 1})
    assert after.status_code == 200, after.text
    assert after.json()["spec"] != result["spec"]  # Restored node/field identities are remapped.
    assert after.json()["rows"][0]["count"] == 6100
    # Change the live graph; frozen data must remain immutable.
    node = next(node for node in graph["nodes"] if node["id"] == stats_id)
    node["config"]["group_column_id"] = None
    save_workflow(client, graph)
    assert (
        client.get(frozen_url, params={"offset": 1099, "limit": 1}).json()["datasets"]
        == result["datasets"]
    )


@pytest.mark.parametrize("case", ["field", "version", "extra", "type", "port", "context"])
def test_box_plot_rejects_incompatible_bindings_without_saving(db_engine, tmp_path, case):
    client, root, graph, ids, stats_id = prepare_boxplot(db_engine, tmp_path, "dataset")
    request = box_request(client, graph, ids)
    if case == "field":
        request["config"]["spec"]["summary"]["median"] = "wrong-field"
    elif case == "version":
        request["config"]["spec"]["version"] = 2
    elif case == "extra":
        request["config"]["spec"]["echarts"] = {"script": "invalid"}
    elif case == "type":
        request["type"] = "table"
    elif case == "port":
        graph["result_catalog"]["outputs"][0]["port"] = "outliers"
        graph = save_workflow(client, graph)
        request["expected_workflow_revision"] = graph["revision"]
    elif case == "context":
        from uuid import uuid4

        identity = str(uuid4())
        graph["result_catalog"]["outputs"][0]["context_ids"] = [identity]
        graph["result_catalog"]["contexts"] = [
            {
                "id": identity,
                "name": "Group",
                "roles": [{"name": "group", "logical_type": "string"}],
                "points": [
                    {
                        "node_id": stats_id,
                        "port": "dataset",
                        "column_id": request["config"]["spec"]["summary"]["group"],
                        "role": "group",
                    }
                ],
            }
        ]
        graph = save_workflow(client, graph)
        request["expected_workflow_revision"] = graph["revision"]
    before = client.get(f"{root}/visualizations").json()
    for endpoint in ("visualizations", "visualizations/preview"):
        response = client.post(f"{root}/{endpoint}", json=deepcopy(request))
        assert response.status_code in (400, 422), response.text
    assert client.get(f"{root}/visualizations").json() == before
