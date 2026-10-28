"""Live and frozen bullet results from one prepared table and explicit shared scale."""

from app.domain.bullet import BulletSpec
from app.domain.datasets import Dataset, DatasetSchema
from app.domain.nodes import ExecutionContext
from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.visualizations import TITLE_PARAMETER, VisualizationConfig
from app.domain.workflows import WorkflowGraph
from app.models import Visualization, Workflow
from app.schemas.dashboards import VisualizationResult
from app.services.box_plot_visualizations import dataset_page
from app.services.bullet_preparation import prepare_bullet
from app.services.execution import ExecutionResult


def validate_bullet(
    kind: str,
    config: VisualizationConfig,
    graph: WorkflowGraph,
    output: PublishedOutput,
    catalog: ResultCatalog,
) -> None:
    if kind != "bullet_chart":
        return
    if not isinstance(config.spec, BulletSpec) or output.kind != "dataset":
        raise ValueError("Choose bullet category, actual, target and explicit scale ranges.")
    if config.additional_series or config.grain_column_ids is not None:
        raise ValueError(
            "Bullet charts use prepared actual and target fields, not additional series."
        )
    if config.orientation != "vertical":
        raise ValueError("Bullet charts use a fixed horizontal numeric scale.")


def render_bullet(
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
    assert isinstance(config.spec, BulletSpec)
    dataset = result.output
    prepared = prepare_bullet(
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
                *(f.column_id for f in page.columns),
                *config.context_column_ids,
                *([config.highlight_column_id] if config.highlight_column_id else []),
            ]
        )
    )
    try:
        fields = tuple(dataset.schema.by_id(identity) for identity in ids)
    except StopIteration as error:
        raise ValueError("A bullet navigation field is unavailable.") from error
    if len(fields) != len(page.columns):
        page = dataset_page(
            Dataset(dataset.frame.select([f.engine_name for f in fields]), DatasetSchema(fields)),
            page.offset,
            page.limit,
        )
    return VisualizationResult(
        spec=config.spec,
        bullet=prepared.presentation,
        datasets={"observations": page},
        visualization_id=visualization.id,
        visualization_revision=visualization.revision,
        revision=workflow.revision,
        type="bullet_chart",
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
            lambda m: (
                str(context.parameters[m[1]]) if context.parameters.get(m[1]) is not None else "—"
            ),
            config.title,
        )
        if config.title_template
        else config.title,
        category_field=dataset.schema.by_id(config.spec.category_column_id).engine_name,
        value_field=None,
        number_format=config.number_format,
        decimals=config.decimals,
        currency=config.currency,
        show_legend=config.show_legend,
        show_labels=config.show_labels,
        **page.model_dump(),
    )


def page_frozen_bullet(result: VisualizationResult, offset: int, limit: int) -> VisualizationResult:
    assert result.bullet is not None
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
            "bullet": result.bullet.model_copy(
                update={"points": result.bullet.points[offset : offset + limit]}
            ),
        }
    )
