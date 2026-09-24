import { expect, it } from "vitest";
import type { GraphDraft } from "@/features/workflow/autosave";
import { fieldHandle, renderWire, saveWire } from "@/features/workflow/field-wires";
import { attachedBook, bookCanvasId, bookHandle, detachWorkbookSheet, groupWorkbook, reconcileWorkbooks, renderBookWire, resolveBookConnection } from "@/features/workflow/workbook-containers";

const graph: GraphDraft = { name: "Main", format_version: 2, nodes: [
  { id: "source", type: "excel_source", version: 1, position: { x: 20, y: 40 }, config: { source_id: "book", sheet_name: "Sales" } },
  { id: "multiply", type: "field_arithmetic", version: 1, position: { x: 500, y: 40 }, config: {} },
], edges: [{ id: "wire", source_node_id: "source", source_port: "dataset", source_column_id: 'a:["same"]', target_node_id: "multiply", target_port: "a" }], presentation: { blocks: [], workbooks: [] } };

it("keeps the workbook and its wires after switching to a period collection", () => {
  const grouped = groupWorkbook(graph, "book", "Sales.xlsx");
  const periods = { ...grouped, nodes: grouped.nodes.map(node => node.id === "source" ? { ...node, type: "excel_periods" } : node) };
  expect(reconcileWorkbooks(periods).presentation).toEqual(grouped.presentation);
  expect(groupWorkbook(periods, "book", "Periods").presentation).toEqual(grouped.presentation);
});

it("groups without altering computational nodes or edges and reverses proxy handles exactly", () => {
  const grouped = groupWorkbook(graph, "book", "Sales.xlsx");
  expect(grouped.nodes).toBe(graph.nodes);
  expect(grouped.edges).toBe(graph.edges);
  const book = grouped.presentation!.workbooks![0];
  const displayed = renderBookWire(grouped, renderWire(graph.edges[0]));
  expect(displayed.source).toBe(bookCanvasId(book.id));
  const normalized = resolveBookConnection(grouped, { source: displayed.source, target: displayed.target, sourceHandle: displayed.sourceHandle!, targetHandle: displayed.targetHandle! });
  expect(saveWire(normalized, "wire")).toEqual(graph.edges[0]);
  const regrouped = groupWorkbook(grouped, "book", "ignored");
  expect(regrouped.presentation!.workbooks).toHaveLength(1);
  expect(regrouped.presentation!.workbooks![0].id).toBe(book.id);
});

it("detach and return preserve identity/wires and stop accepting obsolete proxy endpoints", () => {
  const grouped = groupWorkbook(graph, "book", "Sales.xlsx");
  const book = grouped.presentation!.workbooks![0];
  const detached = detachWorkbookSheet(grouped, book.id, "source", true);
  expect(detached.edges).toBe(graph.edges);
  expect(attachedBook(detached, "source")).toBeUndefined();
  expect(renderBookWire(detached, renderWire(graph.edges[0])).source).toBe("source");
  const connection = { source: bookCanvasId(book.id), sourceHandle: bookHandle("source", fieldHandle("dataset", "col")), target: "multiply", targetHandle: "a" };
  expect(resolveBookConnection(detached, connection).source).toBe(bookCanvasId(book.id));
  const returned = detachWorkbookSheet(detached, book.id, "source", false);
  expect(attachedBook(returned, "source")?.id).toBe(book.id);
  expect(returned.nodes[0].id).toBe("source");
});

it("removes stale workbook members atomically on source change or deletion, without touching blocks", () => {
  const grouped = groupWorkbook(graph, "book", "Sales.xlsx");
  const changed = reconcileWorkbooks({ ...grouped, nodes: grouped.nodes.map(node => node.id === "source" ? { ...node, config: { ...node.config, source_id: "other" } } : node) });
  expect(changed.presentation!.workbooks).toEqual([]);
  expect(changed.presentation!.blocks).toBe(grouped.presentation!.blocks);
  const deleted = reconcileWorkbooks({ ...grouped, nodes: [], edges: [] });
  expect(deleted.presentation!.workbooks).toEqual([]);
  const blocked = { ...graph, presentation: { blocks: [{ id: "block", label: "Block", node_ids: ["source"], position: { x: 0, y: 0 }, collapsed: false, inputs: [], outputs: [] }], workbooks: [] } };
  expect(groupWorkbook(blocked, "book", "Sales.xlsx")).toBe(blocked);
});
