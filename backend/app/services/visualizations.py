import uuid
from dataclasses import replace

from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.nodes import NodeRegistry
from app.domain.parameters import ParameterValue
from app.domain.publications import ResultCatalog, ViewContext
from app.domain.visualizations import (
    CHART_TYPES,
    TITLE_PARAMETER,
    VisualizationConfig,
    effective_visualization_config,
)
from app.domain.workflows import NodeInstance, Position
from app.infrastructure.storage import StorageProvider
from app.models import Visualization, Workflow
from app.nodes.visualization import VisualizationExecutor
from app.schemas.dashboards import VisualizationResult
from app.schemas.workflows import ResolvedColumnRead
from app.services.execution import (
    ExecutionFailure,
    InMemoryExecutionCache,
    WorkflowExecutionService,
)
from app.services.independent_visualizations import publication
from app.services.publication_execution import compile_publication
from app.services.source_access import ProjectSourceAccess
from app.services.workflow_validation import InvalidWorkflowError
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
    parameters: dict[str, ParameterValue] | None = None,
    view: ViewContext | None = None,
    draft: Visualization | None = None,
    sources: ProjectSourceAccess | None = None,
) -> VisualizationResult:
    visualization = draft or session.get(Visualization, visualization_id)
    if visualization is None:
        raise ApplicationError("VISUALIZATION_NOT_FOUND", "Visualization does not exist.", 404)
    workflow = session.get(Workflow, visualization.workflow_id)
    if workflow is None or workflow.project_id != visualization.project_id:
        raise ApplicationError(
            "VISUALIZATION_NOT_FOUND", "Visualization workflow is unavailable.", 404
        )
    graph = domain_graph(session, workflow)
    node: NodeInstance | None
    applied: list[str] = []
    unsupported: list[str] = []
    context = execution_context(workflow, session, storage, settings, cache, parameters, sources)
    try:
        if visualization.publication_id:
            published = publication(workflow, visualization.publication_id)
            catalog = ResultCatalog.model_validate(workflow.result_catalog)
            view = view or ViewContext()
            view = view.model_copy(update={"values": {**(parameters or {}), **view.values}})
            roles = {
                role.name: role
                for item in catalog.contexts
                if item.id in published.context_ids
                for role in item.roles
            }
            context.parameter_definitions = (
                *context.parameter_definitions,
                *(
                    role
                    for name, role in roles.items()
                    if name not in {p.name for p in context.parameter_definitions}
                ),
            )
            context.parameters.update(
                {name: role.checked(view.values.get(name)) for name, role in roles.items()}
            )
            graph, target, applied, unsupported = compile_publication(
                graph, published, catalog, view, registry
            )
            result = WorkflowExecutionService(registry).execute(
                graph,
                target,
                context,
                output_port=published.port if target == published.node_id else "dataset",
            )
            if result.value_kind != published.kind:
                raise ValueError("Published output type has changed. Review its visualizations.")
            config = VisualizationConfig.model_validate(visualization.config)
            visible_ids = (
                set(
                    config.column_ids
                    if config.column_ids is not None
                    else [c.column_id for c in result.schema.columns]
                )
                if visualization.type == "table"
                else {config.category_column_id, config.value_column_id}
            )
            config.context_column_ids = list(
                dict.fromkeys(
                    [
                        *config.context_column_ids,
                        *(
                            identity
                            for identity in published.semantic_fields.values()
                            if identity not in visible_ids
                        ),
                    ]
                )
            )
            if published.kind == "scalar":
                config.value_column_id = result.schema.columns[0].column_id
            for role in view.highlight_only:
                if role in published.semantic_fields:
                    config.highlight_column_id = published.semantic_fields[role]
                    config.highlight_parameter = role
                    break
            node = NodeInstance(
                visualization.id, visualization.type, 1, Position(0, 0), config.model_dump()
            )
            executor = VisualizationExecutor()
            if node.type == "kpi" and result.output.row_count == 0:
                executor.infer_schema(node, {"input": result.schema}, context)
            else:
                output = executor.execute(node, {"input": result.output}, context)
                result = replace(result, output=output, schema=output.schema)
        else:
            node = next((n for n in graph.nodes if n.id == visualization.source_node_id), None)
            if node is None or node.type not in CHART_TYPES:
                raise ApplicationError(
                    "VISUALIZATION_NOT_FOUND", "Visualization node is unavailable.", 404
                )
            result = WorkflowExecutionService(registry).execute(graph, node.id, context)
            config = effective_visualization_config(node)
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
                    "edge_id": str(i.edge_id) if i.edge_id else None,
                }
                for i in exc.issues
            ],
        ) from exc
    except InvalidWorkflowError as exc:
        raise ApplicationError(
            "INVALID_PUBLICATION",
            str(exc),
            issues=[
                {
                    "code": issue.code,
                    "message": issue.message,
                    "node_id": str(issue.node_id) if issue.node_id else None,
                    "field": issue.field,
                }
                for issue in exc.issues
            ],
        ) from exc
    except (ValueError, StopIteration) as exc:
        raise ApplicationError(
            "INVALID_VISUALIZATION", str(exc) or "A selected visualization field is unavailable."
        ) from exc
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
    fields.extend(result.schema.by_id(series.column_id) for series in config.additional_series)
    fields = list({column.column_id: column for column in fields}.values())
    included = {column.column_id for column in fields}
    context_columns = list(config.context_column_ids)
    if config.highlight_column_id and (
        config.highlight_column_id not in included
        or (
            node.type == "table"
            and config.column_ids is not None
            and config.highlight_column_id not in config.column_ids
        )
    ):
        context_columns.append(config.highlight_column_id)
    for identity in context_columns:
        if identity not in included:
            fields.append(result.schema.by_id(identity))
            included.add(identity)
    page = result.output.frame.select([c.engine_name for c in fields])
    if node.type == "table":
        page = page.slice(offset, limit)
    else:
        offset, limit = 0, result.output.row_count
    return VisualizationResult(
        additional_series=[
            {
                "field": result.schema.by_id(series.column_id).engine_name,
                "name": series.name or result.schema.by_id(series.column_id).display_name,
            }
            for series in config.additional_series
        ],
        visualization_revision=visualization.revision,
        applied_context=applied,
        unsupported_filters=unsupported,
        highlight_field=result.schema.by_id(config.highlight_column_id).engine_name
        if config.highlight_column_id
        else None,
        highlight_value=context.parameters.get(config.highlight_parameter)
        if config.highlight_parameter
        else None,
        context_column_ids=context_columns,
        column_formats=config.column_formats,
        orientation=config.orientation,
        visualization_id=visualization_id,
        revision=workflow.revision,
        type=node.type,
        title=TITLE_PARAMETER.sub(
            lambda match: str(
                context.parameters.get(match[1])
                if context.parameters.get(match[1]) is not None
                else "—"
            ),
            config.title,
        )
        if config.title_template
        else config.title,
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
