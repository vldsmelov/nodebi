import uuid

from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.nodes import NodeRegistry
from app.domain.visualizations import CHART_TYPES, VisualizationConfig
from app.infrastructure.storage import StorageProvider
from app.models import Visualization, Workflow
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
    offset: int = 0,
    limit: int = 100,
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
    if node is None or node.type not in CHART_TYPES:
        raise ApplicationError("VISUALIZATION_NOT_FOUND", "Visualization node is unavailable.", 404)
    context = execution_context(workflow, session, storage, settings, cache)
    try:
        result = WorkflowExecutionService(registry).execute(graph, node.id, context)
    except ExecutionFailure as exc:
        raise ApplicationError(
            exc.code,
            exc.issues[0].message if exc.issues else exc.message,
            node_id=str(exc.node_id),
            execution_id=str(exc.execution_id),
            issues=[
                {
                    "code": i.code,
                    "message": i.message,
                    "field": i.field,
                    "node_id": str(i.node_id) if i.node_id else None,
                }
                for i in exc.issues
            ],
        ) from exc
    config = VisualizationConfig.model_validate(node.config)
    fields = (
        list(result.schema.columns)
        if node.type == "table"
        else [result.schema.by_id(config.value_column_id)]
        if config.value_column_id
        else []
    )
    if (
        node.type not in {"table", "kpi"}
        and config.category_column_id
        and config.category_column_id != config.value_column_id
    ):
        fields.insert(0, result.schema.by_id(config.category_column_id))
    page = result.output.frame.select([c.engine_name for c in fields])
    if node.type == "table":
        page = page.slice(offset, limit)
    else:
        offset, limit = 0, result.output.row_count
    return VisualizationResult(
        column_formats=config.column_formats,
        orientation=config.orientation,
        visualization_id=visualization_id,
        revision=workflow.revision,
        type=node.type,
        title=config.title,
        value_field=result.schema.by_id(config.value_column_id).engine_name
        if node.type != "table" and config.value_column_id
        else None,
        category_field=result.schema.by_id(config.category_column_id).engine_name
        if node.type not in {"table", "kpi"} and config.category_column_id
        else None,
        number_format=config.number_format,
        decimals=config.decimals,
        currency=config.currency,
        show_legend=config.show_legend,
        show_labels=config.show_labels,
        total_rows=result.output.row_count,
        offset=offset,
        limit=limit,
        truncated=offset + page.height < result.output.row_count,
        columns=[ResolvedColumnRead(**c.to_dict()) for c in fields],
        rows=page.to_dicts(),
    )
