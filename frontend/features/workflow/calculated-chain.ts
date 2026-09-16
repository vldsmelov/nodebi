import type { Edge } from "@xyflow/react";
import type { EditorNode } from "./WorkflowNodeCard";
import type { NodeDefinition, ResolvedColumn } from "./types";
import { canConnect } from "./graph-interaction";
import { formulaParts } from "./formula-presentation";

export type CalculatedRow = { id: string; name: string; expression: string };
export const calculatedId = (id: string) => `calc_${id.replaceAll("-", "")}`;
export const normalizedName = (name: string) => name.trim().replace(/\s+/g, " ");
export function rowColumns(columns: ResolvedColumn[], rows: CalculatedRow[]): ResolvedColumn[] {
  return [...columns, ...rows.map(row => ({ column_id: calculatedId(row.id), engine_name: normalizedName(row.name), display_name: normalizedName(row.name), logical_type: "unknown", nullable: true, metadata: {} }))];
}
export function validRows(rows: CalculatedRow[], columns: ResolvedColumn[]) {
  return rows.length > 0 && rows.length <= 20 && rows.every((row, index) => {
    const previous = rowColumns(columns, rows.slice(0, index));
    const name = normalizedName(row.name);
    return name.length > 0 && name.length <= 255 && !!row.expression.trim() && row.expression.length <= 4096
      && !previous.some(column => column.engine_name === name)
      && formulaParts(row.expression, previous).every(part => !part.reference || !!part.column);
  });
}

/** Reconstruct only an actual consecutive chain; no stored recipe can override the graph. */
export function calculatedChain(nodes: EditorNode[], edges: Edge[], start: string): EditorNode[] {
  const chain: EditorNode[] = [], seen = new Set<string>();
  let node = nodes.find(node => node.id === start);
  while (node?.data.definition.type === "calculated_column" && node.data.definition.version === 1 && !seen.has(node.id) && chain.length < 20) {
    chain.push(node); seen.add(node.id);
    const outgoing = edges.filter(edge => edge.source === node!.id);
    if (outgoing.length !== 1 || outgoing[0].sourceHandle !== "dataset" || outgoing[0].targetHandle !== "input") break;
    const target = outgoing[0].target;
    if (edges.filter(edge => edge.target === target).length !== 1) break;
    node = nodes.find(node => node.id === target);
  }
  return chain;
}

export function appendCalculatedChain(nodes: EditorNode[], edges: Edge[], sourceId: string, definition: NodeDefinition, rows: CalculatedRow[]) {
  const source = nodes.find(node => node.id === sourceId);
  if (!source || definition.type !== "calculated_column" || rows.some(row => nodes.some(node => node.id === row.id)) || new Set(rows.map(row => row.id)).size !== rows.length) return null;
  const nextNodes = [...nodes], nextEdges = [...edges];
  let previous = source;
  for (const row of rows) {
    const position = { x: previous.position.x + 360, y: previous.position.y };
    while (nextNodes.some(node => Math.abs(node.position.x - position.x) < 300 && Math.abs(node.position.y - position.y) < 180)) position.y += 200;
    const next: EditorNode = { id: row.id, type: "workflowNode", position, data: { definition, config: { name: normalizedName(row.name), expression: row.expression } } };
    const connection = { source: previous.id, sourceHandle: "dataset", target: next.id, targetHandle: "input" };
    if (!canConnect([...nextNodes, next], nextEdges, connection)) return null;
    nextNodes.push(next); nextEdges.push({ ...connection, id: crypto.randomUUID(), animated: true }); previous = next;
  }
  return { nodes: nextNodes, edges: nextEdges };
}
