import uuid
from collections.abc import Sequence

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.domain.errors import GraphOwnershipError, WorkflowConflictError
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
        expected_revision: int | None = None,
    ) -> None:
        """Synchronize a graph inside the caller's transaction and flush as one unit."""
        node_ids = [node.id for node in nodes]
        edge_ids = [edge.id for edge in edges]
        # Do not autoflush a caller's renamed workflow before ownership is checked.
        with self.session.no_autoflush:
            existing_nodes = {
                node.id: node
                for node in self.session.scalars(
                    select(WorkflowNode).where(WorkflowNode.id.in_(node_ids))
                )
            }
            existing_edges = {
                edge.id: edge
                for edge in self.session.scalars(
                    select(WorkflowEdge).where(WorkflowEdge.id.in_(edge_ids))
                )
            }
        ownership_records: list[WorkflowNode | WorkflowEdge] = [
            *nodes,
            *edges,
            *existing_nodes.values(),
            *existing_edges.values(),
        ]
        if any(item.workflow_id != workflow.id for item in ownership_records):
            raise GraphOwnershipError("Node and edge IDs must belong to this workflow.")
        # Serialize graph replacement at the database boundary. A stale request
        # must not delete or change any graph rows, even from another process.
        expected = workflow.revision if expected_revision is None else expected_revision
        with self.session.no_autoflush:
            accepted = self.session.execute(
                update(Workflow)
                .where(Workflow.id == workflow.id, Workflow.revision == expected)
                .values(revision=Workflow.revision + 1)
                .returning(Workflow.revision)
                .execution_options(synchronize_session=False)
            ).scalar_one_or_none()
        if accepted is None:
            raise WorkflowConflictError(
                "This workflow was changed elsewhere. Reload before saving."
            )
        self.session.expire(workflow, ["revision"])
        # Recreate owned edges before removing nodes: an existing edge may be
        # rewired away from a deleted endpoint in this same graph replacement.
        self.session.execute(delete(WorkflowEdge).where(WorkflowEdge.workflow_id == workflow.id))
        node_delete = delete(WorkflowNode).where(WorkflowNode.workflow_id == workflow.id)
        if node_ids:
            node_delete = node_delete.where(WorkflowNode.id.not_in(node_ids))
        self.session.execute(node_delete)
        for node in nodes:
            existing = existing_nodes.get(node.id)
            if existing is None:
                self.session.add(node)
            else:
                for attribute in (
                    "node_type",
                    "node_version",
                    "position_x",
                    "position_y",
                    "config",
                    "ui_state",
                ):
                    setattr(existing, attribute, getattr(node, attribute))
        self.session.flush()
        for edge in edges:
            self.session.add(edge)
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
