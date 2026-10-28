"""Paged presentation of graph-owned rollups; exact formatting is not aggregation."""

from decimal import Decimal

from app.domain.datasets import Dataset
from app.domain.nodes import ExecutionContext
from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.visualization_specs import AnalyticalRowRoles, AnalyticalTableSpec, TableFormatRule
from app.domain.visualizations import TITLE_PARAMETER, VisualizationConfig
from app.domain.workflows import WorkflowGraph
from app.models import Visualization, Workflow
from app.nodes.table_rollup import TableRollupConfig
from app.schemas.dashboards import (
    AnalyticalTablePresentation,
    TableCellFormat,
    VisualizationResult,
)
from app.services.box_plot_visualizations import dataset_page
from app.services.execution import ExecutionResult


def suggested_analytical_spec(
    graph: WorkflowGraph, output: PublishedOutput
) -> AnalyticalTableSpec | None:
    node = next((node for node in graph.nodes if node.id == output.node_id), None)
    if (
        node is None
        or node.type != "table_rollup"
        or node.version != 1
        or output.kind != "dataset"
        or output.port != "dataset"
    ):
        return None
    config = TableRollupConfig.model_validate(node.config)
    prefix = f"roll_{node.id.hex}_"
    return AnalyticalTableSpec(
        rows=AnalyticalRowRoles.model_validate(
            {name: prefix + name for name in AnalyticalRowRoles.model_fields}
        ),
        dimensions=[prefix + "dimension_" + identity for identity in config.dimensions],
        measures=[prefix + "measure_" + measure.output_id.hex for measure in config.measures],
        pinned_columns=min(1, len(config.dimensions)),
    )


def validate_analytical_table(
    kind: str,
    config: VisualizationConfig,
    graph: WorkflowGraph,
    output: PublishedOutput,
    catalog: ResultCatalog,
) -> None:
    if kind != "analytical_table":
        return
    expected = suggested_analytical_spec(graph, output)
    spec = config.spec
    if (
        expected is None
        or not isinstance(spec, AnalyticalTableSpec)
        or spec.rows != expected.rows
        or spec.dimensions != expected.dimensions
        or set(spec.measures) != set(expected.measures)
    ):
        raise ValueError("Select the dataset publication of an Analytical table totals node.")
    if config.additional_series or config.grain_column_ids is not None:
        raise ValueError("Analytical tables use prepared measures, not additional series.")
    if any(
        point.node_id == output.node_id
        for item in catalog.contexts
        if item.id in output.context_ids
        for point in item.points
    ):
        raise ValueError("Connect population restrictions before Analytical table totals.")
    allowed = {*expected.rows.model_dump().values(), *expected.dimensions, *expected.measures}
    if not set(config.context_column_ids) <= allowed or (
        config.highlight_column_id and config.highlight_column_id not in allowed
    ):
        raise ValueError("Select analytical-table navigation fields from the prepared output.")


def matches(rule: TableFormatRule, raw: object, kind: str) -> bool:
    if rule.scope == "details" and kind != "detail" or rule.scope == "totals" and kind == "detail":
        return False
    if rule.operator == "is_empty":
        return raw is None
    if raw is None:
        return False
    value = Decimal(str(raw))
    if not value.is_finite():
        raise ValueError("Analytical-table values must be finite numbers or empty.")
    assert rule.threshold is not None
    threshold = Decimal(rule.threshold)
    if rule.operator == "between":
        assert rule.upper is not None
        return threshold <= value <= Decimal(rule.upper)
    return {
        "lt": value < threshold,
        "lte": value <= threshold,
        "eq": value == threshold,
        "gte": value >= threshold,
        "gt": value > threshold,
    }[rule.operator]


def table_formats(
    dataset: Dataset, spec: AnalyticalTableSpec, offset: int, limit: int
) -> AnalyticalTablePresentation:
    names = {column.column_id: column.engine_name for column in dataset.schema.columns}
    cells: dict[str, dict[str, TableCellFormat]] = {}
    # First matching rule per cell wins. Nulls never compare equal to zero.
    for row in dataset.frame.slice(offset, limit).iter_rows(named=True):
        formatted: dict[str, TableCellFormat] = {}
        for rule in spec.rules:
            if rule.column_id not in formatted and matches(
                rule, row[names[rule.column_id]], str(row[names[spec.rows.kind]])
            ):
                formatted[rule.column_id] = TableCellFormat(
                    rule_id=rule.id, label=rule.label.strip(), tone=rule.tone
                )
        if formatted:
            cells[str(row[names[spec.rows.row_id]])] = formatted
    return AnalyticalTablePresentation(cells=cells)


def render_analytical_table(
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
    assert isinstance(config.spec, AnalyticalTableSpec)
    dataset = result.output
    for identity in [
        *config.spec.rows.model_dump().values(),
        *config.spec.dimensions,
        *config.spec.measures,
    ]:
        dataset.schema.by_id(identity)
    offset, limit = (0, dataset.row_count) if full_data else (offset, limit)
    page = dataset_page(dataset, offset, limit)
    return VisualizationResult(
        spec=config.spec,
        datasets={"table": page},
        analytical_table=table_formats(dataset, config.spec, offset, limit),
        visualization_id=visualization.id,
        visualization_revision=visualization.revision,
        revision=workflow.revision,
        type="analytical_table",
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
        category_field=None,
        value_field=None,
        number_format=config.number_format,
        decimals=config.decimals,
        currency=config.currency,
        show_legend=False,
        show_labels=False,
        **page.model_dump(),
    )


def page_frozen_analytical_table(
    result: VisualizationResult, offset: int, limit: int
) -> VisualizationResult:
    """Page stored rows and stored formatting together without rerunning any live computation."""
    assert isinstance(result.spec, AnalyticalTableSpec) and result.analytical_table is not None
    page = result.datasets["table"].model_copy(
        update={
            "rows": result.rows[offset : offset + limit],
            "offset": offset,
            "limit": limit,
            "truncated": offset + limit < result.total_rows,
        }
    )
    key = next(c.engine_name for c in result.columns if c.column_id == result.spec.rows.row_id)
    ids = {str(row[key]) for row in page.rows}
    return result.model_copy(
        update={
            "rows": page.rows,
            "offset": page.offset,
            "limit": page.limit,
            "truncated": page.truncated,
            "datasets": {"table": page},
            "analytical_table": AnalyticalTablePresentation(
                cells={
                    identity: cells
                    for identity, cells in result.analytical_table.cells.items()
                    if identity in ids
                }
            ),
        }
    )
