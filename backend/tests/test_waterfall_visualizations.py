from copy import deepcopy
from decimal import localcontext
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.visualization_specs import waterfall_spec
from app.services.waterfall_visualizations import waterfall_scale
from tests.test_report_editing import save_workflow
from tests.test_waterfall_api import freeze, prepare_waterfall


def scale(rows):
    spec = waterfall_spec(uuid4())
    names = ["step_id", "start", "end", "value"]
    dataset = Dataset(
        pl.DataFrame(rows, schema={name: pl.String for name in names}, orient="row"),
        DatasetSchema(
            tuple(
                ColumnSchema(getattr(spec.steps, name), name, name, LogicalType.STRING, False)
                for name in names
            )
        ),
    )
    return waterfall_scale(dataset, spec)


def test_exact_scale_crosses_zero_without_decimal_context_rounding():
    with localcontext() as context:
        context.prec = 2
        result = scale(
            [
                ("positive", "0", "9007199254740993.11", "9007199254740993.11"),
                (
                    "negative",
                    "9007199254740993.11",
                    "-9007199254740993.11",
                    "-18014398509481986.22",
                ),
            ]
        )
    assert result.minimum == "-9007199254740993.11" and result.maximum == "9007199254740993.11"
    assert result.zero == 0.5
    assert result.positions["negative"].model_dump() == {"start": 1, "end": 0, "sign": -1}
    assert result.ticks[1].label == "-4503599627370496.555"


def test_empty_zero_and_unrepresentably_small_contributions_keep_their_meaning():
    assert not scale([]).positions
    zero = scale([("zero", "0", "0", "0")])
    assert zero.zero == 0.5 and zero.ticks[0].label == "0"
    assert zero.positions["zero"].sign == 0
    exact = scale([("tiny", "9007199254740993.11", "9007199254740993.12", "0.01")])
    assert exact.positions["tiny"].sign == 1  # Even if screen endpoints round to the same pixel.
    assert exact.maximum == "9007199254740993.12"
    huge = scale([("huge", "-1e308", "1e308", "1e308")])
    assert huge.zero == 0.5 and huge.positions["huge"].end == 1


@pytest.mark.parametrize("value", ["NaN", "Infinity", "-Infinity"])
def test_nonfinite_prepared_positions_fail(value):
    with pytest.raises(ValueError, match="finite"):
        scale([("invalid", "0", value, value)])


def prepared(db_engine, tmp_path, csv=None):
    client, root, graph, ids, node_id, columns = prepare_waterfall(db_engine, tmp_path, csv)
    specs = client.get(
        f"/api/v1/workflows/{graph['id']}/publications/{ids['publication_id']}/schema"
    ).json()["suggested_specs"]
    spec = next(spec for spec in specs if spec["type"] == "waterfall_chart")
    payload = {
        "workflow_id": graph["id"],
        "publication_id": ids["publication_id"],
        "expected_workflow_revision": graph["revision"],
        "expected_revision": 1,
        "name": "Waterfall",
        "type": "waterfall_chart",
        "config": {"spec": spec},
    }
    return client, root, graph, ids, node_id, columns, payload


def test_waterfall_chart_preview_cas_copy_release_restore_and_upstream_context(db_engine, tmp_path):
    client, root, graph, ids, node_id, columns, payload = prepared(db_engine, tmp_path)
    registry = client.get("/api/v1/visualization-types").json()
    assert any(item["type"] == "waterfall_chart" and item["max_steps"] == 2000 for item in registry)
    preview = client.post(f"{root}/visualizations/preview", json=payload)
    assert preview.status_code == 200, preview.text
    data = preview.json()
    assert (data["waterfall_scale"]["minimum"], data["waterfall_scale"]["maximum"]) == (
        "-30",
        "120",
    )
    assert [row["balance"] for row in data["rows"]] == ["100", "120", "-30", "-30", "10", "10"]
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    assert client.put(url, json=payload).status_code == 409
    assert (
        client.post(f"{url}/result", json={"limit": 1, "offset": 3}).json()["datasets"]
        == data["datasets"]
    )
    copied = client.post(
        f"{url}/copy", json={**payload, "expected_revision": 2, "config": {"title": "Copy"}}
    )
    assert copied.status_code == 201, copied.text
    assert copied.json()["config"]["spec"] == payload["config"]["spec"]
    appearance = client.put(
        url, json={**payload, "expected_revision": 2, "config": {"orientation": "horizontal"}}
    )
    assert appearance.status_code == 200, appearance.text
    assert appearance.json()["config"]["spec"] == payload["config"]["spec"]
    release_id, frozen_url = freeze(client, root, ids)
    assert client.get(frozen_url).json()["waterfall_scale"] == data["waterfall_scale"]
    restored = client.post(
        f"/api/v1/releases/{release_id}/restore", json={"name": "Restored bridge"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert after.status_code == 200, after.text
    assert [row["balance"] for row in after.json()["rows"]] == [
        row["balance"] for row in data["rows"]
    ]
    assert after.json()["spec"] != data["spec"]
    assert after.json()["waterfall_scale"]["ticks"] == data["waterfall_scale"]["ticks"]
    source = next(node for node in graph["nodes"] if node["type"] == "dataset_source")
    context_id = str(uuid4())
    graph["result_catalog"]["outputs"][0]["context_ids"] = [context_id]
    graph["result_catalog"]["contexts"] = [
        {
            "id": context_id,
            "name": "Segment",
            "roles": [{"name": "selected_segment", "logical_type": "string"}],
            "points": [
                {
                    "node_id": source["id"],
                    "port": "dataset",
                    "role": "selected_segment",
                    "column_id": columns["segment"],
                }
            ],
        }
    ]
    graph = save_workflow(client, graph)
    filtered = client.post(
        f"{url}/result", json={"context": {"values": {"selected_segment": "keep"}}}
    )
    assert filtered.status_code == 200, filtered.text
    assert filtered.json()["rows"][-1]["balance"] == "160"
    graph["result_catalog"]["contexts"][0]["points"][0].update(
        node_id=node_id, column_id=data["spec"]["steps"]["category"]
    )
    save_workflow(client, graph)
    rejected = client.post(f"{url}/result", json={})
    assert rejected.status_code == 422 and "before Waterfall" in rejected.text
    assert client.get(frozen_url).json()["datasets"] == data["datasets"]


def test_complete_waterfall_chart_is_frozen_beyond_preview_limits(db_engine, tmp_path):
    csv = ("group,value\n" + "".join(f"Step{i},1\n" for i in range(1100))).encode()
    client, root, _, ids, _, _, payload = prepared(db_engine, tmp_path, csv)
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    assert client.put(url, json=payload).status_code == 200
    live = client.post(f"{url}/result", json={"limit": 1}).json()
    assert len(live["rows"]) == len(live["waterfall_scale"]["positions"]) == 1101
    _, frozen_url = freeze(client, root, ids)
    frozen = client.get(frozen_url, params={"limit": 1}).json()
    assert (
        frozen["datasets"] == live["datasets"]
        and frozen["waterfall_scale"] == live["waterfall_scale"]
    )


def test_invalid_waterfall_roles_types_series_and_navigation_do_not_save(db_engine, tmp_path):
    client, _, _, ids, _, _, payload = prepared(db_engine, tmp_path)
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    before = client.get(url).json()
    for change in ("role", "version", "type", "series", "navigation"):
        bad = deepcopy(payload)
        if change == "role":
            bad["config"]["spec"]["steps"]["start"] = "removed"
        elif change == "series":
            bad["config"]["additional_series"] = [{"column_id": "removed", "name": "Extra"}]
        elif change == "navigation":
            bad["config"]["context_column_ids"] = ["removed"]
        else:
            bad["config"]["spec"][change] = 2 if change == "version" else "heatmap_chart"
        response = client.put(url, json=bad)
        assert response.status_code == 422, response.text
        assert client.get(url).json() == before
