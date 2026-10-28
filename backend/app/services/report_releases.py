"""Frozen report artifacts, independent of future graph execution."""

import gzip
import io
import json
import uuid
from collections.abc import Callable
from typing import Any, cast

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.formulas import remap_expression
from app.infrastructure.storage import StorageProvider
from app.models import (
    Dashboard,
    DashboardLayoutTemplate,
    DashboardWidget,
    DatasetSnapshot,
    DataSource,
    Project,
    ReportDocument,
    SourceVersion,
    Visualization,
    Workflow,
    WorkflowEdge,
    WorkflowNode,
)
from app.nodes import get_node_registry
from app.schemas.reporting import ReleaseRequest
from app.services.dashboards import DashboardService
from app.services.execution import InMemoryExecutionCache
from app.services.file_cleanup import enqueue_deletion
from app.services.projects import ProjectService
from app.services.report_checks import check_project
from app.services.source_access import ProjectSourceAccess
from app.services.source_updates import state_token
from app.services.template_catalog import freeze_template_catalog, restore_template_catalog
from app.services.visualizations import render_visualization

MODELS: tuple[type[Any], ...] = (
    DataSource,
    SourceVersion,
    DatasetSnapshot,
    Workflow,
    WorkflowNode,
    WorkflowEdge,
    Visualization,
    Dashboard,
    DashboardWidget,
    DashboardLayoutTemplate,
)


def snapshot(session: Session, project_id: uuid.UUID) -> dict[str, Any]:
    workflows = select(Workflow.id).where(Workflow.project_id == project_id)
    sources = select(DataSource.id).where(DataSource.project_id == project_id)
    dashboards = select(Dashboard.id).where(Dashboard.project_id == project_id)
    output = {}
    for model in MODELS:
        if model in (SourceVersion, DatasetSnapshot):
            query = select(model).where(model.source_id.in_(sources))
        elif model in (WorkflowNode, WorkflowEdge):
            query = select(model).where(model.workflow_id.in_(workflows))
        elif model in (DashboardWidget, DashboardLayoutTemplate):
            query = select(model).where(model.dashboard_id.in_(dashboards))
        else:
            query = select(model).where(model.project_id == project_id)
        output[model.__tablename__] = [
            {
                column.key: getattr(row, column.key)
                for column in model.__mapper__.column_attrs
                if column.key not in {"created_at", "updated_at"}
            }
            for row in session.scalars(query.execution_options(populate_existing=True))
        ]
    return cast(dict[str, Any], json.loads(json.dumps(output, default=str)))


def create_release(
    session: Session,
    project_id: uuid.UUID,
    request: ReleaseRequest,
    storage: StorageProvider,
    settings: Settings,
    progress: Callable[[int], None],
    artifacts: list[str] | None = None,
) -> ReportDocument:
    initial = state_token(session, project_id)
    if initial != request.expected_token:
        raise ApplicationError(
            "CHECK_STALE", "Run the checks again before fixing this release.", 409
        )
    sources = ProjectSourceAccess(project_id, session, storage)
    check = check_project(session, project_id, storage, settings, sources)
    if any(issue.severity == "error" for issue in check.issues):
        raise ApplicationError("CHECK_FAILED", "Resolve report errors before fixing this release.")
    if check.issues and not request.acknowledge_warnings:
        raise ApplicationError("WARNINGS_NOT_ACKNOWLEDGED", "Review and acknowledge the warnings.")
    content: dict[str, Any] = {
        "engine_version": "0.1.0",
        "format_version": 1,
        "context": request.context.model_dump(mode="json"),
        "dashboard_contexts": {
            str(key): value.model_dump(mode="json")
            for key, value in request.dashboard_contexts.items()
        },
        "check": check.model_dump(mode="json"),
        "warnings_acknowledged": request.acknowledge_warnings,
        "documents": snapshot(session, project_id),
        "rules": [
            row.payload
            for row in session.scalars(
                select(ReportDocument).where(
                    ReportDocument.project_id == project_id, ReportDocument.kind == "rules"
                )
            )
        ],
        **freeze_template_catalog(session, project_id),
        "dashboards": [],
        "results": {},
    }
    cache = InMemoryExecutionCache()
    size = len(json.dumps(content).encode())
    for index, dashboard_id in enumerate(request.dashboard_ids):
        progress(int(10 + index / len(request.dashboard_ids) * 80))
        # Materialization must not retain dashboard locks before taking the project
        # lock. The final fingerprint rejects any intervening edit.
        board = DashboardService(session).read(dashboard_id, lock=False)
        if board.project_id != project_id:
            raise ApplicationError(
                "DASHBOARD_NOT_FOUND", "Dashboard does not exist in this project.", 404
            )
        content["dashboards"].append(board.model_dump(mode="json"))
        view = request.dashboard_contexts.get(dashboard_id, request.context)
        values = {
            parameter.name: parameter.checked(view.values.get(parameter.name, parameter.default))
            for parameter in board.configuration.parameters
        }
        if any(
            parameter.required and values[parameter.name] is None
            for parameter in board.configuration.parameters
        ):
            raise ApplicationError(
                "REQUIRED_PARAMETER",
                "Choose all required dashboard values before fixing a release.",
            )
        for widget in board.widgets:
            key = str(widget.id)
            visualization = session.get(Visualization, widget.visualization_id)
            assert visualization is not None
            parameters = {
                binding.workflow_parameter: values.get(binding.dashboard_parameter)
                for binding in board.configuration.bindings
                if binding.workflow_id == visualization.workflow_id
            }
            widget_view = view.model_copy(
                update={
                    "values": {**view.values, **values},
                    "highlight_only": widget.config.highlight_only,
                }
            )
            if key in content["results"]:
                continue
            page = render_visualization(
                session,
                widget.visualization_id,
                get_node_registry(),
                storage,
                settings,
                cache,
                limit=1000,
                full_data=True,
                view=widget_view,
                parameters=parameters,
                sources=sources,
            )
            saved = page.model_dump(mode="json")
            size += len(json.dumps(saved).encode())
            while len(saved["rows"]) < page.total_rows:
                if size > settings.max_release_bytes:
                    raise ApplicationError(
                        "RELEASE_TOO_LARGE",
                        "Release exceeds its storage limit; no rows were truncated.",
                        413,
                    )
                progress(int(10 + index / len(request.dashboard_ids) * 80))
                page = render_visualization(
                    session,
                    widget.visualization_id,
                    get_node_registry(),
                    storage,
                    settings,
                    cache,
                    offset=len(saved["rows"]),
                    limit=1000,
                    view=widget_view,
                    parameters=parameters,
                    sources=sources,
                )
                if not page.rows:
                    raise ApplicationError(
                        "RELEASE_INCOMPLETE", "The report changed during release creation.", 409
                    )
                rows = page.model_dump(mode="json")["rows"]
                size += len(json.dumps(rows).encode())
                saved["rows"].extend(rows)
            saved["offset"], saved["limit"], saved["truncated"] = 0, len(saved["rows"]), False
            content["results"][key] = saved
    progress(95)
    key = storage.reserve_key(suffix=".gz")
    # Persist cleanup intent before the first byte is written. Publication deletes this
    # intent in the same transaction that publishes the release; startup cleans survivors.
    with Session(session.get_bind()) as tracking:
        intent = ReportDocument(
            project_id=project_id,
            kind="artifact",
            status="staging",
            payload={"artifact_keys": [key]},
        )
        tracking.add(intent)
        tracking.commit()
        intent_id = intent.id
    if artifacts is not None:
        artifacts.append(key)
    ProjectService(session).lock(project_id)
    # Lock dashboard rows as their saves use dashboard-level locking.
    session.scalars(
        select(Dashboard).where(Dashboard.project_id == project_id).with_for_update()
    ).all()
    if initial != state_token(session, project_id):
        raise ApplicationError(
            "CHECK_STALE", "Data changed while the release was built. Try again.", 409
        )
    encoded = json.dumps(content, ensure_ascii=False).encode()
    if len(encoded) > settings.max_release_bytes:
        raise ApplicationError(
            "RELEASE_TOO_LARGE", "Release exceeds its storage limit; no rows were truncated.", 413
        )
    storage.save_reserved(key, io.BytesIO(gzip.compress(encoded)))
    pending = session.get(ReportDocument, intent_id)
    if pending is not None:
        session.delete(pending)
    row = ReportDocument(
        project_id=project_id,
        kind="release",
        status="published",
        payload={
            "summary": {
                "name": request.name,
                "period": request.period,
                "comment": request.comment,
                "dashboard_ids": [str(value) for value in request.dashboard_ids],
            },
            "artifact_keys": [key],
        },
    )
    session.add(row)
    session.flush()
    return row


def read_archive(
    row: ReportDocument, storage: StorageProvider, settings: Settings
) -> dict[str, Any]:
    with (
        storage.open(row.payload["artifact_keys"][0]) as file,
        gzip.GzipFile(fileobj=file) as archive,
    ):
        data = archive.read(settings.max_release_bytes + 1)
    if len(data) > settings.max_release_bytes:
        raise ApplicationError(
            "RELEASE_TOO_LARGE", "Increase the release read limit to open this report.", 413
        )
    return json.loads(data)  # type: ignore[no-any-return]


def restore_release(
    session: Session, row: ReportDocument, name: str, storage: StorageProvider, settings: Settings
) -> Project:
    content = read_archive(row, storage, settings)
    project = Project(id=uuid.uuid4(), name=name)
    documents = content["documents"]
    ids: dict[str, str] = {str(row.project_id): str(project.id)}
    for items in documents.values():
        for item in items:
            ids[item["id"]] = str(uuid.uuid4())

    # Publications, presentation groups and other embedded document identities also need remapping.
    def collect(value: Any) -> None:
        if isinstance(value, dict):
            for key, item in value.items():
                if key == "id" and isinstance(item, str):
                    try:
                        uuid.UUID(item)
                        ids.setdefault(item, str(uuid.uuid4()))
                    except ValueError:
                        pass
                collect(item)
        elif isinstance(value, list):
            for item in value:
                collect(item)

    collect(documents)
    collect(content.get("rules", []))
    keys: dict[str, str] = {}
    try:
        for item in [
            *documents["data_sources"],
            *documents["source_versions"],
            *documents.get("dataset_snapshots", []),
        ]:
            original = item["storage_key"]
            if original not in keys:
                with storage.open(original) as source:
                    from pathlib import PurePosixPath

                    keys[original] = storage.save(source, suffix=PurePosixPath(original).suffix)

        def remap(value: Any) -> Any:
            if isinstance(value, dict):
                return {
                    remap(key): remap_expression(item, ids)
                    if key == "expression" and isinstance(item, str)
                    else remap(item)
                    for key, item in value.items()
                }
            if isinstance(value, list):
                return [remap(item) for item in value]
            if isinstance(value, str):
                if value in keys:
                    return keys[value]
                if value in ids:
                    return ids[value]
                for old, new in ids.items():
                    value = value.replace(old.replace("-", ""), new.replace("-", ""))
                return value
            return value

        session.add(project)
        session.flush()
        for model in MODELS:
            for original in documents.get(model.__tablename__, []):
                values = remap(original)
                for column in model.__mapper__.column_attrs:
                    if column.columns[0].type.python_type is uuid.UUID and values.get(column.key):
                        values[column.key] = uuid.UUID(values[column.key])
                session.add(model(**values))
            session.flush()
        for rules in content.get("rules", []):
            session.add(
                ReportDocument(
                    project_id=project.id, kind="rules", status="saved", payload=remap(rules)
                )
            )
        # Templates contain role keys and literal filter values, not references to this graph.
        # Do not remap literals that happen to look like a source/node UUID.
        restore_template_catalog(session, project.id, content)
        views = [
            {
                "dashboard_id": remap(board["id"]),
                "name": board["name"],
                "context": remap(
                    content.get("dashboard_contexts", {}).get(
                        board["id"], content.get("context", {})
                    )
                ),
            }
            for board in content["dashboards"]
        ]
        session.add(
            ReportDocument(
                project_id=project.id, kind="restoration", status="saved", payload={"views": views}
            )
        )
        session.commit()
        return project
    except Exception:
        session.rollback()
        for key in keys.values():
            enqueue_deletion(session, key)
        session.commit()
        raise
