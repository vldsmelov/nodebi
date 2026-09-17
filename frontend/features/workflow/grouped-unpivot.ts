import type { Edge } from "@xyflow/react";
import type { EditorNode } from "./WorkflowNodeCard";
import type { NodeDefinition, ResolvedColumn } from "./types";
import { normalizedName } from "./calculated-chain";
import { appendUnaryChain, type PlannedStep } from "./unary-chain";
import { canConnect } from "./graph-interaction";
export type UnpivotGroup = { id: string; name: string };
export type UnpivotField = { id: string; group: string; label: string; identifier: boolean };
export type GroupedUnpivotPlan = { branches: PlannedStep[][]; unions: string[] };
export function groupedUnpivotPlan(columns: ResolvedColumn[], groups: UnpivotGroup[], fields: UnpivotField[], groupField: string): GroupedUnpivotPlan | null {
  const name = normalizedName(groupField), groupNames = groups.map(group => normalizedName(group.name));
  const identifiers = fields.filter(field => field.identifier), values = fields.filter(field => field.group && !field.identifier);
  const byId = new Map(columns.map(column => [column.column_id, column]));
  const reserved = new Set(["field_id", "field_name", "value", name]);
  if (!name || name.length > 255 || reserved.size !== 4 || identifiers.some(field => reserved.has(byId.get(field.id)?.engine_name ?? ""))) return null;
  if (!groups.length || groups.length > 10 || new Set(groupNames).size !== groups.length || groupNames.some(name => !name || name.length > 255)) return null;
  if (new Set(fields.map(field => field.id)).size !== fields.length || fields.some(field => !byId.has(field.id))) return null;
  if (!values.length || values.some(field => !groups.some(group => group.id === field.group) || !normalizedName(field.label) || normalizedName(field.label).length > 255)) return null;
  const types = new Set(values.map(field => byId.get(field.id)!.logical_type));
  // Union requires matching types; ask for explicit upstream conversion instead of guessing.
  if (types.size !== 1 || types.has("unknown")) return null;
  const branches: PlannedStep[][] = [];
  for (const group of groups) {
    const selected = values.filter(field => field.group === group.id);
    if (!selected.length || selected.length > 1024) return null;
    branches.push([
      { id: crypto.randomUUID(), type: "unpivot", config: { identifiers: identifiers.map(field => field.id), columns: selected.map(field => field.id), labels: Object.fromEntries(selected.map(field => [field.id, normalizedName(field.label)])) }, fields: selected.map(field => normalizedName(field.label)) },
      { id: crypto.randomUUID(), type: "calculated_column", config: { name, expression: JSON.stringify(normalizedName(group.name)) }, fields: [normalizedName(group.name)] },
    ]);
  }
  return { branches, unions: groups.slice(1).map(() => crypto.randomUUID()) };
}
export function appendGroupedUnpivot(nodes: EditorNode[], edges: Edge[], sourceId: string, catalog: NodeDefinition[], plan: GroupedUnpivotPlan) {
  let graph = { nodes, edges }; const outputs: string[] = [];
  for (const branch of plan.branches) {
    const next = appendUnaryChain(graph.nodes, graph.edges, sourceId, catalog, branch); if (!next) return null;
    graph = next; outputs.push(branch[branch.length - 1].id);
  }
  if (!outputs.length || plan.unions.length !== outputs.length - 1) return null;
  let last = outputs[0];
  for (let index = 1; index < outputs.length; index++) {
    const definition = catalog.find(node => node.type === "union" && node.version === 1);
    const left = graph.nodes.find(node => node.id === last)!, right = graph.nodes.find(node => node.id === outputs[index])!;
    if (!definition || graph.nodes.some(node => node.id === plan.unions[index - 1])) return null;
    const node: EditorNode = { id: plan.unions[index - 1], type: "workflowNode", position: { x: Math.max(left.position.x, right.position.x) + 360, y: right.position.y }, data: { definition, config: {} } };
    const nextNodes = [...graph.nodes, node], nextEdges = [...graph.edges];
    for (const [source, targetHandle] of [[last, "left"], [right.id, "right"]]) {
      const connection = { source, sourceHandle: "dataset", target: node.id, targetHandle };
      if (!canConnect(nextNodes, nextEdges, connection)) return null;
      nextEdges.push({ ...connection, id: crypto.randomUUID(), animated: true });
    }
    graph = { nodes: nextNodes, edges: nextEdges }; last = node.id;
  }
  return { ...graph, last };
}
