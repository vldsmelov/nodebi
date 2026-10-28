import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.sources import AppSettings, DatabaseSession, Storage
from app.domain.errors import ApplicationError
from app.schemas.report_builder import ReportBuildResult, ReportEditResult
from app.schemas.statistical_reports import (
    StatisticalEditRead,
    StatisticalEditRequest,
    StatisticalReportPreview,
    StatisticalReportRequest,
)
from app.services.statistical_editing import StatisticalEditingService
from app.services.statistical_reports import StatisticalReportService

router = APIRouter(tags=["statistical reports"])


@router.post(
    "/api/v1/projects/{project_id}/statistical-reports/preview",
    response_model=StatisticalReportPreview,
)
def preview(
    project_id: uuid.UUID,
    request: StatisticalReportRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
    outlier_offset: Annotated[int, Query(ge=0, le=2**63 - 1)] = 0,
    offset: Annotated[int | None, Query(ge=0, le=2**63 - 1)] = None,
) -> StatisticalReportPreview:
    if offset is not None and outlier_offset not in {0, offset}:
        raise ApplicationError("INVALID_PAGE", "Choose one consistent preview page offset.")
    return StatisticalReportService(session, storage, settings).preview(
        project_id, request, outlier_offset if offset is None else offset
    )


@router.post(
    "/api/v1/projects/{project_id}/statistical-reports/apply", response_model=ReportBuildResult
)
def apply(
    project_id: uuid.UUID,
    request: StatisticalReportRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> ReportBuildResult:
    return StatisticalReportService(session, storage, settings).apply(project_id, request)


@router.get(
    "/api/v1/projects/{project_id}/statistical-reports/{visualization_id}",
    response_model=StatisticalEditRead,
)
def read_edit(
    project_id: uuid.UUID,
    visualization_id: uuid.UUID,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> StatisticalEditRead:
    return StatisticalEditingService(session, storage, settings).read(project_id, visualization_id)


@router.post(
    "/api/v1/projects/{project_id}/statistical-reports/{visualization_id}/preview",
    response_model=StatisticalReportPreview,
)
def preview_edit(
    project_id: uuid.UUID,
    visualization_id: uuid.UUID,
    request: StatisticalEditRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
    offset: Annotated[int, Query(ge=0, le=2**63 - 1)] = 0,
) -> StatisticalReportPreview:
    return StatisticalEditingService(session, storage, settings).preview(
        project_id, visualization_id, request, offset
    )


@router.post(
    "/api/v1/projects/{project_id}/statistical-reports/{visualization_id}/apply",
    response_model=ReportEditResult,
)
def apply_edit(
    project_id: uuid.UUID,
    visualization_id: uuid.UUID,
    request: StatisticalEditRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> ReportEditResult:
    return StatisticalEditingService(session, storage, settings).apply(
        project_id, visualization_id, request
    )
