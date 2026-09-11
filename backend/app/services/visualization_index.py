from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.visualizations import CHART_TYPES
from app.models import Visualization, Workflow
from app.schemas.workflows import WorkflowSave


def synchronize_visualizations(session: Session, workflow: Workflow, payload: WorkflowSave) -> None:
    existing = {
        row.id: row
        for row in session.scalars(
            select(Visualization).where(Visualization.workflow_id == workflow.id)
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
