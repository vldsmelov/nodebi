import type { Edge } from "@xyflow/react";
import type { EditorNode } from "./WorkflowNodeCard";

/** Deterministic left-to-right DAG layers. Presentation positions only. */
export function layoutGraph<T extends Pick<EditorNode, "id" | "position" | "measured">>(nodes: T[], edges: Edge[]): T[] | null {
  const ids = new Set(nodes.map(node => node.id));
  const incoming = new Map(nodes.map(node => [node.id, 0]));
  const outgoing = new Map(nodes.map(node => [node.id, [] as string[]]));
  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) return null;
    incoming.set(edge.target, incoming.get(edge.target)! + 1);
    outgoing.get(edge.source)!.push(edge.target);
  }
  const levels = new Map(nodes.map(node => [node.id, 0]));
  const queue = nodes.filter(node => incoming.get(node.id) === 0).map(node => node.id);
  let processed = 0;
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index]; processed++;
    for (const target of outgoing.get(id)!) {
      levels.set(target, Math.max(levels.get(target)!, levels.get(id)! + 1));
      incoming.set(target, incoming.get(target)! - 1);
      if (incoming.get(target) === 0) queue.push(target);
    }
  }
  if (processed !== nodes.length) return null;
  const offsets = new Map<number, number>();
  const width = Math.max(256, ...nodes.map(node => node.measured?.width ?? 256)) + 110;
  const positions = new Map<string, { x: number; y: number }>();
  for (const node of [...nodes].sort((a, b) => a.id.localeCompare(b.id))) {
    const level = levels.get(node.id)!, y = offsets.get(level) ?? 80;
    offsets.set(level, y + Math.max(160, node.measured?.height ?? 160) + 60);
    positions.set(node.id, { x: 80 + level * width, y });
  }
  return nodes.map(node => ({ ...node, position: positions.get(node.id)! }));
}
