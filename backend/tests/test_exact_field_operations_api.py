from uuid import uuid4

import pytest
from test_report_editing import example, save_workflow


def prepare_exact_fields(db_engine, tmp_path, formula=False):
    client, project, ids, request = example(db_engine, tmp_path)
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    constant, calc, total = [str(uuid4()) for _ in range(3)]
    for identity, kind, config in (
        (constant, "scalar_constant", {"value": "0.00000001", "scale": 8}),
        (
            calc,
            "field_formula" if formula else "field_arithmetic",
            {"expression": "a / 3 * 3 + b", "scale": 8}
            if formula
            else {"operation": "add", "scale": 8},
        ),
        (total, "field_sum", {}),
    ):
        graph["nodes"].append(
            {
                "id": identity,
                "type": kind,
                "version": 2,
                "position": {"x": 200, "y": 200},
                "config": config,
            }
        )
    for start, end, port, output, column in (
        (source["id"], calc, "a", "dataset", request["measures"][0]["column_id"]),
        (constant, calc, "b", "value", None),
        (source["id"], total, "table", "dataset", None),
        (calc, total, "value", "value", None),
    ):
        graph["edges"].append(
            {
                "id": str(uuid4()),
                "source_node_id": start,
                "source_port": output,
                "source_column_id": column,
                "target_node_id": end,
                "target_port": port,
            }
        )
    publication = graph["result_catalog"]["outputs"][0]
    publication.update(node_id=total, port="value", kind="scalar")
    graph = save_workflow(client, graph)
    visual = client.get(f"/api/v1/visualizations/{ids['visualization_id']}").json()
    saved = client.put(
        f"/api/v1/visualizations/{ids['visualization_id']}",
        json={
            "workflow_id": graph["id"],
            "publication_id": publication["id"],
            "expected_workflow_revision": graph["revision"],
            "expected_revision": visual["revision"],
            "name": "Exact KPI",
            "type": "kpi",
            "config": {"spec": {"type": "kpi"}, "decimals": 8},
        },
    )
    assert saved.status_code == 200, saved.text
    return client, project, ids, graph, total


@pytest.mark.parametrize("formula", [False, True])
def test_exact_fields_preview_publication_release_restore_and_fresh_cache(
    db_engine, tmp_path, formula
):
    client, project, ids, graph, total = prepare_exact_fields(db_engine, tmp_path, formula)
    preview = client.post(f"/api/v1/workflows/{graph['id']}/nodes/{total}/preview", json={})
    assert preview.status_code == 200, preview.text
    assert preview.json()["rows"] == [{"value": "0.80000003"}]
    assert preview.json()["columns"][0]["metadata"]["scale"] == 8
    result = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert result.status_code == 200, result.text
    assert result.json()["rows"] == [{"value": "0.80000003"}]
    root = f"/api/v1/projects/{project}"
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Exact fields",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release = client.get(f"{root}/releases").json()[0]
    dashboard = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    frozen = client.get(
        f"/api/v1/releases/{release['id']}/widgets/{dashboard['widgets'][0]['id']}/result"
    )
    assert frozen.json()["rows"] == result.json()["rows"]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored exact fields"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert after.status_code == 200, after.text
    assert after.json()["rows"] == result.json()["rows"]
