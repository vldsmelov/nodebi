"""Derived aligned measures use the ordinary exact engine and existing atomic lifecycle."""

import hashlib
import json
from uuid import UUID, uuid4, uuid5

import pytest
from sqlalchemy.orm import Session

from app.models import ReportDocument
from app.schemas.alignment_reports import AlignmentReportRequest
from app.services.execution import WorkflowExecutionService
from tests.test_alignment_reports import counts, example
from tests.test_report_editing import save_workflow


def formula(expression, name="Difference", **settings):
    return {"node_id": str(uuid4()), "name": name, "expression": expression, "scale": 2, **settings}


def refs(body):
    prefix = f"align_{uuid5(UUID(body['request_id']), 'alignment-node').hex}"
    return f"[{prefix}_left_value]", f"[{prefix}_right_value]"


def test_exact_chain_preview_apply_retry_and_release(db_engine, tmp_path):
    client, root, graph, body = example(db_engine, tmp_path)
    left, right = refs(body)
    first = formula(f"{left}-{right}")
    second = formula(f"[calc_{UUID(first['node_id']).hex}] / nullif({right}, 0) * 100", "Change %")
    body["formulas"] = [first, second]
    before = counts(db_engine)
    checked = client.post(f"{root}/alignment-reports/fields", json=body)
    assert checked.status_code == 200, checked.text
    assert len(checked.json()["columns"]) == 5
    assert [len(c) for c in checked.json()["formula_outputs"].values()] == [6, 7]
    response = client.post(f"{root}/alignment-reports/preview", json=body)
    assert response.status_code == 200, response.text
    preview = response.json()
    assert preview["formula_fields"] == checked.json()
    expected = [
        ["A", "0.30", "0.60", True, True, "-0.30", "-50.00"],
        ["B", "0.50", None, True, False, None, None],
    ]
    assert [list(r.values()) for r in preview["rows"]] == expected
    assert preview["alignment_diagnostics"]["left_only_rows"] == 1
    assert counts(db_engine) == before
    graph_url = f"/api/v1/workflows/{graph['id']}"
    assert client.get(graph_url).json() == graph
    saved = client.post(f"{root}/alignment-reports/apply", json=body)
    assert saved.status_code == 200, saved.text
    ids = saved.json()
    after = client.get(graph_url).json()
    assert after["nodes"][:-3] == graph["nodes"]
    assert after["edges"][:-4] == graph["edges"]
    assert [n["type"] for n in after["nodes"][-3:]] == [
        "align_measures",
        "calculated_column",
        "calculated_column",
    ]
    assert after["result_catalog"]["outputs"][-1]["node_id"] == second["node_id"]
    retry = client.post(f"{root}/alignment-reports/apply", json=body)
    assert retry.status_code == 200 and retry.json() == ids
    assert client.get(graph_url).json() == after
    assert (
        client.get(f"{root}/report-builder/{ids['visualization_id']}").json()["editable"] is False
    )
    changed = {**body, "formulas": [first]}
    assert client.post(f"{root}/alignment-reports/apply", json=changed).status_code == 409
    rendered = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert rendered.status_code == 200, rendered.text
    assert [list(r.values()) for r in rendered.json()["rows"]] == expected
    # Independent execution of the saved graph yields the same values and lineage.
    manual = client.post(f"{graph_url}/nodes/{second['node_id']}/preview", json={})
    assert manual.status_code == 200, manual.text
    assert [list(r.values()) for r in manual.json()["rows"]] == expected
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Derived measures",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release = client.get(f"{root}/releases").json()[0]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored derived"}
    )
    assert restored.status_code == 200, restored.text
    visuals = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"]
    visual = next(v for v in visuals if v["name"] == body["name"])
    result = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert result.status_code == 200, result.text
    assert [list(r.values()) for r in result.json()["rows"]] == expected


def test_fields_infers_without_executing_or_saving(db_engine, tmp_path, monkeypatch):
    client, root, graph, body = example(db_engine, tmp_path)
    left, right = refs(body)
    body["formulas"] = [formula(f"{left} / {right}")]
    before = counts(db_engine)

    def fail(*args, **kwargs):
        raise AssertionError("Field discovery must not execute rows")

    monkeypatch.setattr(WorkflowExecutionService, "execute", fail)
    response = client.post(f"{root}/alignment-reports/fields", json=body)
    assert response.status_code == 200, response.text
    assert counts(db_engine) == before
    assert client.get(f"/api/v1/workflows/{graph['id']}").json() == graph


@pytest.mark.parametrize(
    "kind",
    ["missing", "forward", "duplicate", "collision", "zero", "overflow", "boolean", "unsafe"],
)
def test_invalid_formulas_do_not_write(db_engine, tmp_path, kind):
    client, root, graph, body = example(db_engine, tmp_path)
    left, right = refs(body)
    first = formula(f"{left} - {right}")
    other = formula("1", "Other")
    if kind == "missing":
        first["expression"] = "[removed] + 1"
    elif kind == "forward":
        first["expression"] = f"[calc_{UUID(other['node_id']).hex}] + 1"
    elif kind == "duplicate":
        other["node_id"] = first["node_id"]
    elif kind == "collision":
        first["node_id"] = graph["nodes"][0]["id"]
    elif kind == "zero":
        first["expression"] = f"{left}/({right}-{right})"
    elif kind == "overflow":
        first.update(expression="1000", precision=2, scale=0)
    elif kind == "boolean":
        first["expression"] = left.replace("_value", "_present") + " + 1"
    else:
        first["expression"] = "__import__('os')"
    body["formulas"] = [first, other]
    before = counts(db_engine)
    for action in ("preview", "apply"):
        response = client.post(f"{root}/alignment-reports/{action}", json=body)
        assert response.status_code in {400, 422}, response.text
    assert counts(db_engine) == before
    assert client.get(f"/api/v1/workflows/{graph['id']}").json() == graph


def test_all_sixteen_formulas_and_explicit_zero_fallback(db_engine, tmp_path):
    client, root, _, body = example(db_engine, tmp_path)
    left, right = refs(body)
    body["formulas"] = [
        formula(f"safe_divide({left}, {right}-{right}, 0)", f"Measure {i}") for i in range(16)
    ]
    response = client.post(f"{root}/alignment-reports/apply", json=body)
    assert response.status_code == 200, response.text
    rendered = client.post(
        f"/api/v1/visualizations/{response.json()['visualization_id']}/result", json={}
    )
    assert rendered.status_code == 200, rendered.text
    assert all(list(row.values())[5:] == ["0.00"] * 16 for row in rendered.json()["rows"])


def test_historical_receipt_remains_valid(db_engine, tmp_path):
    client, root, _, body = example(db_engine, tmp_path)
    response = client.post(f"{root}/alignment-reports/apply", json=body)
    assert response.status_code == 200, response.text
    with Session(db_engine) as session:
        receipt = session.get(ReportDocument, UUID(body["request_id"]))
        # Original requests include config defaults in their canonical hash.
        payload = AlignmentReportRequest.model_validate(body).model_dump(
            mode="json", exclude={"formulas"}
        )
        expected = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        assert receipt.payload["fingerprint"] == expected
    retry = client.post(f"{root}/alignment-reports/apply", json={**body, "formulas": []})
    assert retry.status_code == 200 and retry.json() == response.json()


@pytest.mark.parametrize("kind", ["float", "empty", "late_zero", "large"])
def test_full_data_and_numeric_boundaries(db_engine, tmp_path, kind):
    client, root, graph, body = example(db_engine, tmp_path)
    group = next(n for n in graph["nodes"] if n["type"] == "group_by")
    data = {
        "float": "category,amount\nA,0.1\n",
        "empty": "category,amount\n",
        "late_zero": "category,amount\n"
        + "".join(f"K{i:03},2.00\n" for i in range(59))
        + "K059,1.00\n",
        "large": "category,amount\nA,9007199254740993.11\n",
    }[kind]
    source = client.post(
        f"{root}/imports",
        data={"connector": "csv"},
        files={"file": ("boundary.csv", data.encode())},
    ).json()
    profile = client.post(
        f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": "table"}
    ).json()["profile"]
    for field, identity, logical in zip(
        profile["fields"],
        [group["config"]["dimensions"][0], group["config"]["aggregations"][0]["column_id"]],
        ["string", "float" if kind == "float" else "decimal"],
        strict=True,
    ):
        field.update(field_id=identity, logical_type=logical)
        if logical == "decimal":
            field.update(precision=38, scale=2)
    applied = client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={"profile": profile, "expected_revision": 1, "request_id": str(uuid4())},
    )
    assert applied.status_code == 200, applied.text
    next(n for n in graph["nodes"] if n["type"] == "dataset_source")["config"]["source_id"] = (
        source["id"]
    )
    graph = save_workflow(client, graph)
    body["right_publication_id"] = body["left_publication_id"]
    body["alignment"]["right_value"] = body["alignment"]["left_value"]
    body["expected_token"] = client.get(
        f"{root}/report-builder/inputs/{graph['id']}/{body['left_publication_id']}"
    ).json()["expected_token"]
    left, _ = refs(body)
    body["formulas"] = [formula(f"{left}/({left}-1)" if kind == "late_zero" else f"{left}+0.10")]
    before = counts(db_engine)
    for action in ("preview", "apply"):
        response = client.post(f"{root}/alignment-reports/{action}", json=body)
        if kind in {"float", "late_zero"}:
            assert response.status_code == 422, response.text
            assert (
                "Float64" in response.text
                if kind == "float"
                else "division by zero" in response.text
            )
            assert counts(db_engine) == before
            assert client.get(f"/api/v1/workflows/{graph['id']}").json() == graph
        else:
            assert response.status_code == 200, response.text
            if action == "preview":
                assert (
                    response.json()["rows"] == []
                    if kind == "empty"
                    else response.json()["rows"][0]["Difference"] == "9007199254740993.21"
                )
