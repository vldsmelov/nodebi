import type { Connection, Edge } from "@xyflow/react";
import type { GraphDraft } from "./autosave";
import type { NodeDefinition, WorkflowEdge, WorkflowSchemaResult } from "./types";

/** Handle encoding is presentation only; the saved edge has an explicit column ID. */
export const fieldHandle = (port: string, column?: string | null) => column ? JSON.stringify([port, column]) : port;
export function readHandle(handle: string): { port: string; column?: string } {
  if (handle.startsWith("[")) {
    try { const value = JSON.parse(handle); if (Array.isArray(value) && value.length === 2 && value.every(item => typeof item === "string")) return { port: value[0], column: value[1] }; } catch { /* unavailable handle */ }
  }
  return { port: handle };
}
export const renderWire = (edge: WorkflowEdge): Edge => ({ id: edge.id, source: edge.source_node_id, target: edge.target_node_id, sourceHandle: fieldHandle(edge.source_port, edge.source_column_id), targetHandle: edge.target_port });
export function saveWire(connection: Connection, id = crypto.randomUUID()): WorkflowEdge {
  const source = readHandle(connection.sourceHandle ?? "");
  return { id, source_node_id: connection.source, source_port: source.port, target_node_id: connection.target, target_port: connection.targetHandle ?? "", ...(source.column ? { source_column_id: source.column } : {}) };
}
export function connectionError(graph: GraphDraft, catalog: NodeDefinition[], connection: Connection, schema?: WorkflowSchemaResult): string | null {
  const source = graph.nodes.find(node => node.id === connection.source), target = graph.nodes.find(node => node.id === connection.target);
  if (!source || !target) return "Select available nodes.";
  const endpoint = readHandle(connection.sourceHandle ?? "");
  const output = catalog.find(item => item.type === source.type)?.output_ports.find(port => port.id === endpoint.port);
  const input = catalog.find(item => item.type === target.type)?.input_ports.find(port => port.id === connection.targetHandle);
  if (!output || !input || (endpoint.column && output.kind !== "dataset")) return "Select compatible ports.";
  const resolved = schema?.nodes.find(node => node.node_id === source.id)?.outputs?.[endpoint.port];
  if (endpoint.column && resolved?.columns && !resolved.columns.some(column => column.column_id === endpoint.column)) return "Selected field is unavailable.";
  const kinds = endpoint.column ? ["field"] : resolved ? [resolved.kind] : [output.kind, ...(output.accepted_kinds ?? [])];
  if (!kinds.some(kind => [input.kind, ...(input.accepted_kinds ?? [])].includes(kind))) return "Select compatible ports.";
  const remaining = graph.edges.filter(edge => !(edge.target_node_id === target.id && edge.target_port === input.id));
  if (output.max_connections !== null && remaining.filter(edge => edge.source_node_id === source.id && edge.source_port === endpoint.port).length >= output.max_connections) return "This output has no free connections.";
  const pending = [target.id], visited = new Set<string>();
  while (pending.length) {
    const id = pending.pop()!;
    if (id === source.id) return "This connection would create a cycle.";
    if (visited.has(id)) continue;
    visited.add(id); pending.push(...remaining.filter(edge => edge.source_node_id === id).map(edge => edge.target_node_id));
  }
  const rowContext = (nodeId: string, port: string, column?: string | null) => {
    const value = schema?.nodes.find(node => node.node_id === nodeId)?.outputs?.[port];
    return (column || value?.kind === "field" || value?.kind === "dataset") && value?.row_context ? JSON.stringify(value.row_context) : null;
  };
  if (["field_arithmetic", "field_compare", "field_logical", "append_field", "field_filter", "field_sum"].includes(target.type)) {
    const context = rowContext(source.id, endpoint.port, endpoint.column);
    if (context && remaining.some(edge => edge.target_node_id === target.id && (() => { const other = rowContext(edge.source_node_id, edge.source_port, edge.source_column_id); return other && other !== context; })())) return "Fields use different rows. Join the tables first.";
  }
  return null;
}
