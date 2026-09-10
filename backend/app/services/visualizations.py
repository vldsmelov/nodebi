import uuid
from typing import Literal, cast

from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.nodes import NodeRegistry
from app.infrastructure.storage import StorageProvider
from app.models import Visualization, Workflow
from app.nodes.visualization import VisualizationConfig
from app.schemas.dashboards import VisualizationResult
from app.schemas.workflows import ResolvedColumnRead
from app.services.execution import (
    ExecutionFailure,
    InMemoryExecutionCache,
    WorkflowExecutionService,
)
from app.services.workflows import domain_graph, execution_context


def render_visualization(
    session: Session,
    visualization_id: uuid.UUID,
    registry: NodeRegistry,
    storage: StorageProvider,
    settings: Settings,
    cache: InMemoryExecutionCache,
) -> VisualizationResult:
    visualization = session.get(Visualization, visualization_id)
    if visualization is None:
        raise ApplicationError("VISUALIZATION_NOT_FOUND", "Visualization does not exist.", 404)
    workflow = session.get(Workflow, visualization.workflow_id)
    if workflow is None or workflow.project_id != visualization.project_id:
        raise ApplicationError(
            "VISUALIZATION_NOT_FOUND", "Visualization workflow is unavailable.", 404
        )
    graph = domain_graph(session, workflow)
    node = next((n for n in graph.nodes if n.id == visualization.source_node_id), None)
    if node is None or node.type not in {"bar_chart", "kpi"}:
        raise ApplicationError("VISUALIZATION_NOT_FOUND", "Visualization node is unavailable.", 404)
    context = execution_context(workflow, session, storage, settings, cache)
    try:
        result = WorkflowExecutionService(registry).execute(graph, node.id, context)
    except ExecutionFailure as exc:
        raise ApplicationError(
            exc.code, exc.message, node_id=str(exc.node_id), execution_id=str(exc.execution_id)
        ) from exc
    config = VisualizationConfig.model_validate(node.config)
    fields = [result.schema.by_id(config.value_column_id)]
    if config.category_column_id and config.category_column_id != config.value_column_id:
        fields.insert(0, result.schema.by_id(config.category_column_id))
    return VisualizationResult(
        visualization_id=visualization_id,
        revision=workflow.revision,
        type=cast(Literal["bar_chart", "kpi"], node.type),
        title=config.title,
        value_field=result.schema.by_id(config.value_column_id).engine_name,
        category_field=result.schema.by_id(config.category_column_id).engine_name
        if config.category_column_id
        else None,
        number_format=config.number_format,
        decimals=config.decimals,
        currency=config.currency,
        columns=[ResolvedColumnRead(**c.to_dict()) for c in fields],
        rows=result.output.frame.select([c.engine_name for c in fields]).to_dicts(),
    )
