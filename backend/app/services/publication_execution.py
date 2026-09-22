"""Compile saved view restrictions into ordinary, inspectable execution steps."""

from dataclasses import replace
from uuid import UUID, uuid5

from app.domain.nodes import NodeRegistry
from app.domain.publications import PublishedOutput, ResultCatalog, ViewContext
from app.domain.workflows import NodeInstance, WorkflowEdge, WorkflowGraph
from app.nodes.context_filter import ContextFilterConfig
from app.services.execution import ExecutionPlanner


def compile_publication(
    graph: WorkflowGraph,
    publication: PublishedOutput,
    catalog: ResultCatalog,
    view: ViewContext,
    registry: NodeRegistry,
) -> tuple[WorkflowGraph, UUID, list[str], list[str]]:
    plan = ExecutionPlanner(registry).plan(graph, publication.node_id)
    reachable = {node.id for node in plan.graph.nodes}
    contexts = [item for item in catalog.contexts if item.id in publication.context_ids]
    roles = {role.name: role for item in contexts for role in item.roles}
    ignored = set(publication.ignored_roles) | set(view.highlight_only)
    if set(view.highlight_only) - set(roles):
        raise ValueError("Highlight-only selection references an unavailable context role.")
    if set(view.highlight_only) - set(publication.semantic_fields):
        raise ValueError("Choose a stable output field for highlighting.")
    values = {name: role.checked(view.values.get(name)) for name, role in roles.items()}
    nodes = list(plan.graph.nodes)
    edges = list(plan.graph.edges)
    target = publication.node_id
    applied: list[str] = []
    points = [(item, point) for item in contexts for point in item.points]
    period_supported = any(
        point.role == "period" and point.node_id in reachable for _, point in points
    )
    unsupported = ["period"] if view.period and not period_supported else []
    endpoints: dict[tuple[UUID, str], UUID] = {}
    for data_context, point in points:
        if point.node_id not in reachable:
            continue
        if point.role in ignored or (point.role == "period" and view.period is None):
            continue
        if point.role != "period" and values.get(point.role) is None:
            continue
        parent = next(node for node in nodes if node.id == point.node_id)
        if not any(
            port.id == point.port and port.kind.value == "dataset"
            for port in registry.get(parent.type, parent.version).output_ports
        ):
            raise ValueError("Context restrictions must reference a table output.")
        identity = uuid5(
            graph.id, f"context:{data_context.id}:{point.node_id}:{point.port}:{point.role}"
        )
        config = ContextFilterConfig(
            column_id=point.column_id,
            role=point.role,
            value=values.get(point.role),
            start=view.period.start.isoformat() if view.period and point.role == "period" else None,
            end=view.period.end.isoformat() if view.period and point.role == "period" else None,
            timezone=data_context.timezone,
            logical_type=roles[point.role].logical_type if point.role != "period" else None,
        )
        upstream = endpoints.get((point.node_id, point.port), point.node_id)
        upstream_port = "dataset" if upstream != point.node_id else point.port
        edges = [
            replace(edge, source_node_id=identity, source_port="dataset")
            if edge.source_node_id == upstream and edge.source_port == upstream_port
            else edge
            for edge in edges
        ]
        edges.append(
            WorkflowEdge(uuid5(identity, "input"), upstream, upstream_port, identity, "input")
        )
        nodes.append(
            NodeInstance(
                identity,
                "context_filter",
                1,
                parent.position,
                config.model_dump(),
                {"label": point.role},
            )
        )
        endpoints[(point.node_id, point.port)] = identity
        if publication.node_id == point.node_id and publication.port == point.port:
            target = identity
        applied.append(
            "period" if point.role == "period" else roles[point.role].label or point.role
        )
    return replace(graph, nodes=tuple(nodes), edges=tuple(edges)), target, applied, unsupported
