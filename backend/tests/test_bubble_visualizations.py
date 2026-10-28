from uuid import uuid4

import pytest

from tests.test_radar_visualizations import prepare as prepare_radar
from tests.test_report_editing import save_workflow


def prepare(db_engine, tmp_path, csv=None):
    client, root, graph, ids, payload = prepare_radar(db_engine, tmp_path, csv)
    radar = payload["config"]["spec"]
    payload.update(type="bubble_chart", name="Bubble")
    payload["config"]["spec"] = {
        "type": "bubble_chart",
        "key_column_id": radar["profile_column_id"],
        **{
            f"{role}_column_id": axis["column_id"]
            for role, axis in zip(("x", "y", "size"), radar["axes"], strict=True)
        },
        "group_column_id": radar["profile_column_id"],
    }
    return client, root, graph, ids, payload


def test_live_pages_save_copy_cas_full_freeze_and_restore(db_engine, tmp_path):
    csv = (
        "group,value,quality,margin\n" + "".join(f"P{i},{i},-{i},{i}\n" for i in range(2301))
    ).encode()
    client, root, _, ids, payload = prepare(db_engine, tmp_path, csv)
    preview = client.post(f"{root}/visualizations/preview", json=payload)
    assert preview.status_code == 200, preview.text
    result = preview.json()
    assert result["total_rows"] == 2301 and result["truncated"]
    assert len(result["rows"]) == len(result["bubble"]["points"]) == 100
    assert result["bubble"]["size_maximum"] == "2300"
    assert result["bubble"]["visible_count"] == 2300
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    save_request = {**payload, "request_id": str(uuid4())}
    saved = client.put(url, json=save_request)
    assert saved.status_code == 200, saved.text
    assert client.put(url, json=save_request).json() == saved.json()
    assert client.put(url, json=payload).status_code == 409
    copied = client.post(
        f"{url}/copy", json={**payload, "expected_revision": 2, "config": {"title": "Copy"}}
    )
    assert copied.status_code == 201, copied.text
    assert copied.json()["config"]["spec"] == saved.json()["config"]["spec"]
    appearance = client.put(
        url, json={**payload, "expected_revision": 2, "config": {"title": "Appearance"}}
    )
    assert appearance.status_code == 200, appearance.text
    assert appearance.json()["config"]["spec"] == saved.json()["config"]["spec"]
    tail = client.post(f"{url}/result", json={"offset": 2300, "limit": 100}).json()
    assert tail["total_rows"] == 2301 and len(tail["rows"]) == 1 and not tail["truncated"]
    assert tail["bubble"]["x_axis"] == result["bubble"]["x_axis"]
    assert tail["bubble"]["points"][0]["radius_ratio"] == 1
    assert client.post(f"{url}/result", json={"offset": 2**63}).status_code == 422
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    release = client.post(
        f"{root}/releases",
        json={
            "name": "Bubble",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert release.status_code == 200, release.text
    release_id = client.get(f"{root}/releases").json()[0]["id"]
    board = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    frozen_url = f"/api/v1/releases/{release_id}/widgets/{board['widgets'][0]['id']}/result"
    frozen = client.get(f"{frozen_url}?offset=2300&limit=100").json()
    assert frozen["rows"] == tail["rows"] and frozen["bubble"] == tail["bubble"]
    assert frozen["datasets"] == tail["datasets"]
    initial = client.get(frozen_url).json()
    assert initial["bubble"] == result["bubble"] and initial["rows"] == result["rows"]
    restored = client.post(
        f"/api/v1/releases/{release_id}/restore", json={"name": "Restored bubble"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(
        f"/api/v1/visualizations/{visual['id']}/result", json={"offset": 2300}
    ).json()
    assert after["rows"] == tail["rows"] and after["bubble"]["x_axis"] == tail["bubble"]["x_axis"]
    assert after["bubble"]["points"][0]["id"] != tail["bubble"]["points"][0]["id"]


@pytest.mark.parametrize(
    "failure",
    ["duplicate", "negative", "missing", "non_numeric", "legacy_series", "horizontal", "spec_type"],
)
def test_invalid_save_preserves_document(db_engine, tmp_path, failure):
    csv = None
    if failure in {"duplicate", "negative"}:
        csv = (
            "group,value,quality,margin\n"
            + "".join(f"P{i},1,2,3\n" for i in range(101))
            + ("P0,1,2,3\n" if failure == "duplicate" else "Bad,,, -1\n")
        ).encode()
    client, _, _, ids, payload = prepare(db_engine, tmp_path, csv)
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    before = client.get(url).json()
    settings = payload["config"]["spec"]
    if failure == "missing":
        settings["x_column_id"] = "removed"
    if failure == "non_numeric":
        settings["x_column_id"] = settings["key_column_id"]
    if failure == "legacy_series":
        payload["config"]["additional_series"] = [{"column_id": settings["x_column_id"]}]
    if failure == "horizontal":
        payload["config"]["orientation"] = "horizontal"
    if failure == "spec_type":
        payload["type"] = "scatter_chart"
    failed = client.put(url, json=payload)
    assert failed.status_code == 422, failed.text
    assert client.get(url).json() == before


def test_context_filters_full_population_and_preserves_identity(db_engine, tmp_path):
    client, root, graph, ids, payload = prepare(db_engine, tmp_path)
    before = client.post(f"{root}/visualizations/preview", json=payload).json()
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    context_id = str(uuid4())
    key = payload["config"]["spec"]["key_column_id"]
    graph["result_catalog"]["outputs"][0]["context_ids"] = [context_id]
    graph["result_catalog"]["contexts"] = [
        {
            "id": context_id,
            "name": "Region",
            "roles": [{"name": "region", "logical_type": "string"}],
            "points": [
                {"node_id": source["id"], "port": "dataset", "role": "region", "column_id": key}
            ],
        }
    ]
    graph = save_workflow(client, graph)
    payload["expected_workflow_revision"] = graph["revision"]
    payload["config"].update(
        context_column_ids=[key], highlight_column_id=key, highlight_parameter="region"
    )
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    after = client.post(f"{url}/result", json={"context": {"values": {"region": "South"}}})
    assert after.status_code == 200, after.text
    value = after.json()
    assert value["rows"] == before["rows"][1:2]
    assert value["bubble"]["input_count"] == 1 and value["bubble"]["size_maximum"] == "9"
    assert value["bubble"]["points"][0]["id"] == before["bubble"]["points"][1]["id"]
    assert value["applied_context"]


def test_extra_navigation_fields_use_matching_page_without_wide_transport(db_engine, tmp_path):
    client, root, graph, ids, payload = prepare(
        db_engine,
        tmp_path,
        b"group,value,quality,margin,note,unused\nA,1,2,3,first,hidden\nB,4,5,6,last,hidden\n",
    )
    schema = client.get(
        f"/api/v1/workflows/{graph['id']}/publications/{ids['publication_id']}/schema"
    ).json()
    note = next(c["column_id"] for c in schema["columns"] if c["display_name"] == "note")
    payload["config"]["context_column_ids"] = [note]
    result = client.post(f"{root}/visualizations/preview", json=payload)
    assert result.status_code == 200, result.text
    body = result.json()
    assert len(body["columns"]) == 5
    note_engine = next(c["engine_name"] for c in body["columns"] if c["column_id"] == note)
    assert body["rows"][1][note_engine] == "last"
    assert body["bubble"]["points"][1]["key"] == "B"
    assert body["datasets"]["observations"]["rows"] == body["rows"]
