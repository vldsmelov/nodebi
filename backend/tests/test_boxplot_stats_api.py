from uuid import uuid4

from tests.test_report_editing import save_workflow
from tests.test_sources_api import create_project, make_client


def prepare_boxplot(db_engine, tmp_path, port="outliers", csv=None):
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}"
    source = client.post(
        f"{root}/imports",
        data={"connector": "csv"},
        files={
            "file": (
                "values.csv",
                csv or b"group,value\nA,-100\nA,1\nA,2\nA,3\nA,4\nA,5\nA,6\nA,7\nA,8\nA,100\nB,\n",
            )
        },
    ).json()
    profile = client.post(
        f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": "table"}
    ).json()["profile"]
    snapshot = client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={"profile": profile, "expected_revision": 1, "request_id": str(uuid4())},
    ).json()
    value, group = profile["fields"][1]["field_id"], profile["fields"][0]["field_id"]
    built = client.post(
        f"{root}/report-builder/apply",
        json={
            "request_id": str(uuid4()),
            "source_id": source["id"],
            "resource_id": "table",
            "expected_snapshot_id": snapshot["id"],
            "name": "Distribution",
            "dimensions": [group],
            "measures": [{"column_id": value, "operation": "sum", "name": "Value"}],
        },
    )
    assert built.status_code == 200, built.text
    ids = built.json()
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    source_node = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    stats_id = str(uuid4())
    graph["nodes"].append(
        {
            "id": stats_id,
            "type": "boxplot_stats",
            "version": 1,
            "position": {"x": 400, "y": 400},
            "config": {"value_column_id": value, "group_column_id": group},
        }
    )
    graph["edges"].append(
        {
            "id": str(uuid4()),
            "source_node_id": source_node["id"],
            "source_port": "dataset",
            "target_node_id": stats_id,
            "target_port": "input",
        }
    )
    graph["result_catalog"]["outputs"][0].update(node_id=stats_id, port=port)
    graph = save_workflow(client, graph)
    return client, root, graph, ids, stats_id


def test_boxplot_named_outputs_full_population_publication_and_release(db_engine, tmp_path):
    client, root, graph, ids, stats_id = prepare_boxplot(db_engine, tmp_path)
    url = f"/api/v1/workflows/{graph['id']}/nodes/{stats_id}/preview"
    summary = client.post(url, json={"limit": 1, "output_port": "dataset"})
    assert summary.status_code == 200, summary.text
    row = summary.json()["rows"][0]
    assert (row["count"], row["q1"], row["median"], row["q3"], row["outlier_count"]) == (
        10,
        "2.25",
        "4.50",
        "6.75",
        2,
    )
    assert summary.json()["total_rows"] == 2
    second = client.post(url, json={"offset": 1, "limit": 1}).json()["rows"][0]
    assert second["count"] == 0 and second["missing_count"] == 1 and second["median"] is None
    outliers = client.post(url, json={"output_port": "outliers"})
    assert outliers.status_code == 200, outliers.text
    assert [r["value"] for r in outliers.json()["rows"]] == [-100, 100]
    selected = [
        c["column_id"] for c in outliers.json()["columns"] if c["engine_name"] in {"group", "value"}
    ]
    saved = client.put(
        f"/api/v1/visualizations/{ids['visualization_id']}",
        json={
            "workflow_id": graph["id"],
            "publication_id": ids["publication_id"],
            "expected_workflow_revision": graph["revision"],
            "expected_revision": 1,
            "name": "Outliers",
            "type": "table",
            "config": {"column_ids": selected},
        },
    )
    assert saved.status_code == 200, saved.text
    live = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert live.status_code == 200, live.text
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Statistics",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release = client.get(f"{root}/releases").json()[0]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored statistics"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert after.status_code == 200, after.text
    assert [list(r.values()) for r in after.json()["rows"]] == [["A", -100], ["A", 100]]
