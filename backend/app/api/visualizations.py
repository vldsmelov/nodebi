import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.workflows import AppSettings, ExecutionCache, Registry, Storage
from app.infrastructure.database import get_session
from app.schemas.dashboards import (
    IndependentVisualizationPreview,
    IndependentVisualizationSave,
    PublicationSchema,
    VisualizationRead,
    VisualizationResult,
)
from app.schemas.workflows import WorkflowRead
from app.services.independent_visualizations import (
    IndependentVisualizationService,
    published_schema,
    read_visualization,
)
from app.services.visualization_conversion import ConversionRequest, convert_visualizations
from app.services.visualizations import render_visualization

router = APIRouter(tags=["visualizations"])
Database = Annotated[Session, Depends(get_session)]


class VisualizationUse(BaseModel):
    dashboard_id: str
    name: str
    widget_id: str


@router.post("/api/v1/workflows/{workflow_id}/convert-visualizations", response_model=WorkflowRead)
def convert_workflow_visualizations(
    workflow_id: uuid.UUID,
    payload: ConversionRequest,
    session: Database,
    registry: Registry,
    storage: Storage,
    settings: AppSettings,
    cache: ExecutionCache,
) -> WorkflowRead:
    return convert_visualizations(session, workflow_id, payload, registry, storage, settings, cache)


@router.get(
    "/api/v1/workflows/{workflow_id}/publications/{publication_id}/schema",
    response_model=PublicationSchema,
)
def publication_schema(
    workflow_id: uuid.UUID,
    publication_id: uuid.UUID,
    session: Database,
    registry: Registry,
    storage: Storage,
    settings: AppSettings,
    cache: ExecutionCache,
) -> PublicationSchema:
    return published_schema(
        session, workflow_id, publication_id, registry, storage, settings, cache
    )


@router.get("/api/v1/visualizations/{identity}", response_model=VisualizationRead)
def get_visualization(identity: uuid.UUID, session: Database) -> VisualizationRead:
    return read_visualization(IndependentVisualizationService(session).get(identity))


@router.post(
    "/api/v1/projects/{project_id}/visualizations",
    response_model=VisualizationRead,
    status_code=201,
)
def create_visualization(
    project_id: uuid.UUID, payload: IndependentVisualizationSave, session: Database
) -> VisualizationRead:
    return IndependentVisualizationService(session).save(project_id, payload)


@router.put("/api/v1/visualizations/{identity}", response_model=VisualizationRead)
def save_visualization(
    identity: uuid.UUID, payload: IndependentVisualizationSave, session: Database
) -> VisualizationRead:
    service = IndependentVisualizationService(session)
    return service.save(service.get(identity).project_id, payload, identity)


@router.post(
    "/api/v1/visualizations/{identity}/copy", response_model=VisualizationRead, status_code=201
)
def copy_visualization(
    identity: uuid.UUID, payload: IndependentVisualizationSave, session: Database
) -> VisualizationRead:
    service = IndependentVisualizationService(session)
    row = service.get(identity)
    return service.save(row.project_id, payload, copy_from=identity)


@router.post(
    "/api/v1/projects/{project_id}/visualizations/preview", response_model=VisualizationResult
)
def preview_visualization(
    project_id: uuid.UUID,
    payload: IndependentVisualizationPreview,
    session: Database,
    registry: Registry,
    storage: Storage,
    settings: AppSettings,
    cache: ExecutionCache,
) -> VisualizationResult:
    draft = IndependentVisualizationService(session).draft(project_id, payload)
    return render_visualization(
        session,
        draft.id,
        registry,
        storage,
        settings,
        cache,
        parameters=payload.parameters,
        view=payload.context,
        draft=draft,
    )


@router.get("/api/v1/visualizations/{identity}/uses", response_model=list[VisualizationUse])
def visualization_uses(identity: uuid.UUID, session: Database) -> list[dict[str, str]]:
    return IndependentVisualizationService(session).uses(identity)


@router.delete("/api/v1/visualizations/{identity}", status_code=204)
def delete_visualization(
    identity: uuid.UUID, session: Database, expected_revision: Annotated[int, Query(ge=1)]
) -> Response:
    IndependentVisualizationService(session).delete(identity, expected_revision)
    return Response(status_code=204)
