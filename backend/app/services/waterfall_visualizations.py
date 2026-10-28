"""Waterfall presentation reads prepared balances; it never accumulates contributions."""

from decimal import Decimal
from fractions import Fraction

from app.domain.datasets import Dataset
from app.domain.nodes import ExecutionContext
from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.values import TableValue
from app.domain.visualization_specs import WaterfallSpec, waterfall_spec
from app.domain.visualizations import TITLE_PARAMETER, VisualizationConfig
from app.domain.workflows import WorkflowGraph
from app.models import Visualization, Workflow
from app.nodes.histogram import exact_text
from app.schemas.dashboards import (
    VisualizationResult,
    WaterfallPosition,
    WaterfallScale,
    WaterfallTick,
)
from app.services.box_plot_visualizations import dataset_page
from app.services.execution import ExecutionResult


def suggested_waterfall_spec(graph: WorkflowGraph, output: PublishedOutput) -> WaterfallSpec | None:
    node = next((node for node in graph.nodes if node.id == output.node_id), None)
    if (
        node is None
        or node.type != "waterfall_steps"
        or node.version != 1
        or output.port != "dataset"
        or output.kind != "dataset"
    ):
        return None
    return waterfall_spec(node.id)


def validate_waterfall(
    kind: str,
    config: VisualizationConfig,
    graph: WorkflowGraph,
    output: PublishedOutput,
    catalog: ResultCatalog,
) -> None:
    if kind != "waterfall_chart":
        return
    expected = suggested_waterfall_spec(graph, output)
    if (
        expected is None
        or not isinstance(config.spec, WaterfallSpec)
        or config.spec.steps != expected.steps
    ):
        raise ValueError("Select the dataset publication of a Waterfall steps node.")
    if config.additional_series or config.grain_column_ids is not None:
        raise ValueError("Waterfall uses prepared steps, not additional measure series.")
    if any(
        point.node_id == output.node_id
        for context in catalog.contexts
        if context.id in output.context_ids
        for point in context.points
    ):
        raise ValueError("Connect view restrictions before Waterfall steps.")
    allowed = set(expected.steps.model_dump().values())
    if not set(config.context_column_ids) <= allowed or (
        config.highlight_column_id and config.highlight_column_id not in allowed
    ):
        raise ValueError("Select waterfall navigation fields from its steps.")


def waterfall_scale(dataset: Dataset, spec: WaterfallSpec) -> WaterfallScale:
    names = [
        dataset.schema.by_id(getattr(spec.steps, role)).engine_name
        for role in ("step_id", "start", "end", "value")
    ]
    values = [
        (str(key), Decimal(str(start)), Decimal(str(end)), Decimal(str(value)))
        for key, start, end, value in dataset.frame.select(names).iter_rows()
    ]
    if any(
        not number.is_finite() for _, start, end, value in values for number in (start, end, value)
    ):
        raise ValueError("Waterfall values must be finite numbers or empty totals.")
    # Always include zero so total-bar baselines are never cropped or misleading.
    bounds = [Decimal(0), *(number for _, start, end, _ in values for number in (start, end))]
    lower, upper = min(bounds), max(bounds)
    span = Fraction(upper) - Fraction(lower)

    def position(value: Decimal) -> float:
        return float((Fraction(value) - Fraction(lower)) / span) if span else 0.5

    return WaterfallScale(
        minimum=str(lower),
        maximum=str(upper),
        zero=position(Decimal(0)),
        ticks=[
            WaterfallTick(position=index / 4, label=exact_text(Fraction(lower) + span * index / 4))
            for index in range(5)
        ]
        if span
        else [WaterfallTick(position=0.5, label="0")],
        positions={
            key: WaterfallPosition(
                start=position(start),
                end=position(end),
                sign=1 if value > 0 else -1 if value < 0 else 0,
            )
            for key, start, end, value in values
        },
    )


def render_waterfall(
    visualization: Visualization,
    workflow: Workflow,
    config: VisualizationConfig,
    result: ExecutionResult,
    context: ExecutionContext,
    applied: list[str],
    unsupported: list[str],
) -> VisualizationResult:
    steps = result.outputs.get("dataset")
    if not isinstance(steps, TableValue) or not isinstance(config.spec, WaterfallSpec):
        raise ValueError("Select the dataset publication of a Waterfall steps node.")
    for field in config.spec.steps.model_dump().values():
        steps.dataset.schema.by_id(field)
    page = dataset_page(steps.dataset, 0, steps.dataset.row_count)
    return VisualizationResult(
        spec=config.spec,
        datasets={"steps": page},
        waterfall_scale=waterfall_scale(steps.dataset, config.spec),
        visualization_id=visualization.id,
        visualization_revision=visualization.revision,
        revision=workflow.revision,
        type="waterfall_chart",
        applied_context=applied,
        unsupported_filters=unsupported,
        context_column_ids=config.context_column_ids,
        highlight_field=steps.dataset.schema.by_id(config.highlight_column_id).engine_name
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
        category_field=steps.dataset.schema.by_id(config.spec.steps.category).engine_name,
        value_field=steps.dataset.schema.by_id(config.spec.steps.value).engine_name,
        number_format=config.number_format,
        decimals=config.decimals,
        currency=config.currency,
        show_legend=config.show_legend,
        show_labels=config.show_labels,
        orientation=config.orientation,
        **page.model_dump(),
    )
