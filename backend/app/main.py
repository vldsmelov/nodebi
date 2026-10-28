from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.alignment_reports import router as alignment_reports_router
from app.api.analytical_templates import router as analytical_templates_router
from app.api.dashboards import router as dashboards_router
from app.api.errors import register_error_handlers
from app.api.health import router as health_router
from app.api.ingestion import router as ingestion_router
from app.api.measures import router as measures_router
from app.api.projects import router as projects_router
from app.api.report_builder import router as report_builder_router
from app.api.reporting import router as reporting_router
from app.api.sources import router as sources_router
from app.api.statistical_reports import router as statistical_reports_router
from app.api.visualizations import router as visualizations_router
from app.api.workflows import router as workflows_router
from app.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(title=settings.app_name, version="0.1.0")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_error_handlers(application, settings.cors_origins)
    application.include_router(health_router)
    application.include_router(projects_router)
    application.include_router(sources_router)
    application.include_router(ingestion_router)
    application.include_router(workflows_router)
    application.include_router(dashboards_router)
    application.include_router(visualizations_router)
    application.include_router(reporting_router)
    application.include_router(report_builder_router)
    application.include_router(measures_router)
    application.include_router(alignment_reports_router)
    application.include_router(statistical_reports_router)
    application.include_router(analytical_templates_router)
    return application


app = create_app()
