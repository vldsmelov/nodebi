import copy
import uuid
from pathlib import Path

import polars as pl
import pytest
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.measure_contracts import validate_measure_grain
from app.models import ReportDocument, Workflow
from tests.test_report_editing import save_workflow
from tests.test_report_formulas import example


def prepared(db_engine: Engine, tmp_path: Path, total: bool = False):
    client, project, body = example(db_engine, tmp_path)
    if total:
        body["dimensions"] = []
    root = f"/api/v1/projects/{project}"
    response = client.post(f"{root}/report-builder/apply", json=body)
    assert response.status_code == 200, response.text
    ids = response.json()
    definition = {
        "id": str(uuid.uuid4()),
        "name": "Plan attainment",
        "description": "Ratio of totals, not the mean of row ratios",
        "column_id": "calc_" + body["summary_formulas"][0]["node_id"].replace("-", ""),
        "grain_column_ids": body["dimensions"],
    }
    path = f"{root}/measures/{ids['workflow_id']}/{ids['publication_id']}"
    token = client.get(f"{root}/measures").json()["expected_token"]
    saved = client.put(path, json={"expected_token": token, "definition": definition})
    assert saved.status_code == 200, saved.text
    request = {
        "request_id": str(uuid.uuid4()),
        "workflow_id": ids["workflow_id"],
        "publication_id": ids["publication_id"],
        "measure_id": definition["id"],
        "name": "Reused attainment",
        "presentation": "table",
        "expected_token": client.get(f"{root}/measures").json()["expected_token"],
    }
    return client, root, ids, definition, request


def test_reuse_preserves_exact_values_and_does_not_copy_graph(db_engine, tmp_path):
    client, root, ids, definition, request = prepared(db_engine, tmp_path)
    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    preview = client.post(f"{root}/measure-reports/preview", json=request)
    assert preview.status_code == 200, preview.text
    assert preview.json()["rows"][0]["Ratio of totals"] == "2.5000"
    assert len(preview.json()["columns"]) == 2
    with Session(db_engine) as session:
        assert session.get(ReportDocument, uuid.UUID(request["request_id"])) is None
    applied = client.post(f"{root}/measure-reports/apply", json=request)
    assert applied.status_code == 200, applied.text
    editor = client.get(f"{root}/report-builder/{applied.json()['visualization_id']}").json()
    assert not editor["editable"]
    assert (
        editor["reason"] == "This report reuses a named measure. Edit its calculation in the graph."
    )
    assert applied.json()["publication_id"] == ids["publication_id"]
    assert applied.json()["workflow_id"] == ids["workflow_id"]
    assert client.post(f"{root}/measure-reports/apply", json=request).json() == applied.json()
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == before
    with Session(db_engine) as session:
        assert len(list(session.scalars(select(Workflow)))) == 1
    changed = {**request, "name": "Different"}
    assert client.post(f"{root}/measure-reports/apply", json=changed).status_code == 409
    changed = {**request, "request_id": str(uuid.uuid4())}
    assert client.post(f"{root}/measure-reports/apply", json=changed).status_code == 409


def test_definition_cas_immutable_binding_legacy_save_and_removal(db_engine, tmp_path):
    client, root, ids, definition, request = prepared(db_engine, tmp_path)
    applied = client.post(f"{root}/measure-reports/apply", json=request).json()
    path = f"{root}/measures/{ids['workflow_id']}/{ids['publication_id']}"
    token = client.get(f"{root}/measures").json()["expected_token"]
    wrong = {**definition, "grain_column_ids": []}
    assert client.put(path, json={"expected_token": token, "definition": wrong}).status_code == 409
    definition["name"] = "Renamed measure"
    payload = {"expected_token": token, "definition": definition}
    assert client.put(path, json=payload).status_code == 200
    assert client.put(path, json=payload).status_code == 409
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    graph["result_catalog"]["outputs"][0].pop("measures")
    saved = save_workflow(client, graph)
    assert saved["result_catalog"]["outputs"][0]["measures"] == [definition]
    token = client.get(f"{root}/measures").json()["expected_token"]
    assert client.delete(f"{path}/{definition['id']}?expected_token={token}").status_code == 204
    assert client.get(f"{root}/measures").json()["items"] == []
    result = client.post(f"/api/v1/visualizations/{applied['visualization_id']}/result", json={})
    assert result.status_code == 200, result.text
    assert result.json()["rows"][0]["Ratio of totals"] == "2.5000"


@pytest.mark.parametrize("defect", ["text", "missing_value", "missing_grain", "duplicate_grain"])
def test_invalid_definition_does_not_modify_catalog(db_engine, tmp_path, defect):
    client, root, ids, definition, request = prepared(db_engine, tmp_path)
    definition["id"] = str(uuid.uuid4())
    if defect == "text":
        definition["column_id"] = definition["grain_column_ids"][0]
        definition["grain_column_ids"] = []
    elif defect == "missing_value":
        definition["column_id"] = "deleted"
    elif defect == "missing_grain":
        definition["grain_column_ids"] = ["deleted"]
    else:
        definition["grain_column_ids"] *= 2
    before = client.get(f"{root}/measures").json()
    response = client.put(
        f"{root}/measures/{ids['workflow_id']}/{ids['publication_id']}",
        json={"expected_token": request["expected_token"], "definition": definition},
    )
    assert response.status_code == 422, response.text
    assert client.get(f"{root}/measures").json() == before


@pytest.mark.parametrize("presentation", ["table", "bar_chart", "line_chart", "kpi"])
def test_supported_presentations_and_invalid_kpi_are_atomic(db_engine, tmp_path, presentation):
    client, root, _, _, request = prepared(db_engine, tmp_path)
    request["presentation"] = presentation
    response = client.post(f"{root}/measure-reports/apply", json=request)
    assert response.status_code == (422 if presentation == "kpi" else 200), response.text
    if presentation == "kpi":
        with Session(db_engine) as session:
            assert session.get(ReportDocument, uuid.UUID(request["request_id"])) is None


def test_guard_survives_old_appearance_clients_and_copies(db_engine, tmp_path):
    client, root, ids, definition, request = prepared(db_engine, tmp_path)
    applied = client.post(f"{root}/measure-reports/apply", json=request).json()
    visual_path = f"/api/v1/visualizations/{applied['visualization_id']}"
    visual = client.get(visual_path).json()
    config = copy.deepcopy(visual["config"])
    config.pop("grain_column_ids")
    revision = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()["revision"]
    payload = {
        "workflow_id": ids["workflow_id"],
        "publication_id": ids["publication_id"],
        "expected_revision": visual["revision"],
        "expected_workflow_revision": revision,
        "name": "New appearance",
        "type": "table",
        "config": config,
    }
    changed = client.put(visual_path, json=payload)
    assert changed.status_code == 200, changed.text
    assert changed.json()["config"]["grain_column_ids"] == definition["grain_column_ids"]
    payload["expected_revision"] = changed.json()["revision"]
    copied = client.post(f"{visual_path}/copy", json=payload)
    assert copied.status_code == 201, copied.text
    assert copied.json()["config"]["grain_column_ids"] == definition["grain_column_ids"]
    payload["config"]["value_column_id"] = "something_else"
    assert client.put(visual_path, json=payload).status_code == 422


def test_legacy_metadata_merge_rechecks_measure_identity_uniqueness(db_engine, tmp_path):
    client, _, ids, definition, _ = prepared(db_engine, tmp_path)
    path = f"/api/v1/workflows/{ids['workflow_id']}"
    before = client.get(path).json()
    graph = copy.deepcopy(before)
    output = graph["result_catalog"]["outputs"][0]
    output.pop("measures")
    graph["result_catalog"]["outputs"].append(
        {
            **output,
            "id": str(uuid.uuid4()),
            "name": "Another",
            "measures": [definition],
        }
    )
    payload = {
        key: graph[key]
        for key in (
            "name",
            "nodes",
            "edges",
            "parameters",
            "presentation",
            "result_catalog",
        )
    }
    payload.update(format_version=3, expected_revision=graph["revision"])
    rejected = client.put(path, json=payload)
    assert rejected.status_code == 422, rejected.text
    assert "Measure identities must be unique" in rejected.text
    assert client.get(path).json() == before


def test_release_restores_measure_binding_and_guard(db_engine, tmp_path):
    client, root, _, definition, request = prepared(db_engine, tmp_path, total=True)
    request["presentation"] = "kpi"
    applied = client.post(f"{root}/measure-reports/apply", json=request)
    assert applied.status_code == 200, applied.text
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Measures",
            "period": "October",
            "dashboard_ids": [applied.json()["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release = client.get(f"{root}/releases").json()[0]
    restored = client.post(f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored"})
    assert restored.status_code == 200, restored.text
    restored_root = f"/api/v1/projects/{restored.json()['id']}"
    entry = client.get(f"{restored_root}/measures").json()["items"][0]
    assert entry["definition"]["name"] == definition["name"]
    visual = next(
        v
        for v in client.get(f"{restored_root}/visualizations").json()["items"]
        if v["name"] == request["name"]
    )
    assert visual["config"]["grain_column_ids"] == []
    assert visual["config"]["value_column_id"] == entry["definition"]["column_id"]
    result = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert result.status_code == 200, result.text
    assert result.json()["rows"][0]["Ratio of totals"] == "2.5000"


def test_live_graph_grain_drift_is_not_silently_aggregated(db_engine, tmp_path):
    client, root, ids, definition, request = prepared(db_engine, tmp_path)
    applied = client.post(f"{root}/measure-reports/apply", json=request).json()
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    group = next(n for n in graph["nodes"] if n["type"] == "group_by")
    group["config"]["dimensions"].append(group["config"]["aggregations"][1]["column_id"])
    save_workflow(client, graph)
    result = client.post(f"/api/v1/visualizations/{applied['visualization_id']}/result", json={})
    assert result.status_code == 422, result.text
    assert "not unique at the declared grain" in result.text
    definition["id"] = str(uuid.uuid4())
    token = client.get(f"{root}/measures").json()["expected_token"]
    rejected = client.put(
        f"{root}/measures/{ids['workflow_id']}/{ids['publication_id']}",
        json={"expected_token": token, "definition": definition},
    )
    assert rejected.status_code == 422, rejected.text
    assert len(client.get(f"{root}/measures").json()["items"]) == 1


@pytest.mark.parametrize(
    "keys,grain,valid",
    [
        ([], ["key"], True),
        ([None], ["key"], True),
        ([None, None], ["key"], False),
        ([0], [], True),
        ([0, 1], [], False),
        (list(range(100)) + [0], ["key"], False),
    ],
)
def test_grain_validation_includes_rows_beyond_preview(keys, grain, valid):
    schema = DatasetSchema((ColumnSchema("key", "key", "Key", LogicalType.INTEGER, True),))
    dataset = Dataset(pl.DataFrame({"key": keys}, schema={"key": pl.Int64}), schema)
    if valid:
        validate_measure_grain(dataset, grain)
    else:
        with pytest.raises(ValueError, match="not unique"):
            validate_measure_grain(dataset, grain)
