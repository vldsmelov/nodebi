import uuid

from fastapi import APIRouter

from app.api.sources import AppSettings, DatabaseSession, Storage
from app.schemas.report_builder import (
    ReportBuildPreview,
    ReportBuildRequest,
    ReportBuildResult,
    ReportEditRead,
    ReportEditRequest,
    ReportEditResult,
    ReportFormulaFields,
    ReportInputList,
    ReportInputRead,
)
from app.services.report_builder import ReportBuilderService
from app.services.report_editing import ReportEditingService
from app.services.report_inputs import ReportInputService

router = APIRouter(tags=["report builder"])


@router.get("/api/v1/projects/{project_id}/report-builder/inputs", response_model=ReportInputList)
def list_inputs(
    project_id: uuid.UUID, session: DatabaseSession, storage: Storage, settings: AppSettings
) -> ReportInputList:
    return ReportInputService(session, storage, settings).list(project_id)


@router.get(
    "/api/v1/projects/{project_id}/report-builder/inputs/{workflow_id}/{publication_id}",
    response_model=ReportInputRead,
)
def read_input(
    project_id: uuid.UUID,
    workflow_id: uuid.UUID,
    publication_id: uuid.UUID,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> ReportInputRead:
    return ReportInputService(session, storage, settings).read(
        project_id, workflow_id, publication_id
    )


@router.post(
    "/api/v1/projects/{project_id}/report-builder/fields", response_model=ReportFormulaFields
)
def fields(
    project_id: uuid.UUID,
    request: ReportBuildRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
    include_summary: bool = False,
) -> ReportFormulaFields:
    return ReportBuilderService(session, storage, settings).fields(
        project_id, request, include_summary
    )


@router.post(
    "/api/v1/projects/{project_id}/report-builder/{visualization_id}/fields",
    response_model=ReportFormulaFields,
)
def edit_fields(
    project_id: uuid.UUID,
    visualization_id: uuid.UUID,
    request: ReportEditRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
    include_summary: bool = False,
) -> ReportFormulaFields:
    return ReportEditingService(session, storage, settings).fields(
        project_id, visualization_id, request, include_summary
    )


@router.get(
    "/api/v1/projects/{project_id}/report-builder/{visualization_id}", response_model=ReportEditRead
)
def edit_read(
    project_id: uuid.UUID,
    visualization_id: uuid.UUID,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> ReportEditRead:
    return ReportEditingService(session, storage, settings).read(project_id, visualization_id)


@router.post(
    "/api/v1/projects/{project_id}/report-builder/{visualization_id}/preview",
    response_model=ReportBuildPreview,
)
def edit_preview(
    project_id: uuid.UUID,
    visualization_id: uuid.UUID,
    request: ReportEditRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> ReportBuildPreview:
    return ReportEditingService(session, storage, settings).preview_edit(
        project_id, visualization_id, request
    )


@router.post(
    "/api/v1/projects/{project_id}/report-builder/{visualization_id}/apply",
    response_model=ReportEditResult,
)
def edit_apply(
    project_id: uuid.UUID,
    visualization_id: uuid.UUID,
    request: ReportEditRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> ReportEditResult:
    return ReportEditingService(session, storage, settings).apply_edit(
        project_id, visualization_id, request
    )


@router.post(
    "/api/v1/projects/{project_id}/report-builder/preview", response_model=ReportBuildPreview
)
def preview(
    project_id: uuid.UUID,
    request: ReportBuildRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> ReportBuildPreview:
    return ReportBuilderService(session, storage, settings).preview(project_id, request)


@router.post("/api/v1/projects/{project_id}/report-builder/apply", response_model=ReportBuildResult)
def apply(
    project_id: uuid.UUID,
    request: ReportBuildRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> ReportBuildResult:
    return ReportBuilderService(session, storage, settings).apply(project_id, request)
