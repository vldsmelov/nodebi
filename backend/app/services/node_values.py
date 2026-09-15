import uuid
from datetime import date, datetime

import polars as pl
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.nodes import NodeRegistry
from app.infrastructure.storage import StorageProvider
from app.schemas.workflows import NodeValuesRead, NodeValuesRequest, ResolvedColumnRead
from app.services.execution import (
    ExecutionFailure,
    InMemoryExecutionCache,
    WorkflowExecutionService,
)
from app.services.workflows import domain_graph, execution_context, get_workflow


def node_values(
    session: Session,
    workflow_id: uuid.UUID,
    node_id: uuid.UUID,
    request: NodeValuesRequest,
    registry: NodeRegistry,
    storage: StorageProvider,
    settings: Settings,
    cache: InMemoryExecutionCache,
) -> NodeValuesRead:
    workflow = get_workflow(session, workflow_id)
    graph = domain_graph(session, workflow)
    context = execution_context(workflow, session, storage, settings, cache, request.parameters)
    try:
        result = WorkflowExecutionService(registry).execute(graph, node_id, context)
    except ExecutionFailure as exc:
        raise ApplicationError(
            exc.code, exc.message, node_id=str(exc.node_id), execution_id=str(exc.execution_id)
        ) from exc
    try:
        column = result.schema.by_id(request.column_id)
    except StopIteration as exc:
        raise ApplicationError(
            "INVALID_PARAMETER_OPTIONS",
            "The parameter options field is unavailable.",
            node_id=str(node_id),
        ) from exc
    series = result.output.frame[column.engine_name].drop_nulls().unique().sort()
    if series.dtype.is_float() and not series.is_finite().all():
        raise ApplicationError(
            "INVALID_PARAMETER_OPTIONS",
            "Parameter choices must contain finite values.",
            node_id=str(node_id),
        )
    if request.search:
        frame = series.to_frame()
        series = frame.filter(
            pl.col(column.engine_name)
            .cast(pl.String)
            .str.to_lowercase()
            .str.contains(request.search.lower(), literal=True)
        )[column.engine_name]
    values = [
        value.isoformat() if isinstance(value, (date, datetime)) else value
        for value in series.head(request.limit).to_list()
    ]
    return NodeValuesRead(
        revision=workflow.revision,
        column=ResolvedColumnRead(**column.to_dict()),
        values=values,
        truncated=len(series) > request.limit,
    )
