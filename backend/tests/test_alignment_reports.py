from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from threading import Barrier
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.infrastructure.storage import LocalStorageProvider
from app.models import Dashboard, ReportDocument, Visualization
from app.schemas.alignment_reports import AlignmentReportRequest
from app.services.alignment_reports import AlignmentReportService
from tests.test_align_measures_api import aligned_example
from tests.test_report_editing import save_workflow


def example(db_engine, tmp_path):
    client, project, _, graph, _ = aligned_example(db_engine, tmp_path)
    group = next(n for n in graph["nodes"] if n["type"] == "group_by")
    filtered = next(n for n in graph["nodes"] if n["type"] == "filter")
    alignment = next(n for n in graph["nodes"] if n["type"] == "align_measures")
    graph["result_catalog"]["outputs"][0]["node_id"] = group["id"]
    right = str(uuid4())
    graph["result_catalog"]["outputs"].append(
        {
            "id": right,
            "name": "Plan",
            "kind": "dataset",
            "node_id": filtered["id"],
            "port": "dataset",
        }
    )
    graph = save_workflow(client, graph)
    root = f"/api/v1/projects/{project}"
    left = graph["result_catalog"]["outputs"][0]["id"]
    token = client.get(f"{root}/report-builder/inputs/{graph['id']}/{left}").json()[
        "expected_token"
    ]
    body = {
        "request_id": str(uuid4()),
        "workflow_id": graph["id"],
        "left_publication_id": left,
        "right_publication_id": right,
        "expected_token": token,
        "name": "Actual and plan",
        "alignment": deepcopy(alignment["config"]),
    }
    return client, root, graph, body


def counts(engine):
    with Session(engine) as session:
        return [
            session.scalar(select(func.count()).select_from(model))
            for model in (Dashboard, Visualization, ReportDocument)
        ]


def test_preview_apply_and_retry_share_graph_without_reaggregation(db_engine, tmp_path):
    client, root, graph, body = example(db_engine, tmp_path)
    before = counts(db_engine)
    preview = client.post(f"{root}/alignment-reports/preview", json=body)
    assert preview.status_code == 200, preview.text
    result = preview.json()
    assert [list(r.values()) for r in result["rows"]] == [
        ["A", "0.30", "0.60", True, True],
        ["B", "0.50", None, True, False],
    ]
    assert result["alignment_diagnostics"]["left_only_rows"] == 1
    assert counts(db_engine) == before
    graph_url = f"/api/v1/workflows/{graph['id']}"
    assert client.get(graph_url).json() == graph
    applied = client.post(f"{root}/alignment-reports/apply", json=body)
    assert applied.status_code == 200, applied.text
    ids = applied.json()
    after = client.get(graph_url).json()
    assert after["nodes"][:-1] == graph["nodes"]
    assert after["edges"][:-2] == graph["edges"]
    assert after["result_catalog"]["outputs"][:-1] == graph["result_catalog"]["outputs"]
    assert after["parameters"] == graph["parameters"]
    assert after["presentation"] == graph["presentation"]
    assert after["revision"] == graph["revision"] + 1
    assert after["nodes"][-1]["type"] == "align_measures"
    assert counts(db_engine) == [n + 1 for n in before]
    retry = client.post(f"{root}/alignment-reports/apply", json=body)
    assert retry.status_code == 200 and retry.json() == ids
    assert client.get(graph_url).json() == after
    changed = client.post(f"{root}/alignment-reports/apply", json={**body, "name": "Changed"})
    assert changed.status_code == 409
    visual = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert visual.status_code == 200, visual.text
    assert [list(r.values()) for r in visual.json()["rows"]] == [
        list(r.values()) for r in result["rows"]
    ]
    # A later manual edit must remain protected from the ordinary single-input wizard.
    editing = client.get(f"{root}/report-builder/{ids['visualization_id']}").json()
    assert editing["editable"] is False
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    released = client.post(
        f"{root}/releases",
        json={
            "name": "Alignment",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert released.status_code == 200, released.text
    release = client.get(f"{root}/releases").json()[0]
    restored = client.post(
        f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored alignment report"}
    )
    assert restored.status_code == 200, restored.text
    visuals = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()["items"]
    restored_visual = next(v for v in visuals if v["name"] == body["name"])
    rendered = client.post(f"/api/v1/visualizations/{restored_visual['id']}/result", json={})
    assert rendered.status_code == 200, rendered.text
    assert [list(r.values()) for r in rendered.json()["rows"]] == [
        list(r.values()) for r in result["rows"]
    ]


@pytest.mark.parametrize("kind", ["stale", "other_workflow", "duplicate", "missing_field"])
def test_invalid_alignment_writes_nothing(db_engine, tmp_path, kind):
    client, root, graph, body = example(db_engine, tmp_path)
    if kind == "stale":
        body["expected_token"] = "0" * 64
    elif kind == "other_workflow":
        body["right_publication_id"] = str(uuid4())
    elif kind == "missing_field":
        body["alignment"]["right_value"] = "removed"
    else:
        source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
        group = next(n for n in graph["nodes"] if n["type"] == "group_by")
        graph["result_catalog"]["outputs"][0]["node_id"] = source["id"]
        graph = save_workflow(client, graph)
        body["expected_token"] = client.get(
            f"{root}/report-builder/inputs/{graph['id']}/{body['left_publication_id']}"
        ).json()["expected_token"]
        body["alignment"]["left_value"] = group["config"]["aggregations"][0]["column_id"]
    before = counts(db_engine)
    for action in ("preview", "apply"):
        response = client.post(f"{root}/alignment-reports/{action}", json=body)
        assert response.status_code in {400, 404, 409, 422}, response.text
        if kind == "duplicate":
            assert response.json()["detail"]["node_id"]
            assert "not unique" in response.json()["detail"]["message"]
    assert counts(db_engine) == before
    assert client.get(f"/api/v1/workflows/{graph['id']}").json() == graph


@pytest.mark.parametrize("with_formula", [False, True])
def test_failed_commit_rolls_back_alignment_graph_and_objects(
    db_engine, tmp_path, monkeypatch, with_formula
):
    client, root, graph, body = example(db_engine, tmp_path)
    if with_formula:
        body["formulas"] = [
            {"node_id": str(uuid4()), "name": "Exact constant", "expression": "0.1+0.2"}
        ]
    before = counts(db_engine)

    def fail_commit(self):
        raise RuntimeError("injected commit failure")

    monkeypatch.setattr(Session, "commit", fail_commit)
    with pytest.raises(RuntimeError, match="injected"):
        client.post(f"{root}/alignment-reports/apply", json=body)
    assert counts(db_engine) == before
    assert client.get(f"/api/v1/workflows/{graph['id']}").json() == graph


@pytest.mark.parametrize("same_request", [True, False])
@pytest.mark.parametrize("with_formula", [False, True])
def test_concurrent_alignment_applies_are_serialized(
    db_engine, tmp_path, same_request, with_formula
):
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Concurrent alignment writes require PostgreSQL")
    client, root, graph, body = example(db_engine, tmp_path)
    if with_formula:
        body["formulas"] = [
            {"node_id": str(uuid4()), "name": "Exact constant", "expression": "0.1+0.2"}
        ]
    barrier = Barrier(2)
    project = UUID(root.rsplit("/", 1)[-1])

    def write(index):
        with Session(db_engine) as session:
            service = AlignmentReportService(
                session,
                LocalStorageProvider(tmp_path),
                Settings(database_url="sqlite://", storage_root=tmp_path),
            )
            request = AlignmentReportRequest.model_validate(
                {**body, "request_id": body["request_id"] if same_request else str(uuid4())}
            )
            barrier.wait(timeout=10)
            try:
                return str(service.apply(project, request).visualization_id)
            except ApplicationError as exc:
                return exc.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(write, [0, 1]))
    if same_request:
        assert outcomes[0] == outcomes[1] and outcomes[0] != "REPORT_INPUT_CONFLICT"
    else:
        assert outcomes.count("REPORT_INPUT_CONFLICT") == 1
    saved = client.get(f"/api/v1/workflows/{graph['id']}").json()
    assert len(saved["nodes"]) == len(graph["nodes"]) + 1 + int(with_formula)
    assert saved["revision"] == graph["revision"] + 1
