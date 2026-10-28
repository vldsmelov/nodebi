import uuid

from fastapi import APIRouter, Query, Response

from app.api.sources import AppSettings, DatabaseSession, Storage
from app.schemas.dashboards import VisualizationResult
from app.schemas.measures import MeasureEntry, MeasureList, MeasureReportRequest, MeasureSave
from app.schemas.report_builder import ReportBuildResult
from app.services.measures import MeasureService

router = APIRouter(tags=["reusable measures"])


@router.delete(
    "/api/v1/projects/{project_id}/measures/{workflow_id}/{publication_id}/{measure_id}",
    status_code=204,
)
def remove_measure(
    project_id: uuid.UUID,
    workflow_id: uuid.UUID,
    publication_id: uuid.UUID,
    measure_id: uuid.UUID,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
    expected_token: str = Query(pattern="^[0-9a-f]{64}$"),
) -> Response:
    MeasureService(session, storage, settings).remove(
        project_id, workflow_id, publication_id, measure_id, expected_token
    )
    return Response(status_code=204)


@router.get("/api/v1/projects/{project_id}/measures", response_model=MeasureList)
def list_measures(
    project_id: uuid.UUID, session: DatabaseSession, storage: Storage, settings: AppSettings
) -> MeasureList:
    return MeasureService(session, storage, settings).list(project_id)


@router.put(
    "/api/v1/projects/{project_id}/measures/{workflow_id}/{publication_id}",
    response_model=MeasureEntry,
)
def save_measure(
    project_id: uuid.UUID,
    workflow_id: uuid.UUID,
    publication_id: uuid.UUID,
    request: MeasureSave,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> MeasureEntry:
    return MeasureService(session, storage, settings).save(
        project_id, workflow_id, publication_id, request
    )


@router.post(
    "/api/v1/projects/{project_id}/measure-reports/preview", response_model=VisualizationResult
)
def preview_report(
    project_id: uuid.UUID,
    request: MeasureReportRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> VisualizationResult:
    return MeasureService(session, storage, settings).preview(project_id, request)


@router.post(
    "/api/v1/projects/{project_id}/measure-reports/apply", response_model=ReportBuildResult
)
def apply_report(
    project_id: uuid.UUID,
    request: MeasureReportRequest,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> ReportBuildResult:
    return MeasureService(session, storage, settings).apply(project_id, request)
