import copy
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier

import pytest
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.infrastructure.storage import LocalStorageProvider
from app.models import Dashboard, ReportDocument, Visualization, Workflow
from app.schemas.report_builder import ReportBuildRequest
from app.services import report_builder
from tests.test_report_editing import example, save_workflow
from tests.test_sources_api import create_project


def prepared(db_engine: Engine, tmp_path: Path):
    client, project, ids, original = example(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}/report-builder"
    path = f"{root}/inputs/{ids['workflow_id']}/{ids['publication_id']}"
    response = client.get(path)
    assert response.status_code == 200, response.text
    detail = response.json()
    request = {
        "request_id": str(uuid.uuid4()),
        "published_input": {
            k: detail[k] for k in ("workflow_id", "publication_id", "expected_token")
        },
        "name": "Grand total",
        "measures": [
            {
                "output_id": str(uuid.uuid4()),
                "column_id": detail["columns"][-1]["column_id"],
                "operation": "sum",
                "name": "Grand total",
            }
        ],
    }
    return client, project, ids, original, request, path


def test_prepared_report_shares_graph_and_preserves_existing_objects(
    db_engine: Engine, tmp_path: Path
):
    client, project, ids, _, request, _ = prepared(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}/report-builder"
    assert client.get(f"{root}/inputs").json()["items"][0]["name"] == "Revenue"
    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    visual = client.get(f"/api/v1/visualizations/{ids['visualization_id']}").json()
    fields = client.post(f"{root}/fields", json=request)
    assert fields.status_code == 200, fields.text
    assert fields.json()["row_columns"][-1]["display_name"] == "Revenue"
    preview = client.post(f"{root}/preview", json=request)
    assert preview.status_code == 200, preview.text
    assert preview.json()["rows"] == [{"Grand total": "0.80"}]
    assert preview.json()["steps"] == ["dataset_source", "group_by", "group_by"]
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == before
    saved = client.post(f"{root}/apply", json=request)
    assert saved.status_code == 200, saved.text
    result = saved.json()
    assert result["workflow_id"] == ids["workflow_id"]
    assert result["publication_id"] != ids["publication_id"]
    assert client.post(f"{root}/apply", json=request).json() == result
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    assert graph["name"] == before["name"]
    assert graph["revision"] == before["revision"] + 1
    assert graph["parameters"] == before["parameters"]
    assert graph["presentation"] == before["presentation"]
    for node in before["nodes"]:
        assert next(n for n in graph["nodes"] if n["id"] == node["id"]) == node
    assert all(edge in graph["edges"] for edge in before["edges"])
    assert graph["result_catalog"]["outputs"][0] == before["result_catalog"]["outputs"][0]
    assert client.get(f"/api/v1/visualizations/{ids['visualization_id']}").json() == visual
    assert client.get(f"{root}/{result['visualization_id']}").json()["editable"]
    assert not client.get(f"{root}/{ids['visualization_id']}").json()["editable"]
    # Changing the shared calculation changes both consumers without copying preparation.
    group = next(
        n for n in graph["nodes"] if n["id"] == before["result_catalog"]["outputs"][0]["node_id"]
    )
    group["config"]["aggregations"][0]["operation"] = "max"
    save_workflow(client, graph)
    rendered = client.post(f"/api/v1/visualizations/{result['visualization_id']}/result", json={})
    assert rendered.status_code == 200, rendered.text
    assert rendered.json()["rows"] == [{"Grand total": "0.70"}]
    with Session(db_engine) as session:
        assert len(list(session.scalars(select(Workflow)))) == 1
        assert len(list(session.scalars(select(Visualization)))) == 2
        assert len(list(session.scalars(select(Dashboard)))) == 2


@pytest.mark.parametrize("endpoint", ["fields", "preview", "apply"])
def test_stale_prepared_input_is_rejected_without_writes(
    db_engine: Engine, tmp_path: Path, endpoint: str
):
    client, project, ids, _, request, _ = prepared(db_engine, tmp_path)
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    graph["name"] = "Changed elsewhere"
    before = save_workflow(client, graph)
    response = client.post(f"/api/v1/projects/{project}/report-builder/{endpoint}", json=request)
    assert response.status_code == 409, response.text
    assert response.json()["detail"]["code"] == "REPORT_INPUT_CONFLICT"
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == before
    with Session(db_engine) as session:
        assert session.get(ReportDocument, uuid.UUID(request["request_id"])) is None


def test_context_and_cross_project_inputs_cannot_bypass_semantics(
    db_engine: Engine, tmp_path: Path
):
    client, project, ids, _, request, path = prepared(db_engine, tmp_path)
    other = str(create_project(db_engine))
    assert client.get(path.replace(project, other)).status_code == 404
    assert (
        client.post(f"/api/v1/projects/{other}/report-builder/apply", json=request).status_code
        == 404
    )
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    context_id = str(uuid.uuid4())
    graph["result_catalog"]["contexts"] = [
        {"id": context_id, "name": "Restricted data", "roles": [], "points": []}
    ]
    graph["result_catalog"]["outputs"][0]["context_ids"] = [context_id]
    save_workflow(client, graph)
    entry = client.get(f"/api/v1/projects/{project}/report-builder/inputs").json()["items"][0]
    assert not entry["available"] and "view-context" in entry["reason"]
    assert client.get(path).status_code == 422
    # A fresh token does not authorize dropping context restrictions.
    with Session(db_engine) as session:
        from app.services.source_updates import state_token

        request["published_input"]["expected_token"] = state_token(session, uuid.UUID(project))
    response = client.post(f"/api/v1/projects/{project}/report-builder/apply", json=request)
    assert response.status_code == 422, response.text
    assert response.json()["detail"]["code"] == "REPORT_INPUT_UNSUPPORTED"


def test_prepared_apply_failure_rolls_back_shared_graph_and_all_new_objects(
    db_engine: Engine, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    client, project, ids, _, request, _ = prepared(db_engine, tmp_path)
    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    original_save = report_builder.save_graph

    def fail_after_graph(*args, **kwargs):
        original_save(*args, **kwargs)
        raise ApplicationError("TEST_FAILURE", "Simulated failure before visualization creation.")

    monkeypatch.setattr(report_builder, "save_graph", fail_after_graph)
    response = client.post(f"/api/v1/projects/{project}/report-builder/apply", json=request)
    assert response.status_code == 422
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == before
    with Session(db_engine) as session:
        assert len(list(session.scalars(select(Visualization)))) == 1
        assert len(list(session.scalars(select(Dashboard)))) == 1
        assert session.get(ReportDocument, uuid.UUID(request["request_id"])) is None


def test_input_selection_is_exclusive_and_legacy_receipts_remain_valid(
    db_engine: Engine, tmp_path: Path
):
    client, project, _, original, request, _ = prepared(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}/report-builder"
    mixed = {
        **request,
        **{k: original[k] for k in ("source_id", "resource_id", "expected_snapshot_id")},
    }
    assert client.post(f"{root}/preview", json=mixed).status_code == 422
    missing = copy.deepcopy(request)
    missing.pop("published_input")
    assert client.post(f"{root}/preview", json=missing).status_code == 422
    assert client.post(f"{root}/apply", json=original).status_code == 200


def test_block_output_must_be_explicit_and_is_preserved(db_engine: Engine, tmp_path: Path):
    client, project, ids, _, request, path = prepared(db_engine, tmp_path)
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    endpoint = graph["result_catalog"]["outputs"][0]["node_id"]
    graph["presentation"]["blocks"] = [
        {
            "id": str(uuid.uuid4()),
            "label": "Preparation",
            "node_ids": [endpoint],
            "position": {"x": 500, "y": 400},
            "collapsed": True,
            "inputs": [
                {"id": str(uuid.uuid4()), "label": "Input", "node_id": endpoint, "port": "input"}
            ],
            "outputs": [],
        }
    ]
    saved = save_workflow(client, graph)
    response = client.get(path)
    assert response.status_code == 422 and "block output" in response.text
    saved["presentation"]["blocks"][0]["outputs"] = [
        {"id": str(uuid.uuid4()), "label": "Table", "node_id": endpoint, "port": "dataset"}
    ]
    saved = save_workflow(client, saved)
    detail = client.get(path)
    assert detail.status_code == 200, detail.text
    request["published_input"]["expected_token"] = detail.json()["expected_token"]
    applied = client.post(f"/api/v1/projects/{project}/report-builder/apply", json=request)
    assert applied.status_code == 200, applied.text
    assert (
        client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()["presentation"]
        == saved["presentation"]
    )


def test_prepared_branch_uses_live_parameter_defaults_and_release_restore(
    db_engine: Engine, tmp_path: Path
):
    client, project, ids, original, request, path = prepared(db_engine, tmp_path)
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    old_edge = graph["edges"][0]
    filter_id = str(uuid.uuid4())
    graph["nodes"].append(
        {
            "id": filter_id,
            "type": "filter",
            "version": 1,
            "position": {"x": 200, "y": 300},
            "config": {
                "conditions": [
                    {
                        "column_id": original["dimensions"][0],
                        "operator": "equals",
                        "parameter": "category",
                    }
                ]
            },
        }
    )
    graph["edges"].append(
        {
            "id": str(uuid.uuid4()),
            "source_node_id": old_edge["source_node_id"],
            "source_port": "dataset",
            "target_node_id": filter_id,
            "target_port": "input",
        }
    )
    old_edge["source_node_id"] = filter_id
    graph["parameters"] = [{"name": "category", "logical_type": "string", "default": "A"}]
    save_workflow(client, graph)
    detail = client.get(path).json()
    assert detail["uses_parameters"]
    request["published_input"]["expected_token"] = detail["expected_token"]
    applied = client.post(f"/api/v1/projects/{project}/report-builder/apply", json=request)
    assert applied.status_code == 200, applied.text
    result = applied.json()
    rendered = client.post(f"/api/v1/visualizations/{result['visualization_id']}/result", json={})
    assert rendered.json()["rows"] == [{"Grand total": "0.30"}]
    client.post(f"/api/v1/projects/{project}/checks")
    check = client.get(f"/api/v1/projects/{project}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    frozen = client.post(
        f"/api/v1/projects/{project}/releases",
        json={
            "name": "Shared graph",
            "period": "October",
            "dashboard_ids": [ids["dashboard_id"], result["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert frozen.status_code == 200, frozen.text
    release = client.get(f"/api/v1/projects/{project}/releases").json()[0]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored shared graph"}
    )
    assert restored.status_code == 200, restored.text
    restored_id = restored.json()["id"]
    visuals = client.get(f"/api/v1/projects/{restored_id}/visualizations").json()["items"]
    assert len({v["workflow_id"] for v in visuals}) == 1
    new_visual = next(v for v in visuals if v["name"] == "Grand total")
    response = client.post(f"/api/v1/visualizations/{new_visual['id']}/result", json={})
    assert response.json()["rows"] == rendered.json()["rows"]
    assert client.get(f"/api/v1/projects/{restored_id}/report-builder/{new_visual['id']}").json()[
        "editable"
    ]


@pytest.mark.parametrize("same_request", [True, False])
def test_concurrent_prepared_report_creation_preserves_shared_graph(
    db_engine: Engine, tmp_path: Path, same_request: bool
):
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Concurrent report input writes require PostgreSQL")
    client, project, ids, _, request, _ = prepared(db_engine, tmp_path)
    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    barrier = Barrier(2)

    def write(index: int):
        with Session(db_engine) as session:
            service = report_builder.ReportBuilderService(
                session,
                LocalStorageProvider(tmp_path),
                Settings(database_url="sqlite://", storage_root=tmp_path),
            )
            body = {
                **request,
                "request_id": request["request_id"] if same_request else str(uuid.uuid4()),
            }
            barrier.wait(timeout=10)
            try:
                return str(
                    service.apply(
                        uuid.UUID(project), ReportBuildRequest.model_validate(body)
                    ).visualization_id
                )
            except ApplicationError as exc:
                return exc.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(write, [1, 2]))
    if same_request:
        assert outcomes[0] == outcomes[1] and outcomes[0] != "REPORT_INPUT_CONFLICT"
    else:
        assert outcomes.count("REPORT_INPUT_CONFLICT") == 1
    after = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    assert after["revision"] == before["revision"] + 1
    assert len(after["result_catalog"]["outputs"]) == 2
    assert len(after["nodes"]) == len(before["nodes"]) + 1
