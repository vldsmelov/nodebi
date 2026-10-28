"""Recognize an editable suffix without reconstructing or owning its upstream graph."""

import uuid
from dataclasses import dataclass

from pydantic import ValidationError

from app.domain.publications import PublishedOutput, ResultCatalog
from app.domain.workflows import NodeInstance, Position, WorkflowEdge, WorkflowGraph
from app.nodes.exact_calculated_column import ExactCalculatedColumnConfig
from app.nodes.exact_group_by import ExactGroupByConfig
from app.nodes.filter import FilterCondition, FilterConfig
from app.nodes.group_by import Aggregation
from app.nodes.period_comparison import CalendarPeriodConfig, PeriodComparisonConfig
from app.nodes.stable_group_by import StableAggregation, StableGroupByConfig
from app.schemas.report_builder import ReportEditSettings
from app.schemas.workflows import (
    EdgePayload,
    NodePayload,
    PositionPayload,
    WorkflowRead,
    WorkflowSave,
)
from app.services.report_formulas import aggregation_config, formula_node


def as_graph(
    saved: WorkflowRead | WorkflowSave, identity: uuid.UUID, project: uuid.UUID
) -> WorkflowGraph:
    return WorkflowGraph(
        identity,
        project,
        saved.name,
        saved.version if isinstance(saved, WorkflowRead) else saved.format_version,
        tuple(
            NodeInstance(
                n.id, n.type, n.version, Position(n.position.x, n.position.y), n.config, n.ui
            )
            for n in saved.nodes
        ),
        tuple(
            WorkflowEdge(
                e.id,
                e.source_node_id,
                e.source_port,
                e.target_node_id,
                e.target_port,
                e.source_column_id,
            )
            for e in saved.edges
        ),
    )


@dataclass(frozen=True)
class EditableSuffix:
    aggregate: NodePayload
    input_edge: EdgePayload
    filter: NodePayload | None
    filter_input: EdgePayload | None
    rows: tuple[NodePayload, ...] = ()
    summaries: tuple[NodePayload, ...] = ()
    row_input: EdgePayload | None = None
    calendar: NodePayload | None = None
    calendar_input: EdgePayload | None = None
    comparison: NodePayload | None = None

    @property
    def upstream(self) -> EdgePayload:
        return self.row_input or self.filter_input or self.calendar_input or self.input_edge

    @property
    def terminal(self) -> NodePayload:
        return self.comparison or (self.summaries[-1] if self.summaries else self.aggregate)

    @property
    def owned(self) -> set[uuid.UUID]:
        return {
            self.aggregate.id,
            *(n.id for n in self.rows),
            *(n.id for n in self.summaries),
            *([self.filter.id] if self.filter else []),
            *([self.calendar.id] if self.calendar else []),
            *([self.comparison.id] if self.comparison else []),
        }


def references(saved: WorkflowRead, identity: uuid.UUID) -> bool:
    catalog = saved.result_catalog or ResultCatalog()
    if any(o.node_id == identity for o in catalog.outputs) or any(
        p.node_id == identity for c in catalog.contexts for p in c.points
    ):
        return True
    return presentation_references(saved, identity)


def presentation_references(saved: WorkflowRead, identity: uuid.UUID) -> bool:
    presentation = saved.presentation
    return bool(
        presentation
        and (
            any(
                identity in c.node_ids or identity in c.detached_node_ids
                for c in presentation.workbooks
            )
            or any(
                identity in c.node_ids
                or any(p.node_id == identity for p in [*c.inputs, *c.outputs])
                for c in presentation.blocks
            )
        )
    )


def table_input(saved: WorkflowRead, identity: uuid.UUID) -> EdgePayload | None:
    edges = [e for e in saved.edges if e.target_node_id == identity]
    if len(edges) != 1 or edges[0].target_port != "input" or edges[0].source_column_id is not None:
        return None
    return edges[0]


def recognize(saved: WorkflowRead, published: PublishedOutput) -> EditableSuffix | None:
    nodes = {n.id: n for n in saved.nodes}
    aggregate = nodes.get(published.node_id)
    comparison = None
    comparison_config = None
    if aggregate and (aggregate.type, aggregate.version) == ("period_comparison", 1):
        try:
            comparison_config = PeriodComparisonConfig.model_validate(aggregate.config)
        except ValidationError:
            return None
        comparison = aggregate
        incoming = table_input(saved, comparison.id)
        if incoming is None:
            return None
        aggregate = nodes.get(incoming.source_node_id)
    summaries: list[NodePayload] = []
    while aggregate and is_formula(aggregate, "summary") and len(summaries) < 16:
        incoming = table_input(saved, aggregate.id)
        if incoming is None or aggregate in summaries:
            return None
        summaries.insert(0, aggregate)
        aggregate = nodes.get(incoming.source_node_id)
    if not aggregate or aggregate.type != "group_by" or aggregate.version not in (2, 3):
        return None
    model = StableGroupByConfig if aggregate.version == 3 else ExactGroupByConfig
    aggregation_model = StableAggregation if aggregate.version == 3 else Aggregation
    try:
        aggregate_config = model.model_validate(aggregate.config)
    except ValidationError:
        return None
    # Unknown future config cannot be silently normalized away.
    if set(aggregate.config) - set(model.model_fields):
        return None
    if any(
        set(a) - set(aggregation_model.model_fields)
        for a in aggregate.config.get("aggregations", [])
    ):
        return None
    edge = table_input(saved, aggregate.id)
    if edge is None:
        return None
    calendar = None
    calendar_input = None
    if comparison_config:
        calendar = nodes.get(edge.source_node_id)
        if not calendar or (calendar.type, calendar.version) != ("calendar_period", 1):
            return None
        try:
            calendar_config = CalendarPeriodConfig.model_validate(calendar.config)
        except ValidationError:
            return None
        calendar_input = table_input(saved, calendar.id)
        if (
            calendar_input is None
            or calendar_config.date_column_id != comparison_config.date_column_id
            or calendar_config.unit != comparison_config.unit
            or comparison_config.date_column_id not in aggregate_config.dimensions
            or comparison_config.partitions
            != [d for d in aggregate_config.dimensions if d != comparison_config.date_column_id]
        ):
            return None
    candidate = nodes.get((calendar_input or edge).source_node_id)
    filter_input = table_input(saved, candidate.id) if candidate else None
    if candidate and (candidate.type, candidate.version) == ("filter", 1) and filter_input:
        try:
            config = FilterConfig.model_validate(candidate.config)
            simple = (
                not (set(candidate.config) - set(FilterConfig.model_fields))
                and len(config.conditions) <= 32
                and all(
                    c.parameter is None
                    and (c.value is None or type(c.value) in (str, bool, int, float))
                    for c in config.conditions
                )
                and all(
                    not (set(c) - set(FilterCondition.model_fields))
                    for c in candidate.config["conditions"]
                )
            )
        except (ValidationError, KeyError, TypeError):
            simple = False
        if (
            simple
            and not references(saved, candidate.id)
            and sum(e.source_node_id == candidate.id for e in saved.edges) == 1
        ):
            return with_formulas(
                saved,
                EditableSuffix(
                    aggregate,
                    edge,
                    candidate,
                    filter_input,
                    summaries=tuple(summaries),
                    calendar=calendar,
                    calendar_input=calendar_input,
                    comparison=comparison,
                ),
            )
    return with_formulas(
        saved,
        EditableSuffix(
            aggregate,
            edge,
            None,
            None,
            summaries=tuple(summaries),
            calendar=calendar,
            calendar_input=calendar_input,
            comparison=comparison,
        ),
    )


def is_formula(node: NodePayload, scope: str) -> bool:
    if (node.type, node.version) != ("calculated_column", 2) or node.ui.get(
        "report_formula"
    ) != scope:
        return False
    try:
        ExactCalculatedColumnConfig.model_validate(node.config)
        return True
    except ValidationError:
        return False


def with_formulas(saved: WorkflowRead, suffix: EditableSuffix) -> EditableSuffix:
    from dataclasses import replace

    nodes = {n.id: n for n in saved.nodes}
    edge = suffix.upstream
    rows: list[NodePayload] = []
    while len(rows) < 16:
        node = nodes.get(edge.source_node_id)
        if not node or not is_formula(node, "row") or node in rows:
            break
        incoming = table_input(saved, node.id)
        if (
            not incoming
            or references(saved, node.id)
            or sum(e.source_node_id == node.id for e in saved.edges) != 1
        ):
            break
        rows.insert(0, node)
        edge = incoming
    return replace(suffix, rows=tuple(rows), row_input=edge if rows else None)


def patch_suffix(
    saved: WorkflowRead, suffix: EditableSuffix, settings: ReportEditSettings, request_id: uuid.UUID
) -> WorkflowSave:
    from app.domain.errors import ApplicationError

    stable = all(m.output_id is not None for m in settings.measures)
    if stable != (suffix.aggregate.version == 3):
        raise ApplicationError(
            "INVALID_REPORT", "The aggregation version cannot change in the wizard."
        )
    old_nodes = {n.id: n for n in saved.nodes}
    formula_ids = {f.node_id for f in [*settings.row_formulas, *settings.summary_formulas]}
    editable_formula_ids = {n.id for n in [*suffix.rows, *suffix.summaries]}
    if formula_ids & (set(old_nodes) - editable_formula_ids):
        raise ApplicationError("INVALID_REPORT", "Formula identities conflict with existing steps.")
    chain = [formula_node(f, "row", 360 * i) for i, f in enumerate(settings.row_formulas)]
    if settings.filters:
        chain.append(
            NodePayload(
                id=suffix.filter.id if suffix.filter else uuid.uuid5(request_id, "edit-filter"),
                type="filter",
                version=1,
                position=PositionPayload(x=suffix.aggregate.position.x - 260, y=220),
                config={"conditions": [c.model_dump(mode="json") for c in settings.filters]},
            )
        )
    aggregate = suffix.aggregate.model_copy(deep=True)
    if settings.comparison:
        chain.append(
            NodePayload(
                id=suffix.calendar.id
                if suffix.calendar
                else uuid.uuid5(request_id, "edit-calendar-period"),
                type="calendar_period",
                version=1,
                position=PositionPayload(x=aggregate.position.x - 180, y=80),
                config={
                    "date_column_id": settings.comparison.date_column_id,
                    "unit": settings.comparison.unit,
                },
            )
        )
    aggregate.config = aggregation_config(settings)
    chain.append(aggregate)
    chain.extend(
        formula_node(f, "summary", aggregate.position.x + 360 * (i + 1))
        for i, f in enumerate(settings.summary_formulas)
    )
    if settings.comparison:
        chain.append(
            NodePayload(
                id=suffix.comparison.id
                if suffix.comparison
                else uuid.uuid5(request_id, "edit-period-comparison"),
                type="period_comparison",
                version=1,
                position=PositionPayload(
                    x=aggregate.position.x + 360 * (len(settings.summary_formulas) + 1), y=80
                ),
                config={
                    **settings.comparison.model_dump(mode="json"),
                    "partitions": [
                        d for d in settings.dimensions if d != settings.comparison.date_column_id
                    ],
                },
            )
        )
    if len({n.id for n in chain}) != len(chain) or any(
        n.id in old_nodes and n.id not in suffix.owned for n in chain
    ):
        raise ApplicationError("INVALID_REPORT", "Formula identities conflict with existing steps.")
    for node in chain:
        if node.id in old_nodes:
            node.position = old_nodes[node.id].position.model_copy()
            node.ui = {**old_nodes[node.id].ui, **node.ui}
    payload = WorkflowSave(
        name=saved.name,
        expected_revision=saved.revision,
        format_version=3,
        nodes=[n.model_copy(deep=True) for n in saved.nodes if n.id not in suffix.owned] + chain,
        edges=[
            e.model_copy(deep=True) for e in saved.edges if e.target_node_id not in suffix.owned
        ],
        parameters=saved.parameters,
        presentation=saved.presentation,
        result_catalog=saved.result_catalog.model_copy(deep=True) if saved.result_catalog else None,
    )
    previous, port = suffix.upstream.source_node_id, suffix.upstream.source_port
    for node in chain:
        existing = next((e for e in saved.edges if e.target_node_id == node.id), None)
        payload.edges.append(
            EdgePayload(
                id=existing.id if existing else uuid.uuid5(request_id, f"formula-edge-{node.id}"),
                source_node_id=previous,
                source_port=port,
                target_node_id=node.id,
                target_port="input",
            )
        )
        previous, port = node.id, "dataset"
    if payload.result_catalog:
        for output in payload.result_catalog.outputs:
            if output.node_id == suffix.terminal.id:
                output.node_id = chain[-1].id
    return payload
