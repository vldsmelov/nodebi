import uuid
from collections import defaultdict
from dataclasses import dataclass
from typing import Literal

from pydantic import ValidationError

from app.domain.datasets import DatasetSchema
from app.domain.nodes import (
    ExecutionContext,
    NodeDefinition,
    NodeRegistry,
    PortDefinition,
    SchemaInferenceMode,
    UnknownNodeTypeError,
)
from app.domain.workflows import NodeInstance, WorkflowEdge, WorkflowGraph


@dataclass(frozen=True)
class GraphIssue:
    code: str
    message: str
    severity: Literal["error", "warning"] = "error"
    node_id: uuid.UUID | None = None
    edge_id: uuid.UUID | None = None
    field: str | None = None


@dataclass(frozen=True)
class GraphValidationResult:
    issues: tuple[GraphIssue, ...] = ()

    @property
    def valid(self) -> bool:
        return not any(issue.severity == "error" for issue in self.issues)


class InvalidWorkflowError(ValueError):
    def __init__(self, issues: tuple[GraphIssue, ...]) -> None:
        super().__init__("Workflow graph is invalid.")
        self.issues = issues


def _port(definition: NodeDefinition, port_id: str, *, output: bool) -> PortDefinition | None:
    ports = definition.output_ports if output else definition.input_ports
    return next((port for port in ports if port.id == port_id), None)


class WorkflowGraphValidator:
    def __init__(self, registry: NodeRegistry) -> None:
        self.registry = registry

    def validate(self, graph: WorkflowGraph) -> GraphValidationResult:
        issues: list[GraphIssue] = []
        node_ids = [node.id for node in graph.nodes]
        edge_ids = [edge.id for edge in graph.edges]
        for duplicate in _duplicates(node_ids):
            issues.append(
                GraphIssue("DUPLICATE_NODE_ID", "Node IDs must be unique.", node_id=duplicate)
            )
        for duplicate in _duplicates(edge_ids):
            issues.append(
                GraphIssue("DUPLICATE_EDGE_ID", "Edge IDs must be unique.", edge_id=duplicate)
            )

        nodes = {node.id: node for node in graph.nodes}
        definitions: dict[uuid.UUID, NodeDefinition] = {}
        for node in graph.nodes:
            try:
                definition = self.registry.get(node.type, node.version)
                definitions[node.id] = definition
            except UnknownNodeTypeError as exc:
                issues.append(GraphIssue("UNKNOWN_NODE_TYPE", str(exc), node_id=node.id))
                continue
            try:
                definition.config_schema.model_validate(node.config)
            except ValidationError as exc:
                issues.append(
                    GraphIssue(
                        "INVALID_NODE_CONFIGURATION", str(exc), node_id=node.id, field="config"
                    )
                )

        incoming: dict[tuple[uuid.UUID, str], int] = defaultdict(int)
        outgoing: dict[tuple[uuid.UUID, str], int] = defaultdict(int)
        valid_edges: list[WorkflowEdge] = []
        for edge in graph.edges:
            source = nodes.get(edge.source_node_id)
            target = nodes.get(edge.target_node_id)
            if source is None or target is None:
                issues.append(
                    GraphIssue(
                        "MISSING_EDGE_NODE", "Edge references a missing node.", edge_id=edge.id
                    )
                )
                continue
            source_definition = definitions.get(source.id)
            target_definition = definitions.get(target.id)
            if source_definition is None or target_definition is None:
                continue
            source_port = _port(source_definition, edge.source_port, output=True)
            target_port = _port(target_definition, edge.target_port, output=False)
            if source_port is None or target_port is None:
                issues.append(
                    GraphIssue(
                        "INVALID_EDGE_PORT", "Edge references an unknown port.", edge_id=edge.id
                    )
                )
                continue
            if source_port.kind != target_port.kind:
                issues.append(
                    GraphIssue(
                        "INCOMPATIBLE_PORTS",
                        "Connected ports have incompatible kinds.",
                        edge_id=edge.id,
                    )
                )
                continue
            incoming[(target.id, target_port.id)] += 1
            outgoing[(source.id, source_port.id)] += 1
            valid_edges.append(edge)

        for node_id, definition in definitions.items():
            for port in definition.input_ports:
                count = incoming[(node_id, port.id)]
                if port.required and count == 0:
                    issues.append(
                        GraphIssue(
                            "MISSING_REQUIRED_INPUT",
                            f"Required input '{port.id}' is not connected.",
                            node_id=node_id,
                            field=port.id,
                        )
                    )
                if port.max_connections is not None and count > port.max_connections:
                    issues.append(
                        GraphIssue(
                            "MAX_INPUT_CONNECTIONS",
                            f"Input '{port.id}' exceeds its connection limit "
                            f"of {port.max_connections}.",
                            node_id=node_id,
                            field=port.id,
                        )
                    )
            for port in definition.output_ports:
                count = outgoing[(node_id, port.id)]
                if port.max_connections is not None and count > port.max_connections:
                    issues.append(
                        GraphIssue(
                            "MAX_OUTPUT_CONNECTIONS",
                            f"Output '{port.id}' exceeds its connection limit "
                            f"of {port.max_connections}.",
                            node_id=node_id,
                            field=port.id,
                        )
                    )

        if not any(issue.code in {"DUPLICATE_NODE_ID", "MISSING_EDGE_NODE"} for issue in issues):
            try:
                topological_order(graph.nodes, tuple(valid_edges))
            except InvalidWorkflowError as exc:
                issues.extend(exc.issues)
        return GraphValidationResult(tuple(issues))


def _duplicates(values: list[uuid.UUID]) -> tuple[uuid.UUID, ...]:
    seen: set[uuid.UUID] = set()
    duplicates: set[uuid.UUID] = set()
    for value in values:
        if value in seen:
            duplicates.add(value)
        seen.add(value)
    return tuple(sorted(duplicates, key=str))


def topological_order(
    nodes: tuple[NodeInstance, ...], edges: tuple[WorkflowEdge, ...]
) -> tuple[uuid.UUID, ...]:
    node_ids = {node.id for node in nodes}
    if any(
        edge.source_node_id not in node_ids or edge.target_node_id not in node_ids for edge in edges
    ):
        raise InvalidWorkflowError(
            (GraphIssue("MISSING_EDGE_NODE", "Edge references a missing node."),)
        )
    indegree = {node_id: 0 for node_id in node_ids}
    outgoing: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    for edge in edges:
        outgoing[edge.source_node_id].append(edge.target_node_id)
        indegree[edge.target_node_id] += 1
    ready = sorted((node_id for node_id, degree in indegree.items() if degree == 0), key=str)
    order: list[uuid.UUID] = []
    while ready:
        node_id = ready.pop(0)
        order.append(node_id)
        for target_id in sorted(outgoing[node_id], key=str):
            indegree[target_id] -= 1
            if indegree[target_id] == 0:
                ready.append(target_id)
                ready.sort(key=str)
    if len(order) != len(node_ids):
        cyclic = sorted((node_id for node_id, degree in indegree.items() if degree > 0), key=str)
        raise InvalidWorkflowError(
            tuple(
                GraphIssue("CYCLE_DETECTED", "Workflow contains a cycle.", node_id=node_id)
                for node_id in cyclic
            )
        )
    return tuple(order)


@dataclass(frozen=True)
class NodeSchemaResult:
    node_id: uuid.UUID
    schema: DatasetSchema | None
    issues: tuple[GraphIssue, ...] = ()


@dataclass(frozen=True)
class SchemaResolutionResult:
    nodes: tuple[NodeSchemaResult, ...]
    issues: tuple[GraphIssue, ...]

    @property
    def valid(self) -> bool:
        return not any(issue.severity == "error" for issue in self.issues)


class WorkflowSchemaResolver:
    def __init__(self, registry: NodeRegistry) -> None:
        self.registry = registry

    def resolve(self, graph: WorkflowGraph, context: ExecutionContext) -> SchemaResolutionResult:
        validation = WorkflowGraphValidator(self.registry).validate(graph)
        fatal_codes = {
            "DUPLICATE_NODE_ID",
            "DUPLICATE_EDGE_ID",
            "MISSING_EDGE_NODE",
            "UNKNOWN_NODE_TYPE",
            "INVALID_EDGE_PORT",
            "INCOMPATIBLE_PORTS",
            "MAX_INPUT_CONNECTIONS",
            "MAX_OUTPUT_CONNECTIONS",
            "CYCLE_DETECTED",
        }
        if any(issue.code in fatal_codes for issue in validation.issues):
            return SchemaResolutionResult((), validation.issues)
        order = topological_order(graph.nodes, graph.edges)
        nodes = {node.id: node for node in graph.nodes}
        schemas: dict[uuid.UUID, DatasetSchema] = {}
        results: list[NodeSchemaResult] = []
        all_issues = list(validation.issues)
        for node_id in order:
            node = nodes[node_id]
            existing_issues = tuple(
                issue
                for issue in validation.issues
                if issue.node_id == node_id and issue.severity == "error"
            )
            if existing_issues:
                results.append(NodeSchemaResult(node_id, None, existing_issues))
                continue
            definition = self.registry.get(node.type, node.version)
            input_schemas = {
                edge.target_port: schemas[edge.source_node_id]
                for edge in graph.edges
                if edge.target_node_id == node_id and edge.source_node_id in schemas
            }
            node_validation = definition.executor.validate(node, input_schemas, context)
            node_issues = tuple(
                GraphIssue(issue.code, issue.message, node_id=node_id, field=issue.field)
                for issue in node_validation.issues
            )
            if node_issues:
                results.append(NodeSchemaResult(node_id, None, node_issues))
                all_issues.extend(node_issues)
                continue
            if definition.schema_inference_mode == SchemaInferenceMode.UNKNOWN_UNTIL_EXECUTION:
                warning = GraphIssue(
                    "SCHEMA_UNKNOWN_UNTIL_EXECUTION",
                    "Schema is unavailable until this node executes.",
                    "warning",
                    node_id=node_id,
                )
                results.append(NodeSchemaResult(node_id, None, (warning,)))
                all_issues.append(warning)
                continue
            try:
                schema = definition.executor.infer_schema(node, input_schemas, context)
                schemas[node_id] = schema
                results.append(NodeSchemaResult(node_id, schema))
            except Exception as exc:
                issue = GraphIssue("SCHEMA_INFERENCE_FAILED", str(exc), node_id=node_id)
                results.append(NodeSchemaResult(node_id, None, (issue,)))
                all_issues.append(issue)
        return SchemaResolutionResult(tuple(results), tuple(all_issues))
