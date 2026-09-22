import type { Connection, Edge } from "@xyflow/react";
import type { components } from "@/lib/api-schema";
import type { GraphDraft } from "./autosave";

export type WorkbookContainer = components["schemas"]["WorkbookContainer"];
export const bookCanvasId = (id: string) => `workbook:${id}`;
export const bookHandle = (nodeId: string, handle: string) => JSON.stringify([nodeId, handle]);
export function attachedBook(graph: GraphDraft, nodeId: string) {
  return graph.presentation?.workbooks?.find(book => book.node_ids.includes(nodeId) && !book.detached_node_ids?.includes(nodeId));
}
export function renderBookWire(graph: GraphDraft, edge: Edge): Edge {
  const book = attachedBook(graph, edge.source);
  return book ? { ...edge, source: bookCanvasId(book.id), sourceHandle: bookHandle(edge.source, edge.sourceHandle ?? "") } : edge;
}
export function resolveBookConnection(graph: GraphDraft, connection: Connection): Connection {
  const book = graph.presentation?.workbooks?.find(item => bookCanvasId(item.id) === connection.source);
  if (!book) return connection;
  try {
    const value: unknown = JSON.parse(connection.sourceHandle ?? "");
    if (Array.isArray(value) && value.length === 2 && value.every(item => typeof item === "string") && attachedBook(graph, value[0])?.id === book.id) return { ...connection, source: value[0], sourceHandle: value[1] };
  } catch { /* The ordinary connection validator rejects unresolved container endpoints. */ }
  return connection;
}

export function groupWorkbook(graph: GraphDraft, sourceId: string, label: string): GraphDraft {
  const books = graph.presentation?.workbooks ?? [];
  const blockMembers = new Set(graph.presentation?.blocks?.flatMap(block => block.node_ids) ?? []);
  const members = graph.nodes.filter(node => node.type === "excel_source" && node.config?.source_id === sourceId && !blockMembers.has(node.id));
  if (!members.length) return graph;
  const existing = books.find(book => book.source_id === sourceId);
  const book: WorkbookContainer = existing ? { ...existing, node_ids: members.map(node => node.id) } : { id: crypto.randomUUID(), label: label.slice(0, 200), source_id: sourceId, node_ids: members.map(node => node.id), detached_node_ids: [], collapsed: false, position: { ...members[0].position } };
  return { ...graph, presentation: { ...graph.presentation, workbooks: [...books.filter(item => item.id !== book.id), book] } };
}

/** Deleting a source or changing its workbook must not leave invalid presentation references. */
export function reconcileWorkbooks(graph: GraphDraft): GraphDraft {
  if (!graph.presentation?.workbooks?.length) return graph;
  const workbooks = graph.presentation.workbooks.flatMap(book => {
    const node_ids = book.node_ids.filter(id => graph.nodes.some(node => node.id === id && node.type === "excel_source" && node.config?.source_id === book.source_id));
    return node_ids.length ? [{ ...book, node_ids, detached_node_ids: (book.detached_node_ids ?? []).filter(id => node_ids.includes(id)) }] : [];
  });
  return { ...graph, presentation: { ...graph.presentation, workbooks } };
}

export function detachWorkbookSheet(graph: GraphDraft, bookId: string, nodeId: string, detach: boolean, dropPosition?: { x: number; y: number }): GraphDraft {
  const book = graph.presentation?.workbooks?.find(item => item.id === bookId && item.node_ids.includes(nodeId));
  if (!book) return graph;
  const position = dropPosition ?? { x: book.position.x + 380, y: book.position.y + 60 };
  if (!dropPosition && detach) {
    while (graph.nodes.some(node => node.id !== nodeId && !attachedBook(graph, node.id) && Math.abs(node.position.x - position.x) < 340 && Math.abs(node.position.y - position.y) < 500)) position.x += 340;
  }
  return { ...graph,
    nodes: detach ? graph.nodes.map(node => node.id === nodeId ? { ...node, position } : node) : graph.nodes,
    presentation: { ...graph.presentation, workbooks: graph.presentation!.workbooks!.map(item => item.id !== bookId ? item : { ...item, detached_node_ids: detach ? [...new Set([...(item.detached_node_ids ?? []), nodeId])] : (item.detached_node_ids ?? []).filter(id => id !== nodeId) }) },
  };
}
