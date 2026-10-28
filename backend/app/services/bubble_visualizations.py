"""Live and frozen views of one prepared bubble population."""

from app.domain.bubble import BubbleSpec
from app.domain.datasets import Dataset, DatasetSchema
from app.domain.nodes import ExecutionContext
from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.visualizations import TITLE_PARAMETER, VisualizationConfig
from app.domain.workflows import WorkflowGraph
from app.models import Visualization, Workflow
from app.schemas.dashboards import VisualizationResult
from app.services.box_plot_visualizations import dataset_page
from app.services.bubble_preparation import prepare_bubble
from app.services.execution import ExecutionResult


def validate_bubble(
    kind: str,
    config: VisualizationConfig,
    graph: WorkflowGraph,
    output: PublishedOutput,
    catalog: ResultCatalog,
) -> None:
    if kind != "bubble_chart":
        return
    if not isinstance(config.spec, BubbleSpec) or output.kind != "dataset":
        raise ValueError("Choose bubble key, X, Y and size fields on a prepared table.")
    if config.additional_series or config.grain_column_ids is not None:
        raise ValueError("Bubble charts use typed roles, not additional measure series.")
    if config.orientation != "vertical":
        raise ValueError("Bubble charts use horizontal X and vertical Y axes.")


def render_bubble(
    visualization: Visualization,
    workflow: Workflow,
    config: VisualizationConfig,
    result: ExecutionResult,
    context: ExecutionContext,
    applied: list[str],
    unsupported: list[str],
    offset: int,
    limit: int,
    full_data: bool,
) -> VisualizationResult:
    assert isinstance(config.spec, BubbleSpec)
    dataset = result.output
    prepared = prepare_bubble(
        dataset,
        config.spec,
        visualization.publication_id or visualization.id,
        offset=offset,
        limit=limit,
        full_data=full_data,
    )
    page = prepared.observations
    ids = list(
        dict.fromkeys(
            [
                *(field.column_id for field in page.columns),
                *config.context_column_ids,
                *([config.highlight_column_id] if config.highlight_column_id else []),
            ]
        )
    )
    try:
        fields = tuple(dataset.schema.by_id(identity) for identity in ids)
    except StopIteration as error:
        raise ValueError("A bubble navigation field is unavailable.") from error
    if len(fields) != len(page.columns):
        page = dataset_page(
            Dataset(dataset.frame.select([f.engine_name for f in fields]), DatasetSchema(fields)),
            page.offset,
            page.limit,
        )
    return VisualizationResult(
        spec=config.spec,
        bubble=prepared.presentation,
        datasets={"observations": page},
        visualization_id=visualization.id,
        visualization_revision=visualization.revision,
        revision=workflow.revision,
        type="bubble_chart",
        applied_context=applied,
        unsupported_filters=unsupported,
        context_column_ids=config.context_column_ids,
        highlight_field=dataset.schema.by_id(config.highlight_column_id).engine_name
        if config.highlight_column_id
        else None,
        highlight_value=context.parameters.get(config.highlight_parameter)
        if config.highlight_parameter
        else None,
        title=TITLE_PARAMETER.sub(
            lambda match: (
                str(context.parameters[match[1]])
                if context.parameters.get(match[1]) is not None
                else "—"
            ),
            config.title,
        )
        if config.title_template
        else config.title,
        category_field=dataset.schema.by_id(config.spec.key_column_id).engine_name,
        value_field=None,
        number_format=config.number_format,
        decimals=config.decimals,
        currency=config.currency,
        show_legend=config.show_legend,
        show_labels=config.show_labels,
        **page.model_dump(),
    )


def page_frozen_bubble(result: VisualizationResult, offset: int, limit: int) -> VisualizationResult:
    """Slice matching rows and identities; never recalculate the frozen full-population scales."""
    assert result.bubble is not None
    rows = result.rows[offset : offset + limit]
    changes = dict(
        rows=rows, offset=offset, limit=limit, truncated=offset + len(rows) < result.total_rows
    )
    return result.model_copy(
        update={
            **changes,
            "datasets": {
                "observations": result.datasets["observations"].model_copy(update=changes)
            },
            "bubble": result.bubble.model_copy(
                update={"points": result.bubble.points[offset : offset + limit]}
            ),
        }
    )
