import type { Edge } from "@xyflow/react";
import type { EditorNode } from "./WorkflowNodeCard";
import type { NodeDefinition } from "./types";
import { canConnect } from "./graph-interaction";
export type PlannedStep = { id: string; type: string; config: Record<string, unknown>; fields?: string[] };

/** Build one complete proposed branch before changing any editor state. */
export function appendUnaryChain(nodes: EditorNode[], edges: Edge[], sourceId: string, catalog: NodeDefinition[], steps: PlannedStep[]) {
  const source = nodes.find(node => node.id === sourceId);
  if (!source || !steps.length || steps.some(step => nodes.some(node => node.id === step.id)) || new Set(steps.map(step => step.id)).size !== steps.length) return null;
  const nextNodes = [...nodes], nextEdges = [...edges]; let previous = source;
  for (const step of steps) {
    const definition = catalog.find(item => item.type === step.type && item.version === 1);
    if (!definition) return null;
    const position = { x: previous.position.x + 360, y: previous.position.y };
    while (nextNodes.some(node => Math.abs(node.position.x - position.x) < 300 && Math.abs(node.position.y - position.y) < 180)) position.y += 200;
    const next: EditorNode = { id: step.id, type: "workflowNode", position, data: { definition, config: step.config } };
    const connection = { source: previous.id, sourceHandle: "dataset", target: next.id, targetHandle: "input" };
    if (!canConnect([...nextNodes, next], nextEdges, connection)) return null;
    nextNodes.push(next); nextEdges.push({ ...connection, id: crypto.randomUUID(), animated: true }); previous = next;
  }
  return { nodes: nextNodes, edges: nextEdges };
}
