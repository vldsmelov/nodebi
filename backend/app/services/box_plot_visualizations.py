"""Adapt both statistical outputs from one execution to a presentation contract."""

from app.domain.datasets import Dataset
from app.domain.nodes import ExecutionContext
from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.values import TableValue
from app.domain.visualization_specs import BoxPlotSpec, box_plot_spec
from app.domain.visualizations import TITLE_PARAMETER, VisualizationConfig
from app.domain.workflows import WorkflowGraph
from app.models import Visualization, Workflow
from app.schemas.dashboards import VisualizationDataset, VisualizationResult
from app.schemas.workflows import ResolvedColumnRead
from app.services.execution import ExecutionResult
from app.services.normalization import transport_rows


def suggested_box_spec(graph: WorkflowGraph, output: PublishedOutput) -> BoxPlotSpec | None:
    node = next((node for node in graph.nodes if node.id == output.node_id), None)
    if (
        node is None
        or node.type != "boxplot_stats"
        or node.version != 1
        or output.port != "dataset"
        or output.kind != "dataset"
    ):
        return None
    return box_plot_spec(node.id)


def validate_box_plot(
    kind: str,
    config: VisualizationConfig,
    graph: WorkflowGraph,
    output: PublishedOutput,
    catalog: ResultCatalog,
) -> None:
    if kind in {
        "histogram_chart",
        "heatmap_chart",
        "radar_chart",
        "waterfall_chart",
        "combo_chart",
        "bubble_chart",
        "pareto_chart",
        "funnel_chart",
        "treemap_chart",
        "sunburst_chart",
        "bullet_chart",
        "analytical_table",
    }:
        return  # Validated by the corresponding typed adapter.
    if kind != "box_plot":
        if config.spec is not None:
            raise ValueError("The visualization type does not match its typed specification.")
        return
    expected = suggested_box_spec(graph, output)
    if expected is None or config.spec != expected:
        raise ValueError("Select the summary publication of a Box plot statistics node.")
    if config.additional_series or config.grain_column_ids is not None:
        raise ValueError("Box plot uses statistical roles, not reusable measure series.")
    if any(
        point.node_id == output.node_id
        for context in catalog.contexts
        if context.id in output.context_ids
        for point in context.points
    ):
        raise ValueError(
            "Connect view restrictions before Box plot statistics so summary and outliers agree."
        )
    allowed = set(expected.summary.model_dump().values())
    if not set(config.context_column_ids) <= allowed or (
        config.highlight_column_id and config.highlight_column_id not in allowed
    ):
        raise ValueError("Choose navigation and highlight fields from the statistical summary.")


def dataset_page(dataset: Dataset, offset: int, limit: int) -> VisualizationDataset:
    frame = dataset.frame.slice(offset, limit)
    return VisualizationDataset(
        columns=[ResolvedColumnRead(**column.to_dict()) for column in dataset.schema.columns],
        rows=transport_rows(frame),
        total_rows=dataset.row_count,
        offset=offset,
        limit=limit,
        truncated=offset + frame.height < dataset.row_count,
    )


def render_box_plot(
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
    summary, outliers = result.outputs.get("dataset"), result.outputs.get("outliers")
    if not isinstance(summary, TableValue) or not isinstance(outliers, TableValue):
        raise ValueError("Both statistical outputs must come from one Box plot statistics node.")
    if (
        summary.context.node_id != outliers.context.node_id
        or summary.context.workflow_id != outliers.context.workflow_id
    ):
        raise ValueError("Statistical outputs must share the same execution context.")
    assert isinstance(config.spec, BoxPlotSpec)
    # Resolve every role against its own schema; never infer bindings from a label or position.
    for role in config.spec.summary.model_dump().values():
        summary.dataset.schema.by_id(role)
    for role in config.spec.outliers.model_dump().values():
        outliers.dataset.schema.by_id(role)
    summary_page = dataset_page(summary.dataset, 0, summary.dataset.row_count)
    points_page = dataset_page(
        outliers.dataset,
        0 if full_data else offset,
        outliers.dataset.row_count if full_data else limit,
    )
    return VisualizationResult(
        spec=config.spec,
        datasets={"summary": summary_page, "outliers": points_page},
        visualization_id=visualization.id,
        visualization_revision=visualization.revision,
        revision=workflow.revision,
        type="box_plot",
        applied_context=applied,
        unsupported_filters=unsupported,
        context_column_ids=config.context_column_ids,
        highlight_field=summary.dataset.schema.by_id(config.highlight_column_id).engine_name
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
        category_field=summary.dataset.schema.by_id(config.spec.summary.group).engine_name,
        value_field=summary.dataset.schema.by_id(config.spec.summary.median).engine_name,
        number_format=config.number_format,
        decimals=config.decimals,
        currency=config.currency,
        show_legend=config.show_legend,
        show_labels=config.show_labels,
        orientation=config.orientation,
        column_formats=config.column_formats,
        **summary_page.model_dump(),
    )
