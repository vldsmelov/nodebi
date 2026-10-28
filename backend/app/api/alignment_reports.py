import uuid

from fastapi import APIRouter

from app.api.sources import AppSettings, DatabaseSession, Storage
from app.schemas.alignment_reports import (
    AlignmentEditRead,
    AlignmentEditRequest,
    AlignmentReportFields,
    AlignmentReportPreview,
    AlignmentReportRequest,
)
from app.schemas.report_builder import ReportBuildResult, ReportEditResult
from app.services.alignment_editing import AlignmentEditingService
from app.services.alignment_reports import AlignmentReportService

router = APIRouter(tags=["alignment reports"])


@router.get(
    "/api/v1/projects/{project_id}/alignment-reports/{visualization_id}",
    response_model=AlignmentEditRead,
)
def read_alignment(
    project_id: uuid.UUID,
    visualization_id: uuid.UUID,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> AlignmentEditRead:
    return AlignmentEditingService(session, storage, settings).read(project_id, visualization_id)


@router.post(
    "/api/v1/projects/{project_id}/alignment-reports/{visualization_id}/fields",
    response_model=AlignmentReportFields,
)
def edit_alignment_fields(
    project_id: uuid.UUID,
    visualization_id: uuid.UUID,
    request: AlignmentEditRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> AlignmentReportFields:
    return AlignmentEditingService(session, storage, settings).fields(
        project_id, visualization_id, request
    )


@router.post(
    "/api/v1/projects/{project_id}/alignment-reports/{visualization_id}/preview",
    response_model=AlignmentReportPreview,
)
def preview_alignment_edit(
    project_id: uuid.UUID,
    visualization_id: uuid.UUID,
    request: AlignmentEditRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> AlignmentReportPreview:
    return AlignmentEditingService(session, storage, settings).preview(
        project_id, visualization_id, request
    )


@router.post(
    "/api/v1/projects/{project_id}/alignment-reports/{visualization_id}/apply",
    response_model=ReportEditResult,
)
def apply_alignment_edit(
    project_id: uuid.UUID,
    visualization_id: uuid.UUID,
    request: AlignmentEditRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> ReportEditResult:
    return AlignmentEditingService(session, storage, settings).apply(
        project_id, visualization_id, request
    )


@router.post(
    "/api/v1/projects/{project_id}/alignment-reports/fields", response_model=AlignmentReportFields
)
def alignment_fields(
    project_id: uuid.UUID,
    request: AlignmentReportRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> AlignmentReportFields:
    return AlignmentReportService(session, storage, settings).fields(project_id, request)


@router.post(
    "/api/v1/projects/{project_id}/alignment-reports/preview", response_model=AlignmentReportPreview
)
def preview_alignment(
    project_id: uuid.UUID,
    request: AlignmentReportRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> AlignmentReportPreview:
    return AlignmentReportService(session, storage, settings).preview(project_id, request)


@router.post(
    "/api/v1/projects/{project_id}/alignment-reports/apply", response_model=ReportBuildResult
)
def apply_alignment(
    project_id: uuid.UUID,
    request: AlignmentReportRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> ReportBuildResult:
    return AlignmentReportService(session, storage, settings).apply(project_id, request)
