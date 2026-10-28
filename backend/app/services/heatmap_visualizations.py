"""Typed heatmap presentation; aggregation remains in heatmap_stats@1."""

from decimal import Decimal
from fractions import Fraction

from app.domain.datasets import Dataset
from app.domain.nodes import ExecutionContext
from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.values import TableValue
from app.domain.visualization_specs import HeatmapSpec, heatmap_spec
from app.domain.visualizations import TITLE_PARAMETER, VisualizationConfig
from app.domain.workflows import WorkflowGraph
from app.models import Visualization, Workflow
from app.schemas.dashboards import HeatmapScaleResult, VisualizationResult
from app.services.box_plot_visualizations import dataset_page
from app.services.execution import ExecutionResult


def suggested_heatmap_spec(graph: WorkflowGraph, output: PublishedOutput) -> HeatmapSpec | None:
    node = next((node for node in graph.nodes if node.id == output.node_id), None)
    if (
        node is None
        or node.type != "heatmap_stats"
        or node.version != 1
        or output.port != "dataset"
        or output.kind != "dataset"
    ):
        return None
    return heatmap_spec(node.id)


def validate_heatmap(
    kind: str,
    config: VisualizationConfig,
    graph: WorkflowGraph,
    output: PublishedOutput,
    catalog: ResultCatalog,
) -> None:
    if kind != "heatmap_chart":
        return
    expected = suggested_heatmap_spec(graph, output)
    if (
        expected is None
        or not isinstance(config.spec, HeatmapSpec)
        or config.spec.cells != expected.cells
    ):
        raise ValueError("Select the dataset publication of a Heatmap cells node.")
    if config.additional_series or config.grain_column_ids is not None:
        raise ValueError("Heatmap uses prepared cells, not additional measure series.")
    if any(
        point.node_id == output.node_id
        for context in catalog.contexts
        if context.id in output.context_ids
        for point in context.points
    ):
        raise ValueError("Connect view restrictions before Heatmap cells.")
    allowed = set(expected.cells.model_dump().values())
    if not set(config.context_column_ids) <= allowed or (
        config.highlight_column_id and config.highlight_column_id not in allowed
    ):
        raise ValueError("Select heatmap navigation fields from its cells.")


def color_scale(dataset: Dataset, spec: HeatmapSpec) -> HeatmapScaleResult:
    """Normalize exact differences before converting the bounded screen coordinate to float."""
    identity = dataset.schema.by_id(spec.cells.cell_id).engine_name
    value = dataset.schema.by_id(spec.cells.value).engine_name
    pairs = [
        (str(key), Decimal(str(raw)) if raw is not None else None)
        for key, raw in dataset.frame.select(identity, value).iter_rows()
    ]
    numbers = [raw for _, raw in pairs if raw is not None]
    if any(not raw.is_finite() for raw in numbers):
        raise ValueError("Heatmap values must be finite numbers or empty.")
    config = spec.color_scale
    lower: Decimal | None
    upper: Decimal | None
    if config.mode == "fixed":
        assert config.minimum is not None and config.maximum is not None
        lower, upper = Decimal(config.minimum), Decimal(config.maximum)
    elif numbers:
        lower, upper = min(numbers), max(numbers)
        if config.mode == "zero_centered":
            upper = max(lower.copy_abs(), upper.copy_abs())
            lower = upper.copy_negate()
    else:
        lower = upper = None
    positions: dict[str, float | None] = {}
    below = above = 0
    for key, raw in pairs:
        if raw is None or lower is None or upper is None:
            positions[key] = None
        else:
            below += raw < lower
            above += raw > upper
            ratio = (
                (Fraction(raw) - Fraction(lower)) / (Fraction(upper) - Fraction(lower))
                if lower != upper
                else Fraction(1, 2)
            )
            positions[key] = float(max(Fraction(0), min(Fraction(1), ratio)))
    return HeatmapScaleResult(
        mode=config.mode,
        minimum=str(lower) if lower is not None else None,
        maximum=str(upper) if upper is not None else None,
        positions=positions,
        below_count=below,
        above_count=above,
    )


def render_heatmap(
    visualization: Visualization,
    workflow: Workflow,
    config: VisualizationConfig,
    result: ExecutionResult,
    context: ExecutionContext,
    applied: list[str],
    unsupported: list[str],
) -> VisualizationResult:
    cells = result.outputs.get("dataset")
    if not isinstance(cells, TableValue) or not isinstance(config.spec, HeatmapSpec):
        raise ValueError("Select the dataset publication of a Heatmap cells node.")
    for field in config.spec.cells.model_dump().values():
        cells.dataset.schema.by_id(field)
    page = dataset_page(cells.dataset, 0, cells.dataset.row_count)
    return VisualizationResult(
        spec=config.spec,
        datasets={"cells": page},
        heatmap_scale=color_scale(cells.dataset, config.spec),
        visualization_id=visualization.id,
        visualization_revision=visualization.revision,
        revision=workflow.revision,
        type="heatmap_chart",
        applied_context=applied,
        unsupported_filters=unsupported,
        context_column_ids=config.context_column_ids,
        highlight_field=cells.dataset.schema.by_id(config.highlight_column_id).engine_name
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
        category_field=cells.dataset.schema.by_id(config.spec.cells.x).engine_name,
        value_field=cells.dataset.schema.by_id(config.spec.cells.value).engine_name,
        number_format=config.number_format,
        decimals=config.decimals,
        currency=config.currency,
        show_legend=config.show_legend,
        show_labels=config.show_labels,
        orientation=config.orientation,
        **page.model_dump(),
    )
