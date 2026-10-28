import copy
import hashlib
import json
import uuid
from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.models import ReportDocument, Workflow
from app.services.execution import WorkflowExecutionService
from tests.test_report_editing import save_workflow
from tests.test_sources_api import create_project, make_client


def example(db_engine: Engine, tmp_path: Path):
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    source = client.post(
        f"/api/v1/projects/{project}/imports",
        data={"connector": "csv"},
        files={"file": ("sales.csv", b"category,actual,plan\nA,1.00,1.00\nA,9.00,3.00\n")},
    ).json()
    profile = client.post(
        f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": "table"}
    ).json()["profile"]
    snapshot = client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={"profile": profile, "expected_revision": 1, "request_id": str(uuid.uuid4())},
    ).json()
    category, actual, plan = [f["field_id"] for f in profile["fields"]]
    row_id = uuid.uuid4()
    output_ids = [uuid.uuid4() for _ in range(3)]
    summary_id = uuid.uuid4()
    body = {
        "request_id": str(uuid.uuid4()),
        "source_id": source["id"],
        "resource_id": "table",
        "expected_snapshot_id": snapshot["id"],
        "name": "Actual / plan",
        "dimensions": [category],
        "row_formulas": [
            {
                "node_id": str(row_id),
                "name": "Row ratio",
                "expression": f"[{actual}] / [{plan}]",
                "scale": 4,
            }
        ],
        "measures": [
            {
                "output_id": str(output_ids[0]),
                "column_id": actual,
                "name": "Actual",
                "operation": "sum",
            },
            {
                "output_id": str(output_ids[1]),
                "column_id": plan,
                "name": "Plan",
                "operation": "sum",
            },
            {
                "output_id": str(output_ids[2]),
                "column_id": f"calc_{row_id.hex}",
                "name": "Mean of ratios",
                "operation": "average",
            },
        ],
        "summary_formulas": [
            {
                "node_id": str(summary_id),
                "name": "Ratio of totals",
                "expression": f"[measure_{output_ids[0].hex}] / [measure_{output_ids[1].hex}]",
                "scale": 4,
            }
        ],
        "decimal_average_scale": 4,
    }
    return client, project, body


def test_scopes_schema_preview_atomic_apply_and_retry(db_engine: Engine, tmp_path: Path) -> None:
    client, project, body = example(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}/report-builder"
    fields = client.post(f"{root}/fields", json=body)
    assert fields.status_code == 200, fields.text
    assert fields.json()["row_columns"][-1]["display_name"] == "Row ratio"
    assert fields.json()["measure_columns"][0]["column_id"] == "measure_" + body["measures"][0][
        "output_id"
    ].replace("-", "")
    preview = client.post(f"{root}/preview", json=body)
    assert preview.status_code == 200, preview.text
    assert preview.json()["rows"][0] == {
        body["dimensions"][0]: "A",
        "Actual": "10.00",
        "Plan": "4.00",
        "Mean of ratios": "2.0000",
        "Ratio of totals": "2.5000",
    }
    assert [(n["type"], n["version"]) for n in preview.json()["graph"]["nodes"]] == [
        ("dataset_source", 1),
        ("calculated_column", 2),
        ("group_by", 3),
        ("calculated_column", 2),
    ]
    with Session(db_engine) as session:
        assert not list(session.scalars(select(Workflow)))
    saved = client.post(f"{root}/apply", json=body)
    assert saved.status_code == 200, saved.text
    assert client.post(f"{root}/apply", json=body).json() == saved.json()
    result = client.post(
        f"/api/v1/visualizations/{saved.json()['visualization_id']}/result", json={}
    )
    assert result.json()["rows"] == preview.json()["rows"]


def test_field_checks_do_not_execute_or_save_formulas(
    db_engine: Engine, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    client, project, body = example(db_engine, tmp_path)

    def unexpected_execution(*args, **kwargs):
        pytest.fail("Field inspection must infer schemas without executing a report.")

    monkeypatch.setattr(WorkflowExecutionService, "execute", unexpected_execution)
    body["row_formulas"][0]["expression"] = "1 / 0"
    response = client.post(f"/api/v1/projects/{project}/report-builder/fields", json=body)
    assert response.status_code == 200, response.text
    with Session(db_engine) as session:
        assert not list(session.scalars(select(Workflow)))


def test_summary_field_chain_is_opt_in_schema_only_and_preserves_edit_guards(
    db_engine: Engine, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    client, project, body = example(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}/report-builder"
    first = body["summary_formulas"][0]
    second = {
        "node_id": str(uuid.uuid4()),
        "name": "Achievement percent",
        "expression": f"[calc_{first['node_id'].replace('-', '')}] * 100",
        "scale": 2,
    }
    body["summary_formulas"].append(second)
    saved = client.post(f"{root}/apply", json=body)
    assert saved.status_code == 200, saved.text
    result = client.post(
        f"/api/v1/visualizations/{saved.json()['visualization_id']}/result", json={}
    )
    assert result.json()["rows"][0]["Achievement percent"] == "250.00"
    edit_root = f"{root}/{saved.json()['visualization_id']}"
    view = client.get(edit_root).json()
    editing = {
        "request_id": str(uuid.uuid4()),
        "expected_token": view["expected_token"],
        "settings": view["settings"],
    }
    before = client.get(f"/api/v1/workflows/{saved.json()['workflow_id']}").json()

    def unexpected_execution(*args, **kwargs):
        pytest.fail("Checking chained formula fields must never execute a report.")

    monkeypatch.setattr(WorkflowExecutionService, "execute", unexpected_execution)
    for endpoint, payload in [(root, body), (edit_root, editing)]:
        response = client.post(f"{endpoint}/fields?include_summary=true", json=payload)
        assert response.status_code == 200, response.text
        outputs = response.json()["summary_outputs"]
        assert list(outputs) == [first["node_id"], second["node_id"]]
        assert outputs[first["node_id"]][-1]["display_name"] == "Ratio of totals"
        assert outputs[first["node_id"]][-1]["metadata"]["scale"] == 4
        assert outputs[second["node_id"]][-1]["display_name"] == "Achievement percent"
        assert outputs[second["node_id"]][-1]["metadata"]["scale"] == 2
        assert body["dimensions"][0] not in {c["column_id"] for c in outputs[first["node_id"]]}
        # Existing callers still inspect row/measure fields even with an invalid summary.
        invalid = copy.deepcopy(payload)
        settings = invalid.get("settings", invalid)
        settings["summary_formulas"][0]["expression"] = "[missing_measure] + 1"
        legacy = client.post(f"{endpoint}/fields", json=invalid)
        assert legacy.status_code == 200, legacy.text
        assert legacy.json()["summary_outputs"] == {}
        rejected = client.post(f"{endpoint}/fields?include_summary=true", json=invalid)
        assert rejected.status_code == 422, rejected.text
        assert rejected.json()["detail"]["code"] == "INVALID_REPORT"
        not_executed = copy.deepcopy(payload)
        not_executed.get("settings", not_executed)["summary_formulas"][-1]["expression"] = "1 / 0"
        assert (
            client.post(f"{endpoint}/fields?include_summary=true", json=not_executed).status_code
            == 200
        )
    stale = {**editing, "expected_token": "0" * 64}
    assert client.post(f"{edit_root}/fields?include_summary=true", json=stale).status_code == 409
    assert client.get(f"/api/v1/workflows/{saved.json()['workflow_id']}").json() == before
    with Session(db_engine) as session:
        assert len(list(session.scalars(select(Workflow)))) == 1


@pytest.mark.parametrize("binding", ["block", "branch", "publication"])
def test_shared_formula_outputs_remain_graph_only(
    db_engine: Engine, tmp_path: Path, binding: str
) -> None:
    client, project, body = example(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}/report-builder"
    ids = client.post(f"{root}/apply", json=body).json()
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    formula_id = body["summary_formulas"][0]["node_id"]
    if binding == "block":
        graph["presentation"]["blocks"] = [
            {
                "id": str(uuid.uuid4()),
                "label": "Manual summary block",
                "node_ids": [formula_id],
                "position": {"x": 15, "y": 16},
                "collapsed": True,
                "inputs": [
                    {
                        "id": str(uuid.uuid4()),
                        "label": "Input",
                        "node_id": formula_id,
                        "port": "input",
                    }
                ],
                "outputs": [],
            }
        ]
    elif binding == "branch":
        node_id = str(uuid.uuid4())
        graph["nodes"].append(
            {
                "id": node_id,
                "type": "calculated_column",
                "version": 2,
                "position": {"x": 99, "y": 99},
                "config": {"name": "Another consumer", "expression": "1"},
                "ui": {},
            }
        )
        graph["edges"].append(
            {
                "id": str(uuid.uuid4()),
                "source_node_id": formula_id,
                "source_port": "dataset",
                "target_node_id": node_id,
                "target_port": "input",
            }
        )
    else:
        output = copy.deepcopy(graph["result_catalog"]["outputs"][0])
        output.update(id=str(uuid.uuid4()), name="Another publication")
        graph["result_catalog"]["outputs"].append(output)
    saved = save_workflow(client, graph)
    root += "/" + ids["visualization_id"]
    view = client.get(root).json()
    assert not view["editable"], view
    settings = {
        key: value
        for key, value in body.items()
        if key not in {"request_id", "source_id", "resource_id", "expected_snapshot_id"}
    }
    response = client.post(
        f"{root}/apply",
        json={
            "request_id": str(uuid.uuid4()),
            "expected_token": view["expected_token"],
            "settings": settings,
        },
    )
    assert response.status_code == 409, response.text
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == saved


def test_roundtrip_reorder_rename_then_reject_missing_denominator(
    db_engine: Engine, tmp_path: Path
) -> None:
    client, project, body = example(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}/report-builder"
    saved = client.post(f"{root}/apply", json=body).json()
    root += "/" + saved["visualization_id"]
    view = client.get(root).json()
    assert view["editable"], view
    assert len(view["settings"]["row_formulas"]) == len(view["settings"]["summary_formulas"]) == 1
    assert all(step["editable"] for step in view["steps"][1:])
    request = {
        "request_id": str(uuid.uuid4()),
        "expected_token": view["expected_token"],
        "settings": view["settings"],
    }
    measures = request["settings"]["measures"]
    measures[0]["name"] = "Renamed actual"
    request["settings"]["measures"] = [measures[2], measures[1], measures[0]]
    checked = client.post(f"{root}/fields", json=request)
    assert checked.status_code == 200, checked.text
    preview = client.post(f"{root}/preview", json=request)
    assert preview.status_code == 200, preview.text
    assert preview.json()["rows"][0]["Ratio of totals"] == "2.5000"
    assert preview.json()["rows"][0]["Renamed actual"] == "10.00"
    assert client.post(f"{root}/apply", json=request).status_code == 200
    view = client.get(root).json()
    before = client.get(f"/api/v1/workflows/{saved['workflow_id']}").json()
    request = {
        "request_id": str(uuid.uuid4()),
        "expected_token": view["expected_token"],
        "settings": view["settings"],
    }
    request["settings"]["measures"] = [
        m for m in request["settings"]["measures"] if m["name"] != "Plan"
    ]
    request["settings"]["rebind_fields"] = True
    rejected = client.post(f"{root}/apply", json=request)
    assert rejected.status_code == 422, rejected.text
    assert "Unknown column ID" in rejected.text
    assert client.get(f"/api/v1/workflows/{saved['workflow_id']}").json() == before
    with Session(db_engine) as session:
        assert session.get(ReportDocument, uuid.UUID(request["request_id"])) is None


@pytest.mark.parametrize("conditional", [False, True])
def test_selected_formula_kpi_and_release_restore(
    db_engine: Engine, tmp_path: Path, conditional: bool
) -> None:
    client, project, body = example(db_engine, tmp_path)
    literal = "calc_" + body["row_formulas"][0]["node_id"].replace("-", "")
    if conditional:
        original = body["row_formulas"][0]["expression"]
        body["row_formulas"][0]["expression"] = (
            f"if_else([{body['dimensions'][0]}] != '{literal}', {original}, 1 / 0)"
        )
        plan = "measure_" + body["measures"][1]["output_id"].replace("-", "")
        original = body["summary_formulas"][0]["expression"]
        body["summary_formulas"][0]["expression"] = (
            f"if_else(not is_null([{plan}]) and [{plan}] > 0, {original}, None)"
        )
    body.update(
        dimensions=[],
        presentation="kpi",
        value_field_id="calc_" + body["summary_formulas"][0]["node_id"].replace("-", ""),
    )
    saved = client.post(f"/api/v1/projects/{project}/report-builder/apply", json=body)
    assert saved.status_code == 200, saved.text
    ids = saved.json()
    result = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert result.status_code == 200, result.text
    client.post(f"/api/v1/projects/{project}/checks")
    check = client.get(f"/api/v1/projects/{project}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"/api/v1/projects/{project}/releases",
        json={
            "name": "Formula",
            "period": "October",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release = client.get(f"/api/v1/projects/{project}/releases").json()[0]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored formulas"}
    )
    assert restored.status_code == 200, restored.text
    restored_id = restored.json()["id"]
    visual = client.get(f"/api/v1/projects/{restored_id}/visualizations").json()["items"][0]
    restored_result = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert restored_result.status_code == 200, restored_result.text
    assert restored_result.json()["rows"] == result.json()["rows"]
    assert client.get(f"/api/v1/projects/{restored_id}/report-builder/{visual['id']}").json()[
        "editable"
    ]
    if conditional:
        view = client.get(f"/api/v1/projects/{restored_id}/report-builder/{visual['id']}").json()
        row = view["settings"]["row_formulas"][0]
        assert row["node_id"] != body["row_formulas"][0]["node_id"]
        assert f"'{literal}'" in row["expression"]
        assert "2.5000" in restored_result.text


@pytest.mark.parametrize(
    "defect", ["zero", "overflow", "forward", "collision", "mixed", "duplicate"]
)
def test_invalid_formula_never_creates_partial_report(
    db_engine: Engine, tmp_path: Path, defect: str
) -> None:
    client, project, body = example(db_engine, tmp_path)
    if defect == "zero":
        body["summary_formulas"][0]["expression"] = "1 / 0"
    elif defect == "overflow":
        body["summary_formulas"][0].update(expression="999.995", precision=5, scale=2)
    elif defect == "forward":
        body["row_formulas"][0]["expression"] = (
            "[measure_" + body["measures"][0]["output_id"].replace("-", "") + "]"
        )
    elif defect == "collision":
        body["row_formulas"][0]["node_id"] = str(
            uuid.uuid5(uuid.UUID(body["request_id"]), "source")
        )
    elif defect == "mixed":
        body["measures"][0].pop("output_id")
    else:
        body["measures"][1]["output_id"] = body["measures"][0]["output_id"]
    response = client.post(f"/api/v1/projects/{project}/report-builder/apply", json=body)
    assert response.status_code == 422, response.text
    with Session(db_engine) as session:
        assert not list(session.scalars(select(Workflow)))


def test_owned_formulas_can_be_removed_without_leaving_edges_or_changing_other_branches(
    db_engine: Engine, tmp_path: Path
) -> None:
    client, project, body = example(db_engine, tmp_path)
    saved = client.post(f"/api/v1/projects/{project}/report-builder/apply", json=body).json()
    graph = client.get(f"/api/v1/workflows/{saved['workflow_id']}").json()
    extra = {
        "id": str(uuid.uuid4()),
        "type": "calculated_column",
        "version": 1,
        "position": {"x": 77, "y": 88},
        "config": {"name": "Legacy", "expression": "1.5"},
        "ui": {"label": "Do not change"},
    }
    graph["nodes"].append(extra)
    save_workflow(client, graph)
    root = f"/api/v1/projects/{project}/report-builder/{saved['visualization_id']}"
    view = client.get(root).json()
    request = {
        "request_id": str(uuid.uuid4()),
        "expected_token": view["expected_token"],
        "settings": view["settings"],
    }
    request["settings"].update(
        row_formulas=[], summary_formulas=[], value_field_id=None, rebind_fields=True
    )
    request["settings"]["measures"] = request["settings"]["measures"][:2]
    applied = client.post(f"{root}/apply", json=request)
    assert applied.status_code == 200, applied.text
    result = client.get(f"/api/v1/workflows/{saved['workflow_id']}").json()
    assert next(n for n in result["nodes"] if n["id"] == extra["id"]) == extra
    assert not any(
        n["id"] in {body["row_formulas"][0]["node_id"], body["summary_formulas"][0]["node_id"]}
        for n in result["nodes"]
    )
    assert (
        client.post(
            f"/api/v1/visualizations/{saved['visualization_id']}/result", json={}
        ).status_code
        == 200
    )


def test_legacy_creation_receipts_keep_their_previous_fingerprint(
    db_engine: Engine, tmp_path: Path
) -> None:
    client, project, body = example(db_engine, tmp_path)
    body.pop("row_formulas")
    body.pop("summary_formulas")
    body["measures"] = body["measures"][:2]
    for measure in body["measures"]:
        measure.pop("output_id")
    saved = client.post(f"/api/v1/projects/{project}/report-builder/apply", json=body)
    assert saved.status_code == 200, saved.text
    old_payload = {**copy.deepcopy(body), "filters": [], "presentation": "table"}
    old_hash = hashlib.sha256(json.dumps(old_payload, sort_keys=True).encode()).hexdigest()
    with Session(db_engine) as session:
        receipt = session.get(ReportDocument, uuid.UUID(body["request_id"]))
        assert receipt.payload["fingerprint"] == old_hash
    assert (
        client.post(f"/api/v1/projects/{project}/report-builder/apply", json=body).json()
        == saved.json()
    )
