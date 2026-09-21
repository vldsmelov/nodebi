"""Resolve named value schemas before any typed branch is materialized."""

from uuid import UUID

from app.domain.nodes import (
    ExecutionContext,
    NodeRegistry,
    PortKind,
    SchemaInferenceMode,
    TypedNodeExecutor,
)
from app.domain.values import RowContext, ValueSchema
from app.domain.workflows import WorkflowGraph
from app.services.workflow_validation import (
    GraphIssue,
    NodeSchemaResult,
    SchemaResolutionResult,
    WorkflowGraphValidator,
    topological_order,
)


def resolve_typed_schema(
    registry: NodeRegistry, graph: WorkflowGraph, context: ExecutionContext
) -> SchemaResolutionResult:
    validation = WorkflowGraphValidator(registry).validate(graph)
    if not validation.valid:
        return SchemaResolutionResult((), validation.issues)
    nodes = {node.id: node for node in graph.nodes}
    resolved: dict[UUID, dict[str, ValueSchema]] = {}
    results: list[NodeSchemaResult] = []
    for node_id in topological_order(graph.nodes, graph.edges):
        node = nodes[node_id]
        definition = registry.get(node.type, node.version)
        inbound = [edge for edge in graph.edges if edge.target_node_id == node_id]
        inputs: dict[str, ValueSchema] = {}
        for edge in inbound:
            try:
                value = resolved[edge.source_node_id][edge.source_port]
                if edge.source_column_id is not None:
                    value = value.project(edge.source_column_id)
                port = next(port for port in definition.input_ports if port.id == edge.target_port)
                if PortKind(value.kind) not in {port.kind, *port.accepted_kinds}:
                    raise ValueError("The resolved output kind is incompatible with this input.")
                inputs[edge.target_port] = value
            except (ValueError, KeyError) as exc:
                issue = GraphIssue(
                    "INVALID_FIELD_CONNECTION",
                    str(exc),
                    node_id=node_id,
                    edge_id=edge.id,
                    field=edge.target_port,
                )
                return SchemaResolutionResult(tuple(results), (issue,))
        try:
            if isinstance(definition.executor, TypedNodeExecutor):
                outputs = definition.executor.infer_outputs(node, inputs, context)
                schema = next(
                    (output.table for output in outputs.values() if output.kind == "dataset"), None
                )
            else:
                if definition.schema_inference_mode != SchemaInferenceMode.STATIC:
                    raise ValueError(
                        "Data-dependent outputs are not yet supported in typed branches."
                    )
                input_schemas = {
                    port: value.table for port, value in inputs.items() if value.table is not None
                }
                checked = definition.executor.validate(node, input_schemas, context)
                if not checked.valid:
                    issues = tuple(
                        GraphIssue(i.code, i.message, node_id=node_id, field=i.field)
                        for i in checked.issues
                    )
                    return SchemaResolutionResult(tuple(results), issues)
                schema = definition.executor.infer_schema(node, input_schemas, context)
                outputs = {
                    port.id: ValueSchema(
                        "dataset", table=schema, context=RowContext(graph.id, node_id, port.id)
                    )
                    for port in definition.output_ports
                }
            if outputs.keys() != {port.id for port in definition.output_ports}:
                raise ValueError("Executor schema does not match its declared output ports.")
            for port in definition.output_ports:
                if PortKind(outputs[port.id].kind) not in {port.kind, *port.accepted_kinds}:
                    raise ValueError("Executor schema returned an incompatible output kind.")
            resolved[node_id] = outputs
            results.append(NodeSchemaResult(node_id, schema, outputs=outputs))
        except (ValueError, KeyError, StopIteration) as exc:
            issue = GraphIssue(
                "INVALID_TYPED_NODE",
                str(exc) or "A connected field is unavailable.",
                node_id=node_id,
                field="config",
            )
            return SchemaResolutionResult(tuple(results), (issue,))
    return SchemaResolutionResult(tuple(results), ())
