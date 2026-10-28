"""A complete ordered funnel and exact table from one graph execution."""

from fractions import Fraction

from app.domain.funnel import FunnelPoint, FunnelPresentation, FunnelSpec, funnel_spec
from app.domain.nodes import ExecutionContext
from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.values import TableValue
from app.domain.visualizations import TITLE_PARAMETER, VisualizationConfig
from app.domain.workflows import WorkflowGraph
from app.models import Visualization, Workflow
from app.schemas.dashboards import VisualizationResult
from app.services.box_plot_visualizations import dataset_page
from app.services.execution import ExecutionResult


def suggested_funnel_spec(graph: WorkflowGraph, output: PublishedOutput) -> FunnelSpec | None:
    node = next((n for n in graph.nodes if n.id == output.node_id), None)
    return (
        funnel_spec(node.id)
        if node is not None
        and node.type == "funnel_steps"
        and node.version == 1
        and output.port == "dataset"
        and output.kind == "dataset"
        else None
    )


def validate_funnel(
    kind: str,
    config: VisualizationConfig,
    graph: WorkflowGraph,
    output: PublishedOutput,
    catalog: ResultCatalog,
) -> None:
    if kind != "funnel_chart":
        return
    expected = suggested_funnel_spec(graph, output)
    if expected is None or config.spec != expected:
        raise ValueError("Select the ordered publication of a Funnel stages node.")
    if (
        config.additional_series
        or config.grain_column_ids is not None
        or config.orientation != "vertical"
    ):
        raise ValueError("Funnel uses prepared stages in their explicit order and vertical layout.")
    if any(
        point.node_id == output.node_id
        for context in catalog.contexts
        if context.id in output.context_ids
        for point in context.points
    ):
        raise ValueError("Connect view restrictions before Funnel stages.")
    allowed = set(expected.rows.model_dump().values())
    if (
        not set(config.context_column_ids) <= allowed
        or config.highlight_column_id
        and config.highlight_column_id not in allowed
    ):
        raise ValueError("Select funnel navigation fields from its ordered stages.")


def render_funnel(
    visualization: Visualization,
    workflow: Workflow,
    config: VisualizationConfig,
    result: ExecutionResult,
    context: ExecutionContext,
    applied: list[str],
    unsupported: list[str],
) -> VisualizationResult:
    stages, summary = result.outputs.get("dataset"), result.outputs.get("summary")
    if (
        not isinstance(stages, TableValue)
        or not isinstance(summary, TableValue)
        or stages.context.node_id != summary.context.node_id
        or stages.context.workflow_id != summary.context.workflow_id
    ):
        raise ValueError("Funnel stages and population must come from one statistical execution.")
    assert isinstance(config.spec, FunnelSpec)
    dataset = stages.dataset
    names = {
        role: dataset.schema.by_id(identity).engine_name
        for role, identity in config.spec.rows.model_dump().items()
    }
    for identity in config.spec.summary.model_dump().values():
        summary.dataset.schema.by_id(identity)
    page = dataset_page(dataset, 0, max(dataset.row_count, 1))
    points = [
        FunnelPoint(
            id=row[names["point_id"]],
            width=float(Fraction(row[names["initial_exact"]]))
            if row[names["initial_exact"]] is not None
            else 0,
            zero=Fraction(str(row[names["value"]])) == 0,
        )
        for row in page.rows
    ]
    return VisualizationResult(
        spec=config.spec,
        funnel=FunnelPresentation(points=points),
        datasets={"observations": page, "summary": dataset_page(summary.dataset, 0, 1)},
        visualization_id=visualization.id,
        visualization_revision=visualization.revision,
        revision=workflow.revision,
        type="funnel_chart",
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
        category_field=names["stage"],
        value_field=None,
        number_format=config.number_format,
        decimals=config.decimals,
        currency=config.currency,
        show_legend=config.show_legend,
        show_labels=config.show_labels,
        **page.model_dump(),
    )
