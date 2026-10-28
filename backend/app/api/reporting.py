import uuid
from collections.abc import Iterator
from typing import Annotated, Literal
from urllib.parse import quote

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import Engine, func, select
from sqlalchemy.orm import Session

from app.api.workflows import AppSettings, Storage
from app.domain.errors import ApplicationError
from app.domain.ingestion import ReadOptions
from app.infrastructure.database import get_session
from app.models import DataSource, ReportDocument, SourceVersion
from app.schemas.browser_editor import (
    EditorAction,
    EditorPage,
    EditorSave,
    EditorSearch,
    EditorWorkspace,
)
from app.schemas.dashboards import DashboardRead, VisualizationResult
from app.schemas.file_exchange import FileExchangeStart
from app.schemas.projects import ProjectRead
from app.schemas.reporting import (
    ApplyRequest,
    JobRead,
    LineageRead,
    ReleaseRead,
    ReleaseRequest,
    ReportState,
    RestoreRequest,
    RevisionRequest,
    RulesRead,
    RulesSave,
    UpdateRead,
    UpdateSave,
    VersionRead,
)
from app.services.browser_editor import browser_editor_service
from app.services.file_exchange import FileExchangeService
from app.services.projects import ProjectService
from app.services.report_checks import rules_read
from app.services.report_jobs import WORKER_INSTANCE, create_job, read_job, run_job
from app.services.report_lineage import explain_visualization
from app.services.report_releases import read_archive, restore_release
from app.services.source_updates import (
    SourceUpdateService,
    change_document,
    document,
    read_update,
    state_token,
)

router = APIRouter(tags=["report cycle"])
Database = Annotated[Session, Depends(get_session)]


@router.get("/api/v1/updates/{identity}/editor/workspace", response_model=EditorWorkspace)
def editor_workspace(identity: uuid.UUID, session: Database, storage: Storage) -> EditorWorkspace:
    row = document(session, identity, "update")
    return browser_editor_service(session, storage, row).workspace(row)


@router.get("/api/v1/updates/{identity}/editor/find", response_model=EditorSearch)
def find_editor_cells(
    identity: uuid.UUID,
    session: Database,
    storage: Storage,
    resource: str,
    text: Annotated[str, Query(min_length=1, max_length=200)],
) -> EditorSearch:
    row = document(session, identity, "update")
    return browser_editor_service(session, storage, row).find(row, resource, text)


@router.get("/api/v1/updates/{identity}/editor", response_model=EditorPage)
def editor_page(
    identity: uuid.UUID,
    session: Database,
    storage: Storage,
    resource: str | None = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> EditorPage:
    row = document(session, identity, "update")
    return browser_editor_service(session, storage, row).page(row, resource, offset, limit)


@router.post("/api/v1/updates/{identity}/editor", response_model=EditorPage)
def save_editor(
    identity: uuid.UUID,
    payload: EditorSave,
    session: Database,
    storage: Storage,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> EditorPage:
    row = document(session, identity, "update")
    return browser_editor_service(session, storage, row).save(row, payload, offset, limit)


@router.post("/api/v1/updates/{identity}/editor/prepare", response_model=UpdateRead)
def prepare_editor(
    identity: uuid.UUID,
    payload: EditorAction,
    session: Database,
    storage: Storage,
    settings: AppSettings,
) -> UpdateRead:
    row = document(session, identity, "update")
    return browser_editor_service(session, storage, row).commit(row, payload, settings)


@router.post("/api/v1/updates/{identity}/editor/discard", response_model=UpdateRead)
def discard_editor(
    identity: uuid.UUID, payload: RevisionRequest, session: Database, storage: Storage
) -> UpdateRead:
    row = document(session, identity, "update")
    return browser_editor_service(session, storage, row).discard(row, payload.expected_revision)


@router.post("/api/v1/projects/{project_id}/file-updates", response_model=UpdateRead)
def start_file_update(
    project_id: uuid.UUID, payload: FileExchangeStart, session: Database, storage: Storage
) -> UpdateRead:
    return read_update(FileExchangeService(session, storage).start(project_id, payload))


@router.get("/api/v1/updates/{identity}/files/{kind}")
def download_update_file(
    identity: uuid.UUID, kind: Literal["current", "template"], session: Database, storage: Storage
) -> StreamingResponse:
    row = document(session, identity, "update")
    service = FileExchangeService(session, storage)
    source = service.source(row)
    if kind == "template":
        stream, filename = service.template(source)

        def chunks() -> Iterator[bytes]:
            with stream:
                while block := stream.read(65536):
                    yield block
    else:
        filename = row.payload["file_exchange"]["filename"]

        def chunks() -> Iterator[bytes]:
            with storage.open(source.storage_key) as stream:
                while block := stream.read(65536):
                    yield block

    return StreamingResponse(
        chunks(),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": "attachment; filename=source-file; filename*=UTF-8''"
            + quote(filename, safe=""),
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/api/v1/projects/{project_id}/report-state", response_model=ReportState)
def report_state(project_id: uuid.UUID, session: Database) -> ReportState:
    ProjectService(session).get(project_id)
    restored = session.scalar(
        select(ReportDocument).where(
            ReportDocument.project_id == project_id, ReportDocument.kind == "restoration"
        )
    )
    last = session.execute(
        select(ReportDocument.payload["name"].as_string(), ReportDocument.updated_at)
        .where(
            ReportDocument.project_id == project_id,
            ReportDocument.kind == "update",
            ReportDocument.status == "applied",
        )
        .order_by(ReportDocument.updated_at.desc())
        .limit(1)
    ).first()
    pending = (
        session.scalar(
            select(func.count())
            .select_from(ReportDocument)
            .where(
                ReportDocument.project_id == project_id,
                ReportDocument.kind == "update",
                ReportDocument.status.in_(["draft", "checked"]),
            )
        )
        or 0
    )
    result = ReportState(
        token=state_token(session, project_id),
        restored_views=restored.payload.get("views", []) if restored else [],
        last_update_name=last[0] if last else None,
        last_update_at=last[1] if last else None,
        pending_updates=pending,
    )
    checked = session.scalar(
        select(ReportDocument)
        .where(
            ReportDocument.project_id == project_id,
            ReportDocument.kind == "job",
            ReportDocument.status == "succeeded",
            ReportDocument.payload["operation"].as_string() == "check",
        )
        .order_by(ReportDocument.updated_at.desc())
    )
    if checked and checked.payload.get("check"):
        check = checked.payload["check"]
        result.check_status = (
            "outdated"
            if check["token"] != result.token
            else "error"
            if any(issue["severity"] == "error" for issue in check["issues"])
            else "warning"
            if check["issues"]
            else "passed"
        )
    return result


@router.get("/api/v1/visualizations/{identity}/lineage", response_model=LineageRead)
def lineage(identity: uuid.UUID, session: Database) -> LineageRead:
    return explain_visualization(identity, session)


def version_read(row: SourceVersion) -> VersionRead:
    return VersionRead(
        id=row.id,
        source_id=row.source_id,
        filename=row.filename,
        file_size=row.file_size,
        sha256=row.sha256,
        created_at=row.created_at,
        sheet_names=[sheet["name"] for sheet in row.workbook.get("sheets", [])],
        resources=row.workbook.get("resources", []),
        read_options=row.workbook.get("read_options"),
    )


@router.get("/api/v1/sources/{source_id}/versions", response_model=list[VersionRead])
def versions(source_id: uuid.UUID, session: Database) -> list[VersionRead]:
    if session.get(DataSource, source_id) is None:
        raise ApplicationError("SOURCE_NOT_FOUND", "Data source does not exist.", 404)
    return [
        version_read(row)
        for row in session.scalars(
            select(SourceVersion)
            .where(SourceVersion.source_id == source_id)
            .order_by(SourceVersion.created_at.desc())
        )
    ]


@router.post("/api/v1/sources/{source_id}/versions", response_model=VersionRead)
def upload_version(
    source_id: uuid.UUID,
    session: Database,
    storage: Storage,
    settings: AppSettings,
    file: Annotated[UploadFile, File()],
    read_options: Annotated[str | None, Form()] = None,
) -> VersionRead:
    try:
        options = ReadOptions.model_validate_json(read_options) if read_options else None
    except ValueError as exc:
        raise ApplicationError("INVALID_IMPORT_OPTIONS", "Check encoding and delimiter.") from exc
    return version_read(
        SourceUpdateService(session, storage).upload_version(
            source_id, file.filename or "workbook.xlsx", file.file, settings, options
        )
    )


@router.get("/api/v1/projects/{project_id}/updates", response_model=list[UpdateRead])
def updates(project_id: uuid.UUID, session: Database) -> list[UpdateRead]:
    ProjectService(session).get(project_id)
    return [
        read_update(row)
        for row in session.scalars(
            select(ReportDocument)
            .where(ReportDocument.project_id == project_id, ReportDocument.kind == "update")
            .order_by(ReportDocument.created_at.desc())
        )
    ]


@router.post("/api/v1/projects/{project_id}/updates", response_model=UpdateRead)
def create_update(project_id: uuid.UUID, session: Database, storage: Storage) -> UpdateRead:
    return read_update(SourceUpdateService(session, storage).create(project_id))


@router.put("/api/v1/updates/{identity}", response_model=UpdateRead)
def save_update(
    identity: uuid.UUID, payload: UpdateSave, session: Database, storage: Storage
) -> UpdateRead:
    row = document(session, identity, "update")
    SourceUpdateService(session, storage).save(row, payload)
    return read_update(row)


@router.post("/api/v1/updates/{identity}/apply", response_model=UpdateRead)
def apply_update(
    identity: uuid.UUID, payload: ApplyRequest, session: Database, storage: Storage
) -> UpdateRead:
    row = document(session, identity, "update")
    SourceUpdateService(session, storage).apply(
        row, payload.expected_revision, payload.acknowledge_warnings
    )
    return read_update(row)


@router.post("/api/v1/updates/{identity}/cancel", response_model=UpdateRead)
def cancel_update(identity: uuid.UUID, payload: RevisionRequest, session: Database) -> UpdateRead:
    row = document(session, identity, "update")
    if row.status not in {"draft", "checked"}:
        raise ApplicationError("UPDATE_CLOSED", "This data update is already closed.", 409)
    change_document(session, row, payload.expected_revision, row.payload, "cancelled")
    session.commit()
    return read_update(row)


@router.post("/api/v1/updates/{identity}/rollback", response_model=UpdateRead)
def rollback_update(
    identity: uuid.UUID, payload: RevisionRequest, session: Database, storage: Storage
) -> UpdateRead:
    original = document(session, identity, "update")
    if original.revision != payload.expected_revision or original.status != "applied":
        raise ApplicationError("REPORT_CONFLICT", "Choose an applied update to restore.", 409)
    items = []
    for source_id, value in original.payload["previous"].items():
        version = session.scalar(
            select(SourceVersion).where(
                SourceVersion.source_id == uuid.UUID(source_id),
                SourceVersion.storage_key == value["storage_key"],
            )
        )
        if version is None:
            raise ApplicationError(
                "VERSION_NOT_FOUND", "The previous workbook version is unavailable.", 409
            )
        items.append({"source_id": source_id, "version_id": str(version.id)})
    row = SourceUpdateService(session, storage).create(original.project_id)
    change_document(
        session,
        row,
        row.revision,
        {
            "name": "Restore previous data",
            "items": items,
            "rollback_snapshots": original.payload["previous"],
        },
        "draft",
    )
    session.commit()
    return read_update(row)


def schedule(
    session: Session,
    background: BackgroundTasks,
    row: ReportDocument,
    storage: Storage,
    settings: AppSettings,
) -> JobRead:
    bind = session.get_bind()
    if not isinstance(bind, Engine):
        raise RuntimeError("Background jobs require an engine-bound session.")
    background.add_task(run_job, bind, row.id, storage, settings)
    return read_job(row)


@router.post("/api/v1/updates/{identity}/check", response_model=JobRead)
def check_update(
    identity: uuid.UUID,
    payload: RevisionRequest,
    session: Database,
    background: BackgroundTasks,
    storage: Storage,
    settings: AppSettings,
) -> JobRead:
    row = document(session, identity, "update")
    if row.revision != payload.expected_revision:
        raise ApplicationError(
            "REPORT_CONFLICT", "The report changed. Reload before applying your draft.", 409
        )
    job = create_job(
        session, row.project_id, "update", {"update_id": str(identity), **payload.model_dump()}
    )
    return schedule(session, background, job, storage, settings)


@router.get("/api/v1/projects/{project_id}/quality-rules", response_model=RulesRead)
def get_rules(project_id: uuid.UUID, session: Database) -> RulesRead:
    ProjectService(session).get(project_id)
    return rules_read(session, project_id)


@router.put("/api/v1/projects/{project_id}/quality-rules", response_model=RulesRead)
def save_rules(project_id: uuid.UUID, payload: RulesSave, session: Database) -> RulesRead:
    ProjectService(session).lock(project_id)
    row = session.scalar(
        select(ReportDocument).where(
            ReportDocument.project_id == project_id, ReportDocument.kind == "rules"
        )
    )
    if row is None:
        if payload.expected_revision != 1:
            raise ApplicationError("REPORT_CONFLICT", "Reload the report rules.", 409)
        row = ReportDocument(project_id=project_id, kind="rules", revision=1, payload={})
        session.add(row)
        session.flush()
    change_document(
        session,
        row,
        payload.expected_revision,
        {"rules": [rule.model_dump(mode="json") for rule in payload.rules]},
        "saved",
    )
    session.commit()
    return rules_read(session, project_id)


@router.post("/api/v1/projects/{project_id}/checks", response_model=JobRead)
def check_current(
    project_id: uuid.UUID,
    session: Database,
    background: BackgroundTasks,
    storage: Storage,
    settings: AppSettings,
) -> JobRead:
    ProjectService(session).get(project_id)
    return schedule(
        session, background, create_job(session, project_id, "check", {}), storage, settings
    )


@router.get("/api/v1/projects/{project_id}/report-jobs", response_model=list[JobRead])
def jobs(project_id: uuid.UUID, session: Database) -> list[JobRead]:
    for row in session.scalars(
        select(ReportDocument).where(
            ReportDocument.project_id == project_id,
            ReportDocument.kind == "job",
            ReportDocument.status.in_(["queued", "running"]),
        )
    ):
        if row.payload.get("worker") != WORKER_INSTANCE:
            change_document(
                session,
                row,
                row.revision,
                {**row.payload, "message": "The server restarted. Run the task again."},
                "interrupted",
            )
    session.commit()
    return [
        read_job(row)
        for row in session.scalars(
            select(ReportDocument)
            .where(ReportDocument.project_id == project_id, ReportDocument.kind == "job")
            .order_by(ReportDocument.created_at.desc())
            .limit(30)
        )
    ]


@router.post("/api/v1/report-jobs/{identity}/cancel", response_model=JobRead)
def cancel_job(identity: uuid.UUID, payload: RevisionRequest, session: Database) -> JobRead:
    row = document(session, identity, "job")
    if row.status not in {"queued", "running"}:
        raise ApplicationError("JOB_CLOSED", "This task has already finished.", 409)
    change_document(session, row, payload.expected_revision, row.payload, "cancelled")
    session.commit()
    return read_job(row)


@router.post("/api/v1/projects/{project_id}/releases", response_model=JobRead)
def release(
    project_id: uuid.UUID,
    payload: ReleaseRequest,
    session: Database,
    background: BackgroundTasks,
    storage: Storage,
    settings: AppSettings,
) -> JobRead:
    ProjectService(session).get(project_id)
    return schedule(
        session,
        background,
        create_job(session, project_id, "release", payload.model_dump(mode="json")),
        storage,
        settings,
    )


@router.get("/api/v1/projects/{project_id}/releases", response_model=list[ReleaseRead])
def releases(project_id: uuid.UUID, session: Database) -> list[ReleaseRead]:
    return [
        ReleaseRead(id=row.id, created_at=row.created_at, **row.payload["summary"])
        for row in session.scalars(
            select(ReportDocument)
            .where(
                ReportDocument.project_id == project_id,
                ReportDocument.kind == "release",
                ReportDocument.status == "published",
            )
            .order_by(ReportDocument.created_at.desc())
        )
    ]


@router.get("/api/v1/releases/{identity}/dashboards", response_model=list[DashboardRead])
def release_dashboards(
    identity: uuid.UUID, session: Database, storage: Storage, settings: AppSettings
) -> list[DashboardRead]:
    archive = read_archive(document(session, identity, "release"), storage, settings)
    return [DashboardRead.model_validate(item) for item in archive["dashboards"]]


@router.get(
    "/api/v1/releases/{identity}/widgets/{visualization_id}/result",
    response_model=VisualizationResult,
)
def release_result(
    identity: uuid.UUID,
    visualization_id: uuid.UUID,
    session: Database,
    storage: Storage,
    settings: AppSettings,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
) -> VisualizationResult:
    archive = read_archive(document(session, identity, "release"), storage, settings)
    result = archive["results"].get(str(visualization_id))
    if result is None:
        raise ApplicationError(
            "VISUALIZATION_NOT_FOUND", "Visualization is not in this release.", 404
        )
    if result["type"] == "table":
        result = {
            **result,
            "rows": result["rows"][offset : offset + limit],
            "offset": offset,
            "limit": limit,
            "truncated": offset + limit < result["total_rows"],
        }
    if result["type"] == "box_plot":
        points = result["datasets"]["outliers"]
        result = {
            **result,
            "datasets": {
                **result["datasets"],
                "outliers": {
                    **points,
                    "rows": points["rows"][offset : offset + limit],
                    "offset": offset,
                    "limit": limit,
                    "truncated": offset + limit < points["total_rows"],
                },
            },
        }
    parsed = VisualizationResult.model_validate(result)
    if parsed.type == "bullet_chart":
        from app.services.bullet_visualizations import page_frozen_bullet

        return page_frozen_bullet(parsed, offset, limit)
    if parsed.type == "pareto_chart":
        from app.services.pareto_visualizations import page_frozen_pareto

        return page_frozen_pareto(parsed, offset, limit)
    if parsed.type == "bubble_chart":
        from app.services.bubble_visualizations import page_frozen_bubble

        return page_frozen_bubble(parsed, offset, limit)
    if parsed.type == "analytical_table":
        from app.services.analytical_tables import page_frozen_analytical_table

        return page_frozen_analytical_table(parsed, offset, limit)
    return parsed


@router.post("/api/v1/releases/{identity}/restore", response_model=ProjectRead)
def restore(
    identity: uuid.UUID,
    payload: RestoreRequest,
    session: Database,
    storage: Storage,
    settings: AppSettings,
) -> ProjectRead:
    project = restore_release(
        session, document(session, identity, "release"), payload.name, storage, settings
    )
    return ProjectRead(
        id=project.id,
        name=project.name,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )
