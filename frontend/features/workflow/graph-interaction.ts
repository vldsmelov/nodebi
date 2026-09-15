import type { Connection, Edge } from "@xyflow/react";
import type { EditorNodeData, EditorNode } from "./WorkflowNodeCard";

export function nodeLabel(data: EditorNodeData, fallback: string): string {
  for (const value of [data.ui?.label, data.config.title, data.config.name, data.config.sheet_name]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

/** Validate a proposed edge against the final graph, including replacement of one input. */
export function canConnect(nodes: EditorNode[], edges: Edge[], connection: Connection, replaceInput = false): boolean {
  const source = nodes.find(node => node.id === connection.source);
  const target = nodes.find(node => node.id === connection.target);
  const output = source?.data.definition.output_ports.find(port => port.id === connection.sourceHandle);
  const input = target?.data.definition.input_ports.find(port => port.id === connection.targetHandle);
  if (!output || !input || output.kind !== input.kind) return false;
  const remaining = replaceInput ? edges.filter(edge => !(edge.target === connection.target && edge.targetHandle === connection.targetHandle)) : edges;
  if (remaining.some(edge => edge.source === connection.source && edge.sourceHandle === connection.sourceHandle && edge.target === connection.target && edge.targetHandle === connection.targetHandle)) return false;
  if (output.max_connections !== null && remaining.filter(edge => edge.source === connection.source && edge.sourceHandle === connection.sourceHandle).length >= output.max_connections) return false;
  if (input.max_connections !== null && remaining.filter(edge => edge.target === connection.target && edge.targetHandle === connection.targetHandle).length >= input.max_connections) return false;
  const seen = new Set<string>(), pending = [connection.target];
  while (pending.length) {
    const id = pending.pop()!;
    if (id === connection.source) return false;
    if (seen.has(id)) continue;
    seen.add(id);
    pending.push(...remaining.filter(edge => edge.source === id).map(edge => edge.target));
  }
  return true;
}

export type DependencyView = "all" | "ancestors" | "descendants";
export function dependencyIds(edges: Edge[], selected: string, direction: Exclude<DependencyView, "all">): Set<string> {
  const ids = new Set([selected]), pending = [selected];
  while (pending.length) {
    const id = pending.pop()!;
    for (const edge of edges) {
      const next = direction === "ancestors" ? (edge.target === id ? edge.source : null) : (edge.source === id ? edge.target : null);
      if (next && !ids.has(next)) { ids.add(next); pending.push(next); }
    }
  }
  return ids;
}
