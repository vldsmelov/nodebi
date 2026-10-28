import uuid

from fastapi import APIRouter, Query

from app.api.sources import AppSettings, DatabaseSession, Storage
from app.schemas.analytical_templates import (
    TemplateCapture,
    TemplateList,
    TemplatePrepare,
    TemplateRead,
)
from app.schemas.report_builder import ReportSettings
from app.schemas.report_templates import ReportTemplateList, ReportTemplateRead
from app.schemas.statistical_reports import StatisticalSettings
from app.schemas.template_catalog import (
    TemplateCatalogEdit,
    TemplateCatalogEntry,
    TemplateCatalogPage,
    TemplateFamily,
    TemplateState,
)
from app.services.analytical_templates import AnalyticalTemplateService
from app.services.report_templates import ReportTemplateService
from app.services.template_catalog import TemplateCatalogService

router = APIRouter(tags=["analytical templates"])


@router.get("/api/v1/projects/{project_id}/template-catalog", response_model=TemplateCatalogPage)
def list_template_catalog(
    project_id: uuid.UUID,
    session: DatabaseSession,
    q: str = Query(default="", max_length=200),
    family: TemplateFamily | None = None,
    state: TemplateState = "active",
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> TemplateCatalogPage:
    return TemplateCatalogService(session).list(project_id, q, family, state, offset, limit)


@router.patch(
    "/api/v1/projects/{project_id}/template-catalog/{template_id}",
    response_model=TemplateCatalogEntry,
)
def edit_template_catalog(
    project_id: uuid.UUID,
    template_id: uuid.UUID,
    request: TemplateCatalogEdit,
    session: DatabaseSession,
) -> TemplateCatalogEntry:
    return TemplateCatalogService(session).edit(project_id, template_id, request)


@router.get("/api/v1/projects/{project_id}/analytical-templates", response_model=TemplateList)
def list_templates(
    project_id: uuid.UUID, session: DatabaseSession, storage: Storage, settings: AppSettings
) -> TemplateList:
    return AnalyticalTemplateService(session, storage, settings).list(project_id)


@router.post("/api/v1/projects/{project_id}/analytical-templates", response_model=TemplateRead)
def capture_template(
    project_id: uuid.UUID,
    request: TemplateCapture,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> TemplateRead:
    return AnalyticalTemplateService(session, storage, settings).capture(project_id, request)


@router.post(
    "/api/v1/projects/{project_id}/analytical-templates/{template_id}/prepare",
    response_model=StatisticalSettings,
)
def prepare_template(
    project_id: uuid.UUID,
    template_id: uuid.UUID,
    request: TemplatePrepare,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> StatisticalSettings:
    return AnalyticalTemplateService(session, storage, settings).prepare(
        project_id, template_id, request
    )


@router.get("/api/v1/projects/{project_id}/report-templates", response_model=ReportTemplateList)
def list_report_templates(
    project_id: uuid.UUID, session: DatabaseSession, storage: Storage, settings: AppSettings
) -> ReportTemplateList:
    return ReportTemplateService(session, storage, settings).list(project_id)


@router.post("/api/v1/projects/{project_id}/report-templates", response_model=ReportTemplateRead)
def capture_report_template(
    project_id: uuid.UUID,
    request: TemplateCapture,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> ReportTemplateRead:
    return ReportTemplateService(session, storage, settings).capture(project_id, request)


@router.post(
    "/api/v1/projects/{project_id}/report-templates/{template_id}/prepare",
    response_model=ReportSettings,
)
def prepare_report_template(
    project_id: uuid.UUID,
    template_id: uuid.UUID,
    request: TemplatePrepare,
    session: DatabaseSession,
    storage: Storage,
    settings: AppSettings,
) -> ReportSettings:
    return ReportTemplateService(session, storage, settings).prepare(
        project_id, template_id, request
    )
