from uuid import uuid4

import pytest

from tests.test_radar_visualizations import prepare as prepare_radar
from tests.test_report_editing import save_workflow
from tests.test_waterfall_api import freeze


def prepare(db_engine, tmp_path, csv=None):
    client, root, graph, ids, payload = prepare_radar(
        db_engine, tmp_path, csv or b"group,value,quality,margin\nA,40,80,0\nB,0,,0\nC,,50,0\n"
    )
    radar = payload["config"]["spec"]
    payload.update(type="bullet_chart", name="Bullet")
    payload["config"]["spec"] = dict(
        type="bullet_chart",
        category_column_id=radar["profile_column_id"],
        actual_column_id=radar["axes"][0]["column_id"],
        target_column_id=radar["axes"][1]["column_id"],
        minimum="0",
        maximum="100",
        bands=[
            {"label": "Before target", "upper": "80", "tone": "neutral"},
            {"label": "At target", "upper": "100", "tone": "positive"},
        ],
    )
    return client, root, graph, ids, payload


def test_save_retry_copy_full_frozen_population_and_restore(db_engine, tmp_path):
    csv = (
        "group,value,quality,margin\n" + "".join(f"P{i},40,80,0\n" for i in range(2301))
    ).encode()
    client, root, _, ids, payload = prepare(db_engine, tmp_path, csv)
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    before = client.get(url).json()
    preview = client.post(f"{root}/visualizations/preview", json=payload)
    assert preview.status_code == 200, preview.text
    body = preview.json()
    assert client.get(url).json() == before
    assert len(body["rows"]) == len(body["bullet"]["points"]) == 100
    assert body["bullet"]["input_count"] == 2301
    payload["request_id"] = str(uuid4())
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    assert client.put(url, json=payload).json() == saved.json()
    assert client.put(url, json={**payload, "request_id": str(uuid4())}).status_code == 409
    copied = client.post(
        f"{url}/copy",
        json={
            **payload,
            "expected_revision": 2,
            "request_id": str(uuid4()),
            "config": {"title": "Copy"},
        },
    )
    assert copied.status_code == 201, copied.text
    assert copied.json()["config"]["spec"] == saved.json()["config"]["spec"]
    tail = client.post(f"{url}/result", json={"offset": 2300}).json()
    release, frozen_url = freeze(client, root, ids)
    frozen = client.get(frozen_url, params={"offset": 2300}).json()
    assert frozen["rows"] == tail["rows"] and frozen["bullet"] == tail["bullet"]
    restored = client.post(f"/api/v1/releases/{release}/restore", json={"name": "Restored bullet"})
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={"offset": 2300})
    assert after.status_code == 200, after.text
    assert after.json()["rows"] == tail["rows"]
    assert after.json()["bullet"]["points"][0]["actual"] == 0.4


@pytest.mark.parametrize(
    "failure", ["scale", "duplicate", "actual_type", "wrong_spec", "series", "orientation"]
)
def test_invalid_save_leaves_visualization_unchanged(db_engine, tmp_path, failure):
    csv = (
        b"group,value,quality,margin\nA,1,2,0\nA,3,4,0\n"
        if failure == "duplicate"
        else b"group,value,quality,margin\nA,101,80,0\n"
        if failure == "scale"
        else None
    )
    client, _, _, ids, payload = prepare(db_engine, tmp_path, csv)
    if failure == "actual_type":
        payload["config"]["spec"]["actual_column_id"] = payload["config"]["spec"][
            "category_column_id"
        ]
    if failure == "wrong_spec":
        payload["type"] = "bar_chart"
    if failure == "series":
        payload["config"]["additional_series"] = [
            {"column_id": payload["config"]["spec"]["actual_column_id"]}
        ]
    if failure == "orientation":
        payload["config"]["orientation"] = "horizontal"
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    before = client.get(url).json()
    failed = client.put(url, json=payload)
    assert failed.status_code == 422, failed.text
    assert client.get(url).json() == before


def test_view_filter_updates_population_preserves_key_and_extra_navigation_fields(
    db_engine, tmp_path
):
    client, root, graph, ids, payload = prepare(db_engine, tmp_path)
    before = client.post(f"{root}/visualizations/preview", json=payload).json()
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    key = payload["config"]["spec"]["category_column_id"]
    identity = str(uuid4())
    graph["result_catalog"]["outputs"][0]["context_ids"] = [identity]
    graph["result_catalog"]["contexts"] = [
        {
            "id": identity,
            "name": "Category",
            "roles": [{"name": "category", "logical_type": "string"}],
            "points": [
                {"node_id": source["id"], "port": "dataset", "role": "category", "column_id": key}
            ],
        }
    ]
    graph = save_workflow(client, graph)
    payload["expected_workflow_revision"] = graph["revision"]
    schema = client.get(
        f"/api/v1/workflows/{graph['id']}/publications/{ids['publication_id']}/schema"
    ).json()
    extra = next(c["column_id"] for c in schema["columns"] if c["display_name"] == "margin")
    payload["config"]["context_column_ids"] = [key, extra]
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    assert client.put(url, json=payload).status_code == 200
    after = client.post(f"{url}/result", json={"context": {"values": {"category": "B"}}})
    assert after.status_code == 200, after.text
    result = after.json()
    assert result["bullet"]["input_count"] == 1 and result["bullet"]["missing_target_count"] == 1
    assert result["bullet"]["points"][0]["id"] == before["bullet"]["points"][1]["id"]
    assert extra in [c["column_id"] for c in result["columns"]]
    assert result["bullet"]["ticks"] == before["bullet"]["ticks"]
