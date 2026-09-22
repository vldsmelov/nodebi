import type { GraphDraft } from "./autosave";
import type { NodeDefinition, WorkflowPosition, WorkflowSchemaResult } from "./types";
import type { FieldEndpoint } from "./field-interaction";
import { connectionError, readHandle, saveWire } from "./field-wires";
import { fieldDefaults } from "./FieldOperationConfiguration";

export type OperationChoice = { type: string; version: number; port: string };

/** Build real nodes and edges only; callers commit the entire draft as one history action. */
export function appendOperation(graph: GraphDraft, catalog: NodeDefinition[], schema: WorkflowSchemaResult | undefined, source: FieldEndpoint, choice: OperationChoice, position: WorkflowPosition, id = crypto.randomUUID()): GraphDraft | null {
  const endpoint = readHandle(source.handle);
  const output = schema?.nodes.find(node => node.node_id === source.nodeId)?.outputs?.[endpoint.port];
  if (!output || (endpoint.column && !output.columns?.some(column => column.column_id === endpoint.column))) return null;
  const definition = catalog.find(item => item.type === choice.type && item.version === choice.version);
  if (!definition?.input_ports.some(port => port.id === choice.port) || graph.nodes.some(node => node.id === id)) return null;
  const next: GraphDraft = { ...graph, nodes: [...graph.nodes, { id, type: definition.type, version: definition.version, position, config: { ...(fieldDefaults[definition.type] ?? {}) }, ui: {} }], edges: [...graph.edges] };
  const connection = { source: source.nodeId, sourceHandle: source.handle, target: id, targetHandle: choice.port };
  if (connectionError(next, catalog, connection, schema)) return null;
  next.edges.push(saveWire(connection));
  // The exact row context is an explicit dependency, never a guessed matching table.
  if ((endpoint.column || output.kind === "field") && ((choice.port === "value" && ["append_field", "field_filter", "field_sum", "field_scalar"].includes(choice.type)) || (choice.type === "bar_chart" && choice.version === 2 && ["category", "value"].includes(choice.port))) && output.row_context) {
    const context = output.row_context;
    const table = schema?.nodes.find(node => node.node_id === context.node_id)?.outputs?.[context.output_port];
    if (table?.kind === "dataset") {
      const tableConnection = { source: context.node_id, sourceHandle: context.output_port, target: id, targetHandle: "table" };
      if (connectionError(next, catalog, tableConnection, schema)) return null;
      next.edges.push(saveWire(tableConnection));
    }
  }
  // Existing composite metadata remains authoritative until its public-port editor is available.
  for (const edge of next.edges.slice(graph.edges.length)) {
    const block = graph.presentation?.blocks?.find(item => item.node_ids.includes(edge.source_node_id));
    if (block && !block.outputs?.some(port => port.node_id === edge.source_node_id && port.port === edge.source_port && (port.column_id ?? null) === (edge.source_column_id ?? null))) return null;
  }
  return next;
}

export function operationChoices(graph: GraphDraft, catalog: NodeDefinition[], schema: WorkflowSchemaResult | undefined, source: FieldEndpoint): OperationChoice[] {
  return catalog.flatMap(node => node.input_ports.flatMap(port => {
    const choice = { type: node.type, version: node.version, port: port.id };
    return appendOperation(graph, catalog, schema, source, choice, { x: 0, y: 0 }, "operation-candidate") ? [choice] : [];
  }));
}
