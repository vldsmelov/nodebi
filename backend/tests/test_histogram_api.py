from copy import deepcopy

from tests.test_boxplot_stats_api import prepare_boxplot
from tests.test_report_editing import save_workflow


def test_typed_spec_union_preserves_legacy_box_defaults():
    from uuid import uuid4

    from app.domain.visualization_specs import box_plot_spec
    from app.domain.visualizations import VisualizationConfig

    spec = box_plot_spec(uuid4())
    legacy = spec.model_dump(exclude={"type", "version"})
    assert VisualizationConfig(spec=legacy).spec == spec


def test_histogram_full_counts_typed_rendering_releases_and_restore(db_engine, tmp_path):
    from uuid import uuid4

    client, root, graph, ids, stats_id = prepare_boxplot(db_engine, tmp_path, "dataset")
    node = next(node for node in graph["nodes"] if node["id"] == stats_id)
    node["type"] = "histogram"
    node["config"] = {
        "value_column_id": node["config"]["value_column_id"],
        "bin_count": 4,
        "range_min": "0",
        "range_max": "8",
    }
    graph = save_workflow(client, graph)
    schema = client.get(
        f"/api/v1/workflows/{graph['id']}/publications/{ids['publication_id']}/schema"
    )
    assert schema.status_code == 200, schema.text
    spec = schema.json()["suggested_specs"][0]
    assert spec["type"] == "histogram_chart"
    payload = {
        "workflow_id": graph["id"],
        "publication_id": ids["publication_id"],
        "expected_workflow_revision": graph["revision"],
        "expected_revision": 1,
        "name": "Distribution",
        "type": "histogram_chart",
        "config": {"spec": spec},
    }
    preview = client.post(f"{root}/visualizations/preview", json=payload)
    assert preview.status_code == 200, preview.text
    data = preview.json()
    assert [row["count"] for row in data["rows"]] == [1, 2, 2, 3]
    assert data["datasets"]["summary"]["rows"][0] == {
        "input_count": 11,
        "valid_count": 10,
        "missing_count": 1,
        "included_count": 8,
        "below_count": 1,
        "above_count": 1,
        "bin_count": 4,
        "range_min": "0",
        "range_max": "8",
    }
    bad = deepcopy(payload)
    bad["config"]["spec"]["bins"]["count"] = "wrong"
    assert client.post(f"{root}/visualizations/preview", json=bad).status_code == 422
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    live = client.post(f"{url}/result", json={"limit": 1})
    assert live.status_code == 200, live.text
    assert live.json()["rows"] == data["rows"]  # Limits do not recalculate or truncate bins.
    payload["expected_revision"] = 2
    payload["config"] = {"title": "Appearance only", "orientation": "horizontal"}
    updated = client.put(url, json=payload)
    assert updated.status_code == 200, updated.text
    assert updated.json()["config"]["spec"] == spec
    assert client.put(url, json=payload).status_code == 409
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    release = client.post(
        f"{root}/releases",
        json={
            "name": "Histogram",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert release.status_code == 200, release.text
    release_id = client.get(f"{root}/releases").json()[0]["id"]
    board = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    frozen = client.get(f"/api/v1/releases/{release_id}/widgets/{board['widgets'][0]['id']}/result")
    assert frozen.status_code == 200, frozen.text
    assert frozen.json()["datasets"] == data["datasets"]
    restored = client.post(
        f"/api/v1/releases/{release_id}/restore", json={"name": "Restored histogram"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert after.status_code == 200, after.text
    assert after.json()["spec"] != spec
    assert [row["count"] for row in after.json()["rows"]] == [1, 2, 2, 3]
    # Context filtering must precede bin assignment and population accounting alike.
    context_id = str(uuid4())
    source_node = next(item for item in graph["nodes"] if item["type"] == "dataset_source")
    graph["result_catalog"]["outputs"][0]["context_ids"] = [context_id]
    graph["result_catalog"]["contexts"] = [
        {
            "id": context_id,
            "name": "Selected value",
            "roles": [{"name": "selected_value", "logical_type": "integer"}],
            "points": [
                {
                    "node_id": source_node["id"],
                    "port": "dataset",
                    "role": "selected_value",
                    "column_id": node["config"]["value_column_id"],
                }
            ],
        }
    ]
    graph = save_workflow(client, graph)
    filtered = client.post(f"{url}/result", json={"context": {"values": {"selected_value": 2}}})
    assert filtered.status_code == 200, filtered.text
    assert [row["count"] for row in filtered.json()["rows"]] == [0, 1, 0, 0]
    assert filtered.json()["datasets"]["summary"]["rows"][0]["input_count"] == 1
    graph["result_catalog"]["contexts"][0]["points"][0].update(
        node_id=stats_id,
        column_id=spec["bins"]["count"],
    )
    save_workflow(client, graph)
    rejected = client.post(f"{url}/result", json={"context": {"values": {"selected_value": 2}}})
    assert rejected.status_code == 422
    assert "before Histogram" in rejected.json()["detail"]["message"]
    # Frozen data does not inherit later live restrictions.
    frozen_after = client.get(
        f"/api/v1/releases/{release_id}/widgets/{board['widgets'][0]['id']}/result"
    )
    assert frozen_after.json()["datasets"] == data["datasets"]
