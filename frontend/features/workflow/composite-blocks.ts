import type { Connection, Edge } from "@xyflow/react";
import type { components } from "@/lib/api-schema";
import type { GraphDraft } from "./autosave";
import { fieldHandle, readHandle } from "./field-wires";

export type CompositeBlock = components["schemas"]["CompositeBlock"];
type PublicPort = components["schemas"]["PublicPort"];
export const blockCanvasId = (id: string) => `block:${id}`;
export const memberBlock = (graph: GraphDraft, id: string) => graph.presentation?.blocks?.find(block => block.node_ids.includes(id));
const sameEndpoint = (a: PublicPort, b: PublicPort) => a.node_id === b.node_id && a.port === b.port && (a.column_id ?? null) === (b.column_id ?? null);

/** Preserve existing public identities; export each new boundary endpoint once. */
export function reconcileBlocks(graph: GraphDraft): GraphDraft {
  if (!graph.presentation?.blocks?.length) return graph;
  const blocks = graph.presentation.blocks.flatMap(block => {
    const node_ids = block.node_ids.filter(id => graph.nodes.some(node => node.id === id));
    if (!node_ids.length) return [];
    const inputs = block.inputs?.filter(port => node_ids.includes(port.node_id)) ?? [];
    const outputs = block.outputs?.filter(port => node_ids.includes(port.node_id)) ?? [];
    for (const edge of graph.edges) {
      const source = node_ids.includes(edge.source_node_id), target = node_ids.includes(edge.target_node_id);
      if (source === target) continue;
      const node_id = target ? edge.target_node_id : edge.source_node_id;
      const port = target ? edge.target_port : edge.source_port;
      const column_id = target ? null : edge.source_column_id ?? null;
      const item = { id: "", label: `${String(graph.nodes.find(node => node.id === node_id)?.ui?.label || port)}${column_id ? ` / ${column_id}` : ""}`.slice(0, 200), node_id, port, column_id };
      const ports = target ? inputs : outputs;
      if (!ports.some(existing => sameEndpoint(existing, item))) ports.push({ ...item, id: crypto.randomUUID() });
    }
    return [{ ...block, node_ids, inputs, outputs }];
  });
  return { ...graph, presentation: { ...graph.presentation, blocks } };
}

export function packBlock(graph: GraphDraft, ids: string[], label: string): GraphDraft {
  const members = [...new Set(ids)];
  const occupied = new Set([...(graph.presentation?.workbooks ?? []), ...(graph.presentation?.blocks ?? [])].flatMap(item => item.node_ids));
  if (!label.trim() || !members.length || members.some(id => occupied.has(id) || !graph.nodes.some(node => node.id === id))) return graph;
  const first = graph.nodes.find(node => node.id === members[0])!;
  const block: CompositeBlock = { id: crypto.randomUUID(), label: label.trim().slice(0, 200), node_ids: members, position: { x: first.position.x, y: first.position.y - 220 }, collapsed: true, inputs: [], outputs: [] };
  return reconcileBlocks({ ...graph, presentation: { ...graph.presentation, blocks: [...(graph.presentation?.blocks ?? []), block] } });
}

export function publishOutput(graph: GraphDraft, nodeId: string, handle: string, label: string): GraphDraft {
  const block = memberBlock(graph, nodeId), endpoint = readHandle(handle);
  if (!block) return graph;
  const port = { id: crypto.randomUUID(), label: label.slice(0, 200), node_id: nodeId, port: endpoint.port, column_id: endpoint.column ?? null };
  if (block.outputs?.some(item => sameEndpoint(item, port))) return graph;
  return { ...graph, presentation: { ...graph.presentation, blocks: graph.presentation!.blocks!.map(item => item.id === block.id ? { ...item, outputs: [...(item.outputs ?? []), port] } : item) } };
}

export function renderBlockWire(graph: GraphDraft, edge: Edge): Edge | null {
  const source = memberBlock(graph, edge.source), target = memberBlock(graph, edge.target);
  if (source?.id === target?.id && source?.collapsed) return null;
  let result = edge;
  if (source?.collapsed) {
    const endpoint = readHandle(edge.sourceHandle ?? "");
    const port = source.outputs?.find(item => item.node_id === edge.source && item.port === endpoint.port && (item.column_id ?? null) === (endpoint.column ?? null));
    if (port) result = { ...result, source: blockCanvasId(source.id), sourceHandle: port.id };
  }
  if (target?.collapsed) {
    const port = target.inputs?.find(item => item.node_id === edge.target && item.port === edge.targetHandle);
    if (port) result = { ...result, target: blockCanvasId(target.id), targetHandle: port.id };
  }
  return result;
}

export function resolveBlockConnection(graph: GraphDraft, connection: Connection): Connection {
  let result = connection;
  for (const block of graph.presentation?.blocks ?? []) {
    if (blockCanvasId(block.id) === connection.source) {
      const port = block.outputs?.find(item => item.id === connection.sourceHandle);
      if (port) result = { ...result, source: port.node_id, sourceHandle: fieldHandle(port.port, port.column_id) };
    }
    if (blockCanvasId(block.id) === connection.target) {
      const port = block.inputs?.find(item => item.id === connection.targetHandle);
      if (port) result = { ...result, target: port.node_id, targetHandle: port.port };
    }
  }
  return result;
}
