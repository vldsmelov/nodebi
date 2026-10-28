from copy import deepcopy
from decimal import Decimal, localcontext
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.visualization_specs import HeatmapColorScale, heatmap_spec
from app.services.heatmap_visualizations import color_scale
from tests.test_boxplot_stats_api import prepare_boxplot
from tests.test_report_editing import save_workflow


def scale(values, **config):
    spec = heatmap_spec(uuid4())
    spec.color_scale = HeatmapColorScale(**config)
    dataset = Dataset(
        pl.DataFrame(
            {"id": [str(i) for i in range(len(values))], "v": values},
            schema={"id": pl.String, "v": pl.String},
        ),
        DatasetSchema(
            (
                ColumnSchema(spec.cells.cell_id, "id", "ID", LogicalType.STRING, False),
                ColumnSchema(spec.cells.value, "v", "Value", LogicalType.STRING, True),
            )
        ),
    )
    return color_scale(dataset, spec)


def test_scale_preserves_exact_differences_even_with_small_decimal_context():
    with localcontext() as context:
        context.prec = 2
        result = scale(["9007199254740993.11", "9007199254740993.12", "9007199254740993.13", None])
    assert result.positions == {"0": 0, "1": 0.5, "2": 1, "3": None}
    assert (result.minimum, result.maximum) == ("9007199254740993.11", "9007199254740993.13")


@pytest.mark.parametrize(
    "values,positions",
    [([], {}), ([None], {"0": None}), (["0", "0"], {"0": 0.5, "1": 0.5}), (["-7"], {"0": 0.5})],
)
def test_empty_missing_constant_scale(values, positions):
    assert scale(values).positions == positions


def test_symmetric_zero_handles_large_values_without_context_rounding():
    with localcontext() as context:
        context.prec = 2
        result = scale(["-9007199254740993.11", "0", "9007199254740993.11"], mode="zero_centered")
    assert result.positions == {"0": 0, "1": 0.5, "2": 1}
    assert result.minimum == "-9007199254740993.11"
    assert result.maximum == "9007199254740993.11"
    assert scale(["-1e308", "0", "1e308"]).positions == {"0": 0, "1": 0.5, "2": 1}


def test_fixed_scale_saturates_without_losing_empty_or_counting_zero_as_missing():
    result = scale(["-1", "0", "1", "2", "3", None], mode="fixed", minimum="0", maximum="2")
    assert result.positions == {"0": 0, "1": 0, "2": 0.5, "3": 1, "4": 1, "5": None}
    assert (result.below_count, result.above_count) == (1, 1)
    assert scale([], mode="fixed", minimum="0", maximum="2").maximum == "2"


@pytest.mark.parametrize(
    "config",
    [
        dict(mode="fixed"),
        dict(mode="fixed", minimum="0", maximum="0"),
        dict(mode="fixed", minimum="2", maximum="1"),
        dict(mode="fixed", minimum="1e9999999", maximum="2"),
        dict(mode="fixed", minimum="NaN", maximum="2"),
        dict(mode="extent", minimum="0"),
        dict(mode="arbitrary"),
    ],
)
def test_invalid_color_config_fails(config):
    with pytest.raises(ValueError):
        HeatmapColorScale(**config)


def prepared(db_engine, tmp_path, csv=None):
    client, root, graph, ids, node_id = prepare_boxplot(
        db_engine,
        tmp_path,
        "dataset",
        csv=csv
        or b"group,value,period\nA,9007199254740993,Jan\nA,1,Jan\nB,9007199254740995,Jan\nB,,Feb\n",
    )
    node = next(n for n in graph["nodes"] if n["id"] == node_id)
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    columns = client.post(
        f"/api/v1/workflows/{graph['id']}/nodes/{source['id']}/preview", json={"limit": 1}
    ).json()["columns"]
    period = next(c["column_id"] for c in columns if c["display_name"] == "period")
    node["type"] = "heatmap_stats"
    node["config"] = {
        "x_column_id": node["config"]["group_column_id"],
        "y_column_id": period,
        "value_column_id": node["config"]["value_column_id"],
        "aggregation": "sum",
    }
    graph = save_workflow(client, graph)
    spec = client.get(
        f"/api/v1/workflows/{graph['id']}/publications/{ids['publication_id']}/schema"
    ).json()["suggested_specs"][0]
    payload = {
        "workflow_id": graph["id"],
        "publication_id": ids["publication_id"],
        "expected_workflow_revision": graph["revision"],
        "expected_revision": 1,
        "type": "heatmap_chart",
        "name": "Heatmap",
        "config": {"spec": spec},
    }
    return client, root, graph, ids, node_id, payload


def test_heatmap_release_retains_more_than_a_thousand_cells(db_engine, tmp_path):
    csv = (
        "group,value,period\n" + "".join(f"G{i},{i + 1},P{i % 25}\n" for i in range(44))
    ).encode()
    client, root, graph, ids, _, payload = prepared(db_engine, tmp_path, csv)
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    live = client.post(f"{url}/result", json={"limit": 1}).json()
    assert live["total_rows"] == len(live["rows"]) == 1100
    assert len(live["heatmap_scale"]["positions"]) == 1100
    assert sum(row["row_count"] for row in live["rows"]) == 44
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Complete matrix",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release_id = client.get(f"{root}/releases").json()[0]["id"]
    board = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    frozen = client.get(
        f"/api/v1/releases/{release_id}/widgets/{board['widgets'][0]['id']}/result",
        params={"limit": 1},
    ).json()
    assert frozen["datasets"] == live["datasets"]
    assert frozen["heatmap_scale"] == live["heatmap_scale"]


def test_heatmap_typed_render_exact_scale_release_restore_and_context(db_engine, tmp_path):
    client, root, graph, ids, node_id, payload = prepared(db_engine, tmp_path)
    spec = payload["config"]["spec"]
    assert spec["type"] == "heatmap_chart"
    registry = client.get("/api/v1/visualization-types").json()
    assert any(item["type"] == "heatmap_chart" and item["max_cells"] == 10000 for item in registry)
    preview = client.post(f"{root}/visualizations/preview", json=payload)
    assert preview.status_code == 200, preview.text
    data = preview.json()
    values = [row["value"] for row in data["rows"]]
    assert values == [None, None, "9007199254740994", "9007199254740995"]
    assert sorted(v for v in data["heatmap_scale"]["positions"].values() if v is not None) == [0, 1]
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    short = client.post(f"{url}/result", json={"limit": 1, "offset": 3})
    assert short.status_code == 200, short.text
    assert short.json()["datasets"] == data["datasets"]
    assert short.json()["heatmap_scale"] == data["heatmap_scale"]
    payload["expected_revision"] = 2
    payload["config"] = {"title": "Appearance only"}
    assert client.put(url, json=payload).json()["config"]["spec"] == spec
    assert client.put(url, json=payload).status_code == 409
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    release = client.post(
        f"{root}/releases",
        json={
            "name": "Cells",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert release.status_code == 200, release.text
    release_id = client.get(f"{root}/releases").json()[0]["id"]
    board = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    frozen_url = f"/api/v1/releases/{release_id}/widgets/{board['widgets'][0]['id']}/result"
    frozen = client.get(frozen_url, params={"limit": 1})
    assert frozen.status_code == 200, frozen.text
    assert frozen.json()["datasets"] == data["datasets"]
    assert frozen.json()["heatmap_scale"] == data["heatmap_scale"]
    restored = client.post(
        f"/api/v1/releases/{release_id}/restore", json={"name": "Restored heatmap"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert after.status_code == 200, after.text
    assert [row["value"] for row in after.json()["rows"]] == values
    assert after.json()["spec"]["cells"] != spec["cells"]
    assert after.json()["heatmap_scale"]["minimum"] == "9007199254740994"
    # Upstream restrictions change both cells and colour extent; frozen data is unaffected.
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    node = next(n for n in graph["nodes"] if n["id"] == node_id)
    context_id = str(uuid4())
    graph["result_catalog"]["outputs"][0]["context_ids"] = [context_id]
    graph["result_catalog"]["contexts"] = [
        {
            "id": context_id,
            "name": "Group",
            "roles": [{"name": "selected_group", "logical_type": "string"}],
            "points": [
                {
                    "node_id": source["id"],
                    "port": "dataset",
                    "role": "selected_group",
                    "column_id": node["config"]["x_column_id"],
                }
            ],
        }
    ]
    graph = save_workflow(client, graph)
    filtered = client.post(f"{url}/result", json={"context": {"values": {"selected_group": "A"}}})
    assert filtered.status_code == 200, filtered.text
    assert len(filtered.json()["rows"]) == 1
    assert (
        filtered.json()["heatmap_scale"]["minimum"] == filtered.json()["heatmap_scale"]["maximum"]
    )
    graph["result_catalog"]["contexts"][0]["points"][0].update(
        node_id=node_id, column_id=spec["cells"]["x"]
    )
    save_workflow(client, graph)
    rejected = client.post(f"{url}/result", json={})
    assert rejected.status_code == 422 and "before Heatmap" in rejected.text
    assert client.get(frozen_url).json()["heatmap_scale"] == data["heatmap_scale"]


def test_heatmap_rejects_bad_roles_and_persists_explicit_scale(db_engine, tmp_path):
    client, root, graph, ids, node_id, payload = prepared(db_engine, tmp_path)
    for change in ["role", "type", "version", "series"]:
        bad = deepcopy(payload)
        if change == "role":
            bad["config"]["spec"]["cells"]["value"] = "absent"
        elif change == "series":
            bad["config"]["additional_series"] = [{"column_id": "absent", "name": "Extra"}]
        else:
            bad["config"]["spec"][change] = "invalid" if change == "type" else 2
        response = client.post(f"{root}/visualizations/preview", json=bad)
        assert response.status_code == 422, response.text
    spec = payload["config"]["spec"]
    spec["color_scale"] = {
        "mode": "fixed",
        "minimum": "9007199254740994.25",
        "maximum": "9007199254740994.75",
    }
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    response = client.put(url, json=payload)
    assert response.status_code == 200, response.text
    assert response.json()["config"]["spec"] == spec
    copy = client.post(
        f"{url}/copy", json={**payload, "expected_revision": 2, "config": {"title": "Copy"}}
    )
    assert copy.status_code in (200, 201), copy.text
    assert copy.json()["config"]["spec"] == spec
    result = client.post(f"{url}/result", json={}).json()
    assert (result["heatmap_scale"]["below_count"], result["heatmap_scale"]["above_count"]) == (
        1,
        1,
    )
    assert [Decimal(row["value"]) for row in result["rows"] if row["value"] is not None] == [
        Decimal("9007199254740994"),
        Decimal("9007199254740995"),
    ]
