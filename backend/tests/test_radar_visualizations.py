from copy import deepcopy
from decimal import Decimal, localcontext
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.visualization_specs import RadarSpec
from app.services.radar_visualizations import radar_presentation
from tests.test_boxplot_stats_api import prepare_boxplot
from tests.test_report_editing import save_workflow


def spec(**patch):
    return RadarSpec.model_validate(
        {
            "type": "radar_chart",
            "version": 1,
            "profile_column_id": "p",
            "normalization": "shared",
            "axes": [{"column_id": key, "minimum": "0", "maximum": "10"} for key in "abc"],
            **patch,
        }
    )


def data(rows, metadata=None, dtype=pl.Int64):
    kind = (
        LogicalType.FLOAT
        if dtype == pl.Float64
        else LogicalType.DECIMAL
        if isinstance(dtype, pl.Decimal)
        else LogicalType.INTEGER
    )
    return Dataset(
        pl.DataFrame(
            rows, schema={"p": pl.String, "a": dtype, "b": dtype, "c": dtype}, orient="row"
        ),
        DatasetSchema(
            (
                ColumnSchema("p", "p", "Profile", LogicalType.STRING, True),
                *(
                    ColumnSchema(key, key, key, kind, True, (metadata or {}).get(key, {}))
                    for key in "abc"
                ),
            )
        ),
    )


def test_positions_missing_and_identity_under_reordering():
    identity = uuid4()
    rows = [("A", 0, 5, 10), ("B", None, 3, 9)]
    first = radar_presentation(data(rows), spec(), identity)
    second = radar_presentation(data(rows[::-1]), spec(), identity)
    assert first.profiles[0].positions == [0, 0.5, 1]
    assert first.profiles[1].positions == [None, 0.3, 0.9]
    assert first.profiles[1].complete is False and first.incomplete_count == 1
    assert first.profiles == second.profiles[::-1]
    assert not radar_presentation(data([]), spec(), identity).profiles


def test_large_integer_differences_are_exact_before_screen_conversion():
    axes = [
        {"column_id": key, "minimum": "9007199254740992", "maximum": "9007199254740994"}
        for key in "abc"
    ]
    with localcontext() as context:
        context.prec = 2
        result = radar_presentation(
            data([("A", 9007199254740992, 9007199254740993, 9007199254740994)]),
            spec(axes=axes),
            uuid4(),
        )
    assert result.profiles[0].positions == [0, 0.5, 1]

    decimal_axes = [
        {
            "column_id": key,
            "minimum": "-9007199254740993.12",
            "maximum": "-9007199254740993.10",
        }
        for key in "abc"
    ]
    dataset = data(
        [
            (
                "A",
                *(
                    Decimal(value)
                    for value in (
                        "-9007199254740993.12",
                        "-9007199254740993.11",
                        "-9007199254740993.10",
                    )
                ),
            )
        ],
        dtype=pl.Decimal(38, 2),
    )
    with localcontext() as context:
        context.prec = 2
        exact = radar_presentation(dataset, spec(axes=decimal_axes), uuid4())
    assert exact.profiles[0].positions == [0, 0.5, 1]


def test_mixed_units_require_minmax_but_identical_units_can_share_scale():
    dataset = data(
        [("A", 1, 2, 3)], {"a": {"currency": "RUB"}, "b": {"unit": "kg"}, "c": {"unit": "%"}}
    )
    with pytest.raises(ValueError, match="units require"):
        radar_presentation(dataset, spec(), uuid4())
    assert radar_presentation(dataset, spec(normalization="min_max"), uuid4()).profiles[0].complete
    same = data([("A", 1, 2, 3)], {key: {"unit": "kg"} for key in "abc"})
    assert radar_presentation(same, spec(), uuid4()).profiles[0].complete


@pytest.mark.parametrize(
    "rows,message",
    [
        ([("A", 1, 2, 3)] * 2, "one row per profile"),
        ([(None, 1, 2, 3)], "non-empty"),
        ([(" ", 1, 2, 3)], "non-empty"),
        ([(f"P{i}", 1, 2, 3) for i in range(21)], "20 profiles"),
        ([("A", 11, 0, 0)], "outside"),
        ([("A", -1, 0, 0)], "outside"),
    ],
)
def test_invalid_full_dataset_fails(rows, message):
    with pytest.raises(ValueError, match=message):
        radar_presentation(data(rows), spec(), uuid4())


def test_duplicate_beyond_large_preview_is_not_silently_aggregated():
    rows = [(f"P{i}", 1, 2, 3) for i in range(100000)] + [("P0", 9, 9, 9)]
    with pytest.raises(ValueError, match="one row per profile"):
        radar_presentation(data(rows), spec(), uuid4())


@pytest.mark.parametrize("value", [float("nan"), float("inf"), float("-inf")])
def test_nonfinite_values_rejected(value):
    with pytest.raises(ValueError, match="finite"):
        radar_presentation(data([("A", value, 1.0, 2.0)], dtype=pl.Float64), spec(), uuid4())


@pytest.mark.parametrize(
    "change",
    [
        "few",
        "many",
        "duplicate",
        "profile_axis",
        "missing_field",
        "unequal_bounds",
        "equal_bounds",
        "scientific",
        "invalid_mode",
    ],
)
def test_invalid_roles_and_scales(change):
    payload = spec().model_dump()
    if change == "few":
        payload["axes"].pop()
    elif change == "many":
        payload["axes"] *= 3
    elif change == "duplicate":
        payload["axes"][1]["column_id"] = "a"
    elif change == "profile_axis":
        payload["profile_column_id"] = "a"
    elif change == "missing_field":
        payload["axes"][0]["column_id"] = "removed"
    elif change == "unequal_bounds":
        payload["axes"][0]["maximum"] = "20"
    elif change == "equal_bounds":
        payload["axes"][0]["maximum"] = "0"
    elif change == "scientific":
        payload["axes"][0]["maximum"] = "1e999999"
    else:
        payload["normalization"] = "automatic"
    with pytest.raises(ValueError):
        radar_presentation(data([("A", 1, 2, 3)]), RadarSpec.model_validate(payload), uuid4())


def prepare(db_engine, tmp_path, csv=None):
    client, root, graph, ids, _ = prepare_boxplot(
        db_engine,
        tmp_path,
        "dataset",
        csv=csv or b"group,value,quality,margin\nNorth,3,8,5\nSouth,7,4,9\nWest,,2,3\n",
    )
    source = next(node for node in graph["nodes"] if node["type"] == "dataset_source")
    graph["result_catalog"]["outputs"][0]["node_id"] = source["id"]
    graph = save_workflow(client, graph)
    schema = client.get(
        f"/api/v1/workflows/{graph['id']}/publications/{ids['publication_id']}/schema"
    ).json()
    columns = {column["display_name"]: column["column_id"] for column in schema["columns"]}
    payload = {
        "workflow_id": graph["id"],
        "publication_id": ids["publication_id"],
        "expected_workflow_revision": graph["revision"],
        "expected_revision": 1,
        "name": "Radar",
        "type": "radar_chart",
        "config": {
            "spec": {
                "version": 1,
                "type": "radar_chart",
                "profile_column_id": columns["group"],
                "normalization": "shared",
                "axes": [
                    {"column_id": columns[key], "minimum": "0", "maximum": "10"}
                    for key in ("value", "quality", "margin")
                ],
            }
        },
    }
    return client, root, graph, ids, payload


def test_radar_preview_save_cas_copy_freeze_restore_and_context(db_engine, tmp_path):
    client, root, graph, ids, payload = prepare(db_engine, tmp_path)
    preview = client.post(f"{root}/visualizations/preview", json=payload)
    assert preview.status_code == 200, preview.text
    result = preview.json()
    assert result["radar"]["incomplete_count"] == 1
    assert result["radar"]["profiles"][0]["positions"] == [0.3, 0.8, 0.5]
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    assert client.put(url, json=payload).status_code == 409
    saved_spec = saved.json()["config"]["spec"]
    copied = client.post(
        f"{url}/copy", json={**payload, "expected_revision": 2, "config": {"title": "Copied"}}
    )
    assert copied.status_code == 201, copied.text
    assert copied.json()["config"]["spec"] == saved_spec
    payload.update(expected_revision=2, config={"title": "Appearance"})
    assert client.put(url, json=payload).json()["config"]["spec"] == saved_spec
    limited = client.post(f"{url}/result", json={"limit": 1, "offset": 2}).json()
    assert len(limited["rows"]) == 3 and limited["radar"] == result["radar"]
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Profiles",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release_id = client.get(f"{root}/releases").json()[0]["id"]
    board = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    frozen_url = f"/api/v1/releases/{release_id}/widgets/{board['widgets'][0]['id']}/result"
    frozen = client.get(frozen_url).json()
    assert frozen["radar"] == result["radar"] and frozen["datasets"] == result["datasets"]
    restored = client.post(
        f"/api/v1/releases/{release_id}/restore", json={"name": "Restored profiles"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert after.status_code == 200, after.text
    assert after.json()["rows"] == result["rows"]
    # Source logical field IDs are stable across restore; publication/profile IDs are new.
    assert after.json()["spec"] == result["spec"]
    assert after.json()["radar"]["profiles"][0]["id"] != result["radar"]["profiles"][0]["id"]
    assert [p["positions"] for p in after.json()["radar"]["profiles"]] == [
        p["positions"] for p in result["radar"]["profiles"]
    ]
    source = next(node for node in graph["nodes"] if node["type"] == "dataset_source")
    context_id = str(uuid4())
    graph["result_catalog"]["outputs"][0]["context_ids"] = [context_id]
    graph["result_catalog"]["contexts"] = [
        {
            "id": context_id,
            "name": "Profile",
            "roles": [{"name": "selected_profile", "logical_type": "string"}],
            "points": [
                {
                    "node_id": source["id"],
                    "port": "dataset",
                    "role": "selected_profile",
                    "column_id": saved_spec["profile_column_id"],
                }
            ],
        }
    ]
    save_workflow(client, graph)
    filtered = client.post(
        f"{url}/result", json={"context": {"values": {"selected_profile": "North"}}}
    )
    assert filtered.status_code == 200, filtered.text
    assert filtered.json()["radar"]["profiles"] == result["radar"]["profiles"][:1]
    assert client.get(frozen_url).json()["radar"] == result["radar"]


@pytest.mark.parametrize("failure", ["duplicate", "outside", "unavailable"])
def test_radar_failed_save_preserves_existing_document(db_engine, tmp_path, failure):
    csv = b"group,value,quality,margin\nA,1,2,3\nA,4,5,6\n" if failure == "duplicate" else None
    client, _, _, ids, payload = prepare(db_engine, tmp_path, csv)
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    before = client.get(url).json()
    payload = deepcopy(payload)
    if failure == "outside":
        for axis in payload["config"]["spec"]["axes"]:
            axis["maximum"] = "1"
    elif failure == "unavailable":
        payload["config"]["spec"]["axes"][0]["column_id"] = "removed"
    failed = client.put(url, json=payload)
    assert failed.status_code == 422, failed.text
    assert client.get(url).json() == before
