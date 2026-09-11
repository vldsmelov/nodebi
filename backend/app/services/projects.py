import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.errors import ApplicationError
from app.models import Project
from app.repositories.sqlalchemy import SqlAlchemyProjectRepository


class ProjectService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = SqlAlchemyProjectRepository(session)

    def list(self) -> list[Project]:
        return list(self.repository.list())

    def get(self, project_id: uuid.UUID) -> Project:
        project = self.repository.get(project_id)
        if project is None:
            raise ApplicationError("PROJECT_NOT_FOUND", "Project does not exist.", 404)
        return project

    def lock(self, project_id: uuid.UUID) -> Project:
        project = self.session.scalar(
            select(Project).where(Project.id == project_id).with_for_update()
        )
        if project is None:
            raise ApplicationError("PROJECT_NOT_FOUND", "Project does not exist.", 404)
        return project

    def create(self, name: str) -> Project:
        project = self.repository.add(Project(name=name))
        self.session.commit()
        self.session.refresh(project)
        return project

    def rename(self, project_id: uuid.UUID, name: str) -> Project:
        project = self.get(project_id)
        project.name = name
        self.session.commit()
        self.session.refresh(project)
        return project
