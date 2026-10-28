import copy
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from queue import Queue
from threading import Barrier

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.infrastructure.storage import LocalStorageProvider
from app.models import Dashboard, DashboardWidget, ReportDocument, Visualization, Workflow
from app.schemas.report_builder import ReportEditRequest
from app.services.report_editing import ReportEditingService
from tests.test_sources_api import create_project, make_client


def example(db_engine: Engine, tmp_path: Path) -> tuple[TestClient, str, dict, dict]:
    project = str(create_project(db_engine))
    client = make_client(db_engine, tmp_path)
    source = client.post(
        f"/api/v1/projects/{project}/imports",
        data={"connector": "csv"},
        files={"file": ("sales.csv", b"category,amount\nA,0.10\nA,0.20\nB,0.50\n")},
    ).json()
    profile = client.post(
        f"/api/v1/imports/{source['id']}/inspect", json={"resource_id": "table"}
    ).json()["profile"]
    snapshot = client.post(
        f"/api/v1/imports/{source['id']}/apply",
        json={"profile": profile, "expected_revision": 1, "request_id": str(uuid.uuid4())},
    ).json()
    request = {
        "request_id": str(uuid.uuid4()),
        "source_id": source["id"],
        "resource_id": "table",
        "expected_snapshot_id": snapshot["id"],
        "name": "Revenue",
        "dimensions": [profile["fields"][0]["field_id"]],
        "measures": [
            {"column_id": profile["fields"][1]["field_id"], "operation": "sum", "name": "Revenue"}
        ],
    }
    created = client.post(f"/api/v1/projects/{project}/report-builder/apply", json=request)
    assert created.status_code == 200, created.text
    return client, project, created.json(), request


def save_workflow(client: TestClient, graph: dict) -> dict:
    payload = {
        k: graph[k]
        for k in ("name", "nodes", "edges", "parameters", "presentation", "result_catalog")
    }
    saved = client.put(
        f"/api/v1/workflows/{graph['id']}",
        json={
            **payload,
            "expected_revision": graph["revision"],
            "format_version": graph["version"],
        },
    )
    assert saved.status_code == 200, saved.text
    return saved.json()


def test_round_trip_uses_live_graph_preserves_advanced_steps_and_appearance(
    db_engine: Engine, tmp_path: Path
) -> None:
    client, project, ids, original = example(db_engine, tmp_path)
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    aggregate = next(n for n in graph["nodes"] if n["type"] == "group_by")
    # A manually inserted upstream calculation, with its own position and UI metadata.
    advanced = {
        "id": str(uuid.uuid4()),
        "type": "sort",
        "version": 1,
        "position": {"x": 22, "y": 44},
        "ui": {"label": "Manual ordering"},
        "config": {"keys": [{"column_id": original["dimensions"][0], "direction": "descending"}]},
    }
    graph["nodes"].append(advanced)
    graph["edges"][0]["source_node_id"] = advanced["id"]
    graph["edges"].append(
        {
            "id": str(uuid.uuid4()),
            "source_node_id": source["id"],
            "source_port": "dataset",
            "target_node_id": advanced["id"],
            "target_port": "input",
        }
    )
    aggregate["config"]["aggregations"][0]["operation"] = "max"
    aggregate["config"]["decimal_average_scale"] = 4
    graph["presentation"]["blocks"] = [
        {
            "id": str(uuid.uuid4()),
            "label": "Manual preparation",
            "node_ids": [advanced["id"]],
            "position": {"x": 15, "y": 16},
            "collapsed": True,
            "inputs": [
                {
                    "id": str(uuid.uuid4()),
                    "label": "Input",
                    "node_id": advanced["id"],
                    "port": "input",
                }
            ],
            "outputs": [
                {
                    "id": str(uuid.uuid4()),
                    "label": "Output",
                    "node_id": advanced["id"],
                    "port": "dataset",
                }
            ],
        }
    ]
    saved = save_workflow(client, graph)
    before_dashboard = client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json()
    with Session(db_engine) as session:
        visual = session.get(Visualization, uuid.UUID(ids["visualization_id"]))
        assert visual
        visual.config = {
            **visual.config,
            "title": "Custom title",
            "currency": "RUB",
            "decimals": 4,
            "orientation": "horizontal",
            "column_ids": list(reversed(visual.config["column_ids"])),
            "column_formats": {
                visual.config["value_column_id"]: {
                    "number_format": "currency",
                    "currency": "RUB",
                    "decimals": 4,
                    "future_format_hint": "keep",
                }
            },
        }
        session.commit()
        before_config = copy.deepcopy(visual.config)
    root = f"/api/v1/projects/{project}/report-builder/{ids['visualization_id']}"
    view = client.get(root)
    assert view.status_code == 200, view.text
    projection = view.json()
    assert projection["editable"], projection
    assert projection["settings"]["measures"][0]["operation"] == "max"  # Not the creation receipt.
    assert projection["settings"]["decimal_average_scale"] == 4
    assert [(s["type"], s["editable"]) for s in projection["steps"]] == [
        ("dataset_source", False),
        ("sort", False),
        ("group_by", True),
    ]
    body = {
        "request_id": str(uuid.uuid4()),
        "expected_token": projection["expected_token"],
        "settings": projection["settings"],
    }
    body["settings"]["measures"][0]["operation"] = "average"
    body["settings"]["filters"] = [
        {"column_id": original["dimensions"][0], "operator": "equals", "value": "A"}
    ]
    preview = client.post(f"{root}/preview", json=body)
    assert preview.status_code == 200, preview.text
    assert preview.json()["rows"] == [{original["dimensions"][0]: "A", "Revenue": "0.1500"}]
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == saved
    applied = client.post(f"{root}/apply", json=body)
    assert applied.status_code == 200, applied.text
    assert client.post(f"{root}/apply", json=body).json() == applied.json()
    after = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    assert after["revision"] == saved["revision"] + 1
    assert after["presentation"] == saved["presentation"]
    assert after["result_catalog"] == saved["result_catalog"]
    assert next(n for n in after["nodes"] if n["id"] == advanced["id"]) == advanced
    assert client.get(f"/api/v1/dashboards/{ids['dashboard_id']}").json() == before_dashboard
    rendered = client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={})
    assert rendered.status_code == 200, rendered.text
    assert rendered.json()["rows"][0]["Revenue"] == "0.1500"
    with Session(db_engine) as session:
        assert (
            session.get(Visualization, uuid.UUID(ids["visualization_id"])).config == before_config
        )
        assert (
            len(list(session.scalars(select(Workflow))))
            == len(list(session.scalars(select(Dashboard))))
            == 1
        )
    # Reopen the actual edited graph and remove only the newly managed filter.
    new = client.get(root).json()
    new_body = {
        "request_id": str(uuid.uuid4()),
        "expected_token": new["expected_token"],
        "settings": {**new["settings"], "filters": []},
    }
    assert client.post(f"{root}/apply", json=new_body).status_code == 200
    final = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    assert {n["id"] for n in final["nodes"]} == {n["id"] for n in saved["nodes"]}
    assert (
        client.post(
            f"{root}/apply", json={**body, "settings": {**body["settings"], "name": "Other"}}
        ).status_code
        == 409
    )


@pytest.mark.parametrize(
    "change", ["workflow", "visualization", "source", "shared", "context", "legacy"]
)
def test_conflicts_and_unsupported_branches_never_overwrite(
    db_engine: Engine, tmp_path: Path, change: str
) -> None:
    client, project, ids, original = example(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}/report-builder/{ids['visualization_id']}"
    view = client.get(root).json()
    body = {
        "request_id": str(uuid.uuid4()),
        "expected_token": view["expected_token"],
        "settings": view["settings"],
    }
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    if change == "workflow":
        graph["nodes"][0]["position"]["x"] += 50
        save_workflow(client, graph)
    elif change == "source":
        profile = client.post(
            f"/api/v1/imports/{original['source_id']}/inspect", json={"resource_id": "table"}
        ).json()["profile"]
        assert (
            client.post(
                f"/api/v1/imports/{original['source_id']}/apply",
                json={"profile": profile, "expected_revision": 2, "request_id": str(uuid.uuid4())},
            ).status_code
            == 200
        )
    elif change in {"legacy", "context"}:
        if change == "legacy":
            next(n for n in graph["nodes"] if n["type"] == "group_by")["version"] = 1
        else:
            identity = str(uuid.uuid4())
            graph["result_catalog"]["contexts"] = [
                {"id": identity, "name": "Manual scope", "roles": [], "points": []}
            ]
            graph["result_catalog"]["outputs"][0]["context_ids"] = [identity]
        save_workflow(client, graph)
    else:
        with Session(db_engine) as session:
            visual = session.get(Visualization, uuid.UUID(ids["visualization_id"]))
            if change == "visualization":
                visual.revision += 1
            else:
                session.add(
                    Visualization(
                        project_id=visual.project_id,
                        workflow_id=visual.workflow_id,
                        publication_id=visual.publication_id,
                        source_node_id=visual.source_node_id,
                        type=visual.type,
                        name="Other report",
                        config=visual.config,
                    )
                )
            session.commit()
    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    assert client.post(f"{root}/preview", json=body).status_code == 409
    assert client.post(f"{root}/apply", json=body).status_code == 409
    if change in {"shared", "context", "legacy"}:
        latest = client.get(root).json()
        assert not latest["editable"] and latest["reason"]
        assert (
            client.post(
                f"{root}/apply", json={**body, "expected_token": latest["expected_token"]}
            ).status_code
            == 409
        )
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == before


def test_rebind_is_explicit_shared_widgets_require_acknowledgement_and_invalid_edits_roll_back(
    db_engine: Engine, tmp_path: Path
) -> None:
    client, project, ids, _ = example(db_engine, tmp_path)
    with Session(db_engine) as session:
        session.add(
            DashboardWidget(
                dashboard_id=uuid.UUID(ids["dashboard_id"]),
                visualization_id=uuid.UUID(ids["visualization_id"]),
                config={},
                position_x=0,
                position_y=9,
                width=12,
                height=8,
            )
        )
        session.commit()
    root = f"/api/v1/projects/{project}/report-builder/{ids['visualization_id']}"
    view = client.get(root).json()
    assert view["widget_count"] == 2
    body = {
        "request_id": str(uuid.uuid4()),
        "expected_token": view["expected_token"],
        "settings": {**view["settings"], "dimensions": []},
    }
    assert client.post(f"{root}/apply", json=body).status_code == 409
    body["acknowledge_shared"] = True
    assert (
        client.post(f"{root}/apply", json=body).status_code == 422
    )  # Existing table field removed.
    with Session(db_engine) as session:
        assert session.get(ReportDocument, uuid.UUID(body["request_id"])) is None
    body["settings"]["rebind_fields"] = True
    response = client.post(f"{root}/apply", json=body)
    assert response.status_code == 200, response.text
    assert client.post(f"/api/v1/visualizations/{ids['visualization_id']}/result", json={}).json()[
        "rows"
    ] == [{"Revenue": "0.80"}]
    foreign = str(create_project(db_engine))
    assert (
        client.get(
            f"/api/v1/projects/{foreign}/report-builder/{ids['visualization_id']}"
        ).status_code
        == 404
    )


def test_published_filter_is_preserved_and_invalid_configuration_is_read_only(
    db_engine: Engine, tmp_path: Path
) -> None:
    client, project, ids, original = example(db_engine, tmp_path)
    graph = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    source = next(n for n in graph["nodes"] if n["type"] == "dataset_source")
    extra = {
        "id": str(uuid.uuid4()),
        "type": "filter",
        "version": 1,
        "position": {"x": 111, "y": 222},
        "ui": {},
        "config": {
            "conditions": [
                {"column_id": original["dimensions"][0], "operator": "not_equals", "value": "B"}
            ]
        },
    }
    graph["nodes"].append(extra)
    graph["edges"][0]["source_node_id"] = extra["id"]
    graph["edges"].append(
        {
            "id": str(uuid.uuid4()),
            "source_node_id": source["id"],
            "source_port": "dataset",
            "target_node_id": extra["id"],
            "target_port": "input",
        }
    )
    graph["result_catalog"]["outputs"].append(
        {
            "id": str(uuid.uuid4()),
            "name": "Shared filtered input",
            "node_id": extra["id"],
            "port": "dataset",
            "kind": "dataset",
        }
    )
    save_workflow(client, graph)
    root = f"/api/v1/projects/{project}/report-builder/{ids['visualization_id']}"
    view = client.get(root).json()
    assert view["editable"] and view["settings"]["filters"] == []
    assert not next(s for s in view["steps"] if s["node_id"] == extra["id"])["editable"]
    body = {
        "request_id": str(uuid.uuid4()),
        "expected_token": view["expected_token"],
        "settings": {
            **view["settings"],
            "filters": [
                {"column_id": original["dimensions"][0], "operator": "equals", "value": "A"}
            ],
        },
    }
    assert client.post(f"{root}/apply", json=body).status_code == 200
    after = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    assert next(n for n in after["nodes"] if n["id"] == extra["id"]) == extra
    assert len([n for n in after["nodes"] if n["type"] == "filter"]) == 2
    next(n for n in after["nodes"] if n["type"] == "group_by")["config"]["aggregations"] = None
    save_workflow(client, after)
    assert client.get(root).json()["editable"] is False


@pytest.mark.parametrize("same_request", [True, False])
def test_concurrent_report_edits_are_atomic_and_idempotent(
    db_engine: Engine, tmp_path: Path, same_request: bool
) -> None:
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Concurrent report edit locks require PostgreSQL")
    client, project, ids, _ = example(db_engine, tmp_path)
    view = client.get(f"/api/v1/projects/{project}/report-builder/{ids['visualization_id']}").json()
    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()["revision"]
    barrier, request_id = Barrier(2), uuid.uuid4()

    def write(index: int) -> str:
        with Session(db_engine) as session:
            service = ReportEditingService(
                session,
                LocalStorageProvider(tmp_path),
                Settings(database_url="sqlite://", storage_root=tmp_path),
            )
            request = ReportEditRequest.model_validate(
                {
                    "request_id": request_id if same_request else uuid.uuid4(),
                    "expected_token": view["expected_token"],
                    "settings": {
                        **view["settings"],
                        "name": "Same" if same_request else f"Tab {index}",
                    },
                }
            )
            barrier.wait(timeout=10)
            try:
                result = service.apply_edit(
                    uuid.UUID(project), uuid.UUID(ids["visualization_id"]), request
                )
                return str(result.workflow_revision)
            except ApplicationError as exc:
                return exc.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(write, [1, 2]))
    assert (
        results == [str(before + 1)] * 2
        if same_request
        else set(results) == {str(before + 1), "REPORT_EDIT_CONFLICT"}
    )
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()["revision"] == before + 1
    with Session(db_engine) as session:
        assert (
            len(
                list(
                    session.scalars(
                        select(ReportDocument).where(ReportDocument.kind == "report_edit_receipt")
                    )
                )
            )
            == 1
        )


def test_editor_observes_concurrent_widget_attachment(db_engine: Engine, tmp_path: Path) -> None:
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Concurrent visualization usage locks require PostgreSQL")
    _, project, ids, _ = example(db_engine, tmp_path)
    pids: Queue[int] = Queue()

    def read_count() -> int:
        with Session(db_engine) as session:
            pids.put(session.scalar(text("select pg_backend_pid()")))
            service = ReportEditingService(
                session,
                LocalStorageProvider(tmp_path),
                Settings(database_url="sqlite://", storage_root=tmp_path),
            )
            return service.read(uuid.UUID(project), uuid.UUID(ids["visualization_id"])).widget_count

    with Session(db_engine) as attaching, ThreadPoolExecutor(max_workers=1) as pool:
        attaching.scalar(
            select(Visualization)
            .where(Visualization.id == uuid.UUID(ids["visualization_id"]))
            .with_for_update(read=True)
        )
        attaching.add(
            DashboardWidget(
                dashboard_id=uuid.UUID(ids["dashboard_id"]),
                visualization_id=uuid.UUID(ids["visualization_id"]),
                config={},
                position_x=0,
                position_y=10,
                width=12,
                height=8,
            )
        )
        attaching.flush()
        future = pool.submit(read_count)
        try:
            pid, deadline = pids.get(timeout=5), time.monotonic() + 5
            with db_engine.connect() as observer:
                while not observer.scalar(
                    text("select cardinality(pg_blocking_pids(:pid)) > 0"), {"pid": pid}
                ):
                    assert time.monotonic() < deadline, "Editor did not wait for widget attachment"
                    time.sleep(0.02)
            attaching.commit()
            assert future.result(timeout=10) == 2
        finally:
            attaching.rollback()


def test_persistence_failure_rolls_back_graph_visualization_and_receipt(
    db_engine: Engine, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.services import report_editing

    client, project, ids, _ = example(db_engine, tmp_path)
    root = f"/api/v1/projects/{project}/report-builder/{ids['visualization_id']}"
    view = client.get(root).json()
    before = client.get(f"/api/v1/workflows/{ids['workflow_id']}").json()
    body = {
        "request_id": str(uuid.uuid4()),
        "expected_token": view["expected_token"],
        "settings": {**view["settings"], "name": "Must roll back"},
    }
    original = report_editing.save_graph

    def fail_after_graph_flush(*args, **kwargs):
        original(*args, **kwargs)
        raise RuntimeError("Injected persistence failure")

    monkeypatch.setattr(report_editing, "save_graph", fail_after_graph_flush)
    with pytest.raises(RuntimeError, match="Injected persistence failure"):
        client.post(f"{root}/apply", json=body)
    assert client.get(f"/api/v1/workflows/{ids['workflow_id']}").json() == before
    assert client.get(root).json() == view
    with Session(db_engine) as session:
        assert session.get(ReportDocument, uuid.UUID(body["request_id"])) is None
