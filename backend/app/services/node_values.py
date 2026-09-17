import uuid
from datetime import date, datetime
from typing import Any

import polars as pl
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.nodes import NodeRegistry
from app.domain.parameters import ParameterDefinition
from app.infrastructure.storage import StorageProvider
from app.schemas.workflows import (
    NodeValueChoice,
    NodeValuesRead,
    NodeValuesRequest,
    ResolvedColumnRead,
)
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
        label = result.schema.by_id(request.label_column_id) if request.label_column_id else None
    except StopIteration as exc:
        raise ApplicationError(
            "INVALID_PARAMETER_OPTIONS",
            "The parameter options field is unavailable.",
            node_id=str(node_id),
        ) from exc
    frame = (
        result.output.frame.select(
            pl.col(column.engine_name).alias("value"),
            pl.col(label.engine_name if label else column.engine_name).alias("label"),
        )
        .drop_nulls("value")
        .unique()
        .sort("value")
    )
    if any(
        frame[name].dtype.is_float() and not frame[name].drop_nulls().is_finite().all()
        for name in ("value", "label")
    ):
        raise ApplicationError(
            "INVALID_PARAMETER_OPTIONS",
            "Parameter choices must contain finite values.",
            node_id=str(node_id),
        )
    if frame["value"].n_unique() != frame.height:
        raise ApplicationError(
            "AMBIGUOUS_PARAMETER_LABEL",
            "Each parameter value must have one label. "
            "Choose another label field or prepare a unique mapping.",
            node_id=str(node_id),
        )

    def choice(row: dict[str, Any]) -> NodeValueChoice:
        return NodeValueChoice(
            **{
                key: value.isoformat() if isinstance(value, (date, datetime)) else value
                for key, value in row.items()
            }
        )

    selected = None
    if request.selected_value is not None:
        try:
            checked = ParameterDefinition(
                name="selected", logical_type=column.logical_type.value
            ).checked(request.selected_value)
        except ValueError as exc:
            raise ApplicationError(
                "INVALID_PARAMETER_OPTIONS", str(exc), node_id=str(node_id)
            ) from exc
        selected_value = (
            date.fromisoformat(str(checked))
            if column.logical_type.value == "date"
            else datetime.fromisoformat(str(checked))
            if column.logical_type.value == "datetime"
            else checked
        )
        selected_frame = frame.filter(
            pl.col("value") == pl.lit(selected_value, dtype=frame.schema["value"])
        )
        if selected_frame.height:
            selected = choice(selected_frame.row(0, named=True))
    if request.search:
        matches = [
            pl.col(name)
            .cast(pl.String)
            .str.to_lowercase()
            .str.contains(request.search.lower(), literal=True)
            .fill_null(False)
            for name in ("value", "label")
        ]
        frame = frame.filter(matches[0] | matches[1])
    choices = [choice(row) for row in frame.head(request.limit).iter_rows(named=True)]
    return NodeValuesRead(
        revision=workflow.revision,
        column=ResolvedColumnRead(**column.to_dict()),
        label_column=ResolvedColumnRead(**label.to_dict()) if label else None,
        values=[item.value for item in choices],
        choices=choices,
        selected=selected,
        truncated=frame.height > request.limit,
    )
