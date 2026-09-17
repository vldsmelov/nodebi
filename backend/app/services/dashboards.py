import uuid

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.domain.dashboards import DashboardConfiguration
from app.domain.errors import ApplicationError
from app.domain.visualizations import CHART_TYPES
from app.models import Dashboard, DashboardWidget, Project, Visualization
from app.schemas.dashboards import (
    DashboardRead,
    DashboardSave,
    VisualizationRead,
    WidgetConfig,
    WidgetPayload,
)
from app.services.dashboard_configuration import validate_configuration


class DashboardService:
    def __init__(self, session: Session):
        self.session = session

    def project(self, project_id: uuid.UUID) -> Project:
        project = self.session.get(Project, project_id)
        if project is None:
            raise ApplicationError("PROJECT_NOT_FOUND", "Project does not exist.", 404)
        return project

    def get(self, identity: uuid.UUID, *, lock: bool = False) -> Dashboard:
        query = select(Dashboard).where(Dashboard.id == identity)
        if lock:
            query = query.with_for_update()
        row = self.session.scalar(query.execution_options(populate_existing=True))
        if row is None:
            raise ApplicationError("DASHBOARD_NOT_FOUND", "Dashboard does not exist.", 404)
        return row

    def read(self, identity: uuid.UUID) -> DashboardRead:
        row = self.get(identity, lock=True)
        widgets = self.session.scalars(
            select(DashboardWidget)
            .where(DashboardWidget.dashboard_id == row.id)
            .order_by(DashboardWidget.id)
        )
        return DashboardRead(
            configuration=DashboardConfiguration.model_validate(row.configuration),
            id=row.id,
            project_id=row.project_id,
            name=row.name,
            revision=row.revision,
            widgets=[
                WidgetPayload(
                    id=w.id,
                    visualization_id=w.visualization_id,
                    title=w.title,
                    config=WidgetConfig.model_validate(w.config),
                    x=w.position_x,
                    y=w.position_y,
                    width=w.width,
                    height=w.height,
                )
                for w in widgets
            ],
        )

    def create(self, project_id: uuid.UUID, name: str) -> DashboardRead:
        self.project(project_id)
        row = Dashboard(project_id=project_id, name=name)
        self.session.add(row)
        self.session.flush()
        result = self.read(row.id)
        self.session.commit()
        return result

    def save(
        self, identity: uuid.UUID, payload: DashboardSave, *, commit: bool = True
    ) -> DashboardRead:
        row = self.get(identity, lock=True)
        if row.revision != payload.expected_revision:
            raise ApplicationError(
                "DASHBOARD_CONFLICT", "Dashboard changed elsewhere. Reload before saving.", 409
            )
        config = payload.configuration or DashboardConfiguration.model_validate(row.configuration)
        validate_configuration(self.session, row, config, payload.widgets)
        ids = [w.id for w in payload.widgets]
        if len(set(ids)) != len(ids):
            raise ApplicationError("DUPLICATE_WIDGET_ID", "Widget IDs must be unique.")
        foreign = self.session.scalar(
            select(DashboardWidget.id).where(
                DashboardWidget.id.in_(ids), DashboardWidget.dashboard_id != identity
            )
        )
        if foreign:
            raise ApplicationError("FOREIGN_WIDGET_ID", "Widget belongs to another dashboard.")
        visuals = {w.visualization_id for w in payload.widgets}
        available = set(
            self.session.scalars(
                select(Visualization.id)
                .where(Visualization.id.in_(visuals), Visualization.project_id == row.project_id)
                .with_for_update(read=True)
            )
        )
        if visuals != available:
            raise ApplicationError(
                "INVALID_VISUALIZATION",
                "A selected visualization is missing or belongs to another project.",
            )
        self.session.execute(
            update(Dashboard)
            .where(Dashboard.id == identity)
            .values(
                name=payload.name,
                revision=Dashboard.revision + 1,
                configuration=config.model_dump(mode="json"),
            )
        )
        self.session.execute(
            delete(DashboardWidget).where(DashboardWidget.dashboard_id == identity)
        )
        self.session.add_all(
            [
                DashboardWidget(
                    id=w.id,
                    dashboard_id=identity,
                    visualization_id=w.visualization_id,
                    position_x=w.x,
                    position_y=w.y,
                    width=w.width,
                    height=w.height,
                    title=w.title,
                    config=w.config.model_dump(mode="json"),
                )
                for w in payload.widgets
            ]
        )
        self.session.flush()
        result = self.read(identity)
        if commit:
            self.session.commit()
        return result

    def delete(self, identity: uuid.UUID) -> None:
        self.session.delete(self.get(identity, lock=True))
        self.session.commit()

    def visualizations(self, project_id: uuid.UUID) -> list[VisualizationRead]:
        self.project(project_id)
        return [
            VisualizationRead(
                id=row.id,
                workflow_id=row.workflow_id,
                node_id=row.source_node_id,
                name=row.name,
                type=row.type,
            )
            for row in self.session.scalars(
                select(Visualization).where(
                    Visualization.project_id == project_id,
                    Visualization.source_node_id.is_not(None),
                )
            )
            if row.source_node_id is not None and row.type in CHART_TYPES
        ]
