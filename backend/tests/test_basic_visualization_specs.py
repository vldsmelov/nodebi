from copy import deepcopy
from typing import get_args

import pytest
from test_radar_visualizations import prepare

from app.domain.visualization_specs import visualization_types
from app.domain.visualizations import ChartType

BASIC_TYPES = (
    "bar_chart",
    "line_chart",
    "area_chart",
    "pie_chart",
    "donut_chart",
    "scatter_chart",
    "kpi",
    "table",
)


def request_for(payload, kind):
    radar = payload["config"]["spec"]
    group = radar["profile_column_id"]
    value, quality, margin = [axis["column_id"] for axis in radar["axes"]]
    config = {"value_column_id": value}
    if kind == "table":
        config = {"column_ids": [quality, group], "context_column_ids": [margin]}
    elif kind != "kpi":
        config["category_column_id"] = quality if kind == "scatter_chart" else group
    if kind in {"bar_chart", "line_chart"}:
        config["additional_series"] = [{"column_id": quality, "name": "Plan"}]
    return {**payload, "type": kind, "config": config}


def test_registry_describes_every_type_and_supported_binding_contracts():
    registry = {entry.type: entry.model_dump() for entry in visualization_types()}
    assert set(registry) == set(get_args(ChartType))
    for kind in BASIC_TYPES:
        definition = registry[kind]
        assert definition["binding_contract"] == "spec_or_legacy_config"
        assert definition["result_data"] == "rows"
        assert definition["datasets"] == {}
        assert definition["preparation_node"] is None
        assert definition["publication_port"] is None
        assert "quantile_method" not in definition
    assert registry["kpi"]["input_kinds"] == ("dataset", "scalar")
    assert registry["box_plot"]["binding_contract"] == "spec"


@pytest.mark.parametrize("kind", BASIC_TYPES)
def test_basic_specs_preview_save_and_read_do_not_rewrite_config(db_engine, tmp_path, kind):
    client, root, graph, ids, payload = prepare(
        db_engine, tmp_path, b"group,value,quality,margin\nNorth,3,8,5\n"
    )
    payload = request_for(payload, kind)
    original = deepcopy(payload)
    before = client.get(f"/api/v1/workflows/{graph['id']}").json()
    preview = client.post(f"{root}/visualizations/preview", json=payload)
    assert preview.status_code == 200, preview.text
    result = preview.json()
    spec = result["spec"]
    assert spec["version"] == 1 and spec["type"] == kind
    assert "datasets" not in result  # No second copy of table rows in responses/releases.
    config = payload["config"]
    by_id = {column["column_id"]: column for column in result["columns"]}
    if kind == "table":
        assert spec["columns"] == config["column_ids"]
        assert result["context_column_ids"] == config["context_column_ids"]
    elif kind == "kpi":
        assert spec["value"] == config["value_column_id"]
    elif kind in {"pie_chart", "donut_chart"}:
        assert spec["category"] == config["category_column_id"]
        assert spec["value"] == config["value_column_id"]
    else:
        assert spec["x"] == config["category_column_id"]
        if kind == "scatter_chart":
            assert spec["y"] == config["value_column_id"]
        else:
            assert spec["y"][0]["column_id"] == config["value_column_id"]
            assert spec["y"][0]["name"] == by_id[config["value_column_id"]]["display_name"]
            if kind in {"bar_chart", "line_chart"}:
                assert spec["y"][1] == {**config["additional_series"][0]}
    assert client.get(f"/api/v1/workflows/{graph['id']}").json() == before
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    assert saved.json()["config"].get("spec") is None
    live = client.post(f"{url}/result", json={})
    assert live.status_code == 200, live.text
    assert live.json()["spec"] == spec
    assert live.json()["rows"] == result["rows"]
    assert payload == original
    # New clients can write typed roles; storage still has one canonical legacy representation.
    typed = {**payload, "config": {"spec": spec}, "expected_revision": 2}
    updated = client.put(url, json=typed)
    assert updated.status_code == 200, updated.text
    assert "spec" not in updated.json()["config"]
    assert client.post(f"{url}/result", json={}).json()["spec"] == spec


@pytest.mark.parametrize("typed", [False, True])
def test_table_spec_survives_paging_freeze_restore_and_exact_transport(db_engine, tmp_path, typed):
    csv = ("group,value,quality,margin\n" + "North,3,9007199254740993,5\n" * 1101).encode()
    client, root, _, ids, payload = prepare(db_engine, tmp_path, csv)
    payload = request_for(payload, "table")
    selected = payload["config"]["column_ids"]
    if typed:
        payload["config"] = {
            "spec": {"type": "table", "columns": selected},
            "context_column_ids": payload["config"]["context_column_ids"],
        }
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    live = client.post(f"{url}/result", json={"limit": 1, "offset": 1100}).json()
    assert len(live["rows"]) == 1 and live["total_rows"] == 1101
    assert live["spec"]["columns"] == selected
    quality = next(c for c in live["columns"] if c["display_name"] == "quality")
    assert live["rows"][0][quality["engine_name"]] == "9007199254740993"
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Basic typed table",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release = client.get(f"{root}/releases").json()[0]
    board = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    frozen = client.get(
        f"/api/v1/releases/{release['id']}/widgets/{board['widgets'][0]['id']}/result",
        params={"limit": 1, "offset": 1100},
    ).json()
    assert frozen["rows"] == live["rows"]
    assert frozen["spec"] == live["spec"] and "datasets" not in frozen
    restored = client.post(f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored"})
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={"limit": 1}).json()
    assert after["rows"] == live["rows"]
    assert after["spec"]["columns"] == visual["config"]["column_ids"]
