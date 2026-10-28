import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { SpreadsheetSession, columnLetter, parseAddress, type Workspace } from "@/features/spreadsheet/session";
import { SpreadsheetLink } from "@/features/spreadsheet/open-window";

const workspace: Workspace = { page: { revision: 4, resource_id: "Sales", resources: ["Sales"], columns: [{ index: 0, name: "A", description: "string" }, { index: 1, name: "B", description: "decimal" }], rows: [{ id: "r:0", values: ["0001", "0.10"] }, { id: "r:1", values: ["total", "0.20"], readonly: [1], formulas: { 1: "=B1*2" } }], total_rows: 100000, offset: 0, limit: 2, pending: false, workbook: true, can_change_rows: false, external_cached_values: false, can_format: true, precision_as_displayed: false }, sheets: [{ name: "Sales", rows: 100000, columns: 2 }] };
function model() { return new SpreadsheetSession(structuredClone(workspace)); }
it("keeps exact text, codes and decimal values through undo, redo and sparse persistence", () => {
  const session = model();
  const change = { sheet: "Sales", row: 0, column: 0, value: "00009007199254740993" };
  session.edit([change]); expect(session.cell("Sales", 0, 0)?.value).toBe(change.value);
  session.undo(); expect(session.changes.size).toBe(0);
  session.redo(); expect(session.cell("Sales", 0, 0)?.value).toBe(change.value);
  session.persisted([change], 5); expect(session.revision).toBe(5); expect(session.changes.size).toBe(0);
  expect(session.cell("Sales", 0, 1)?.value).toBe("0.10");
});
it("rejects a range touching protected cells atomically and never treats unloaded rows as empty", () => {
  const session = model();
  expect(() => session.edit([{ sheet: "Sales", row: 0, column: 1, value: "7" }, { sheet: "Sales", row: 1, column: 1, value: "9" }])).toThrow("protected");
  expect(session.changes.size).toBe(0);
  expect(() => session.edit([{ sheet: "Sales", row: 99999, column: 0, value: "x" }])).toThrow("load");
});
it("rejects a page from another revision without replacing known input", () => {
  const session = model();
  expect(() => session.accept({ ...workspace.page, revision: 9 })).toThrow("changed");
  expect(session.revision).toBe(4);
});
it("uses stable server row IDs and Excel addresses", () => {
  const session = model();
  session.accept({ ...workspace.page, offset: 99999, rows: [{ id: "a:stable-row", values: ["0002", "0.30"] }] });
  expect(session.cell("Sales", 99999, 0)?.id).toBe("a:stable-row");
  expect(columnLetter(26)).toBe("AA"); expect(parseAddress("AB100000")).toEqual({ row: 99999, column: 27 });
  expect(parseAddress("A0")).toBeNull(); expect(parseAddress("=A1")).toBeNull();
});
it("shows a protected CSV header while keeping physical server row IDs stable", () => {
  const data = structuredClone(workspace); data.page.workbook = false; data.page.can_format = false;
  const session = new SpreadsheetSession(data);
  expect(session.cell("Sales", 0, 0)).toMatchObject({ value: "A", readonly: true });
  expect(session.cell("Sales", 1, 0)).toMatchObject({ value: "0001", id: "r:0" });
  expect(session.workspace.sheets[0].rows).toBe(100001);
});

it("formats formulas without replacing their exact data and shares cell/style undo order", () => {
  const session = model();
  const target = { sheet: "Sales", row: 1, column: 1 };
  session.edit([{ sheet: "Sales", row: 0, column: 0, value: "00009007199254740993" }]);
  session.format([target], { bold: true, background: "#ffff00" });
  expect(session.cell("Sales", 1, 1)).toMatchObject({ formula: "=B1*2", value: "0.20", appearance: { bold: true, background: "#FFFF00" } });
  expect(session.changes.size).toBe(1); expect(session.formats.size).toBe(1);
  session.undo(); expect(session.formats.size).toBe(0); expect(session.changes.size).toBe(1);
  session.undo(); expect(session.dirty).toBe(false);
  session.redo(); session.redo(); expect(session.formats.size).toBe(1);
  expect(session.cell("Sales", 0, 0)?.value).toBe("00009007199254740993");
});

it("can undo persisted draft formatting back to the original source style", () => {
  const session = model(), target = { sheet: "Sales", row: 0, column: 0 };
  session.format([target], { bold: true, wrap: true });
  session.persistedFormats([...session.formats.values()], 5);
  expect(session.formats.size).toBe(0); expect(session.pending).toBe(true);
  expect(session.cell("Sales", 0, 0)?.appearance).toMatchObject({ bold: true, wrap: true });
  session.undo(); expect([...session.formats.values()][0].patch).toEqual({});
  expect(session.cell("Sales", 0, 0)?.appearance.bold).toBeUndefined();
});

it("checks the entire formatting selection before any change and keeps structural protection", () => {
  const data = structuredClone(workspace); data.page.rows[1].format_readonly = [1];
  const session = new SpreadsheetSession(data), a = { sheet: "Sales", row: 0, column: 0 }, b = { sheet: "Sales", row: 1, column: 1 };
  expect(() => session.format([a, b], { italic: true })).toThrow("Formatting");
  expect(session.formats.size).toBe(0);
  session.workbookEditing = true;
  expect(() => session.format([b], { italic: true })).toThrow("Formatting");
  data.page.rows[1].editable_in_workbook_mode = [1];
  const editable = new SpreadsheetSession(data); editable.workbookEditing = true;
  editable.format([b], { italic: true }); expect(editable.formats.size).toBe(1);
});

it("keeps unchanged formatting out of history and refuses CSV formatting", () => {
  const session = model(), target = { sheet: "Sales", row: 0, column: 0 };
  session.format([target], { bold: false, size: 11, color: "auto", background: "none" });
  expect(session.dirty).toBe(false); expect(session.history.length).toBe(0);
  session.workspace.page.can_format = false;
  expect(() => session.format([target], { bold: true })).toThrow("Formatting");
});
it("opens a standalone spreadsheet window synchronously from the user's click", () => {
  const opened = vi.spyOn(window, "open").mockReturnValue(null);
  render(<SpreadsheetLink project="project" source="source">Edit file</SpreadsheetLink>);
  fireEvent.click(screen.getByRole("link", { name: "Edit file" }));
  expect(opened).toHaveBeenCalledWith("/spreadsheet/project?source=source", "_blank", expect.stringContaining("noopener"));
  opened.mockRestore();
});

it("requires explicit calculation mode and preserves formula identity through undo and draft persistence", () => {
  const data = structuredClone(workspace); data.page.rows[1].editable_in_workbook_mode = [1];
  const session = new SpreadsheetSession(data);
  const target = { sheet: "Sales", row: 1, column: 1, value: "=SUM(B1,3)" };
  expect(() => session.edit([target])).toThrow("Edit calculations");
  session.workbookEditing = true; session.edit([target]);
  expect(session.cell("Sales", 1, 1)).toMatchObject({ formula: target.value, value: "", pendingFormula: true, readonly: false });
  expect([...session.changes.values()][0]).toMatchObject({ formula: true, override_protection: true });
  session.undo(); expect(session.changes.size).toBe(0);
  expect(session.cell("Sales", 1, 1)?.formula).toBe("=B1*2");
  session.redo(); session.persisted([...session.changes.values()], 5);
  expect(session.cell("Sales", 1, 1)?.formula).toBe(target.value);
  session.workbookEditing = false; expect(session.cell("Sales", 1, 1)?.readonly).toBe(true);
});

it("distinguishes explicit formulas from literal equals and can replace a formula with an exact code", () => {
  const data = structuredClone(workspace); data.page.rows[1].editable_in_workbook_mode = [1];
  const session = new SpreadsheetSession(data);
  session.edit([{ sheet: "Sales", row: 0, column: 0, value: "=literal" }]);
  expect([...session.changes.values()][0].formula).toBe(false);
  session.workbookEditing = true;
  session.edit([{ sheet: "Sales", row: 0, column: 1, value: "'=1+1" }]);
  expect(session.cell("Sales", 0, 1)).toMatchObject({ value: "=1+1", formula: undefined });
  session.edit([{ sheet: "Sales", row: 1, column: 1, value: "00009007199254740993" }]);
  expect(session.cell("Sales", 1, 1)).toMatchObject({ value: "00009007199254740993", formula: undefined });
  session.undo(); expect(session.cell("Sales", 1, 1)?.formula).toBe("=B1*2");
});

it("keeps structural formula ranges protected and resolves merged cell navigation to its anchor", () => {
  const session = model(); session.workbookEditing = true;
  expect(() => session.edit([{ sheet: "Sales", row: 0, column: 0, value: "changed" }, { sheet: "Sales", row: 1, column: 1, value: "0" }])).toThrow("Array and data-table");
  expect(session.changes.size).toBe(0);
  session.workspace.sheets[0].merges = [[1, 1, 2, 1]];
  expect(session.anchor("Sales", 0, 1)).toEqual({ row: 0, column: 0 });
});
