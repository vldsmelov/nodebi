import type { DataSource } from "@/features/data-sources/api";
import type { GraphDraft } from "./autosave";
import type { WorkflowPosition } from "./types";

export const sheetDragType = "application/x-nodebi-sheet";
export type SheetSelection = { sourceId: string; sheetName: string; nodeId?: string };

/** Reopening a sheet preserves its reading configuration, identity and every wire. */
export function openWorkbookSheet(graph: GraphDraft, sources: DataSource[], selection: SheetSelection, position: WorkflowPosition, version: number) {
  const source = sources.find(item => item.id === selection.sourceId);
  if (!source?.workbook.sheets.some(sheet => sheet.name === selection.sheetName)) return null;
  const matches = graph.nodes.filter(node => node.type === "excel_source" && node.config?.source_id === source.id && node.config?.sheet_name === selection.sheetName);
  const existing = selection.nodeId ? matches.find(node => node.id === selection.nodeId) : matches[0];
  if (selection.nodeId && !existing) return null;
  if (existing) return { graph, nodeId: existing.id };
  const nodeId = crypto.randomUUID();
  return { nodeId, graph: { ...graph, nodes: [...graph.nodes, { id: nodeId, type: "excel_source", version, position, config: { source_id: source.id, sheet_name: selection.sheetName }, ui: {} }] } };
}

export function readSheetDrag(value: string): SheetSelection | null {
  try {
    const item: unknown = JSON.parse(value);
    if (!item || typeof item !== "object" || !("sourceId" in item) || !("sheetName" in item)) return null;
    const { sourceId, sheetName } = item;
    if (typeof sourceId !== "string" || typeof sheetName !== "string") return null;
    if ("nodeId" in item && typeof item.nodeId !== "string") return null;
    return { sourceId, sheetName, ...("nodeId" in item ? { nodeId: item.nodeId as string } : {}) };
  } catch { return null; }
}
