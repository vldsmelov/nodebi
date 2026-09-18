import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.domain.nodes import NodeRegistry
from app.infrastructure.database import get_session
from app.infrastructure.storage import StorageProvider, get_storage_provider
from app.models import Dashboard
from app.nodes import get_node_registry
from app.schemas.dashboards import (
    DashboardList,
    DashboardNavigationSave,
    DashboardRead,
    DashboardSave,
    DashboardVisualizationCreate,
    VisualizationList,
    VisualizationRequest,
    VisualizationResult,
)
from app.schemas.workflows import WorkflowCreate
from app.services.dashboard_authoring import create_visualization
from app.services.dashboard_navigation import save_navigation
from app.services.dashboards import DashboardService
from app.services.execution import (
    InMemoryExecutionCache,
    get_execution_cache,
)
from app.services.visualizations import render_visualization

router = APIRouter(tags=["dashboards"])
Database = Annotated[Session, Depends(get_session)]


@router.get("/api/v1/projects/{project_id}/visualizations", response_model=VisualizationList)
def list_visualizations(project_id: uuid.UUID, session: Database) -> VisualizationList:
    return VisualizationList(items=DashboardService(session).visualizations(project_id))


@router.get("/api/v1/visualizations/{visualization_id}/result", response_model=VisualizationResult)
def visualization_result(
    visualization_id: uuid.UUID,
    session: Database,
    registry: Annotated[NodeRegistry, Depends(get_node_registry)],
    storage: Annotated[StorageProvider, Depends(get_storage_provider)],
    settings: Annotated[Settings, Depends(get_settings)],
    cache: Annotated[InMemoryExecutionCache, Depends(get_execution_cache)],
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
) -> VisualizationResult:
    return render_visualization(
        session, visualization_id, registry, storage, settings, cache, offset, limit
    )


@router.post("/api/v1/visualizations/{visualization_id}/result", response_model=VisualizationResult)
def parameterized_visualization_result(
    visualization_id: uuid.UUID,
    payload: VisualizationRequest,
    session: Database,
    registry: Annotated[NodeRegistry, Depends(get_node_registry)],
    storage: Annotated[StorageProvider, Depends(get_storage_provider)],
    settings: Annotated[Settings, Depends(get_settings)],
    cache: Annotated[InMemoryExecutionCache, Depends(get_execution_cache)],
) -> VisualizationResult:
    return render_visualization(
        session,
        visualization_id,
        registry,
        storage,
        settings,
        cache,
        payload.offset,
        payload.limit,
        payload.parameters,
    )


@router.get("/api/v1/projects/{project_id}/dashboards", response_model=DashboardList)
def list_dashboards(project_id: uuid.UUID, session: Database) -> DashboardList:
    service = DashboardService(session)
    service.project(project_id)
    ids = session.scalars(
        select(Dashboard.id).where(Dashboard.project_id == project_id).order_by(Dashboard.id)
    ).all()
    return DashboardList(items=[service.read(identity) for identity in ids])


@router.post(
    "/api/v1/projects/{project_id}/dashboards", response_model=DashboardRead, status_code=201
)
def create_dashboard(
    project_id: uuid.UUID, payload: WorkflowCreate, session: Database
) -> DashboardRead:
    return DashboardService(session).create(project_id, payload.name)


@router.get("/api/v1/dashboards/{dashboard_id}", response_model=DashboardRead)
def get_dashboard(dashboard_id: uuid.UUID, session: Database) -> DashboardRead:
    return DashboardService(session).read(dashboard_id)


@router.put("/api/v1/dashboards/{dashboard_id}", response_model=DashboardRead)
def save_dashboard(
    dashboard_id: uuid.UUID, payload: DashboardSave, session: Database
) -> DashboardRead:
    return DashboardService(session).save(dashboard_id, payload)


@router.delete("/api/v1/dashboards/{dashboard_id}", status_code=204)
def delete_dashboard(dashboard_id: uuid.UUID, session: Database) -> Response:
    DashboardService(session).delete(dashboard_id)
    return Response(status_code=204)


@router.post(
    "/api/v1/dashboards/{dashboard_id}/visualizations",
    response_model=DashboardRead,
    status_code=201,
)
def author_visualization(
    dashboard_id: uuid.UUID,
    payload: DashboardVisualizationCreate,
    session: Database,
    registry: Annotated[NodeRegistry, Depends(get_node_registry)],
) -> DashboardRead:
    return create_visualization(session, dashboard_id, payload, registry)


@router.post("/api/v1/dashboards/{dashboard_id}/navigation", response_model=DashboardRead)
def author_navigation(
    dashboard_id: uuid.UUID,
    payload: DashboardNavigationSave,
    session: Database,
    registry: Annotated[NodeRegistry, Depends(get_node_registry)],
    storage: Annotated[StorageProvider, Depends(get_storage_provider)],
    settings: Annotated[Settings, Depends(get_settings)],
    cache: Annotated[InMemoryExecutionCache, Depends(get_execution_cache)],
) -> DashboardRead:
    return save_navigation(session, dashboard_id, payload, registry, storage, settings, cache)
