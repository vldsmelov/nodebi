from uuid import UUID, uuid4

import pytest

from app.domain.funnel import funnel_spec
from tests.test_boxplot_stats_api import prepare_boxplot
from tests.test_report_editing import save_workflow
from tests.test_waterfall_api import freeze


def prepare(db_engine, tmp_path, csv=None):
    client, root, graph, ids, node_id = prepare_boxplot(
        db_engine,
        tmp_path,
        "dataset",
        csv=csv or b"group,value,order\nSale,20,30\nLead,100,10\nQualified,40,20\n",
    )
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    preview = client.post(
        f"/api/v1/workflows/{graph['id']}/nodes/{source['id']}/preview", json={}
    ).json()
    order = next(c["column_id"] for c in preview["columns"] if c["display_name"] == "order")
    node = next(n for n in graph["nodes"] if n["id"] == node_id)
    node.update(
        type="funnel_steps",
        config=dict(
            stage_column_id=node["config"]["group_column_id"],
            value_column_id=node["config"]["value_column_id"],
            order_column_id=order,
        ),
    )
    graph = save_workflow(client, graph)
    payload = dict(
        workflow_id=graph["id"],
        publication_id=ids["publication_id"],
        expected_workflow_revision=graph["revision"],
        expected_revision=1,
        name="Funnel",
        type="funnel_chart",
        config={"spec": funnel_spec(UUID(node_id)).model_dump(mode="json")},
    )
    return client, root, graph, ids, node_id, payload


def test_preview_complete_chart_retry_copy_freeze_and_restore(db_engine, tmp_path):
    client, root, graph, ids, node_id, payload = prepare(db_engine, tmp_path)
    schema = client.get(
        f"/api/v1/workflows/{graph['id']}/publications/{ids['publication_id']}/schema"
    ).json()
    assert schema["suggested_specs"] == [payload["config"]["spec"]]
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    before = client.get(url).json()
    preview = client.post(f"{root}/visualizations/preview", json=payload)
    assert preview.status_code == 200, preview.text
    body = preview.json()
    assert client.get(url).json() == before
    assert [p["width"] for p in body["funnel"]["points"]] == [1, 0.4, 0.2]
    assert body["rows"][2]["previous_percent"] == "50.000000000000"
    payload["request_id"] = str(uuid4())
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    assert client.put(url, json=payload).json() == saved.json()
    assert client.put(url, json={**payload, "request_id": str(uuid4())}).status_code == 409
    # A chart is a complete <=50-stage sequence even with ordinary paging arguments.
    result = client.post(f"{url}/result", json={"offset": 2, "limit": 1}).json()
    assert len(result["rows"]) == 3 and not result["truncated"]
    copy = client.post(
        f"{url}/copy",
        json={
            **payload,
            "expected_revision": 2,
            "request_id": str(uuid4()),
            "config": {"title": "Copy"},
        },
    )
    assert copy.status_code == 201, copy.text
    assert copy.json()["config"]["spec"] == payload["config"]["spec"]
    release, frozen_url = freeze(client, root, ids)
    frozen = client.get(frozen_url, params={"offset": 2, "limit": 1}).json()
    assert frozen["funnel"] == result["funnel"] and frozen["rows"] == result["rows"]
    restored = client.post(f"/api/v1/releases/{release}/restore", json={"name": "Restored funnel"})
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert after.status_code == 200, after.text
    # Restored projects get fresh node/point namespaces, with all business values preserved.
    assert [{k: v for k, v in row.items() if k != "point_id"} for row in after.json()["rows"]] == [
        {k: v for k, v in row.items() if k != "point_id"} for row in result["rows"]
    ]
    assert [p["id"] for p in after.json()["funnel"]["points"]] == [
        r["point_id"] for r in after.json()["rows"]
    ]
    node_preview = client.post(
        f"/api/v1/workflows/{graph['id']}/nodes/{node_id}/preview", json={"output_port": "summary"}
    )
    assert node_preview.json()["rows"][0]["overall_exact"] == "0.2"


@pytest.mark.parametrize("failure", ["growth", "role", "spec", "orientation", "series", "context"])
def test_invalid_save_is_atomic(db_engine, tmp_path, failure):
    client, _, graph, ids, node_id, payload = prepare(
        db_engine, tmp_path, b"group,value,order\nA,10,1\nB,20,2\n" if failure == "growth" else None
    )
    if failure == "role":
        payload["config"]["spec"]["rows"]["value"] = "missing"
    if failure == "spec":
        payload["type"] = "bar_chart"
    if failure == "orientation":
        payload["config"]["orientation"] = "horizontal"
    if failure == "series":
        payload["config"]["additional_series"] = [
            {"column_id": payload["config"]["spec"]["rows"]["value"]}
        ]
    if failure == "context":
        context_id = str(uuid4())
        graph["result_catalog"]["outputs"][0]["context_ids"] = [context_id]
        graph["result_catalog"]["contexts"] = [
            dict(
                id=context_id,
                name="Stage",
                roles=[dict(name="stage", logical_type="string")],
                points=[
                    dict(
                        node_id=node_id,
                        port="dataset",
                        role="stage",
                        column_id=payload["config"]["spec"]["rows"]["stage"],
                    )
                ],
            )
        ]
        graph = save_workflow(client, graph)
        payload["expected_workflow_revision"] = graph["revision"]
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    before = client.get(url).json()
    failed = client.put(url, json=payload)
    assert failed.status_code == 422, failed.text
    assert client.get(url).json() == before


def test_complete_fifty_stage_release_and_upstream_population_restriction(db_engine, tmp_path):
    csv = (
        "group,value,order,segment\n"
        + "".join(f"P{i},{50 - i},{i},{'keep' if i < 25 else 'omit'}\n" for i in range(50))
    ).encode()
    client, root, graph, ids, _, payload = prepare(db_engine, tmp_path, csv)
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    original = client.post(f"{url}/result", json={"offset": 49, "limit": 1}).json()
    assert len(original["rows"]) == 50
    assert original["rows"][-1]["initial_exact"] == "0.02"
    _, frozen_url = freeze(client, root, ids)
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    source_preview = client.post(
        f"/api/v1/workflows/{graph['id']}/nodes/{source['id']}/preview", json={}
    ).json()
    segment = next(
        c["column_id"] for c in source_preview["columns"] if c["display_name"] == "segment"
    )
    identity = str(uuid4())
    graph["result_catalog"]["outputs"][0]["context_ids"] = [identity]
    graph["result_catalog"]["contexts"] = [
        dict(
            id=identity,
            name="Segment",
            roles=[dict(name="segment", logical_type="string")],
            points=[dict(node_id=source["id"], port="dataset", role="segment", column_id=segment)],
        )
    ]
    save_workflow(client, graph)
    filtered = client.post(f"{url}/result", json={"context": {"values": {"segment": "keep"}}})
    assert filtered.status_code == 200, filtered.text
    assert len(filtered.json()["rows"]) == 25
    assert filtered.json()["rows"][-1]["initial_exact"] == "0.52"
    assert filtered.json()["funnel"]["points"][0]["id"] == original["funnel"]["points"][0]["id"]
    frozen = client.get(frozen_url, params={"offset": 49, "limit": 1}).json()
    assert frozen["rows"] == original["rows"] and frozen["funnel"] == original["funnel"]
