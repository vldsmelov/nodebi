import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.infrastructure.database import get_session
from app.models import Project
from app.repositories.sqlalchemy import SqlAlchemyProjectRepository
from app.schemas.projects import ProjectCreate, ProjectList, ProjectRead, ProjectUpdate

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])
DatabaseSession = Annotated[Session, Depends(get_session)]


def project_or_404(repository: SqlAlchemyProjectRepository, project_id: uuid.UUID) -> Project:
    project = repository.get(project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROJECT_NOT_FOUND", "message": "Project does not exist."},
        )
    return project


@router.get("", response_model=ProjectList)
def list_projects(session: DatabaseSession) -> ProjectList:
    projects = SqlAlchemyProjectRepository(session).list()
    return ProjectList(items=[ProjectRead.model_validate(item) for item in projects])


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, session: DatabaseSession) -> Project:
    repository = SqlAlchemyProjectRepository(session)
    project = repository.add(Project(name=payload.name))
    session.commit()
    session.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: uuid.UUID, session: DatabaseSession) -> Project:
    return project_or_404(SqlAlchemyProjectRepository(session), project_id)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: uuid.UUID, payload: ProjectUpdate, session: DatabaseSession
) -> Project:
    repository = SqlAlchemyProjectRepository(session)
    project = project_or_404(repository, project_id)
    project.name = payload.name
    session.commit()
    session.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: uuid.UUID,
    session: DatabaseSession,
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
    repository = SqlAlchemyProjectRepository(session)
    project = project_or_404(repository, project_id)
    repository.delete(project)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
