from copy import deepcopy
from decimal import Decimal, localcontext
from uuid import uuid4

import polars as pl
import pytest

from app.domain.visualization_specs import ComboSpec
from app.services.combo_visualizations import combo_presentation
from tests.test_radar_visualizations import data
from tests.test_radar_visualizations import prepare as prepare_radar
from tests.test_report_editing import save_workflow


def spec(**patch):
    return ComboSpec.model_validate(
        {
            "category_column_id": "p",
            "series": [
                {"column_id": "a", "kind": "bar"},
                {"column_id": "b", "kind": "line"},
            ],
            **patch,
        }
    )


def test_exact_zero_inclusive_scales_missing_and_stable_identity():
    identity = uuid4()
    rows = [("A", -10, 30, 0), ("B", 10, None, 0)]
    first = combo_presentation(data(rows), spec(), identity)
    assert (first.primary.minimum, first.primary.maximum) == ("-10", "30")
    assert (first.primary.lower, first.primary.upper) == (-0.25, 0.75)
    assert [tick.label for tick in first.primary.ticks] == ["-10", "0", "10", "20", "30"]
    assert first.observations[0].positions == [-0.25, 0.75]
    assert first.observations[1].positions == [0.25, None]
    assert (
        first.observations
        == combo_presentation(data(rows[::-1]), spec(), identity).observations[::-1]
    )
    assert first.secondary is None
    for rows in ([], [("A", 0, 0, 0)], [("A", None, None, None)]):
        empty = combo_presentation(data(rows), spec(), identity)
        assert (empty.primary.minimum, empty.primary.maximum) == ("0", "0")
        assert [(tick.position, tick.label) for tick in empty.primary.ticks] == [(0, "0")]


def test_exact_decimals_under_tiny_context_and_float_extremes():
    dataset = data(
        [("A", Decimal("-9007199254740993.12"), Decimal("9007199254740993.12"), None)],
        dtype=pl.Decimal(38, 2),
    )
    with localcontext() as context:
        context.prec = 2
        result = combo_presentation(dataset, spec(), uuid4())
    assert result.observations[0].positions == [-0.5, 0.5]
    assert result.primary.ticks[1].label == "-4503599627370496.56"
    extreme = combo_presentation(
        data([("A", -1e308, 1e308, None)], dtype=pl.Float64), spec(), uuid4()
    )
    assert extreme.observations[0].positions == [-0.5, 0.5]


def test_secondary_axis_is_explicit_and_unit_safe():
    dataset = data([("A", 10, 1, 0)], {"a": {"currency": "RUB"}, "b": {"unit": "%"}})
    with pytest.raises(ValueError, match="matching unit"):
        combo_presentation(dataset, spec(), uuid4())
    result = combo_presentation(
        dataset,
        spec(
            secondary_axis=True,
            series=[
                {"column_id": "a", "kind": "bar"},
                {"column_id": "b", "kind": "line", "axis": "secondary"},
            ],
        ),
        uuid4(),
    )
    assert result.primary.maximum == "10" and result.secondary.maximum == "1"
    assert result.observations[0].positions == [1, 1]


@pytest.mark.parametrize(
    "patch",
    [
        {"secondary_axis": True},
        {
            "series": [
                {"column_id": "a", "kind": "bar"},
                {"column_id": "b", "kind": "line", "axis": "secondary"},
            ]
        },
        {"series": [{"column_id": "a", "kind": "bar"}, {"column_id": "b", "kind": "bar"}]},
        {"series": [{"column_id": "a", "kind": "line"}, {"column_id": "a", "kind": "bar"}]},
        {"category_column_id": "a"},
        {"version": 2},
        {"series": [{"column_id": "a", "kind": "line"}]},
        {"series": [{"column_id": str(i), "kind": "line" if i else "bar"} for i in range(9)]},
    ],
)
def test_invalid_specs(patch):
    with pytest.raises(ValueError):
        spec(**patch)


@pytest.mark.parametrize(
    "rows,message",
    [
        ([("A", 1, 2, 3)] * 2, "one row per category"),
        ([(" ", 1, 2, 3)], "non-empty"),
        ([(None, 1, 2, 3)], "non-empty"),
        ([(str(i), 1, 2, 3) for i in range(2001)], "2000 categories"),
        ([(str(i), 1, 2, 3) for i in range(100000)] + [("0", 1, 2, 3)], "one row per category"),
    ],
)
def test_invalid_full_data(rows, message):
    with pytest.raises(ValueError, match=message):
        combo_presentation(data(rows), spec(), uuid4())


@pytest.mark.parametrize("value", [float("inf"), float("-inf"), float("nan")])
def test_nonfinite(value):
    with pytest.raises(ValueError, match="finite"):
        combo_presentation(data([("A", value, 0.0, 0.0)], dtype=pl.Float64), spec(), uuid4())


def prepare(db_engine, tmp_path, csv=None):
    client, root, graph, ids, payload = prepare_radar(db_engine, tmp_path, csv)
    radar = payload["config"]["spec"]
    payload.update(type="combo_chart", name="Plan and actual")
    payload["config"]["spec"] = {
        "type": "combo_chart",
        "category_column_id": radar["profile_column_id"],
        "series": [
            {"column_id": axis["column_id"], "kind": "bar" if i == 0 else "line"}
            for i, axis in enumerate(radar["axes"][:2])
        ],
    }
    return client, root, graph, ids, payload


@pytest.mark.parametrize("dual", [False, True])
def test_preview_save_copy_cas_freeze_and_restore_full_data(db_engine, tmp_path, dual):
    csv = (
        "group,value,quality,margin\n" + "".join(f"P{i},{i},-{i},0\n" for i in range(1101))
    ).encode()
    client, root, _, ids, payload = prepare(db_engine, tmp_path, csv)
    if dual:
        payload["config"]["spec"]["secondary_axis"] = True
        payload["config"]["spec"]["series"][1]["axis"] = "secondary"
    preview = client.post(f"{root}/visualizations/preview", json=payload)
    assert preview.status_code == 200, preview.text
    result = preview.json()
    assert len(result["rows"]) == 1101 and result["combo"]["primary"]["maximum"] == "1100"
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    saved_spec = saved.json()["config"]["spec"]
    assert client.put(url, json=payload).status_code == 409
    copied = client.post(
        f"{url}/copy", json={**payload, "expected_revision": 2, "config": {"title": "Copy"}}
    )
    assert copied.status_code == 201, copied.text
    assert copied.json()["config"]["spec"] == saved_spec
    payload.update(expected_revision=2, config={"title": "Appearance"})
    assert client.put(url, json=payload).json()["config"]["spec"] == saved_spec
    limited = client.post(f"{url}/result", json={"limit": 1, "offset": 1000}).json()
    assert limited["datasets"] == result["datasets"] and limited["combo"] == result["combo"]
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Combo",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release_id = client.get(f"{root}/releases").json()[0]["id"]
    board = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    frozen = client.get(
        f"/api/v1/releases/{release_id}/widgets/{board['widgets'][0]['id']}/result"
    ).json()
    assert frozen["combo"] == result["combo"] and frozen["datasets"] == result["datasets"]
    restored = client.post(
        f"/api/v1/releases/{release_id}/restore", json={"name": "Restored combo"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert after.status_code == 200, after.text
    assert after.json()["rows"] == result["rows"]
    assert after.json()["combo"]["primary"] == result["combo"]["primary"]
    assert after.json()["combo"]["secondary"] == result["combo"]["secondary"]
    assert (
        after.json()["combo"]["observations"][0]["id"] != result["combo"]["observations"][0]["id"]
    )


@pytest.mark.parametrize(
    "failure", ["duplicate", "missing", "non_numeric", "legacy_series", "horizontal"]
)
def test_failed_save_does_not_mutate_document(db_engine, tmp_path, failure):
    csv = b"group,value,quality,margin\nA,1,2,3\nA,4,5,6\n" if failure == "duplicate" else None
    client, _, _, ids, payload = prepare(db_engine, tmp_path, csv)
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    before = client.get(url).json()
    payload = deepcopy(payload)
    spec = payload["config"]["spec"]
    if failure == "missing":
        spec["series"][0]["column_id"] = "removed"
    elif failure == "non_numeric":
        spec["category_column_id"], spec["series"][0]["column_id"] = (
            spec["series"][0]["column_id"],
            spec["category_column_id"],
        )
    elif failure == "legacy_series":
        payload["config"]["additional_series"] = [{"column_id": spec["series"][0]["column_id"]}]
    elif failure == "horizontal":
        payload["config"]["orientation"] = "horizontal"
    failed = client.put(url, json=payload)
    assert failed.status_code == 422, failed.text
    assert client.get(url).json() == before


def test_context_recalculates_full_scale_but_retains_category_identity(db_engine, tmp_path):
    client, root, graph, ids, payload = prepare(db_engine, tmp_path)
    before = client.post(f"{root}/visualizations/preview", json=payload).json()
    source = next(node for node in graph["nodes"] if node["type"] == "dataset_source")
    context_id = str(uuid4())
    graph["result_catalog"]["outputs"][0]["context_ids"] = [context_id]
    graph["result_catalog"]["contexts"] = [
        {
            "id": context_id,
            "name": "Category",
            "roles": [{"name": "selected_category", "logical_type": "string"}],
            "points": [
                {
                    "node_id": source["id"],
                    "port": "dataset",
                    "role": "selected_category",
                    "column_id": payload["config"]["spec"]["category_column_id"],
                }
            ],
        }
    ]
    graph = save_workflow(client, graph)
    payload["expected_workflow_revision"] = graph["revision"]
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    after = client.post(
        f"{url}/result", json={"context": {"values": {"selected_category": "South"}}}
    )
    assert after.status_code == 200, after.text
    assert after.json()["rows"] == before["rows"][1:2]
    assert after.json()["combo"]["primary"]["maximum"] == "7"
    assert before["combo"]["primary"]["maximum"] == "8"
    assert (
        after.json()["combo"]["observations"][0]["id"] == before["combo"]["observations"][1]["id"]
    )
