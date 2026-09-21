"""Resolve named schemas, materializing only validated data-dependent prefixes."""

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
    # Execution imports the resolver at its preflight boundary.
    from app.services.execution import ExecutionFailure, WorkflowExecutionService

    validation = WorkflowGraphValidator(registry).validate(graph)
    fatal = {
        "DUPLICATE_NODE_ID",
        "DUPLICATE_EDGE_ID",
        "MISSING_EDGE_NODE",
        "UNKNOWN_NODE_TYPE",
        "INVALID_EDGE_PORT",
        "INCOMPATIBLE_PORTS",
        "INVALID_FIELD_PROJECTION",
        "MAX_INPUT_CONNECTIONS",
        "MAX_OUTPUT_CONNECTIONS",
        "CYCLE_DETECTED",
    }
    if any(issue.code in fatal for issue in validation.issues):
        return SchemaResolutionResult((), validation.issues)
    nodes = {node.id: node for node in graph.nodes}
    resolved: dict[UUID, dict[str, ValueSchema]] = {}
    results: list[NodeSchemaResult] = []
    all_issues = list(validation.issues)
    for node_id in topological_order(graph.nodes, graph.edges):
        node = nodes[node_id]
        definition = registry.get(node.type, node.version)
        existing = tuple(issue for issue in validation.issues if issue.node_id == node_id)
        if existing:
            results.append(NodeSchemaResult(node_id, None, existing))
            continue
        inbound = [edge for edge in graph.edges if edge.target_node_id == node_id]
        if any(edge.source_node_id not in resolved for edge in inbound):
            issue = GraphIssue(
                "UPSTREAM_SCHEMA_UNAVAILABLE",
                "Connect and configure upstream nodes first.",
                node_id=node_id,
            )
            all_issues.append(issue)
            results.append(NodeSchemaResult(node_id, None, (issue,)))
            continue
        inputs: dict[str, ValueSchema] = {}
        input_failed = False
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
                all_issues.append(issue)
                results.append(NodeSchemaResult(node_id, None, (issue,)))
                input_failed = True
                break
        if input_failed:
            continue
        try:
            if isinstance(definition.executor, TypedNodeExecutor):
                outputs = definition.executor.infer_outputs(node, inputs, context)
                schema = next(
                    (output.table for output in outputs.values() if output.kind == "dataset"), None
                )
            else:
                if definition.schema_inference_mode == SchemaInferenceMode.UNKNOWN_UNTIL_EXECUTION:
                    raise ValueError("This node does not support output schema discovery.")
                input_schemas = {
                    port: value.table for port, value in inputs.items() if value.table is not None
                }
                checked = definition.executor.validate(node, input_schemas, context)
                if not checked.valid:
                    issues = tuple(
                        GraphIssue(i.code, i.message, node_id=node_id, field=i.field)
                        for i in checked.issues
                    )
                    all_issues.extend(issues)
                    results.append(NodeSchemaResult(node_id, None, issues))
                    continue
                if definition.schema_inference_mode == SchemaInferenceMode.DATA_DEPENDENT:
                    # All ancestors and this node's inputs/configuration have now
                    # passed schema validation. Execute only this prefix, without
                    # recursively asking this resolver for the same dynamic schema.
                    # The common engine retains resource limits and access checks.
                    schema = (
                        WorkflowExecutionService(registry)
                        ._execute(graph, node_id, context, preflight=False)
                        .schema
                    )
                else:
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
        except ExecutionFailure as exc:
            issues = exc.issues or (GraphIssue(exc.code, str(exc), node_id=exc.node_id or node_id),)
            all_issues.extend(issues)
            results.append(NodeSchemaResult(node_id, None, issues))
        except (ValueError, KeyError, StopIteration) as exc:
            issue = GraphIssue(
                "INVALID_TYPED_NODE",
                str(exc) or "A connected field is unavailable.",
                node_id=node_id,
                field="config",
            )
            all_issues.append(issue)
            results.append(NodeSchemaResult(node_id, None, (issue,)))
    return SchemaResolutionResult(tuple(results), tuple(all_issues))
