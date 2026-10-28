"""Validate and present a complete graph-owned hierarchy; never aggregate a chart page."""

import math
from fractions import Fraction
from typing import Literal

from app.domain.datasets import Dataset, LogicalType
from app.domain.hierarchy import HierarchyPoint, HierarchyPresentation
from app.domain.nodes import ExecutionContext
from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.visualization_specs import HierarchySpec
from app.domain.visualizations import TITLE_PARAMETER, VisualizationConfig
from app.domain.workflows import WorkflowGraph
from app.models import Visualization, Workflow
from app.nodes.histogram import exact_text
from app.nodes.table_rollup import TableRollupConfig
from app.schemas.dashboards import VisualizationResult
from app.services.analytical_tables import suggested_analytical_spec
from app.services.box_plot_visualizations import dataset_page
from app.services.execution import ExecutionResult

KINDS = {"treemap_chart", "sunburst_chart"}
MAX_NODES = 5000
ADDITIVE = {"sum", "count", "count_rows"}


def suggested_hierarchy_spec(
    graph: WorkflowGraph, output: PublishedOutput, kind: Literal["treemap_chart", "sunburst_chart"]
) -> HierarchySpec | None:
    base = suggested_analytical_spec(graph, output)
    if base is None or not base.dimensions:
        return None
    node = next(n for n in graph.nodes if n.id == output.node_id)
    config = TableRollupConfig.model_validate(node.config)
    if not config.grand_total or (len(config.dimensions) > 1 and not config.subtotals):
        return None
    measure = next((m for m in config.measures if m.operation in ADDITIVE), None)
    return (
        HierarchySpec(
            type=kind,
            rows=base.rows,
            dimensions=base.dimensions,
            value_column_id=f"roll_{node.id.hex}_measure_{measure.output_id.hex}",
        )
        if measure
        else None
    )


def validate_hierarchy(
    kind: str,
    config: VisualizationConfig,
    graph: WorkflowGraph,
    output: PublishedOutput,
    catalog: ResultCatalog,
) -> None:
    if kind not in KINDS:
        return
    spec = config.spec
    expected = suggested_hierarchy_spec(graph, output, "treemap_chart")
    if (
        expected is None
        or not isinstance(spec, HierarchySpec)
        or spec.type != kind
        or spec.rows != expected.rows
        or spec.dimensions != expected.dimensions
    ):
        raise ValueError(
            "Select a grouped analytical-table publication with all subtotals and a grand total."
        )
    node = next(n for n in graph.nodes if n.id == output.node_id)
    measures = {
        f"roll_{node.id.hex}_measure_{m.output_id.hex}"
        for m in TableRollupConfig.model_validate(node.config).measures
        if m.operation in ADDITIVE
    }
    if spec.value_column_id not in measures:
        raise ValueError("Hierarchy area requires a sum or count, not an average or ratio.")
    if (
        config.additional_series
        or config.grain_column_ids is not None
        or config.orientation != "vertical"
    ):
        raise ValueError("Hierarchy charts use one prepared additive measure.")
    if any(
        p.node_id == output.node_id
        for c in catalog.contexts
        if c.id in output.context_ids
        for p in c.points
    ):
        raise ValueError("Connect population restrictions before Analytical table totals.")


def prepare_hierarchy(dataset: Dataset, spec: HierarchySpec) -> HierarchyPresentation:
    if dataset.row_count > MAX_NODES:
        raise ValueError(
            "Hierarchy charts support up to 5000 complete nodes. Group or filter upstream."
        )
    names = {
        role: dataset.schema.by_id(identity).engine_name
        for role, identity in spec.rows.model_dump().items()
    }
    value = dataset.schema.by_id(spec.value_column_id)
    if value.logical_type not in {LogicalType.INTEGER, LogicalType.DECIMAL, LogicalType.FLOAT}:
        raise ValueError("Hierarchy area requires a numeric additive measure.")
    selected = [*names.values(), value.engine_name]
    records = list(dataset.frame.select(selected).iter_rows(named=True))
    indexed = {r[names["row_id"]]: r for r in records}
    roots = [r for r in records if r[names["parent_id"]] is None]
    if len(indexed) != len(records) or len(roots) != 1:
        raise ValueError("Hierarchy identities must be unique with one complete root.")
    root = roots[0]
    root_id = root[names["row_id"]]
    if root[names["depth"]] != 0 or root[names["kind"]] != "grand_total":
        raise ValueError("Hierarchy requires its complete grand total.")
    amounts: dict[str, Fraction] = {}
    children: dict[str, list[str]] = {}
    for identity, row in indexed.items():
        raw = row[value.engine_name]
        # An empty sum is undefined, but an empty hierarchy still needs its structural root.
        if raw is None and len(records) == 1 and row[names["source_count"]] == 0:
            amounts[identity] = Fraction(0)
        else:
            try:
                number = Fraction(str(raw))
            except (ValueError, ZeroDivisionError) as error:
                raise ValueError(
                    "Hierarchy values must be finite, non-empty and non-negative."
                ) from error
            if number < 0:
                raise ValueError("Hierarchy values must be finite, non-empty and non-negative.")
            amounts[identity] = number
        parent = row[names["parent_id"]]
        depth = row[names["depth"]]
        if not isinstance(depth, int) or not 0 <= depth <= len(spec.dimensions):
            raise ValueError("Hierarchy depth does not match its grouping fields.")
        if parent is not None:
            if parent not in indexed or indexed[parent][names["depth"]] + 1 != depth:
                raise ValueError("Hierarchy parents must be present at the preceding level.")
            children.setdefault(parent, []).append(identity)
        elif identity != root_id:
            raise ValueError("Hierarchy requires one connected root.")
    for identity, row in indexed.items():
        depth = row[names["depth"]]
        expected_kind = (
            "grand_total"
            if depth == 0
            else "detail"
            if depth == len(spec.dimensions)
            else "subtotal"
        )
        if row[names["kind"]] != expected_kind or (
            depth < len(spec.dimensions)
            and not children.get(identity)
            and row[names["source_count"]] > 0
        ):
            raise ValueError("Hierarchy requires every intermediate grouping level.")
        if identity not in children:
            continue
        total = sum((amounts[c] for c in children[identity]), Fraction(0))
        exact = total == amounts[identity]
        if not exact and not (
            value.logical_type == LogicalType.FLOAT
            and math.isclose(float(total), float(amounts[identity]), rel_tol=1e-12, abs_tol=0)
        ):
            raise ValueError(
                "Hierarchy child contributions must reconcile with their parent total."
            )
    total = amounts[root_id]
    return HierarchyPresentation(
        root_id=root_id,
        total=str(root[value.engine_name]) if root[value.engine_name] is not None else None,
        zero_count=sum(amount == 0 for identity, amount in amounts.items() if identity != root_id),
        points=[
            HierarchyPoint(
                id=identity,
                parent_id=row[names["parent_id"]],
                depth=row[names["depth"]],
                weight=min(1, float(amounts[identity] / total)) if total else 0,
                share_exact=exact_text(amounts[identity] / total) if total else None,
            )
            for identity, row in indexed.items()
        ],
    )


def render_hierarchy(
    visualization: Visualization,
    workflow: Workflow,
    config: VisualizationConfig,
    result: ExecutionResult,
    context: ExecutionContext,
    applied: list[str],
    unsupported: list[str],
) -> VisualizationResult:
    assert isinstance(config.spec, HierarchySpec)
    dataset = result.output
    prepared = prepare_hierarchy(dataset, config.spec)
    # Trees are complete and explicitly bounded, never a partial page masquerading as a hierarchy.
    page = dataset_page(dataset, 0, dataset.row_count)
    return VisualizationResult(
        spec=config.spec,
        hierarchy=prepared,
        datasets={"hierarchy": page},
        visualization_id=visualization.id,
        visualization_revision=visualization.revision,
        revision=workflow.revision,
        type=config.spec.type,
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
        category_field=None,
        value_field=None,
        number_format=config.number_format,
        decimals=config.decimals,
        currency=config.currency,
        show_legend=False,
        show_labels=config.show_labels,
        **page.model_dump(),
    )
