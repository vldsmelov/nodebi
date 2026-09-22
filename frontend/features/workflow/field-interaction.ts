import type { GraphDraft } from "./autosave";
import type { NodeDefinition, WorkflowSchemaResult } from "./types";
import { connectionError, readHandle } from "./field-wires";

export type FieldEndpoint = { nodeId: string; handle: string };
export type InputHint = { state: "compatible" | "blocked" | "pending"; message: string };
export function inputHint(graph: GraphDraft, catalog: NodeDefinition[], source: FieldEndpoint, target: string, port: string, schema?: WorkflowSchemaResult): InputHint {
  const error = connectionError(graph, catalog, { source: source.nodeId, sourceHandle: source.handle, target, targetHandle: port }, schema);
  if (error) return { state: "blocked", message: error };
  const endpoint = readHandle(source.handle);
  if (!schema?.nodes.find(node => node.node_id === source.nodeId)?.outputs?.[endpoint.port]) return { state: "pending", message: "Waiting for a current schema." };
  return { state: "compatible", message: "Compatible input" };
}

/** Trace explicit field-expression wiring, never infer lineage across table transformations. */
export function fieldPath(graph: GraphDraft, catalog: NodeDefinition[], start: FieldEndpoint): Set<string> {
  const result = new Set<string>();
  const ports = (id: string) => {
    const node = graph.nodes.find(item => item.id === id);
    return catalog.find(item => item.type === node?.type && item.version === node.version)?.output_ports ?? [];
  };
  const expressions = (id: string) => ports(id).filter(port => port.kind !== "dataset");
  const seenUp = new Set<string>(), seenDown = new Set<string>();
  const up = (point: FieldEndpoint) => {
    const key = JSON.stringify(point), endpoint = readHandle(point.handle);
    if (seenUp.has(key) || endpoint.column || !expressions(point.nodeId).some(port => port.id === endpoint.port)) return;
    seenUp.add(key);
    for (const edge of graph.edges.filter(item => item.target_node_id === point.nodeId)) {
      result.add(edge.id);
      up({ nodeId: edge.source_node_id, handle: edge.source_column_id ? JSON.stringify([edge.source_port, edge.source_column_id]) : edge.source_port });
    }
  };
  const down = (point: FieldEndpoint) => {
    const key = JSON.stringify(point), endpoint = readHandle(point.handle);
    if (seenDown.has(key)) return;
    seenDown.add(key);
    for (const edge of graph.edges.filter(item => item.source_node_id === point.nodeId && item.source_port === endpoint.port && (!endpoint.column || item.source_column_id === endpoint.column))) {
      result.add(edge.id);
      for (const output of expressions(edge.target_node_id)) down({ nodeId: edge.target_node_id, handle: output.id });
    }
  };
  up(start); down(start);
  return result;
}
