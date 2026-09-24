import uuid
from io import BytesIO
from pathlib import Path

import pytest
from openpyxl import Workbook
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.infrastructure.storage import LocalStorageProvider
from app.main import app
from app.services.source_access import ProjectSourceAccess
from tests.test_sources_api import create_project, make_client


def book(columns: list[str], rows: list[list[object]]) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    assert sheet is not None
    sheet.title = "Sales"
    sheet.append(columns)
    for row in rows:
        sheet.append(row)
    stream = BytesIO()
    workbook.save(stream)
    workbook.close()
    return stream.getvalue()


@pytest.fixture
def report(db_engine: Engine, tmp_path: Path):  # type: ignore[no-untyped-def]
    project = create_project(db_engine)
    client = make_client(db_engine, tmp_path)
    source = client.post(
        f"/api/v1/projects/{project}/sources/excel",
        files={"file": ("sales.xlsx", book(["product", "amount"], [["A", 10], ["B", 20]]))},
    ).json()
    flow = client.post(f"/api/v1/projects/{project}/workflows", json={"name": "Sales"}).json()
    node, publication = str(uuid.uuid4()), str(uuid.uuid4())
    response = client.put(
        f"/api/v1/workflows/{flow['id']}",
        json={
            "name": "Sales",
            "expected_revision": 1,
            "format_version": 3,
            "nodes": [
                {
                    "id": node,
                    "type": "excel_source",
                    "version": 1,
                    "position": {"x": 0, "y": 0},
                    "config": {"source_id": source["id"], "sheet_name": "Sales"},
                }
            ],
            "edges": [],
            "presentation": {
                "workbooks": [
                    {
                        "id": str(uuid.uuid4()),
                        "label": "Sales book",
                        "source_id": source["id"],
                        "node_ids": [node],
                        "position": {"x": 0, "y": 0},
                    }
                ]
            },
            "result_catalog": {
                "outputs": [
                    {
                        "id": publication,
                        "name": "Sales",
                        "node_id": node,
                        "port": "dataset",
                        "kind": "dataset",
                    }
                ]
            },
        },
    )
    assert response.status_code == 200, response.text
    visual = client.post(
        f"/api/v1/projects/{project}/visualizations",
        json={
            "workflow_id": flow["id"],
            "publication_id": publication,
            "expected_workflow_revision": response.json()["revision"],
            "name": "Sales table",
            "type": "table",
            "config": {},
        },
    )
    assert visual.status_code in (200, 201), visual.text
    board = client.post(f"/api/v1/projects/{project}/dashboards", json={"name": "Sales"}).json()
    saved = client.put(
        f"/api/v1/dashboards/{board['id']}",
        json={
            "name": "Sales",
            "expected_revision": 1,
            "widgets": [
                {
                    "id": str(uuid.uuid4()),
                    "visualization_id": visual.json()["id"],
                    "x": 0,
                    "y": 0,
                    "width": 12,
                    "height": 6,
                }
            ],
        },
    )
    assert saved.status_code == 200, saved.text
    yield client, project, source, flow, node, visual.json(), board
    app.dependency_overrides.clear()


def stage(client, project, source, data, **options):  # type: ignore[no-untyped-def]
    version = client.post(
        f"/api/v1/sources/{source['id']}/versions", files={"file": ("next.xlsx", data)}
    )
    assert version.status_code == 200, version.text
    draft = client.post(f"/api/v1/projects/{project}/updates").json()
    saved = client.put(
        f"/api/v1/updates/{draft['id']}",
        json={
            "expected_revision": draft["revision"],
            "items": [{"source_id": source["id"], "version_id": version.json()["id"], **options}],
        },
    )
    assert saved.status_code == 200, saved.text
    checked = client.post(
        f"/api/v1/updates/{draft['id']}/check", json={"expected_revision": saved.json()["revision"]}
    )
    assert checked.status_code == 200, checked.text
    jobs = client.get(f"/api/v1/projects/{project}/report-jobs").json()
    assert jobs[0]["status"] == "succeeded", jobs
    return client.get(f"/api/v1/projects/{project}/updates").json()[0]


def test_reordered_columns_pinned_execution_and_stale_revision(
    report, db_engine: Engine, tmp_path: Path
):  # type: ignore[no-untyped-def]
    client, project, source, *_ = report
    initial_revision = client.get(f"/api/v1/workflows/{report[3]['id']}").json()["revision"]
    with Session(db_engine) as session:
        pinned = ProjectSourceAccess(project, session, LocalStorageProvider(tmp_path))
        draft = stage(client, project, source, book(["amount", "product"], [[40, "C"]]))
        assert draft["check"]["issues"] == []
        assert pinned.load(uuid.UUID(source["id"]), "Sales").row_count == 2
        applied = client.post(
            f"/api/v1/updates/{draft['id']}/apply", json={"expected_revision": draft["revision"]}
        )
        assert applied.status_code == 200, applied.text
        assert (
            client.get(f"/api/v1/workflows/{report[3]['id']}").json()["revision"]
            == initial_revision + 1
        )
        assert pinned.load(uuid.UUID(source["id"]), "Sales").row_count == 2
        fresh = ProjectSourceAccess(project, session, LocalStorageProvider(tmp_path)).load(
            uuid.UUID(source["id"]), "Sales"
        )
        assert fresh.frame.rows() == [("C", 40)]
        assert [c.column_id for c in fresh.schema.columns] == ["col_1", "col_2"]
        assert (
            client.post(
                f"/api/v1/updates/{draft['id']}/apply",
                json={"expected_revision": draft["revision"]},
            ).status_code
            == 409
        )


def test_periods_reject_duplicate_files_and_replace_existing_period(
    report, db_engine: Engine, tmp_path: Path
):  # type: ignore[no-untyped-def]
    client, project, source, *_ = report
    incoming = book(["product", "amount"], [["C", 30]])
    draft = stage(
        client,
        project,
        source,
        incoming,
        mode="append",
        period="February",
        baseline_period="January",
    )
    assert not draft["check"]["issues"], draft
    assert (
        client.post(
            f"/api/v1/updates/{draft['id']}/apply", json={"expected_revision": draft["revision"]}
        ).status_code
        == 200
    )
    with Session(db_engine) as session:
        assert (
            ProjectSourceAccess(project, session, LocalStorageProvider(tmp_path))
            .load(uuid.UUID(source["id"]), "Sales")
            .row_count
            == 3
        )
    workflow = client.get(f"/api/v1/workflows/{report[3]['id']}").json()
    assert workflow["nodes"][0]["type"] == "excel_periods"
    saved = client.put(
        f"/api/v1/workflows/{workflow['id']}",
        json={
            "name": workflow["name"],
            "expected_revision": workflow["revision"],
            "format_version": 3,
            **{key: workflow[key] for key in ["nodes", "edges", "presentation", "result_catalog"]},
        },
    )
    assert saved.status_code == 200, saved.text
    duplicate = stage(client, project, source, incoming, mode="append", period="March")
    assert any("already included" in issue["message"] for issue in duplicate["check"]["issues"])
    assert (
        client.post(
            f"/api/v1/updates/{duplicate['id']}/apply",
            json={"expected_revision": duplicate["revision"]},
        ).status_code
        == 422
    )
    corrected = stage(
        client,
        project,
        source,
        book(["product", "amount"], [["C", 99]]),
        mode="replace_period",
        period="February",
    )
    assert not corrected["check"]["issues"], corrected
    assert (
        client.post(
            f"/api/v1/updates/{corrected['id']}/apply",
            json={"expected_revision": corrected["revision"]},
        ).status_code
        == 200
    )
    applied = next(
        row
        for row in client.get(f"/api/v1/projects/{project}/updates").json()
        if row["id"] == corrected["id"]
    )
    rollback = client.post(
        f"/api/v1/updates/{applied['id']}/rollback", json={"expected_revision": applied["revision"]}
    ).json()
    renamed = client.put(
        f"/api/v1/updates/{rollback['id']}",
        json={
            "expected_revision": rollback["revision"],
            "name": "Restore complete previous set",
            "items": rollback["items"],
        },
    ).json()
    assert (
        client.post(
            f"/api/v1/updates/{rollback['id']}/check",
            json={"expected_revision": renamed["revision"]},
        ).status_code
        == 200
    )
    checked = next(
        row
        for row in client.get(f"/api/v1/projects/{project}/updates").json()
        if row["id"] == rollback["id"]
    )
    assert not checked["check"]["issues"]
    assert (
        client.post(
            f"/api/v1/updates/{rollback['id']}/apply",
            json={"expected_revision": checked["revision"]},
        ).status_code
        == 200
    )
    with Session(db_engine) as session:
        table = ProjectSourceAccess(project, session, LocalStorageProvider(tmp_path)).load(
            uuid.UUID(source["id"]), "Sales"
        )
        assert table.frame.rows() == [("A", 10), ("B", 20), ("C", 30)]


def test_release_freezes_all_rows_and_restores_editable_project(report):  # type: ignore[no-untyped-def]
    client, project, source, flow, node, visual, board = report
    draft = stage(
        client, project, source, book(["product", "amount"], [[str(i), i] for i in range(1205)])
    )
    assert (
        client.post(
            f"/api/v1/updates/{draft['id']}/apply", json={"expected_revision": draft["revision"]}
        ).status_code
        == 200
    )
    saved_rules = client.put(
        f"/api/v1/projects/{project}/quality-rules",
        json={
            "expected_revision": 1,
            "rules": [
                {
                    "name": "Product required",
                    "workflow_id": flow["id"],
                    "node_id": node,
                    "kind": "required",
                    "columns": ["col_1"],
                }
            ],
        },
    )
    assert saved_rules.status_code == 200, saved_rules.text
    client.post(f"/api/v1/projects/{project}/checks")
    checked = client.get(f"/api/v1/projects/{project}/report-jobs").json()[0]
    assert checked["status"] == "succeeded", checked
    response = client.post(
        f"/api/v1/projects/{project}/releases",
        json={
            "name": "January",
            "period": "January",
            "dashboard_ids": [board["id"]],
            "expected_token": checked["check"]["token"],
        },
    )
    assert response.status_code == 200, response.text
    jobs = client.get(f"/api/v1/projects/{project}/report-jobs").json()
    assert jobs[0]["status"] == "succeeded", jobs
    release = client.get(f"/api/v1/projects/{project}/releases").json()[0]
    widget_id = client.get(f"/api/v1/releases/{release['id']}/dashboards").json()[0]["widgets"][0][
        "id"
    ]
    last = client.get(
        f"/api/v1/releases/{release['id']}/widgets/{widget_id}/result?offset=1200"
    ).json()
    assert last["total_rows"] == 1205 and len(last["rows"]) == 5
    changed = stage(client, project, source, book(["product", "amount"], [["new", 42]]))
    assert (
        client.post(
            f"/api/v1/updates/{changed['id']}/apply",
            json={"expected_revision": changed["revision"]},
        ).status_code
        == 200
    )
    assert (
        client.get(
            f"/api/v1/releases/{release['id']}/widgets/{widget_id}/result?offset=1200"
        ).json()
        == last
    )
    restored = client.post(f"/api/v1/releases/{release['id']}/restore", json={"name": "Restored"})
    assert restored.status_code == 200, restored.text
    assert restored.json()["id"] != str(project)
    flows = client.get(f"/api/v1/projects/{restored.json()['id']}/workflows").json()["items"]
    assert len(flows) == 1 and flows[0]["id"] != flow["id"]
    visuals = client.get(f"/api/v1/projects/{restored.json()['id']}/visualizations").json()
    if isinstance(visuals, dict):
        visuals = visuals["items"]
    result = client.post(f"/api/v1/visualizations/{visuals[0]['id']}/result", json={})
    assert result.status_code == 200, result.text
    assert result.json()["total_rows"] == 1205
    restored_rules = client.get(f"/api/v1/projects/{restored.json()['id']}/quality-rules").json()
    assert restored_rules["rules"][0]["workflow_id"] == flows[0]["id"]
    assert restored_rules["rules"][0]["node_id"] != node
    bookmarks = client.get(f"/api/v1/projects/{restored.json()['id']}/report-state").json()[
        "restored_views"
    ]
    assert len(bookmarks) == 1 and bookmarks[0]["dashboard_id"] != board["id"]
    assert client.get(f"/api/v1/dashboards/{bookmarks[0]['dashboard_id']}").status_code == 200
    assert client.delete(f"/api/v1/projects/{project}?confirm=true").status_code == 204
    assert (
        client.post(f"/api/v1/visualizations/{visuals[0]['id']}/result", json={}).json()[
            "total_rows"
        ]
        == 1205
    )


def test_rules_count_complete_data_and_rollback_is_rechecked(report):  # type: ignore[no-untyped-def]
    client, project, source, flow, node, *_ = report
    rules = [
        {
            "id": str(uuid.uuid4()),
            "name": "Unique products",
            "workflow_id": flow["id"],
            "node_id": node,
            "kind": "unique",
            "columns": ["col_1"],
            "severity": "warning",
        }
    ]
    saved = client.put(
        f"/api/v1/projects/{project}/quality-rules", json={"expected_revision": 1, "rules": rules}
    )
    assert saved.status_code == 200, saved.text
    draft = stage(
        client, project, source, book(["product", "amount"], [["A", i] for i in range(1205)])
    )
    issue = next(i for i in draft["check"]["issues"] if i["message"] == "Unique products")
    assert issue["count"] == 1205 and len(issue["examples"]) == 20
    assert (
        client.post(
            f"/api/v1/updates/{draft['id']}/apply", json={"expected_revision": draft["revision"]}
        ).status_code
        == 422
    )
    applied = client.post(
        f"/api/v1/updates/{draft['id']}/apply",
        json={"expected_revision": draft["revision"], "acknowledge_warnings": True},
    )
    assert applied.status_code == 200, applied.text
    rollback = client.post(
        f"/api/v1/updates/{draft['id']}/rollback",
        json={"expected_revision": applied.json()["revision"]},
    ).json()
    checked = client.post(
        f"/api/v1/updates/{rollback['id']}/check", json={"expected_revision": rollback["revision"]}
    )
    assert checked.status_code == 200, checked.text
    rollback = client.get(f"/api/v1/projects/{project}/updates").json()[0]
    assert not rollback["check"]["issues"]
    restored = client.post(
        f"/api/v1/updates/{rollback['id']}/apply", json={"expected_revision": rollback["revision"]}
    )
    assert restored.status_code == 200, restored.text


def test_atomic_source_bundle_conflict_and_mapping_errors(report, db_engine: Engine):  # type: ignore[no-untyped-def]
    from app.models import DataSource

    client, project, source, *_ = report
    other = client.post(
        f"/api/v1/projects/{project}/sources/excel",
        files={"file": ("other.xlsx", book(["product", "amount"], [["X", 3]]))},
    ).json()
    versions = []
    for current in [source, other]:
        versions.append(
            client.post(
                f"/api/v1/sources/{current['id']}/versions",
                files={"file": ("next.xlsx", book(["product", "amount"], [["Y", 5]]))},
            ).json()
        )
    draft = client.post(f"/api/v1/projects/{project}/updates").json()
    draft = client.put(
        f"/api/v1/updates/{draft['id']}",
        json={
            "expected_revision": 1,
            "items": [
                {"source_id": current["id"], "version_id": version["id"]}
                for current, version in zip([source, other], versions, strict=True)
            ],
        },
    ).json()
    client.post(
        f"/api/v1/updates/{draft['id']}/check", json={"expected_revision": draft["revision"]}
    )
    draft = client.get(f"/api/v1/projects/{project}/updates").json()[0]
    with Session(db_engine) as session:
        before = {
            item["id"]: session.get(DataSource, uuid.UUID(item["id"])).storage_key
            for item in [source, other]
        }
    # CAS failure after pointer changes must roll back the complete source set.
    failed = client.post(f"/api/v1/updates/{draft['id']}/apply", json={"expected_revision": 1})
    assert failed.status_code == 409, failed.text
    with Session(db_engine) as session:
        assert all(
            session.get(DataSource, uuid.UUID(identity)).storage_key == key
            for identity, key in before.items()
        )
    assert (
        client.post(
            f"/api/v1/updates/{draft['id']}/apply", json={"expected_revision": draft["revision"]}
        ).status_code
        == 200
    )
    invalid = stage(client, project, source, book(["renamed", "amount"], [["Y", 5]]))
    assert any(
        "Choose the incoming field" in issue["message"] for issue in invalid["check"]["issues"]
    )


def test_jobs_cancel_and_restart_never_publish_a_result(report, db_engine: Engine, tmp_path: Path):  # type: ignore[no-untyped-def]
    from app.config import Settings
    from app.models import ReportDocument
    from app.services.report_jobs import create_job, run_job

    client, project, *_ = report
    with Session(db_engine) as session:
        job = create_job(session, project, "check", {})
        identity = job.id
        revision = job.revision
    cancelled = client.post(
        f"/api/v1/report-jobs/{identity}/cancel", json={"expected_revision": revision}
    )
    assert cancelled.status_code == 200, cancelled.text
    run_job(db_engine, identity, LocalStorageProvider(tmp_path), Settings())
    jobs = client.get(f"/api/v1/projects/{project}/report-jobs").json()
    assert jobs[0]["status"] == "cancelled" and jobs[0]["check"] is None
    with Session(db_engine) as session:
        job = ReportDocument(
            project_id=project,
            kind="job",
            status="running",
            payload={"worker": "previous-process", "operation": "check"},
        )
        session.add(job)
        session.commit()
    jobs = client.get(f"/api/v1/projects/{project}/report-jobs").json()
    assert jobs[0]["status"] == "interrupted" and "restarted" in jobs[0]["message"]


def test_release_size_failure_preserves_working_state(report, tmp_path: Path):  # type: ignore[no-untyped-def]
    from app.config import Settings, get_settings

    client, project, source, flow, node, visual, board = report
    token = client.get(f"/api/v1/projects/{project}/report-state").json()["token"]
    before_files = set(tmp_path.rglob("*"))
    app.dependency_overrides[get_settings] = lambda: Settings(
        storage_root=tmp_path, max_release_bytes=10
    )
    response = client.post(
        f"/api/v1/projects/{project}/releases",
        json={
            "name": "Too large",
            "period": "January",
            "dashboard_ids": [board["id"]],
            "expected_token": token,
        },
    )
    assert response.status_code == 200, response.text
    job = client.get(f"/api/v1/projects/{project}/report-jobs").json()[0]
    assert job["status"] == "failed" and "limit" in job["message"]
    assert client.get(f"/api/v1/projects/{project}/releases").json() == []
    assert not (set(path for path in tmp_path.rglob("*") if path.is_file()) - before_files)
    assert client.get(f"/api/v1/projects/{project}/report-state").json()["token"] == token


def test_published_scalar_change_uses_previous_successful_baseline(report):  # type: ignore[no-untyped-def]
    client, project, source, flow, node, *_ = report
    graph = client.get(f"/api/v1/workflows/{flow['id']}").json()
    total = str(uuid.uuid4())
    graph["nodes"].append(
        {
            "id": total,
            "type": "field_sum",
            "version": 1,
            "position": {"x": 300, "y": 0},
            "config": {},
        }
    )
    graph["edges"] = [
        {
            "id": str(uuid.uuid4()),
            "source_node_id": node,
            "source_port": "dataset",
            "target_node_id": total,
            "target_port": port,
            "source_column_id": column,
        }
        for port, column in [("table", None), ("value", "col_2")]
    ]
    graph["result_catalog"]["outputs"].append(
        {
            "id": str(uuid.uuid4()),
            "name": "Total",
            "node_id": total,
            "port": "value",
            "kind": "scalar",
        }
    )
    graph["expected_revision"] = graph["revision"]
    graph["format_version"] = 3
    allowed = {
        key: graph[key]
        for key in [
            "name",
            "expected_revision",
            "format_version",
            "nodes",
            "edges",
            "result_catalog",
        ]
    }
    saved = client.put(f"/api/v1/workflows/{flow['id']}", json=allowed)
    assert saved.status_code == 200, saved.text
    client.post(f"/api/v1/projects/{project}/checks")
    before = client.get(f"/api/v1/projects/{project}/report-jobs").json()[0]
    assert before["check"]["metrics"][0]["value"] == 30
    rules = [
        {
            "name": "Total changed",
            "workflow_id": flow["id"],
            "node_id": total,
            "port": "value",
            "kind": "change",
            "tolerance": 5,
        }
    ]
    assert (
        client.put(
            f"/api/v1/projects/{project}/quality-rules",
            json={"expected_revision": 1, "rules": rules},
        ).status_code
        == 200
    )
    draft = stage(client, project, source, book(["product", "amount"], [["A", 99]]))
    metric = draft["check"]["metrics"][0]
    assert metric["previous"] == 30 and metric["value"] == 99
    assert any(
        issue["message"] == "Total changed" and issue["severity"] == "error"
        for issue in draft["check"]["issues"]
    )


def test_release_does_not_block_concurrent_dashboard_edit_and_rejects_changed_snapshot(
    report, db_engine: Engine, monkeypatch: pytest.MonkeyPatch
):  # type: ignore[no-untyped-def]
    from sqlalchemy import text

    from app.models import Dashboard
    from app.services import report_releases

    client, project, source, flow, node, visual, board = report
    original = report_releases.render_visualization
    changed = False

    def render(*args, **kwargs):  # type: ignore[no-untyped-def]
        nonlocal changed
        result = original(*args, **kwargs)
        if not changed:
            changed = True
            with Session(db_engine) as session:
                if db_engine.dialect.name == "postgresql":
                    session.execute(text("SET LOCAL lock_timeout = '500ms'"))
                row = session.get(Dashboard, uuid.UUID(board["id"]))
                assert row is not None
                row.name = "Edited during release"
                row.revision += 1
                session.commit()
        return result

    monkeypatch.setattr(report_releases, "render_visualization", render)
    token = client.get(f"/api/v1/projects/{project}/report-state").json()["token"]
    assert (
        client.post(
            f"/api/v1/projects/{project}/releases",
            json={
                "name": "Concurrent",
                "period": "January",
                "dashboard_ids": [board["id"]],
                "expected_token": token,
            },
        ).status_code
        == 200
    )
    job = client.get(f"/api/v1/projects/{project}/report-jobs").json()[0]
    assert job["status"] == "failed" and "Data changed" in job["message"]
    assert client.get(f"/api/v1/projects/{project}/releases").json() == []
    assert client.get(f"/api/v1/dashboards/{board['id']}").json()["name"] == "Edited during release"
