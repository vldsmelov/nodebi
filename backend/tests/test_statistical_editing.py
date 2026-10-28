import copy
import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Dashboard, DashboardWidget, ReportDocument, Visualization, Workflow
from tests.test_analytical_reports import business_rows
from tests.test_analytical_reports import example as analytical_example
from tests.test_guided_profiles import example as profile_example
from tests.test_report_editing import save_workflow
from tests.test_statistical_reports import imported


def example(db_engine, tmp_path, kind="histogram"):
    if kind in {"pareto", "funnel_steps"}:
        client, root, body, _ = profile_example(db_engine, tmp_path, kind)
    elif kind in {"heatmap_stats", "table_rollup"}:
        client, root, body, _ = analytical_example(db_engine, tmp_path, kind)
    else:
        client, root, body, profile = imported(db_engine, tmp_path)
        if kind == "boxplot_stats":
            body["analysis"] = {"type": kind, "value_column_id": profile["fields"][1]["field_id"]}
    applied = client.post(f"{root}/statistical-reports/apply", json=body)
    assert applied.status_code == 200, applied.text
    ids = applied.json()
    path = f"{root}/statistical-reports/{ids['visualization_id']}"
    read = client.get(path)
    assert read.status_code == 200, read.text
    assert read.json()["editable"], read.text
    request = {
        "request_id": str(uuid.uuid4()),
        "expected_token": read.json()["expected_token"],
        "settings": read.json()["settings"],
    }
    return client, root, path, ids, request


@pytest.mark.parametrize(
    "kind",
    ["histogram", "boxplot_stats", "heatmap_stats", "table_rollup", "pareto", "funnel_steps"],
)
def test_edit_analysis_preserves_ids_appearance_layout_and_exact_retry(db_engine, tmp_path, kind):
    client, root, path, ids, request = example(db_engine, tmp_path, kind)
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    visual_url = f"/api/v1/visualizations/{ids['visualization_id']}"
    before = client.get(graph_url).json()
    with Session(db_engine) as session:
        visual = session.get(Visualization, uuid.UUID(ids["visualization_id"]))
        visual.config = {**visual.config, "title": "Custom title", "show_legend": False}
        session.commit()
    old_visual = client.get(visual_url).json()
    dashboard = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    read = client.get(path).json()
    request["expected_token"] = read["expected_token"]
    settings = request["settings"]
    settings["name"] = "Edited analysis"
    if kind == "histogram":
        settings["analysis"]["bin_count"] = 4
    elif kind == "boxplot_stats":
        settings["analysis"]["group_column_id"] = read["columns"][0]["column_id"]
    elif kind == "heatmap_stats":
        settings["analysis"]["aggregation"] = "average"
    elif kind == "table_rollup":
        settings["analysis"]["measures"][0]["operation"] = "max"
    settings["filters"] = [
        {"column_id": read["columns"][0]["column_id"], "operator": "equals", "value": "A"}
    ]
    preview = client.post(f"{path}/preview", json=request)
    assert preview.status_code == 200, preview.text
    assert preview.json()["steps"] == ["dataset_source", "filter", kind]
    assert client.get(graph_url).json() == before
    assert client.get(visual_url).json() == old_visual
    saved = client.post(f"{path}/apply", json=request)
    assert saved.status_code == 200, saved.text
    after = client.get(graph_url).json()
    assert (
        next(n for n in after["nodes"] if n["type"] == kind)["id"]
        == next(n for n in before["nodes"] if n["type"] == kind)["id"]
    )
    assert after["nodes"][0] == before["nodes"][0]
    assert after["result_catalog"] == before["result_catalog"]
    assert client.get(visual_url).json()["config"] == old_visual["config"]
    assert client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json() == dashboard
    result = client.post(f"{visual_url}/result", json={})
    assert result.status_code == 200, result.text
    assert result.json()["rows"] == preview.json()["result"]["rows"]
    assert client.post(f"{path}/apply", json=request).json() == saved.json()
    assert client.get(graph_url).json() == after
    request["settings"]["name"] = "Different payload"
    assert client.post(f"{path}/apply", json=request).status_code == 409
    read = client.get(path).json()
    remove = {
        "request_id": str(uuid.uuid4()),
        "expected_token": read["expected_token"],
        "settings": {**read["settings"], "filters": []},
    }
    assert client.post(f"{path}/apply", json=remove).status_code == 200
    graph = client.get(graph_url).json()
    assert [n["id"] for n in graph["nodes"]] == [n["id"] for n in before["nodes"]]
    assert graph["edges"] == before["edges"]
    with Session(db_engine) as session:
        for model in [Workflow, Visualization, Dashboard]:
            assert len(list(session.scalars(select(model)))) == 1


@pytest.mark.parametrize(
    "case",
    [
        "shared_node",
        "shared_visual",
        "outliers",
        "future_config",
        "type",
        "stale",
        "widget",
        "parameter_filter",
    ],
)
def test_unsafe_analysis_edit_is_non_mutating(db_engine, tmp_path, case):
    client, root, path, ids, request = example(db_engine, tmp_path, "boxplot_stats")
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    graph = client.get(graph_url).json()
    if case in {"shared_node", "outliers"}:
        graph["result_catalog"]["outputs"].append(
            {
                **graph["result_catalog"]["outputs"][0],
                "id": str(uuid.uuid4()),
                "name": "Other",
                "port": "outliers" if case == "outliers" else "dataset",
            }
        )
        save_workflow(client, graph)
    elif case == "future_config":
        graph["nodes"][-1]["config"]["future"] = True
        save_workflow(client, graph)
    elif case == "shared_visual":
        with Session(db_engine) as session:
            old = session.get(Visualization, uuid.UUID(ids["visualization_id"]))
            session.add(
                Visualization(
                    project_id=old.project_id,
                    workflow_id=old.workflow_id,
                    source_node_id=old.source_node_id,
                    publication_id=old.publication_id,
                    name="Other",
                    type=old.type,
                    config=old.config,
                )
            )
            session.commit()
    elif case == "widget":
        with Session(db_engine) as session:
            old = session.scalar(select(DashboardWidget))
            old.config = {"highlight_only": ["region"]}
            session.commit()
    elif case == "type":
        request["settings"]["analysis"] = {
            "type": "histogram",
            "value_column_id": request["settings"]["analysis"]["value_column_id"],
        }
    elif case == "parameter_filter":
        request["settings"]["filters"] = [
            {"column_id": "x", "operator": "equals", "parameter": "p"}
        ]
    else:
        graph["name"] = "Changed elsewhere"
        save_workflow(client, graph)
    read = client.get(path).json()
    if case in {"shared_node", "shared_visual", "outliers", "future_config", "widget"}:
        assert not read["editable"]
    if case != "stale":
        request["expected_token"] = read["expected_token"]
    before = client.get(graph_url).json()
    for endpoint in ["preview", "apply"]:
        response = client.post(f"{path}/{endpoint}", json=request)
        assert response.status_code in {409, 422}, response.text
    assert client.get(graph_url).json() == before
    with Session(db_engine) as session:
        assert session.get(ReportDocument, uuid.UUID(request["request_id"])) is None


def test_table_rebinding_is_explicit_and_does_not_drop_conditional_rules(db_engine, tmp_path):
    client, _, path, ids, request = example(db_engine, tmp_path, "table_rollup")
    visual_url = f"/api/v1/visualizations/{ids['visualization_id']}"
    with Session(db_engine) as session:
        visual = session.get(Visualization, uuid.UUID(ids["visualization_id"]))
        spec = copy.deepcopy(visual.config["spec"])
        spec["density"] = "compact"
        spec["rules"] = [
            {
                "id": str(uuid.uuid4()),
                "column_id": spec["measures"][0],
                "operator": "gt",
                "threshold": "0",
                "label": "Positive",
                "tone": "positive",
                "scope": "all",
            }
        ]
        visual.config = {**visual.config, "spec": spec}
        session.commit()
    original_view = client.get(visual_url).json()["config"]["spec"]
    request["expected_token"] = client.get(path).json()["expected_token"]
    request["settings"]["analysis"]["dimensions"].reverse()
    response = client.post(f"{path}/preview", json=request)
    assert response.status_code == 422, response.text
    request["rebind_fields"] = True
    assert client.post(f"{path}/apply", json=request).status_code == 200
    saved_spec = client.get(visual_url).json()["config"]["spec"]
    assert saved_spec["rules"] == original_view["rules"] and saved_spec["density"] == "compact"
    with Session(db_engine) as session:
        assert (
            session.get(Visualization, uuid.UUID(ids["visualization_id"])).config["spec"]["rules"]
            == spec["rules"]
        )
    assert saved_spec["dimensions"] == spec["dimensions"][::-1]
    request["request_id"] = str(uuid.uuid4())
    request["expected_token"] = client.get(path).json()["expected_token"]
    request["settings"]["analysis"]["measures"].pop(0)
    response = client.post(f"{path}/apply", json=request)
    assert response.status_code == 422, response.text
    assert client.get(visual_url).json()["config"]["spec"] == saved_spec


def test_manual_preparation_shared_filter_and_multiple_widgets_remain_explicit(db_engine, tmp_path):
    client, _, path, ids, request = example(db_engine, tmp_path)
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    graph = client.get(graph_url).json()
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    column = client.get(path).json()["columns"][0]["column_id"]
    manual = {
        "id": str(uuid.uuid4()),
        "type": "filter",
        "version": 1,
        "position": {"x": 200, "y": 250},
        "ui": {"label": "Shared manual filter"},
        "config": {"conditions": [{"column_id": column, "operator": "equals", "value": "A"}]},
    }
    graph["nodes"].append(manual)
    graph["edges"][0]["source_node_id"] = manual["id"]
    graph["edges"].append(
        {
            "id": str(uuid.uuid4()),
            "source_node_id": source["id"],
            "source_port": "dataset",
            "target_node_id": manual["id"],
            "target_port": "input",
        }
    )
    graph["result_catalog"]["outputs"].append(
        {
            "id": str(uuid.uuid4()),
            "node_id": manual["id"],
            "port": "dataset",
            "kind": "dataset",
            "name": "Reusable rows",
        }
    )
    before = save_workflow(client, graph)
    with Session(db_engine) as session:
        old = session.scalar(select(DashboardWidget))
        session.add(
            DashboardWidget(
                dashboard_id=old.dashboard_id,
                visualization_id=old.visualization_id,
                config={},
                position_x=0,
                position_y=12,
                width=12,
                height=10,
            )
        )
        session.commit()
    read = client.get(path).json()
    assert read["editable"] and read["widget_count"] == 2
    assert read["settings"]["filters"] == []
    assert next(s for s in read["steps"] if s["node_id"] == manual["id"])["editable"] is False
    request["expected_token"] = read["expected_token"]
    request["settings"]["analysis"]["bin_count"] = 5
    assert client.post(f"{path}/apply", json=request).status_code == 409
    request["acknowledge_shared"] = True
    assert client.post(f"{path}/apply", json=request).status_code == 200
    after = client.get(graph_url).json()
    assert next(n for n in after["nodes"] if n["id"] == manual["id"]) == next(
        n for n in before["nodes"] if n["id"] == manual["id"]
    )
    assert after["edges"] == before["edges"] and after["result_catalog"] == before["result_catalog"]


def test_edit_failure_rolls_back_and_deleted_receipt_never_recreates(
    db_engine, tmp_path, monkeypatch
):
    from app.services import statistical_editing

    client, _, path, ids, request = example(db_engine, tmp_path)
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    before = client.get(graph_url).json()
    original = statistical_editing.save_graph

    def fail(*args, **kwargs):
        original(*args, **kwargs)
        raise RuntimeError("after graph write")

    monkeypatch.setattr(statistical_editing, "save_graph", fail)
    with pytest.raises(RuntimeError, match="after graph write"):
        client.post(f"{path}/apply", json=request)
    assert client.get(graph_url).json() == before
    with Session(db_engine) as session:
        assert session.get(ReportDocument, uuid.UUID(request["request_id"])) is None
    monkeypatch.setattr(statistical_editing, "save_graph", original)
    assert client.post(f"{path}/apply", json=request).status_code == 200
    with Session(db_engine) as session:
        session.delete(session.scalar(select(DashboardWidget)))
        session.delete(session.get(Visualization, uuid.UUID(ids["visualization_id"])))
        session.commit()
    assert client.post(f"{path}/apply", json=request).status_code == 410


@pytest.mark.parametrize("same_request", [True, False])
def test_concurrent_analytical_edits_serialize_and_replay(db_engine, tmp_path, same_request):
    from app.config import Settings
    from app.domain.errors import ApplicationError
    from app.infrastructure.storage import LocalStorageProvider
    from app.schemas.statistical_reports import StatisticalEditRequest
    from app.services.statistical_editing import StatisticalEditingService

    if db_engine.dialect.name != "postgresql":
        pytest.skip("Concurrent analytical edits require PostgreSQL")
    client, _, _, ids, request = example(db_engine, tmp_path)
    project = uuid.UUID(client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()["project_id"])
    barrier = Barrier(2)

    def write(index):
        with Session(db_engine) as session:
            service = StatisticalEditingService(
                session,
                LocalStorageProvider(tmp_path),
                Settings(database_url="sqlite://", storage_root=tmp_path),
            )
            body = StatisticalEditRequest.model_validate(
                {
                    **request,
                    "request_id": request["request_id"] if same_request else str(uuid.uuid4()),
                }
            )
            barrier.wait(timeout=10)
            try:
                return service.apply(
                    project, uuid.UUID(ids["visualization_id"]), body
                ).workflow_revision
            except ApplicationError as exc:
                return exc.code

    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(write, [1, 2]))
    if same_request:
        assert outcomes == [before["revision"] + 1] * 2
    else:
        assert outcomes.count("REPORT_EDIT_CONFLICT") == 1
    after = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    assert after["revision"] == before["revision"] + 1


@pytest.mark.parametrize("kind", ["histogram", "boxplot_stats", "heatmap_stats", "table_rollup"])
def test_edited_analysis_freezes_restores_and_is_still_structurally_editable(
    db_engine, tmp_path, kind
):
    client, root, path, ids, request = example(db_engine, tmp_path, kind)
    request["settings"]["name"] = "Edited before release"
    assert client.post(f"{path}/apply", json=request).status_code == 200
    result = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={}).json()
    assert client.post(f"{root}/checks").status_code == 200
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    release = client.post(
        f"{root}/releases",
        json={
            "name": "Edited analytics",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert release.status_code == 200, release.text
    release_id = client.get(f"{root}/releases").json()[0]["id"]
    restored = client.post(
        f"/api/v1/releases/{release_id}/restore", json={"name": "Restored edited analytics"}
    )
    assert restored.status_code == 200, restored.text
    project = restored.json()["id"]
    visual = client.get(f"/api/v1/projects/{project}/visualizations").json()["items"][0]
    restored_result = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert restored_result.status_code == 200, restored_result.text
    assert business_rows(restored_result.json()) == business_rows(result)
    read = client.get(f"/api/v1/projects/{project}/statistical-reports/{visual['id']}").json()
    assert read["editable"] and read["settings"]["name"] == "Edited before release"
