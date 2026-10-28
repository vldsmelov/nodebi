from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from threading import Barrier
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.infrastructure.storage import LocalStorageProvider
from app.models import DashboardWidget, Visualization
from app.schemas.alignment_reports import AlignmentEditRequest
from app.services.alignment_editing import AlignmentEditingService
from tests.test_alignment_formulas import formula, refs
from tests.test_alignment_reports import counts, example
from tests.test_report_editing import save_workflow


def editable(db_engine, tmp_path, with_formula=True):
    client, root, _, body = example(db_engine, tmp_path)
    if with_formula:
        left, right = refs(body)
        body["formulas"] = [formula(f"{left}-{right}")]
    applied = client.post(f"{root}/alignment-reports/apply", json=body)
    assert applied.status_code == 200, applied.text
    ids = applied.json()
    path = f"{root}/alignment-reports/{ids['visualization_id']}"
    read = client.get(path)
    assert read.status_code == 200, read.text
    assert read.json()["editable"], read.text
    request = {
        "request_id": str(uuid4()),
        "expected_token": read.json()["expected_token"],
        "settings": read.json()["settings"],
    }
    return client, root, path, ids, request


@pytest.mark.parametrize("with_formula", [False, True])
def test_edit_preserves_upstream_graph_appearance_layout_and_exact_release(
    db_engine, tmp_path, with_formula
):
    client, root, path, ids, body = editable(db_engine, tmp_path, with_formula)
    visual_url = f"/api/v1/visualizations/{ids['visualization_id']}"
    with Session(db_engine) as session:
        visual = session.get(Visualization, UUID(ids["visualization_id"]))
        visual.config = {
            **visual.config,
            "title": "Custom title",
            "show_labels": True,
            "column_ids": list(reversed(visual.config["column_ids"])),
        }
        session.commit()
    before_graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    before_visual = client.get(visual_url).json()
    before_dashboard = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    body["expected_token"] = client.get(path).json()["expected_token"]
    body["settings"]["name"] = "Edited alignment"
    body["settings"]["alignment"]["left_name"] = "Actual updated"
    if with_formula:
        body["settings"]["formulas"][0]["expression"] += "*2"
    before = counts(db_engine)
    fields = client.post(f"{path}/fields", json=body)
    assert fields.status_code == 200, fields.text
    preview = client.post(f"{path}/preview", json=body)
    assert preview.status_code == 200, preview.text
    assert counts(db_engine) == before
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == before_graph
    applied = client.post(f"{path}/apply", json=body)
    assert applied.status_code == 200, applied.text
    after_graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    owned = {step["node_id"] for step in client.get(path).json()["steps"] if step["editable"]}
    assert [n for n in after_graph["nodes"] if n["id"] not in owned] == [
        n for n in before_graph["nodes"] if n["id"] not in owned
    ]
    assert after_graph["edges"] == before_graph["edges"]
    assert after_graph["presentation"] == before_graph["presentation"]
    assert client.get(visual_url).json()["config"] == before_visual["config"]
    assert client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json() == before_dashboard
    assert client.post(f"{path}/apply", json=body).json() == applied.json()
    assert (
        client.post(f"{path}/apply", json={**body, "request_id": str(uuid4())}).status_code == 409
    )
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == after_graph
    client.post(f"{root}/checks")
    check = client.get(f"{root}/report-jobs").json()[0]
    assert check["status"] == "succeeded", check
    release = client.post(
        f"{root}/releases",
        json={
            "name": "Edited",
            "period": "2026",
            "dashboard_ids": [ids["dashboard_id"]],
            "expected_token": check["check"]["token"],
        },
    )
    assert release.status_code == 200, release.text
    release_id = client.get(f"{root}/releases").json()[0]["id"]
    restored = client.post(
        f"/api/v1/releases/{release_id}/restore", json={"name": "Restored edited"}
    )
    assert restored.status_code == 200, restored.text
    new_root = f"/api/v1/projects/{restored.json()['id']}"
    visual = next(
        v
        for v in client.get(f"{new_root}/visualizations").json()["items"]
        if v["name"] == body["settings"]["name"]
    )
    assert client.get(f"{new_root}/alignment-reports/{visual['id']}").json()["editable"]
    result = client.post(f"/api/v1/visualizations/{visual['id']}/result", json={})
    assert result.status_code == 200, result.text
    # Configured reversed display order is retained; compare each row by engine name.
    assert result.json()["rows"] == preview.json()["rows"]


def test_add_remove_formulas_requires_rebind_and_never_drops_formatting(db_engine, tmp_path):
    client, _, path, ids, body = editable(db_engine, tmp_path, False)
    first = formula("0.1 + 0.2", "Exact")
    body["settings"]["formulas"] = [first]
    assert client.post(f"{path}/preview", json=body).status_code == 422
    body["rebind_fields"] = True
    response = client.post(f"{path}/apply", json=body)
    assert response.status_code == 200, response.text
    with Session(db_engine) as session:
        assert (
            str(session.get(Visualization, UUID(ids["visualization_id"])).source_node_id)
            == first["node_id"]
        )
    field = f"calc_{UUID(first['node_id']).hex}"
    with Session(db_engine) as session:
        visual = session.get(Visualization, UUID(ids["visualization_id"]))
        visual.config = {**visual.config, "column_formats": {field: {"decimals": 2}}}
        session.commit()
    read = client.get(path).json()
    removal = {
        **body,
        "request_id": str(uuid4()),
        "expected_token": read["expected_token"],
        "settings": {**read["settings"], "formulas": []},
    }
    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    assert client.post(f"{path}/apply", json=removal).status_code == 422
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == before
    with Session(db_engine) as session:
        visual = session.get(Visualization, UUID(ids["visualization_id"]))
        visual.config = {**visual.config, "column_formats": {}}
        session.commit()
    removal["expected_token"] = client.get(path).json()["expected_token"]
    response = client.post(f"{path}/apply", json=removal)
    assert response.status_code == 200, response.text
    after = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    assert first["node_id"] not in {n["id"] for n in after["nodes"]}
    assert client.get(path).json()["editable"]


@pytest.mark.parametrize(
    "kind",
    ["shared_publication", "shared_visual", "manual_formula", "interactive", "unknown_config"],
)
def test_advanced_suffix_remains_graph_only(db_engine, tmp_path, kind):
    client, _, path, ids, body = editable(db_engine, tmp_path)
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    graph = client.get(graph_url).json()
    formula_id = body["settings"]["formulas"][0]["node_id"]
    if kind == "shared_publication":
        output = deepcopy(
            next(o for o in graph["result_catalog"]["outputs"] if o["id"] == ids["publication_id"])
        )
        output["id"] = str(uuid4())
        graph["result_catalog"]["outputs"].append(output)
        save_workflow(client, graph)
    elif kind == "manual_formula":
        next(n for n in graph["nodes"] if n["id"] == formula_id)["ui"] = {}
        save_workflow(client, graph)
    else:
        with Session(db_engine) as session:
            visual = session.get(Visualization, UUID(ids["visualization_id"]))
            if kind == "shared_visual":
                session.add(
                    Visualization(
                        id=uuid4(),
                        project_id=visual.project_id,
                        workflow_id=visual.workflow_id,
                        publication_id=visual.publication_id,
                        source_node_id=visual.source_node_id,
                        name="Shared",
                        type=visual.type,
                        config=visual.config,
                    )
                )
            elif kind == "unknown_config":
                visual.config = {**visual.config, "future_feature": True}
            else:
                widget = session.scalar(
                    select(DashboardWidget).where(DashboardWidget.visualization_id == visual.id)
                )
                widget.config = {"action": {"type": "filter"}}
            session.commit()
    read = client.get(path).json()
    assert read["editable"] is False, read
    body["expected_token"] = read["expected_token"]
    before = client.get(graph_url).json()
    for action in ("fields", "preview", "apply"):
        assert client.post(f"{path}/{action}", json=body).status_code == 409
    assert client.get(graph_url).json() == before


def test_shared_widgets_acknowledgement_and_failed_commit(db_engine, tmp_path, monkeypatch):
    client, _, path, ids, body = editable(db_engine, tmp_path)
    with Session(db_engine) as session:
        old = session.scalar(
            select(DashboardWidget).where(
                DashboardWidget.visualization_id == UUID(ids["visualization_id"])
            )
        )
        session.add(
            DashboardWidget(
                dashboard_id=old.dashboard_id,
                visualization_id=old.visualization_id,
                config={},
                position_x=0,
                position_y=12,
                width=12,
                height=8,
            )
        )
        session.commit()
    read = client.get(path).json()
    assert read["widget_count"] == 2 and read["editable"]
    body["expected_token"] = read["expected_token"]
    assert client.post(f"{path}/apply", json=body).status_code == 409
    body["acknowledge_shared"] = True
    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()

    def fail(self):
        raise RuntimeError("injected failure")

    monkeypatch.setattr(Session, "commit", fail)
    with pytest.raises(RuntimeError, match="injected"):
        client.post(f"{path}/apply", json=body)
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == before


@pytest.mark.parametrize("kind", ["stale", "collision", "missing", "zero", "duplicate"])
def test_invalid_changes_leave_graph_and_visualization_unchanged(db_engine, tmp_path, kind):
    client, _, path, ids, body = editable(db_engine, tmp_path)
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    before = client.get(graph_url).json()
    visual = client.get(f"/api/v1/visualizations/{ids['visualization_id']}").json()
    if kind == "stale":
        body["expected_token"] = "0" * 64
    elif kind == "collision":
        body["settings"]["formulas"][0]["node_id"] = before["nodes"][0]["id"]
    elif kind == "missing":
        body["settings"]["alignment"]["left_value"] = "missing"
    elif kind == "zero":
        body["settings"]["formulas"][0]["expression"] = "1/0"
    else:
        body["settings"]["formulas"] *= 2
    for action in ("preview", "apply"):
        response = client.post(f"{path}/{action}", json=body)
        assert response.status_code in {400, 409, 422}, response.text
    assert client.get(graph_url).json() == before
    assert client.get(f"/api/v1/visualizations/{ids['visualization_id']}").json() == visual


def test_key_change_rebinds_only_explicit_table_roles(db_engine, tmp_path):
    client, _, path, ids, body = editable(db_engine, tmp_path, False)
    graph_url = f"/api/v1/workflows/{ids['workflow_id']}"
    graph = client.get(graph_url).json()
    group = next(n for n in graph["nodes"] if n["type"] == "group_by")
    group["config"]["aggregations"].append({"name": "Rows", "operation": "count"})
    graph = save_workflow(client, graph)
    read = client.get(path).json()
    assert read["editable"], read
    key = next(c["column_id"] for c in read["left_columns"] if c["display_name"] == "Rows")
    body["settings"]["alignment"]["keys"] = [{"left_key": key, "right_key": key}]
    body["expected_token"] = read["expected_token"]
    assert client.post(f"{path}/apply", json=body).status_code == 422
    assert client.get(graph_url).json() == graph
    body["rebind_fields"] = True
    response = client.post(f"{path}/apply", json=body)
    assert response.status_code == 200, response.text
    visual = client.get(f"/api/v1/visualizations/{ids['visualization_id']}").json()
    assert visual["config"]["grain_column_ids"][0].endswith(f"_key_{key}")
    result = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert result.status_code == 200, result.text
    assert [list(r.values()) for r in result.json()["rows"]] == [
        [2, "0.30", "0.60", True, True],
        [1, "0.50", None, True, False],
    ]


def test_edit_retry_does_not_recreate_deleted_visualization(db_engine, tmp_path):
    client, _, path, ids, body = editable(db_engine, tmp_path)
    response = client.post(f"{path}/apply", json=body)
    assert response.status_code == 200, response.text
    assert client.delete(f"/api/v1/dashboards/{ids['dashboard_id']}").status_code == 204
    deleted = client.delete(
        f"/api/v1/visualizations/{ids['visualization_id']}",
        params={"expected_revision": response.json()["visualization_revision"]},
    )
    assert deleted.status_code == 204, deleted.text
    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    retry = client.post(f"{path}/apply", json=body)
    assert retry.status_code == 410, retry.text
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == before


@pytest.mark.parametrize("same_request", [True, False])
def test_concurrent_edits(db_engine, tmp_path, same_request):
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Concurrent alignment edits require PostgreSQL")
    client, root, _, ids, body = editable(db_engine, tmp_path)
    barrier = Barrier(2)

    def write(index):
        with Session(db_engine) as session:
            service = AlignmentEditingService(
                session,
                LocalStorageProvider(tmp_path),
                Settings(database_url="sqlite://", storage_root=tmp_path),
            )
            request = AlignmentEditRequest.model_validate(
                {**body, "request_id": body["request_id"] if same_request else str(uuid4())}
            )
            barrier.wait(timeout=10)
            try:
                return service.apply(
                    UUID(root.rsplit("/", 1)[-1]), UUID(ids["visualization_id"]), request
                ).model_dump(mode="json")
            except ApplicationError as exc:
                return exc.code

    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(write, [0, 1]))
    if same_request:
        assert outcomes[0] == outcomes[1] and isinstance(outcomes[0], dict)
    else:
        assert outcomes.count("REPORT_EDIT_CONFLICT") == 1
    assert (
        client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()["revision"]
        == before["revision"] + 1
    )
