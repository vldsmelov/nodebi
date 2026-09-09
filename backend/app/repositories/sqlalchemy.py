import uuid
from collections.abc import Sequence

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import (
    Dashboard,
    DataSource,
    Project,
    Visualization,
    Workflow,
    WorkflowEdge,
    WorkflowNode,
)


class SqlAlchemyProjectRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, project: Project) -> Project:
        self.session.add(project)
        self.session.flush()
        return project

    def get(self, project_id: uuid.UUID) -> Project | None:
        return self.session.get(Project, project_id)

    def list(self) -> Sequence[Project]:
        return self.session.scalars(select(Project).order_by(Project.created_at)).all()

    def delete(self, project: Project) -> None:
        self.session.delete(project)


class SqlAlchemySourceRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, source: DataSource) -> DataSource:
        self.session.add(source)
        self.session.flush()
        return source

    def get(self, source_id: uuid.UUID) -> DataSource | None:
        return self.session.get(DataSource, source_id)

    def list_for_project(self, project_id: uuid.UUID) -> Sequence[DataSource]:
        return self.session.scalars(
            select(DataSource)
            .where(DataSource.project_id == project_id)
            .order_by(DataSource.created_at)
        ).all()

    def delete(self, source: DataSource) -> None:
        self.session.delete(source)


class SqlAlchemyWorkflowRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, workflow: Workflow) -> Workflow:
        self.session.add(workflow)
        self.session.flush()
        return workflow

    def get(self, workflow_id: uuid.UUID) -> Workflow | None:
        return self.session.get(Workflow, workflow_id)

    def list_for_project(self, project_id: uuid.UUID) -> Sequence[Workflow]:
        return self.session.scalars(
            select(Workflow).where(Workflow.project_id == project_id).order_by(Workflow.created_at)
        ).all()

    def delete(self, workflow: Workflow) -> None:
        self.session.delete(workflow)

    def save_graph(
        self,
        workflow: Workflow,
        nodes: Sequence[WorkflowNode],
        edges: Sequence[WorkflowEdge],
    ) -> None:
        """Synchronize a graph inside the caller's transaction and flush as one unit."""
        node_ids = [node.id for node in nodes]
        edge_ids = [edge.id for edge in edges]
        edge_delete = delete(WorkflowEdge).where(WorkflowEdge.workflow_id == workflow.id)
        if edge_ids:
            edge_delete = edge_delete.where(WorkflowEdge.id.not_in(edge_ids))
        self.session.execute(edge_delete)
        node_delete = delete(WorkflowNode).where(WorkflowNode.workflow_id == workflow.id)
        if node_ids:
            node_delete = node_delete.where(WorkflowNode.id.not_in(node_ids))
        self.session.execute(node_delete)
        workflow.version += 1
        for node in nodes:
            self.session.merge(node)
        self.session.flush()
        for edge in edges:
            self.session.merge(edge)
        self.session.flush()


class SqlAlchemyVisualizationRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, visualization: Visualization) -> Visualization:
        self.session.add(visualization)
        self.session.flush()
        return visualization

    def get(self, visualization_id: uuid.UUID) -> Visualization | None:
        return self.session.get(Visualization, visualization_id)

    def list_for_project(self, project_id: uuid.UUID) -> Sequence[Visualization]:
        return self.session.scalars(
            select(Visualization)
            .where(Visualization.project_id == project_id)
            .order_by(Visualization.created_at)
        ).all()

    def delete(self, visualization: Visualization) -> None:
        self.session.delete(visualization)


class SqlAlchemyDashboardRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, dashboard: Dashboard) -> Dashboard:
        self.session.add(dashboard)
        self.session.flush()
        return dashboard

    def get(self, dashboard_id: uuid.UUID) -> Dashboard | None:
        return self.session.get(Dashboard, dashboard_id)

    def list_for_project(self, project_id: uuid.UUID) -> Sequence[Dashboard]:
        return self.session.scalars(
            select(Dashboard)
            .where(Dashboard.project_id == project_id)
            .order_by(Dashboard.created_at)
        ).all()

    def delete(self, dashboard: Dashboard) -> None:
        self.session.delete(dashboard)
