"""Recognize and patch a terminal analysis without taking ownership of manual preparation."""

import uuid
from dataclasses import dataclass

from pydantic import TypeAdapter, ValidationError

from app.domain.publications import PublishedOutput
from app.nodes.filter import FilterCondition, FilterConfig
from app.nodes.table_rollup import RollupMeasure
from app.schemas.statistical_reports import AnalysisSettings, StatisticalSettings
from app.schemas.workflows import (
    EdgePayload,
    NodePayload,
    PositionPayload,
    WorkflowRead,
    WorkflowSave,
)
from app.services.report_projection import references, table_input

ANALYSIS_TYPES = {
    "histogram": "histogram_chart",
    "boxplot_stats": "box_plot",
    "heatmap_stats": "heatmap_chart",
    "table_rollup": "analytical_table",
    "pareto": "pareto_chart",
    "funnel_steps": "funnel_chart",
    "waterfall_steps": "waterfall_chart",
}


@dataclass(frozen=True)
class StatisticalSuffix:
    node: NodePayload
    input_edge: EdgePayload
    filter: NodePayload | None = None
    filter_input: EdgePayload | None = None

    @property
    def owned(self) -> set[uuid.UUID]:
        return {self.node.id, *([self.filter.id] if self.filter else [])}

    @property
    def upstream(self) -> EdgePayload:
        return self.filter_input or self.input_edge


def recognize_statistics(saved: WorkflowRead, output: PublishedOutput) -> StatisticalSuffix | None:
    node = next((n for n in saved.nodes if n.id == output.node_id), None)
    if not node or node.type not in ANALYSIS_TYPES or node.version != 1:
        return None
    try:
        config: AnalysisSettings = TypeAdapter(AnalysisSettings).validate_python(
            {
                **node.config,
                "type": node.type,
                **(
                    {"order_column_id": node.config.get("order_column_id")}
                    if node.type == "waterfall_steps"
                    else {}
                ),
            }
        )
    except ValidationError:
        return None
    if set(node.config) - (set(type(config).model_fields) - {"type"}):
        return None
    if node.type == "table_rollup" and any(
        set(m) - set(RollupMeasure.model_fields) for m in node.config.get("measures", [])
    ):
        return None
    edge = table_input(saved, node.id)
    if edge is None:
        return None
    suffix = StatisticalSuffix(node, edge)
    candidate = next((n for n in saved.nodes if n.id == edge.source_node_id), None)
    if not candidate or (candidate.type, candidate.version) != ("filter", 1):
        return suffix
    upstream = table_input(saved, candidate.id)
    try:
        filters = FilterConfig.model_validate(candidate.config)
        simple = (
            not (set(candidate.config) - set(FilterConfig.model_fields))
            and all(
                not (set(c) - set(FilterCondition.model_fields))
                for c in candidate.config["conditions"]
            )
            and len(filters.conditions) <= 32
            and all(
                c.parameter is None
                and (c.value is None or type(c.value) in (str, bool, int, float))
                for c in filters.conditions
            )
        )
    except (ValidationError, KeyError, TypeError):
        simple = False
    if (
        upstream
        and simple
        and not references(saved, candidate.id)
        and sum(e.source_node_id == candidate.id for e in saved.edges) == 1
    ):
        return StatisticalSuffix(node, edge, candidate, upstream)
    return suffix


def patch_statistics(
    saved: WorkflowRead,
    suffix: StatisticalSuffix,
    settings: StatisticalSettings,
    request_id: uuid.UUID,
) -> WorkflowSave:
    # Keep node/UI/position identities; only the explicitly owned calculation settings change.
    node = suffix.node.model_copy(deep=True)
    node.config = settings.analysis.model_dump(mode="json", exclude={"type"})
    incoming = suffix.input_edge.model_copy(deep=True)
    nodes = [n for n in saved.nodes if n.id not in suffix.owned]
    edges = [e for e in saved.edges if e.target_node_id not in suffix.owned]
    if settings.filters:
        filtered = (
            suffix.filter.model_copy(deep=True)
            if suffix.filter
            else NodePayload(
                id=uuid.uuid5(request_id, "statistical-edit-filter"),
                type="filter",
                version=1,
                position=PositionPayload(x=node.position.x - 180, y=node.position.y),
                config={},
            )
        )
        filtered.config = {"conditions": [c.model_dump(mode="json") for c in settings.filters]}
        edge = (
            suffix.filter_input.model_copy(deep=True)
            if suffix.filter_input
            else incoming.model_copy(
                update={
                    "id": uuid.uuid5(request_id, "statistical-edit-input"),
                    "target_node_id": filtered.id,
                },
                deep=True,
            )
        )
        incoming.source_node_id, incoming.source_port = filtered.id, "dataset"
        nodes.append(filtered)
        edges.append(edge)
    else:
        incoming.source_node_id = suffix.upstream.source_node_id
        incoming.source_port = suffix.upstream.source_port
    nodes.append(node)
    edges.append(incoming)
    node_order = {n.id: i for i, n in enumerate(saved.nodes)}
    edge_order = {e.id: i for i, e in enumerate(saved.edges)}
    nodes.sort(key=lambda n: node_order.get(n.id, len(node_order)))
    edges.sort(key=lambda e: edge_order.get(e.id, len(edge_order)))
    return WorkflowSave(
        name=saved.name,
        expected_revision=saved.revision,
        format_version=saved.version,
        nodes=nodes,
        edges=edges,
        parameters=saved.parameters,
        presentation=saved.presentation,
        result_catalog=saved.result_catalog,
    )
