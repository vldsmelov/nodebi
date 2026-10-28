from copy import deepcopy
from decimal import Decimal, localcontext
from uuid import uuid4

import pytest

from app.domain.visualization_specs import AnalyticalTableSpec, TableFormatRule
from app.services.analytical_tables import matches
from tests.test_report_editing import save_workflow
from tests.test_table_rollup_api import prepare


def rule(**patch):
    return TableFormatRule.model_validate(
        dict(id=uuid4(), column_id="measure", label="Attention", operator="gte", threshold="0")
        | patch
    )


@pytest.mark.parametrize("op", ["lt", "lte", "eq", "gte", "gt", "between", "is_empty"])
def test_exact_comparisons_and_scopes(op):
    bound = "9007199254740993.123456789012345678"
    config = rule(
        operator=op,
        threshold=None if op == "is_empty" else bound,
        upper=bound if op == "between" else None,
    )
    with localcontext() as context:
        context.prec = 2
        assert matches(config, Decimal(bound), "detail") == (op in {"lte", "eq", "gte", "between"})
        assert matches(config, None, "detail") == (op == "is_empty")
    assert not matches(rule(scope="details"), 1, "subtotal")
    assert not matches(rule(scope="totals"), 1, "detail")
    assert matches(rule(scope="totals"), 0, "grand_total")
    assert not matches(rule(), None, "grand_total")


@pytest.mark.parametrize(
    "patch",
    [
        {"threshold": "NaN"},
        {"threshold": "Infinity"},
        {"threshold": "1e3"},
        {"threshold": "1,5"},
        {"threshold": 10},
        {"threshold": ""},
        {"upper": "10"},
        {"operator": "between", "upper": "-1"},
        {"operator": "between"},
        {"operator": "is_empty"},
        {"label": "  "},
    ],
)
def test_invalid_rules_fail(patch):
    with pytest.raises(ValueError):
        rule(**patch)


def setup(db_engine, tmp_path, csv=None):
    client, root, graph, ids, node_id, _, fields = prepare(db_engine, tmp_path, csv)
    schema = client.get(
        f"/api/v1/workflows/{graph['id']}/publications/{ids['publication_id']}/schema"
    )
    assert schema.status_code == 200, schema.text
    spec = next(s for s in schema.json()["suggested_specs"] if s["type"] == "analytical_table")
    spec["rules"] = [
        rule(column_id=spec["measures"][1], label="High", threshold="20").model_dump(mode="json"),
        rule(column_id=spec["measures"][1], label="Fallback", threshold="0").model_dump(
            mode="json"
        ),
        rule(
            column_id=spec["measures"][1], label="Missing", operator="is_empty", threshold=None
        ).model_dump(mode="json"),
    ]
    payload = dict(
        workflow_id=graph["id"],
        publication_id=ids["publication_id"],
        expected_workflow_revision=graph["revision"],
        expected_revision=1,
        name="Analytical table",
        type="analytical_table",
        config={"spec": spec},
    )
    url = f"/api/v1/visualizations/{ids['visualization_id']}"
    return client, root, graph, ids, node_id, fields, spec, payload, url


def test_pages_rules_preview_save_copy_and_cas(db_engine, tmp_path):
    client, root, _, _, _, _, spec, payload, url = setup(db_engine, tmp_path)
    preview = client.post(f"{root}/visualizations/preview", json=payload)
    assert preview.status_code == 200, preview.text
    result = preview.json()
    assert result["total_rows"] == 6 and result["datasets"]["table"]["rows"] == result["rows"]
    assert [
        result["analytical_table"]["cells"][r["row_id"]][spec["measures"][1]]["label"]
        for r in result["rows"]
    ] == ["Fallback", "High", "High", "Missing", "Missing", "High"]
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    assert client.put(url, json=payload).status_code == 409
    page = client.post(f"{url}/result", json={"offset": 5, "limit": 1}).json()
    assert page["rows"] == [result["rows"][-1]]
    assert list(page["analytical_table"]["cells"]) == [result["rows"][-1]["row_id"]]
    assert page["datasets"]["table"]["offset"] == 5
    payload.update(expected_revision=saved.json()["revision"], config={"title": "Changed"})
    changed = client.put(url, json=payload)
    assert changed.status_code == 200, changed.text
    assert changed.json()["config"]["spec"] == spec
    payload["expected_revision"] = changed.json()["revision"]
    copied = client.post(f"{url}/copy", json=payload | {"name": "Copy"})
    assert copied.status_code == 201, copied.text
    assert copied.json()["config"]["spec"] == spec


def test_invalid_bindings_fail_without_mutation(db_engine, tmp_path):
    client, _, graph, _, node_id, _, spec, payload, url = setup(db_engine, tmp_path)
    before = client.get(url).json()
    for patch in (
        {"dimensions": []},
        {"measures": ["missing"]},
        {"rows": {**spec["rows"], "kind": "missing"}},
    ):
        invalid = deepcopy(payload)
        invalid["config"]["spec"].update(patch)
        assert client.put(url, json=invalid).status_code == 422
        assert client.get(url).json() == before
    for patch in (
        {"visible_measures": []},
        {"visible_measures": ["missing"]},
        {"pinned_columns": 5},
        {"pinned_columns": True},
        {"rules": [spec["rules"][0], spec["rules"][0]]},
    ):
        with pytest.raises(ValueError):
            AnalyticalTableSpec.model_validate(spec | patch)
    context_id = str(uuid4())
    graph["result_catalog"]["outputs"][0]["context_ids"] = [context_id]
    graph["result_catalog"]["contexts"] = [
        dict(
            id=context_id,
            name="Group",
            roles=[dict(name="group", logical_type="string")],
            points=[
                dict(node_id=node_id, port="dataset", role="group", column_id=spec["dimensions"][0])
            ],
        )
    ]
    graph = save_workflow(client, graph)
    payload["expected_workflow_revision"] = graph["revision"]
    rejected = client.put(url, json=payload)
    assert rejected.status_code == 422 and "before Analytical table totals" in rejected.text


def test_upstream_population_recomputes_totals_and_rules(db_engine, tmp_path):
    client, _, graph, _, _, fields, spec, payload, url = setup(db_engine, tmp_path)
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    context_id = str(uuid4())
    graph["result_catalog"]["outputs"][0]["context_ids"] = [context_id]
    graph["result_catalog"]["contexts"] = [
        dict(
            id=context_id,
            name="Branch",
            roles=[dict(name="branch", logical_type="string")],
            points=[
                dict(
                    node_id=source["id"], port="dataset", role="branch", column_id=fields["branch"]
                )
            ],
        )
    ]
    graph = save_workflow(client, graph)
    payload["expected_workflow_revision"] = graph["revision"]
    assert client.put(url, json=payload).status_code == 200
    filtered = client.post(f"{url}/result", json={"context": {"values": {"branch": "A"}}})
    assert filtered.status_code == 200, filtered.text
    result = filtered.json()
    assert result["rows"][-1]["source_count"] == 1
    assert (
        result["analytical_table"]["cells"][result["rows"][-1]["row_id"]][spec["measures"][1]][
            "label"
        ]
        == "Fallback"
    )


def test_complete_frozen_pages_restore_and_rule_immutability(db_engine, tmp_path):
    csv = ("group,value,branch\n" + "".join(f"North,{i},B{i}\n" for i in range(1101))).encode()
    client, root, _, ids, _, _, spec, payload, url = setup(db_engine, tmp_path, csv)
    saved = client.put(url, json=payload)
    assert saved.status_code == 200, saved.text
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json=dict(
            name="Analytical",
            period="2026",
            dashboard_ids=[ids["dashboard_id"]],
            expected_token=check["check"]["token"],
        ),
    )
    assert released.status_code == 200, released.text
    release_id = client.get(f"{root}/releases").json()[0]["id"]
    board = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    frozen_url = f"/api/v1/releases/{release_id}/widgets/{board['widgets'][0]['id']}/result"
    page = client.get(frozen_url, params={"offset": 1100, "limit": 3})
    assert page.status_code == 200, page.text
    result = page.json()
    assert result["total_rows"] == 1103
    assert [r["kind"] for r in result["rows"]] == ["detail", "subtotal", "grand_total"]
    assert result["datasets"]["table"]["rows"] == result["rows"]
    assert set(result["analytical_table"]["cells"]) == {r["row_id"] for r in result["rows"]}
    restored = client.post(f"/api/v1/releases/{release_id}/restore", json={"name": "Restored"})
    assert restored.status_code == 200, restored.text
    visual = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"][
        0
    ]
    after = client.post(
        f"/api/v1/visualizations/{visual['id']}/result", json={"offset": 1100, "limit": 3}
    )
    assert after.status_code == 200, after.text
    data = after.json()
    assert data["rows"][-1]["source_count"] == 1101
    assert data["spec"]["measures"] != spec["measures"]
    assert data["spec"]["rules"][0]["column_id"] == data["spec"]["measures"][1]
    assert len(data["analytical_table"]["cells"]) == 3
    payload["expected_revision"] = saved.json()["revision"]
    payload["config"]["spec"]["rules"] = []
    assert client.put(url, json=payload).status_code == 200
    assert client.get(frozen_url, params={"offset": 1100, "limit": 3}).json() == result
    empty = client.get(frozen_url, params={"offset": 2000}).json()
    assert empty["rows"] == [] and empty["analytical_table"]["cells"] == {}
