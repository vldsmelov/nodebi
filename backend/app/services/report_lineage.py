"""Read-only, source-version-aware explanation of a visualization dependency branch."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.errors import ApplicationError
from app.models import DataSource, SourceVersion, Visualization, Workflow
from app.schemas.reporting import LineageRead, LineageSource
from app.services.independent_visualizations import publication
from app.services.workflows import read_workflow


def explain_visualization(identity: uuid.UUID, session: Session) -> LineageRead:
    visual = session.get(Visualization, identity)
    if visual is None:
        raise ApplicationError("VISUALIZATION_NOT_FOUND", "Visualization does not exist.", 404)
    workflow = session.get(Workflow, visual.workflow_id)
    assert workflow is not None
    saved = read_workflow(session, workflow)
    target = (
        publication(workflow, visual.publication_id).node_id
        if visual.publication_id
        else visual.source_node_id
    )
    assert target is not None
    selected = {target}
    pending = [target]
    while pending:
        current = pending.pop()
        for edge in saved.edges:
            if edge.target_node_id == current and edge.source_node_id not in selected:
                selected.add(edge.source_node_id)
                pending.append(edge.source_node_id)
    saved.nodes = [node for node in saved.nodes if node.id in selected]
    saved.edges = [
        edge
        for edge in saved.edges
        if edge.target_node_id in selected and edge.source_node_id in selected
    ]
    source_ids = {str(node.config.get("source_id")) for node in saved.nodes}
    sources = []
    for source in session.scalars(
        select(DataSource).where(DataSource.project_id == visual.project_id)
    ):
        if str(source.id) not in source_ids:
            continue
        periods = source.source_metadata.get("periods", [])
        keys = {member["storage_key"] for member in periods} or {source.storage_key}
        versions = session.scalars(
            select(SourceVersion).where(
                SourceVersion.source_id == source.id, SourceVersion.storage_key.in_(keys)
            )
        ).all()
        sources.append(
            LineageSource(
                source_id=source.id,
                name=source.name,
                files=[
                    f"{version.filename} ({version.created_at.isoformat()})" for version in versions
                ]
                or [source.original_filename],
                periods=[member["period"] for member in periods],
            )
        )
    return LineageRead(workflow=saved, target_node_id=target, sources=sources)
