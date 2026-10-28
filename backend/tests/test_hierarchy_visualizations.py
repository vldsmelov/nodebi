from copy import deepcopy
from decimal import Decimal, localcontext
from uuid import uuid4

import polars as pl
import pytest

from app.domain.datasets import Dataset
from app.domain.visualization_specs import AnalyticalRowRoles, HierarchySpec
from app.services.hierarchy_visualizations import prepare_hierarchy
from tests.test_report_editing import save_workflow
from tests.test_table_rollup import measure, run
from tests.test_table_rollup_api import prepare
from tests.test_waterfall_api import freeze


def spec_for(dataset):
    return HierarchySpec(
        type="treemap_chart",
        rows=AnalyticalRowRoles.model_validate(
            {key: dataset.schema.by_name(key).column_id for key in AnalyticalRowRoles.model_fields}
        ),
        dimensions=[
            c.column_id
            for c in dataset.schema.columns
            if c.metadata.get("rollup_role") == "dimension"
        ],
        value_column_id=next(
            c.column_id
            for c in dataset.schema.columns
            if c.metadata.get("rollup_role") == "measure"
        ),
    )


def test_complete_exact_hierarchy_distinguishes_null_keys_and_reorders_stably():
    node_id = uuid4()
    rows = [("N", "A", 10, 1), ("N", "B", 20, 1), (None, "A", 0, 1)]
    data = run(rows, node_id=node_id, measures=[measure("sum")])
    result = prepare_hierarchy(data, spec_for(data))
    assert result.total == "30" and result.zero_count == 2
    assert len(result.points) == 6
    assert sorted(p.share_exact for p in result.points if p.depth == 2) == ["0", "1/3", "2/3"]
    other = run(list(reversed(rows)), node_id=node_id, measures=[measure("sum")])
    assert {p.id: p.model_dump() for p in result.points} == {
        p.id: p.model_dump() for p in prepare_hierarchy(other, spec_for(other)).points
    }


def test_huge_decimal_exactness_and_float_rounding():
    value = Decimal("9007199254740993.11")
    data = run(
        [("N", "A", value, value), ("N", "B", value, value)],
        dtype=pl.Decimal(38, 2),
        measures=[measure("sum")],
    )
    with localcontext() as context:
        context.prec = 2
        result = prepare_hierarchy(data, spec_for(data))
    assert result.total == "18014398509481986.22"
    assert [p.weight for p in result.points if p.depth == 2] == [0.5, 0.5]
    floating = run(
        [("N", "A", 0.1, 1.0), ("N", "B", 0.2, 1.0)], dtype=pl.Float64, measures=[measure("sum")]
    )
    assert prepare_hierarchy(floating, spec_for(floating)).total == "0.30000000000000004"


@pytest.mark.parametrize("rows", [[], [("N", "A", 0, 1)]])
def test_empty_and_zero_hierarchy_have_no_fake_shares(rows):
    data = run(rows, measures=[measure("sum")])
    assert all(
        p.weight == 0 and p.share_exact is None
        for p in prepare_hierarchy(data, spec_for(data)).points
    )


@pytest.mark.parametrize("operation", ["count", "count_rows"])
def test_count_measure_preserves_full_population(operation):
    data = run([("N", "A", None, 1), ("N", "B", 3, 1)], measures=[measure(operation)])
    result = prepare_hierarchy(data, spec_for(data))
    assert result.total == ("1" if operation == "count" else "2")


def test_complete_large_tree_survives_freeze_beyond_preview_limit(db_engine, tmp_path):
    csv = ("group,value,branch\n" + "".join(f"N,1,B{i}\n" for i in range(1201))).encode()
    client, root, graph, ids, _, _, payload = setup(db_engine, tmp_path, csv=csv)
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    assert client.put(url, json=payload).status_code == 200
    live = client.post(f"{url}/result", json={"limit": 1}).json()
    assert len(live["rows"]) == len(live["hierarchy"]["points"]) == 1203
    _, frozen_url = freeze(client, root, ids)
    assert client.get(frozen_url, params={"limit": 1}).json()["hierarchy"] == live["hierarchy"]
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    column = client.post(
        f"/api/v1/workflows/{graph['id']}/nodes/{source['id']}/preview", json={}
    ).json()["columns"][2]["column_id"]
    identity = str(uuid4())
    graph["result_catalog"]["outputs"][0]["context_ids"] = [identity]
    graph["result_catalog"]["contexts"] = [
        {
            "id": identity,
            "name": "Branch",
            "roles": [{"name": "branch", "logical_type": "string"}],
            "points": [
                {"node_id": source["id"], "port": "dataset", "role": "branch", "column_id": column}
            ],
        }
    ]
    save_workflow(client, graph)
    filtered = client.post(f"{url}/result", json={"context": {"values": {"branch": "B1200"}}})
    assert filtered.status_code == 200, filtered.text
    after = filtered.json()["hierarchy"]
    assert after["total"] == "1" and len(after["points"]) == 3
    assert all(p["share_exact"] == "1" for p in after["points"])
    assert {p["id"] for p in after["points"]} <= {p["id"] for p in live["hierarchy"]["points"]}
    assert client.get(frozen_url).json()["hierarchy"]["total"] == "1201"


@pytest.mark.parametrize("value", [None, -1])
def test_missing_and_negative_contributions_are_not_silently_removed(value):
    data = run([("N", "A", value, 1)], measures=[measure("sum")])
    with pytest.raises(ValueError, match="finite, non-empty"):
        prepare_hierarchy(data, spec_for(data))


@pytest.mark.parametrize(
    "damage", ["duplicate", "missing_parent", "wrong_total", "depth", "kind", "too_many"]
)
def test_damaged_or_oversized_hierarchy_fails_explicitly(damage):
    data = run([("N", "A", 1, 1)], measures=[measure("sum")])
    rows = data.frame.to_dicts()
    if damage == "duplicate":
        rows.append(rows[0])
    if damage == "missing_parent":
        rows[0]["parent_id"] = "gone"
    if damage == "wrong_total":
        rows[-1][data.schema.by_id(spec_for(data).value_column_id).engine_name] = Decimal(99)
    if damage == "depth":
        rows[0]["depth"] = 8
    if damage == "kind":
        rows[0]["kind"] = "subtotal"
    if damage == "too_many":
        rows = [rows[0]] * 5001
    damaged = Dataset(pl.DataFrame(rows, schema=data.frame.schema), data.schema)
    with pytest.raises(ValueError):
        prepare_hierarchy(damaged, spec_for(data))


def setup(db_engine, tmp_path, kind="treemap_chart", csv=None):
    client, root, graph, ids, node_id, _, fields = prepare(
        db_engine, tmp_path, csv or b"group,value,branch\nNorth,10,A\nNorth,20,B\nSouth,0,A\n"
    )
    schema = client.get(
        f"/api/v1/workflows/{graph['id']}/publications/{ids['publication_id']}/schema"
    ).json()
    spec = next(s for s in schema["suggested_specs"] if s["type"] == kind)
    payload = dict(
        workflow_id=graph["id"],
        publication_id=ids["publication_id"],
        expected_workflow_revision=graph["revision"],
        expected_revision=1,
        name="Hierarchy",
        type=kind,
        config={"spec": spec},
    )
    return client, root, graph, ids, node_id, fields, payload


@pytest.mark.parametrize("kind", ["treemap_chart", "sunburst_chart"])
def test_complete_tree_save_retry_freeze_and_restore(db_engine, tmp_path, kind):
    client, root, graph, ids, _, _, payload = setup(db_engine, tmp_path, kind)
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    before = client.get(url).json()
    preview = client.post(f"{root}/visualizations/preview", json=payload)
    assert preview.status_code == 200, preview.text
    assert client.get(url).json() == before
    result = preview.json()
    assert result["hierarchy"]["total"] == "30" and len(result["rows"]) == 6
    payload["request_id"] = str(uuid4())
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    assert client.put(url, json=payload).json() == saved.json()
    assert client.put(url, json={**payload, "request_id": str(uuid4())}).status_code == 409
    complete = client.post(f"{url}/result", json={"offset": 5, "limit": 1}).json()
    assert complete["rows"] == result["rows"] and not complete["truncated"]
    release, frozen_url = freeze(client, root, ids)
    frozen = client.get(frozen_url, params={"offset": 5, "limit": 1}).json()
    assert frozen["hierarchy"] == result["hierarchy"] and frozen["rows"] == result["rows"]
    restored = client.post(
        f"/api/v1/releases/{release}/restore", json={"name": "Hierarchy restored"}
    )
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert after.status_code == 200, after.text
    assert after.json()["hierarchy"]["total"] == "30"
    assert sorted(p["share_exact"] or "" for p in after.json()["hierarchy"]["points"]) == sorted(
        p["share_exact"] or "" for p in result["hierarchy"]["points"]
    )
    inherited = client.post(
        f"{url}/copy",
        json={
            **payload,
            "expected_revision": 2,
            "request_id": str(uuid4()),
            "config": {"title": "Copy"},
        },
    )
    assert inherited.status_code == 201, inherited.text
    assert inherited.json()["config"]["spec"] == payload["config"]["spec"]


@pytest.mark.parametrize(
    "damage", ["average", "spec_type", "subtotals", "grand_total", "negative", "post_context"]
)
def test_invalid_settings_and_population_do_not_mutate_visualization(db_engine, tmp_path, damage):
    csv = b"group,value,branch\nN,-1,A\nN,2,B\n" if damage == "negative" else None
    client, _, graph, ids, node_id, _, payload = setup(db_engine, tmp_path, csv=csv)
    node = next(n for n in graph["nodes"] if n["id"] == node_id)
    if damage == "average":
        measure_id = node["config"]["measures"][0]["output_id"].replace("-", "")
        payload["config"]["spec"]["value_column_id"] = (
            f"roll_{node_id.replace('-', '')}_measure_{measure_id}"
        )
    if damage == "spec_type":
        payload["config"]["spec"]["type"] = "sunburst_chart"
    if damage in {"subtotals", "grand_total"}:
        node["config"][damage] = False
    if damage == "post_context":
        identity = str(uuid4())
        graph["result_catalog"]["outputs"][0]["context_ids"] = [identity]
        graph["result_catalog"]["contexts"] = [
            {
                "id": identity,
                "name": "Wrong level",
                "roles": [{"name": "region", "logical_type": "string"}],
                "points": [
                    {
                        "node_id": node_id,
                        "port": "dataset",
                        "role": "region",
                        "column_id": payload["config"]["spec"]["dimensions"][0],
                    }
                ],
            }
        ]
    if damage in {"subtotals", "grand_total", "post_context"}:
        graph = save_workflow(client, graph)
        payload["expected_workflow_revision"] = graph["revision"]
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    before = deepcopy(client.get(url).json())
    failed = client.put(url, json=payload)
    assert failed.status_code == 422, failed.text
    assert client.get(url).json() == before
