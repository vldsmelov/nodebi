import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "./render";
import type { DataSource } from "@/features/data-sources/api";
import type { GraphDraft } from "@/features/workflow/autosave";
import { WorkbookBrowser } from "@/features/workflow/WorkbookBrowser";
import { openWorkbookSheet, readSheetDrag } from "@/features/workflow/workbook-navigation";

afterEach(cleanup);
const source = { id: "book", name: "Sales", original_filename: "sales.xlsx", workbook: { sheets: Array.from({ length: 80 }, (_, index) => ({ name: `Sheet ${index}`, row_count: null, column_count: null })) } } as DataSource;
const empty: GraphDraft = { name: "Main", format_version: 2, nodes: [], edges: [], presentation: { workbooks: [], blocks: [] } };

it("reuses configured sheet identity and wires, isolates identically named sheets in other books", () => {
  const added = openWorkbookSheet(empty, [source], { sourceId: source.id, sheetName: "Sheet 3" }, { x: 2, y: 3 }, 1)!;
  const configured = { ...added.graph, nodes: added.graph.nodes.map(node => ({ ...node, config: { ...node.config, header_row: 3 } })) };
  const reopened = openWorkbookSheet(configured, [source], { sourceId: source.id, sheetName: "Sheet 3" }, { x: 99, y: 99 }, 1)!;
  expect(reopened.graph).toBe(configured);
  expect(reopened.nodeId).toBe(added.nodeId);
  const other = { ...source, id: "other" };
  const second = openWorkbookSheet(configured, [source, other], { sourceId: other.id, sheetName: "Sheet 3" }, { x: 0, y: 0 }, 1)!;
  expect(second.graph.nodes).toHaveLength(2);
  expect(second.nodeId).not.toBe(added.nodeId);
  expect(openWorkbookSheet(configured, [source], { sourceId: "missing", sheetName: "Sheet 3" }, { x: 0, y: 0 }, 1)).toBeNull();
  expect(openWorkbookSheet(configured, [source], { sourceId: source.id, sheetName: "Sheet 3", nodeId: "deleted" }, { x: 0, y: 0 }, 1)).toBeNull();
});

it("validates drag payloads without accepting missing or malformed identities", () => {
  for (const invalid of ["oops", "null", "[]", '{"sourceId":2,"sheetName":"Sheet 3"}', '{"sourceId":"book","sheetName":"Sheet 3","nodeId":null}']) expect(readSheetDrag(invalid)).toBeNull();
  expect(readSheetDrag('{"sourceId":"book","sheetName":"Sheet 3"}')).toEqual({ sourceId: "book", sheetName: "Sheet 3" });
});

it("lazily reveals bounded sheets, searches beyond the first page and offers a keyboard action", () => {
  const open = vi.fn();
  render(<WorkbookBrowser sources={[source]} nodes={[]} onOpen={open} />);
  expect(screen.queryByTitle("Add sheet to graph")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /sales.xlsx/ }));
  expect(screen.getAllByTitle("Add sheet to graph")).toHaveLength(50);
  fireEvent.change(screen.getByLabelText("Search books and sheets"), { target: { value: "Sheet 79" } });
  fireEvent.click(screen.getByRole("button", { name: "+ Sheet 79" }));
  expect(open).toHaveBeenCalledWith({ sourceId: "book", sheetName: "Sheet 79", nodeId: undefined });
});

it("distinguishes multiple configured instances and opens the requested one", () => {
  const first = openWorkbookSheet(empty, [source], { sourceId: source.id, sheetName: "Sheet 3" }, { x: 0, y: 0 }, 1)!;
  const nodes = [first.graph.nodes[0], { ...first.graph.nodes[0], id: "second", ui: { label: "Different headers" } }];
  const graph = { ...first.graph, nodes };
  const open = vi.fn();
  render(<WorkbookBrowser sources={[source]} nodes={nodes} onOpen={open} />);
  fireEvent.change(screen.getByLabelText("Search books and sheets"), { target: { value: "Sheet 3" } });
  fireEvent.click(screen.getByRole("button", { name: /Different headers/ }));
  const selection = open.mock.calls[0][0];
  expect(openWorkbookSheet(graph, [source], selection, { x: 0, y: 0 }, 1)?.nodeId).toBe("second");
});
