"""Present ranked graph results; never sort, aggregate or accumulate in chart settings."""

from fractions import Fraction

from app.domain.nodes import ExecutionContext
from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.values import TableValue
from app.domain.visualization_specs import ParetoSpec, pareto_spec
from app.domain.visualizations import TITLE_PARAMETER, VisualizationConfig
from app.domain.workflows import WorkflowGraph
from app.models import Visualization, Workflow
from app.nodes.histogram import exact_text
from app.schemas.dashboards import (
    ComboObservation,
    ComboPresentation,
    ComboScale,
    ComboTick,
    VisualizationResult,
)
from app.services.box_plot_visualizations import dataset_page
from app.services.execution import ExecutionResult


def suggested_pareto_spec(graph: WorkflowGraph, output: PublishedOutput) -> ParetoSpec | None:
    node = next((n for n in graph.nodes if n.id == output.node_id), None)
    return (
        pareto_spec(node.id)
        if node is not None
        and node.type == "pareto"
        and node.version == 1
        and output.port == "dataset"
        and output.kind == "dataset"
        else None
    )


def validate_pareto(
    kind: str,
    config: VisualizationConfig,
    graph: WorkflowGraph,
    output: PublishedOutput,
    catalog: ResultCatalog,
) -> None:
    if kind != "pareto_chart":
        return
    expected = suggested_pareto_spec(graph, output)
    if (
        expected is None
        or not isinstance(config.spec, ParetoSpec)
        or config.spec.rows != expected.rows
        or config.spec.summary != expected.summary
    ):
        raise ValueError("Select the ranked publication of a Pareto contributions node.")
    if (
        config.additional_series
        or config.grain_column_ids is not None
        or config.orientation != "vertical"
    ):
        raise ValueError("Pareto uses prepared contributions and shares on vertical axes.")
    if any(
        point.node_id == output.node_id
        for context in catalog.contexts
        if context.id in output.context_ids
        for point in context.points
    ):
        raise ValueError("Connect view restrictions before Pareto contributions.")
    allowed = set(expected.rows.model_dump().values())
    if (
        not set(config.context_column_ids) <= allowed
        or config.highlight_column_id
        and config.highlight_column_id not in allowed
    ):
        raise ValueError("Select Pareto navigation fields from its ranked contributions.")


def render_pareto(
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
    ranked, summary = result.outputs.get("dataset"), result.outputs.get("summary")
    if (
        not isinstance(ranked, TableValue)
        or not isinstance(summary, TableValue)
        or ranked.context.node_id != summary.context.node_id
        or ranked.context.workflow_id != summary.context.workflow_id
    ):
        raise ValueError("Pareto ranks and population must come from one statistical execution.")
    assert isinstance(config.spec, ParetoSpec)
    dataset = ranked.dataset
    names = {
        role: dataset.schema.by_id(identity).engine_name
        for role, identity in config.spec.rows.model_dump().items()
    }
    for identity in config.spec.summary.model_dump().values():
        summary.dataset.schema.by_id(identity)
    maximum = dataset.frame[names["value"]].max()
    extent = Fraction(str(maximum)) if maximum is not None else Fraction(0)
    primary = ComboScale(
        minimum="0",
        maximum=exact_text(extent),
        lower=0,
        upper=1,
        ticks=[ComboTick(position=i / 4, label=exact_text(extent * i / 4)) for i in range(5)]
        if extent
        else [ComboTick(position=0, label="0")],
    )
    secondary = ComboScale(
        minimum="0",
        maximum="100",
        lower=0,
        upper=1,
        ticks=[ComboTick(position=i / 4, label=str(i * 25)) for i in range(5)],
    )
    page = dataset_page(
        dataset, 0 if full_data else offset, dataset.row_count if full_data else limit
    )
    observations = [
        ComboObservation(
            id=row[names["point_id"]],
            positions=[
                float(Fraction(str(row[names["value"]])) / extent) if extent else 0,
                float(Fraction(row[names["cumulative_exact"]]))
                if row[names["cumulative_exact"]] is not None
                else None,
            ],
        )
        for row in page.rows
    ]
    return VisualizationResult(
        spec=config.spec,
        combo=ComboPresentation(primary=primary, secondary=secondary, observations=observations),
        datasets={"observations": page, "summary": dataset_page(summary.dataset, 0, 1)},
        visualization_id=visualization.id,
        visualization_revision=visualization.revision,
        revision=workflow.revision,
        type="pareto_chart",
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
        category_field=names["category"],
        value_field=None,
        number_format=config.number_format,
        decimals=config.decimals,
        currency=config.currency,
        show_legend=config.show_legend,
        show_labels=config.show_labels,
        **page.model_dump(),
    )


def page_frozen_pareto(result: VisualizationResult, offset: int, limit: int) -> VisualizationResult:
    assert result.combo is not None
    rows = result.rows[offset : offset + limit]
    changes = dict(
        rows=rows, offset=offset, limit=limit, truncated=offset + len(rows) < result.total_rows
    )
    return result.model_copy(
        update={
            **changes,
            "datasets": {
                **result.datasets,
                "observations": result.datasets["observations"].model_copy(update=changes),
            },
            "combo": result.combo.model_copy(
                update={"observations": result.combo.observations[offset : offset + limit]}
            ),
        }
    )
