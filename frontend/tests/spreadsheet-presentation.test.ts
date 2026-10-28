import { expect, it } from "vitest";
import { BorderStyleTypes, CellValueType, HorizontalAlign } from "@univerjs/presets";
import { SpreadsheetSession, type Workspace } from "@/features/spreadsheet/session";
import { displayNumber, sourceCell, sourceStyle } from "@/features/spreadsheet/source-presentation";

function session() {
  const workspace: Workspace = {
    page: { resource_id: "Inputs", resources: ["Inputs"], revision: 1, offset: 0, limit: 1, total_rows: 1, workbook: true, pending: false, can_change_rows: false, external_cached_values: false, can_format: true, precision_as_displayed: false,
      columns: ["Code", "Amount", "Empty", "Formula", "Literal"].map((name, index) => ({ name, index, description: "Worksheet column" })),
      rows: [{ id: "r:0", values: ["00009007199254740993", "1234.5678", "", "7", "=literal"], number_values: { 1: "1234.5678", 3: "7" }, readonly: [3], editable_in_workbook_mode: [3], formulas: { 3: "=B1*2" } }],
    }, sheets: [{ name: "Inputs", rows: 1, columns: 5 }],
    styles: [{ font: "Arial", size: 11, bold: false, italic: false, color: "#123456", background: null, alignment: "general", wrap: false, number_format: "#,##0.00", borders: { bottom: { line: "thin", color: "#112233" } } }],
  };
  return new SpreadsheetSession(workspace);
}

it("keeps unsafe integers and high-precision decimals as exact text for presentation", () => {
  expect(displayNumber("9007199254740993")).toBeUndefined();
  expect(displayNumber("1234567890123456.78")).toBeUndefined();
  expect(displayNumber("0.123456789012345678")).toBeUndefined();
  expect(displayNumber("1234.5000")).toBe(1234.5);
  expect(displayNumber("1.25e3")).toBe(1250);
});

it("keeps empty and exact raw values as strings, distinct from numeric-only presentation", () => {
  const model = session();
  expect(sourceCell(model, "Inputs", 0, 0)).toMatchObject({ v: "00009007199254740993", t: CellValueType.STRING, f: null });
  expect(sourceCell(model, "Inputs", 0, 1)).toMatchObject({ v: "1234.5678", t: CellValueType.STRING });
  expect(sourceCell(model, "Inputs", 0, 2)).toMatchObject({ v: "", t: CellValueType.STRING });
  expect(displayNumber(model.cell("Inputs", 0, 2)?.numberValue)).toBeUndefined();
  expect(displayNumber("0")).toBe(0); expect(displayNumber("NaN")).toBeUndefined(); expect(displayNumber("")).toBeUndefined();
  expect(displayNumber(model.cell("Inputs", 0, 1)?.numberValue)).toBe(1234.5678);
  expect(model.cell("Inputs", 0, 1)?.value).toBe("1234.5678");
});

it("supplies native formulas and source formatting, and protects equals literals from execution", () => {
  const model = session();
  expect(sourceCell(model, "Inputs", 0, 3)).toMatchObject({ v: "7", f: "=B1*2" });
  expect(sourceCell(model, "Inputs", 0, 4)).toMatchObject({ v: "=literal", f: null, t: CellValueType.FORCE_STRING });
  const style = sourceStyle(model, "Inputs", 0, 1);
  expect(style.n?.pattern).toBe("#,##0.00"); expect(style.ht).toBe(HorizontalAlign.RIGHT);
  expect(style.bd?.b).toEqual({ s: BorderStyleTypes.THIN, cl: { rgb: "#112233" } });
  expect(sourceStyle(model, "Inputs", 0, 0).ht).toBe(HorizontalAlign.LEFT);
});

it("does not show an old cached result for an edited or persisted-but-uncalculated formula", () => {
  const model = session(); model.workbookEditing = true;
  model.edit([{ sheet: "Inputs", row: 0, column: 3, value: "=B1*3" }]);
  expect(model.cell("Inputs", 0, 3)?.numberValue).toBeUndefined();
  model.persisted([...model.changes.values()], 2);
  expect(sourceCell(model, "Inputs", 0, 3)).toMatchObject({ v: "", f: "=B1*3" });
  expect(model.cell("Inputs", 0, 3)?.numberValue).toBeUndefined();
});
