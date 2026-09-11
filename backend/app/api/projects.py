import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.infrastructure.database import get_session
from app.infrastructure.storage import StorageProvider, get_storage_provider
from app.models import Project
from app.schemas.projects import ProjectCreate, ProjectList, ProjectRead, ProjectUpdate
from app.services.projects import ProjectService
from app.services.sources import SourceService

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])
DatabaseSession = Annotated[Session, Depends(get_session)]


@router.get("", response_model=ProjectList)
def list_projects(session: DatabaseSession) -> ProjectList:
    projects = ProjectService(session).list()
    return ProjectList(items=[ProjectRead.model_validate(item) for item in projects])


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, session: DatabaseSession) -> Project:
    return ProjectService(session).create(payload.name)


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: uuid.UUID, session: DatabaseSession) -> Project:
    return ProjectService(session).get(project_id)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: uuid.UUID, payload: ProjectUpdate, session: DatabaseSession
) -> Project:
    return ProjectService(session).rename(project_id, payload.name)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: uuid.UUID,
    session: DatabaseSession,
    storage: Annotated[StorageProvider, Depends(get_storage_provider)],
    confirm: Annotated[bool, Query(description="Explicit destructive-action confirmation")] = False,
) -> Response:
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "DELETION_CONFIRMATION_REQUIRED",
                "message": "Confirm project deletion with confirm=true.",
            },
        )
    project = ProjectService(session).get(project_id)
    SourceService(session, storage).delete_project(project)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
