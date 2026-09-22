from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.errors import ApplicationError
from app.domain.visualizations import CHART_TYPES
from app.models import DashboardWidget, Visualization, Workflow
from app.schemas.workflows import WorkflowSave


def protect_used_visualizations(
    session: Session, workflow: Workflow, payload: WorkflowSave
) -> None:
    retained = [node.id for node in payload.nodes if node.type in CHART_TYPES]
    # Dashboard saves acquire shared locks on these same rows before attaching widgets.
    removed = list(
        session.scalars(
            select(Visualization.id)
            .where(
                Visualization.workflow_id == workflow.id,
                Visualization.publication_id.is_(None),
                Visualization.id.not_in(retained),
            )
            .order_by(Visualization.id)
            .with_for_update()
        )
    )
    used = session.scalar(
        select(DashboardWidget.visualization_id)
        .where(DashboardWidget.visualization_id.in_(removed))
        .limit(1)
    )
    if used is not None:
        raise ApplicationError(
            "VISUALIZATION_IN_USE",
            "Remove this visualization from dashboards before deleting its node.",
            409,
            node_id=str(used),
        )


def synchronize_visualizations(session: Session, workflow: Workflow, payload: WorkflowSave) -> None:
    existing = {
        row.id: row
        for row in session.scalars(
            select(Visualization).where(
                Visualization.workflow_id == workflow.id, Visualization.publication_id.is_(None)
            )
        )
    }
    charts = {node.id: node for node in payload.nodes if node.type in CHART_TYPES}
    for identity, existing_row in existing.items():
        if identity not in charts:
            session.delete(existing_row)
    for identity, node in charts.items():
        row = existing.get(identity)
        if row is None:
            row = Visualization(
                id=identity,
                project_id=workflow.project_id,
                workflow_id=workflow.id,
                source_node_id=identity,
            )
            session.add(row)
        row.type = node.type
        title = node.config.get("title")
        row.name = (
            title[:200]
            if isinstance(title, str) and title.strip()
            else node.type.replace("_", " ").title()
        )
        row.config = {}
    session.flush()
