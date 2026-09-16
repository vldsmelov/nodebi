import type { Edge } from "@xyflow/react";
import type { EditorNode } from "./WorkflowNodeCard";
import type { NodeDefinition, ResolvedColumn } from "./types";
import { appendUnaryChain } from "./unary-chain";
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
  if (definition.type !== "calculated_column") return null;
  return appendUnaryChain(nodes, edges, sourceId, [definition], rows.map(row => ({ id: row.id, type: definition.type, config: { name: normalizedName(row.name), expression: row.expression } })));
}
