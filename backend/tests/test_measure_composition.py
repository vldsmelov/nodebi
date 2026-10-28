import copy
import hashlib
import json
import uuid

import polars as pl
import pytest
from sqlalchemy.orm import Session

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.nodes import ExecutionContext
from app.domain.workflows import NodeInstance, Position
from app.models import ReportDocument
from app.nodes.visualization import VisualizationExecutor
from tests.test_measures import prepared
from tests.test_report_editing import save_workflow


def compound(db_engine, tmp_path, defect=None):
    client, root, ids, first, request = prepared(db_engine, tmp_path)
    result = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={}).json()
    second = {
        **first,
        "id": str(uuid.uuid4()),
        "name": "Mean of row ratios",
        "column_id": next(
            c["column_id"] for c in result["columns"] if c["display_name"] == "Mean of ratios"
        ),
    }
    if defect == "grain":
        second["grain_column_ids"] = []  # One prepared row makes either declaration valid alone.
    if defect == "alias":
        second["column_id"] = first["column_id"]
    path = f"{root}/measures/{ids['workflow_id']}/{ids['publication_id']}"
    saved = client.put(
        path, json={"expected_token": request["expected_token"], "definition": second}
    )
    assert saved.status_code == 200, saved.text
    request["expected_token"] = client.get(f"{root}/measures").json()["expected_token"]
    request["additional_measure_ids"] = [second["id"]]
    return client, root, ids, first, second, request


def test_compound_reuse_is_exact_atomic_and_does_not_copy_calculations(db_engine, tmp_path):
    client, root, ids, first, second, request = compound(db_engine, tmp_path)
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    before = client.get(graph_url).json()
    preview = client.post(f"{root}/measure-reports/preview", json=request)
    assert preview.status_code == 200, preview.text
    assert [c["column_id"] for c in preview.json()["columns"]] == [
        *first["grain_column_ids"],
        first["column_id"],
        second["column_id"],
    ]
    assert preview.json()["rows"][0]["Ratio of totals"] == "2.5000"
    assert preview.json()["rows"][0]["Mean of ratios"] == "2.0000"
    with Session(db_engine) as session:
        assert session.get(ReportDocument, uuid.UUID(request["request_id"])) is None
    saved = client.post(f"{root}/measure-reports/apply", json=request)
    assert saved.status_code == 200, saved.text
    assert client.post(f"{root}/measure-reports/apply", json=request).json() == saved.json()
    assert client.get(graph_url).json() == before
    path = f"/api/v1/visualizations/{saved.json()['visualization_id']}"
    assert client.get(path).json()["config"]["measure_column_ids"] == [
        first["column_id"],
        second["column_id"],
    ]
    token = client.get(f"{root}/measures").json()["expected_token"]
    deleted = client.delete(
        f"{root}/measures/{ids['workflow_id']}/{ids['publication_id']}/{second['id']}?expected_token={token}"
    )
    assert deleted.status_code == 204
    assert client.post(f"{path}/result", json={}).json()["rows"] == preview.json()["rows"]
    request["request_id"] = str(uuid.uuid4())
    assert client.post(f"{root}/measure-reports/apply", json=request).status_code == 409


@pytest.mark.parametrize("defect", ["grain", "alias", "missing", "duplicate", "chart"])
def test_incompatible_selection_never_partially_saves(db_engine, tmp_path, defect):
    client, root, ids, _, _, request = compound(db_engine, tmp_path, defect)
    if defect == "missing":
        request["additional_measure_ids"] = [str(uuid.uuid4())]
    elif defect == "duplicate":
        request["additional_measure_ids"] = [request["measure_id"]]
    elif defect == "chart":
        request["presentation"] = "line_chart"
    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    saved = client.post(f"{root}/measure-reports/apply", json=request)
    assert saved.status_code == (404 if defect == "missing" else 422), saved.text
    with Session(db_engine) as session:
        assert session.get(ReportDocument, uuid.UUID(request["request_id"])) is None
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == before


def test_compound_guards_survive_legacy_edits_copies_and_live_schema_drift(db_engine, tmp_path):
    client, root, ids, first, second, request = compound(db_engine, tmp_path)
    saved = client.post(f"{root}/measure-reports/apply", json=request).json()
    path = f"/api/v1/visualizations/{saved['visualization_id']}"
    visual = client.get(path).json()
    config = copy.deepcopy(visual["config"])
    config.pop("measure_column_ids")
    config.pop("grain_column_ids")
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    payload = {
        "workflow_id": ids["workflow_id"],
        "publication_id": ids["publication_id"],
        "expected_revision": visual["revision"],
        "expected_workflow_revision": graph["revision"],
        "type": "table",
        "name": "Appearance",
        "config": config,
    }
    edited = client.put(path, json=payload)
    assert edited.status_code == 200, edited.text
    protected = [first["column_id"], second["column_id"]]
    assert edited.json()["config"]["measure_column_ids"] == protected
    payload["expected_revision"] = edited.json()["revision"]
    copied = client.post(f"{path}/copy", json=payload)
    assert copied.status_code == 201, copied.text
    assert copied.json()["config"]["measure_column_ids"] == protected
    payload["config"]["column_ids"].remove(second["column_id"])
    assert client.put(path, json=payload).status_code == 422
    group = next(n for n in graph["nodes"] if n["type"] == "group_by")
    group["config"]["aggregations"] = group["config"]["aggregations"][:2]
    save_workflow(client, graph)
    for identity in (saved["visualization_id"], copied.json()["id"]):
        assert client.post(f"/api/v1/visualizations/{identity}/result", json={}).status_code == 422


def test_legacy_single_measure_receipt_is_unchanged(db_engine, tmp_path):
    client, root, _, _, request = prepared(db_engine, tmp_path)
    expected = hashlib.sha256(json.dumps(request, sort_keys=True).encode()).hexdigest()
    saved = client.post(f"{root}/measure-reports/apply", json=request)
    assert saved.status_code == 200, saved.text
    with Session(db_engine) as session:
        assert (
            session.get(ReportDocument, uuid.UUID(request["request_id"])).payload["fingerprint"]
            == expected
        )
    request["additional_measure_ids"] = []
    assert client.post(f"{root}/measure-reports/apply", json=request).json() == saved.json()


def test_release_restores_all_selected_measure_guards(db_engine, tmp_path):
    client, root, _, _, _, request = compound(db_engine, tmp_path)
    saved = client.post(f"{root}/measure-reports/apply", json=request).json()
    before = client.post(
        f"/api/v1/visualizations/{saved['visualization_id']}/result", json={}
    ).json()
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Combined",
            "period": "2026",
            "dashboard_ids": [saved["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release = client.get(f"{root}/releases").json()[0]
    restored = client.post(f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored"})
    assert restored.status_code == 200, restored.text
    visuals = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"]
    visual = next(v for v in visuals if v["name"] == request["name"])
    assert len(visual["config"]["measure_column_ids"]) == 2
    assert visual["config"]["measure_column_ids"][0] == visual["config"]["value_column_id"]
    result = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert result.status_code == 200, result.text
    assert result.json()["rows"] == before["rows"]


@pytest.mark.parametrize("defect", ["none", "infinity", "nan", "text", "duplicate"])
def test_full_data_validation_covers_every_selected_measure(defect):
    text = defect == "text"
    value = {"infinity": float("inf"), "nan": float("nan"), "text": "invalid"}.get(defect)
    keys = list(range(101))
    if defect == "duplicate":
        keys[-1] = 0
    frame = pl.DataFrame({"key": keys, "primary": [1.0] * 101}).with_columns(
        pl.Series("other", [None] * 100 + [value], dtype=pl.String if text else pl.Float64)
    )
    schema = DatasetSchema(
        (
            ColumnSchema("key", "key", "Key", LogicalType.INTEGER, False),
            ColumnSchema("primary", "primary", "Primary", LogicalType.FLOAT, False),
            ColumnSchema(
                "other", "other", "Other", LogicalType.STRING if text else LogicalType.FLOAT, True
            ),
        )
    )
    node = NodeInstance(
        uuid.uuid4(),
        "table",
        1,
        Position(0, 0),
        {
            "value_column_id": "primary",
            "grain_column_ids": ["key"],
            "measure_column_ids": ["primary", "other"],
            "column_ids": ["key", "primary", "other"],
        },
    )
    context = ExecutionContext(uuid.uuid4(), uuid.uuid4(), uuid.uuid4())
    executor = VisualizationExecutor()
    if defect == "none":
        result = executor.execute(node, {"input": Dataset(frame, schema)}, context)
        assert result.frame["other"].null_count() == 101
    else:
        with pytest.raises((ValueError, NodeExecutionError)):
            executor.execute(node, {"input": Dataset(frame, schema)}, context)
