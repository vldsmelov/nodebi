"""Presentation of a graph histogram: bin assignment stays in the statistical node."""

from app.domain.nodes import ExecutionContext
from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.values import TableValue
from app.domain.visualization_specs import HistogramSpec, histogram_spec
from app.domain.visualizations import TITLE_PARAMETER, VisualizationConfig
from app.domain.workflows import WorkflowGraph
from app.models import Visualization, Workflow
from app.schemas.dashboards import VisualizationResult
from app.services.box_plot_visualizations import dataset_page
from app.services.execution import ExecutionResult


def suggested_histogram_spec(graph: WorkflowGraph, output: PublishedOutput) -> HistogramSpec | None:
    node = next((node for node in graph.nodes if node.id == output.node_id), None)
    if (
        node is None
        or node.type != "histogram"
        or node.version != 1
        or output.port != "dataset"
        or output.kind != "dataset"
    ):
        return None
    return histogram_spec(node.id)


def validate_histogram(
    kind: str,
    config: VisualizationConfig,
    graph: WorkflowGraph,
    output: PublishedOutput,
    catalog: ResultCatalog,
) -> None:
    if kind != "histogram_chart":
        return
    expected = suggested_histogram_spec(graph, output)
    if expected is None or config.spec != expected:
        raise ValueError("Select the intervals publication of a Histogram statistics node.")
    if config.additional_series or config.grain_column_ids is not None:
        raise ValueError("Histogram uses interval counts, not reusable measure series.")
    if any(
        point.node_id == output.node_id
        for context in catalog.contexts
        if context.id in output.context_ids
        for point in context.points
    ):
        raise ValueError("Connect view restrictions before Histogram statistics.")
    allowed = set(expected.bins.model_dump().values())
    if not set(config.context_column_ids) <= allowed or (
        config.highlight_column_id and config.highlight_column_id not in allowed
    ):
        raise ValueError("Select histogram navigation fields from its intervals.")


def render_histogram(
    visualization: Visualization,
    workflow: Workflow,
    config: VisualizationConfig,
    result: ExecutionResult,
    context: ExecutionContext,
    applied: list[str],
    unsupported: list[str],
) -> VisualizationResult:
    bins, summary = result.outputs.get("dataset"), result.outputs.get("summary")
    if not isinstance(bins, TableValue) or not isinstance(summary, TableValue):
        raise ValueError("Histogram intervals and counts must come from one statistical execution.")
    assert isinstance(config.spec, HistogramSpec)
    for field in config.spec.bins.model_dump().values():
        bins.dataset.schema.by_id(field)
    for field in config.spec.summary.model_dump().values():
        summary.dataset.schema.by_id(field)
    page = dataset_page(bins.dataset, 0, bins.dataset.row_count)
    return VisualizationResult(
        spec=config.spec,
        datasets={"bins": page, "summary": dataset_page(summary.dataset, 0, 1)},
        visualization_id=visualization.id,
        visualization_revision=visualization.revision,
        revision=workflow.revision,
        type="histogram_chart",
        applied_context=applied,
        unsupported_filters=unsupported,
        highlight_field=bins.dataset.schema.by_id(config.highlight_column_id).engine_name
        if config.highlight_column_id
        else None,
        highlight_value=context.parameters.get(config.highlight_parameter)
        if config.highlight_parameter
        else None,
        context_column_ids=config.context_column_ids,
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
        category_field=bins.dataset.schema.by_id(config.spec.bins.interval).engine_name,
        value_field=bins.dataset.schema.by_id(config.spec.bins.count).engine_name,
        number_format="number",
        decimals=0,
        currency=config.currency,
        show_legend=config.show_legend,
        show_labels=config.show_labels,
        orientation=config.orientation,
        **page.model_dump(),
    )
