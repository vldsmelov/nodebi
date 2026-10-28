from uuid import UUID, uuid4

import pytest

from app.domain.visualization_specs import pareto_spec
from tests.test_boxplot_stats_api import prepare_boxplot
from tests.test_pareto_api import prepare_pareto
from tests.test_report_editing import save_workflow
from tests.test_waterfall_api import freeze


def chart_payload(graph, ids, node_id):
    return {
        "workflow_id": graph["id"],
        "publication_id": ids["publication_id"],
        "expected_workflow_revision": graph["revision"],
        "expected_revision": 2,
        "name": "Pareto",
        "type": "pareto_chart",
        "config": {"spec": pareto_spec(UUID(node_id)).model_dump(mode="json")},
    }


def test_pareto_typed_preview_save_copy_pages_freeze_restore(db_engine, tmp_path):
    csv = ("group,value\n" + "".join(f"P{i:04d},1\n" for i in range(2301))).encode()
    client, root, graph, ids, node_id = prepare_pareto(db_engine, tmp_path, csv)
    payload = chart_payload(graph, ids, node_id)
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
    assert len(body["rows"]) == len(body["combo"]["observations"]) == 100
    assert body["combo"]["secondary"]["maximum"] == "100"
    assert body["combo"]["observations"][0]["positions"][1] == 1 / 2301
    payload["request_id"] = str(uuid4())
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    assert client.put(url, json=payload).json() == saved.json()
    stale = {**payload, "request_id": str(uuid4())}
    assert client.put(url, json=stale).status_code == 409
    copied = client.post(
        f"{url}/copy",
        json={
            **payload,
            "request_id": str(uuid4()),
            "expected_revision": 3,
            "config": {"title": "Copy"},
        },
    )
    assert copied.status_code == 201, copied.text
    assert copied.json()["config"]["spec"] == payload["config"]["spec"]
    tail = client.post(f"{url}/result", json={"offset": 2300}).json()
    assert tail["combo"]["observations"][0]["positions"] == [1, 1]
    assert tail["datasets"]["summary"] == body["datasets"]["summary"]
    release_id, frozen_url = freeze(client, root, ids)
    frozen = client.get(frozen_url, params={"offset": 2300}).json()
    assert frozen["combo"] == tail["combo"] and frozen["datasets"] == tail["datasets"]
    restored = client.post(
        f"/api/v1/releases/{release_id}/restore", json={"name": "Restored Pareto chart"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    restored_result = client.post(
        f"/api/v1/visualizations/{visual['id']}/result", json={"offset": 2300}
    )
    assert restored_result.status_code == 200, restored_result.text
    row = restored_result.json()["rows"][0]
    assert row["cumulative_exact"] == "1" and row["category"] == "P2300"


@pytest.mark.parametrize("threshold", [0, 101, 80.5, True])
def test_pareto_rejects_invalid_reference(threshold):
    spec = pareto_spec(uuid4()).model_dump()
    spec["threshold_percent"] = threshold
    with pytest.raises(ValueError):
        type(pareto_spec(uuid4())).model_validate(spec)


def test_zero_population_and_reference_appearance_are_not_fake_percentages(db_engine, tmp_path):
    client, root, graph, ids, node_id = prepare_pareto(
        db_engine, tmp_path, b"group,value\nB,0\nA,0\n"
    )
    payload = chart_payload(graph, ids, node_id)
    payload["config"]["spec"]["threshold_percent"] = 90
    result = client.post(f"{root}/visualizations/preview", json=payload)
    assert result.status_code == 200, result.text
    assert all(item["positions"] == [0, None] for item in result.json()["combo"]["observations"])
    assert result.json()["spec"]["threshold_percent"] == 90
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    assert client.put(url, json=payload).status_code == 200
    saved = client.put(
        url, json={**payload, "expected_revision": 3, "config": {"title": "Appearance"}}
    )
    assert saved.status_code == 200, saved.text
    assert saved.json()["config"]["spec"]["threshold_percent"] == 90


def test_invalid_full_input_save_does_not_mutate_chart(db_engine, tmp_path):
    csv = ("group,value\n" + "".join(f"P{i},1\n" for i in range(101)) + "Invalid,-1\n").encode()
    client, _, graph, ids, node_id = prepare_boxplot(db_engine, tmp_path, "dataset", csv)
    node = next(n for n in graph["nodes"] if n["id"] == node_id)
    node.update(
        type="pareto",
        config={
            "category_column_id": node["config"]["group_column_id"],
            "value_column_id": node["config"]["value_column_id"],
        },
    )
    graph = save_workflow(client, graph)
    payload = chart_payload(graph, ids, node_id)
    payload["expected_revision"] = 1
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    before = client.get(url).json()
    result = client.put(url, json=payload)
    assert result.status_code == 422 and "cannot be negative" in result.text
    assert client.get(url).json() == before


def test_post_statistics_context_is_rejected(db_engine, tmp_path):
    client, _, graph, ids, node_id = prepare_pareto(db_engine, tmp_path)
    context_id = str(uuid4())
    graph["result_catalog"]["outputs"][0]["context_ids"] = [context_id]
    graph["result_catalog"]["contexts"] = [
        {
            "id": context_id,
            "name": "Wrong level",
            "roles": [{"name": "category", "logical_type": "string"}],
            "points": [
                {
                    "node_id": node_id,
                    "port": "dataset",
                    "role": "category",
                    "column_id": pareto_spec(UUID(node_id)).rows.category,
                }
            ],
        }
    ]
    graph = save_workflow(client, graph)
    failed = client.put(
        f"/api/v1/visualizations/{ids['visualization_id']}", json=chart_payload(graph, ids, node_id)
    )
    assert failed.status_code == 422 and "before Pareto" in failed.text


def test_upstream_context_recalculates_full_shares_without_changing_category_identity(
    db_engine, tmp_path
):
    client, root, graph, ids, node_id = prepare_pareto(db_engine, tmp_path)
    payload = chart_payload(graph, ids, node_id)
    before = client.post(f"{root}/visualizations/preview", json=payload).json()
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
    payload["expected_workflow_revision"] = graph["revision"]
    payload["config"]["context_column_ids"] = [payload["config"]["spec"]["rows"]["category"]]
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    assert client.put(url, json=payload).status_code == 200
    response = client.post(f"{url}/result", json={"context": {"values": {"segment": "keep"}}})
    assert response.status_code == 200, response.text
    after = response.json()
    assert (
        after["applied_context"]
        and after["context_column_ids"] == payload["config"]["context_column_ids"]
    )
    assert after["datasets"]["summary"]["rows"][0]["total_value"] == "6"
    assert [r["share_exact"] for r in after["rows"]] == ["0.5", "0.5", "0"]
    assert [r["positions"][1] for r in after["combo"]["observations"]] == [0.5, 1, 1]
    identities = {
        row["category"]: point["id"]
        for row, point in zip(before["rows"], before["combo"]["observations"], strict=True)
    }
    assert all(
        point["id"] == identities[row["category"]]
        for row, point in zip(after["rows"], after["combo"]["observations"], strict=True)
    )
