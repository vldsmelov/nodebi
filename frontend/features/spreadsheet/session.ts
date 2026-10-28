import type { components } from "@/lib/api-schema";

export type Page = components["schemas"]["EditorPage"];
export type Workspace = components["schemas"]["EditorWorkspace"];
export type CellChange = { sheet: string; row: number; column: number; value: string; formula?: boolean; override_protection?: boolean };
export type FormatPatch = components["schemas"]["CellFormatPatch"];
export type FormatChange = { sheet: string; row: number; column: number; patch: FormatPatch; override_protection?: boolean };
type History = { kind: "cells"; before: CellChange[]; after: CellChange[] } | { kind: "formats"; before: FormatChange[]; after: FormatChange[] };
export const cellKey = (sheet: string, row: number, column: number) => JSON.stringify([sheet, row, column]);

/** Source values stay strings. This model owns edits, never calculations. */
export class SpreadsheetSession {
  revision: number;
  pending: boolean;
  workbookEditing = false;
  readonly rows = new Map<string, Map<number, Page["rows"][number]>>();
  readonly changes = new Map<string, CellChange>();
  readonly formats = new Map<string, FormatChange>();
  get dirty() { return this.changes.size > 0 || this.formats.size > 0; }
  readonly history: History[] = [];
  readonly future: History[] = [];
  constructor(readonly workspace: Workspace) {
    if (!workspace.page.workbook) this.workspace = { ...workspace, sheets: workspace.sheets.map(s => ({ ...s, rows: s.rows + 1 })) };
    this.revision = workspace.page.revision;
    this.pending = workspace.page.pending;
    this.accept(workspace.page);
  }
  accept(page: Page) {
    if (page.revision !== this.revision) throw new Error("The report changed. Reload before applying your draft.");
    const rows = this.rows.get(page.resource_id) ?? new Map();
    const shift = this.workspace.page.workbook ? 0 : 1;
    if (shift) rows.set(0, { id: "header", values: page.columns.map(c => c.name), readonly: page.columns.map((_, i) => i), format_readonly: page.columns.map((_, i) => i) });
    page.rows.forEach((row, i) => rows.set(page.offset + i + shift, row));
    this.rows.set(page.resource_id, rows);
  }
  cell(sheet: string, row: number, column: number) {
    const record = this.rows.get(sheet)?.get(row);
    if (!record || column < 0 || column >= record.values.length) return null;
    const change = this.changes.get(cellKey(sheet, row, column));
    const formula = change ? change.formula ? change.value : undefined : record.formulas?.[column];
    const protectedCell = record.readonly?.includes(column) ?? false;
    const override = this.workbookEditing && (record.editable_in_workbook_mode?.includes(column) || !protectedCell);
    const value = change ? change.formula ? "" : change.value : record.values[column];
    const numericColumn = !this.workspace.page.workbook && row > 0 && ["integer", "float", "decimal"].includes(this.workspace.page.columns[column]?.description);
    const numberValue = change || numericColumn ? !formula && (numericColumn || record.number_values?.[column] !== undefined) && value.trim() ? value.replaceAll(" ", "").replaceAll("\u00a0", "").replace(",", ".") : undefined : record.number_values?.[column];
    const pendingFormula = change ? !!change.formula : record.pending_formulas?.includes(column) ?? false;
    const patch = this.formats.get(cellKey(sheet, row, column))?.patch ?? record.formats?.[column] ?? {};
    const appearance = { ...this.workspace.styles?.[record.style_ids?.[column] ?? 0], ...cleanFormat(patch) };
    return { value, numberValue: pendingFormula ? undefined : numberValue,
      readonly: (protectedCell && !override) || (!!formula && !this.workbookEditing), formula,
      pendingFormula,
      style: record.style_ids?.[column], id: record.id, appearance,
      formatReadonly: !this.workspace.page.can_format || ((record.format_readonly?.includes(column) ?? false) && !(this.workbookEditing && record.editable_in_workbook_mode?.includes(column))) };
  }
  anchor(sheet: string, row: number, column: number) {
    const merge = this.workspace.sheets.find(s => s.name === sheet)?.merges?.find(([l, t, r, b]) => column >= l - 1 && column < r && row >= t - 1 && row < b);
    return merge ? { row: merge[1] - 1, column: merge[0] - 1 } : { row, column };
  }
  edit(changes: CellChange[]) {
    if (!changes.length) return;
    if (changes.length > 2000 || this.formats.size + this.changes.size + changes.filter(c => !this.changes.has(cellKey(c.sheet, c.row, c.column))).length > 10000) throw new Error("The pasted range is too large. Paste a smaller range.");
    const normalized = changes.map(change => ({ ...change,
      value: this.workbookEditing && change.value.startsWith("'=") ? change.value.slice(1) : change.value,
      formula: change.formula ?? (this.workbookEditing && change.value.startsWith("=") && (this.cell(change.sheet, change.row, change.column)?.formula !== undefined || this.cell(change.sheet, change.row, change.column)?.value !== change.value)),
      override_protection: change.override_protection ?? this.workbookEditing,
    }));
    const before = normalized.map(change => {
      const current = this.cell(change.sheet, change.row, change.column);
      if (!current) throw new Error("Wait for the selected rows to load before editing.");
      if (current.readonly) throw new Error(this.workbookEditing ? "Edit the top-left cell of a merged area. Array and data-table formulas stay protected." : "Enable Edit calculations to change formulas or protected cell values.");
      if (change.formula && !this.workbookEditing) throw new Error("Enable Edit calculations to change formulas or protected cell values.");
      if (change.value.length > 10000) throw new Error("The pasted range is too large. Paste a smaller range.");
      return { ...change, value: current.formula ?? current.value, formula: !!current.formula };
    });
    if (normalized.every((change, i) => change.value === before[i].value && change.formula === before[i].formula)) return;
    this.apply(normalized);
    this.history.push({ kind: "cells", before, after: normalized });
    if (this.history.length > 100) this.history.shift();
    this.future.length = 0;
  }
  private apply(changes: CellChange[]) {
    for (const change of changes) {
      const key = cellKey(change.sheet, change.row, change.column);
      const record = this.rows.get(change.sheet)?.get(change.row);
      const original = record?.formulas?.[change.column];
      if ((original ?? record?.values[change.column]) === change.value && !!original === !!change.formula) this.changes.delete(key);
      else this.changes.set(key, change);
    }
  }
  format(cells: { sheet: string; row: number; column: number }[], patch: FormatPatch) {
    if (!cells.length) return;
    if (cells.length > 2000 || this.formats.size + cells.filter(c => !this.formats.has(cellKey(c.sheet, c.row, c.column))).length + this.changes.size > 10000) throw new Error("The pasted range is too large. Paste a smaller range.");
    const before: FormatChange[] = [], after: FormatChange[] = [];
    for (const coordinate of cells) {
      const current = this.cell(coordinate.sheet, coordinate.row, coordinate.column);
      if (!current) throw new Error("Wait for the selected rows to load before editing.");
      if (current.formatReadonly) throw new Error("Formatting is unavailable for this cell. Enable Edit calculations for protected worksheet cells.");
      const record = this.rows.get(coordinate.sheet)!.get(coordinate.row)!;
      const previous = this.formats.get(cellKey(coordinate.sheet, coordinate.row, coordinate.column))?.patch ?? record.formats?.[coordinate.column] ?? {};
      const original = formatDefaults(this.workspace.styles?.[current.style ?? 0]);
      const next = cleanFormat({ ...previous, ...patch });
      for (const key of Object.keys(next) as (keyof FormatPatch)[]) if (next[key] === original[key]) delete next[key];
      before.push({ ...coordinate, patch: cleanFormat(previous), override_protection: this.workbookEditing });
      after.push({ ...coordinate, patch: next, override_protection: this.workbookEditing });
    }
    if (after.every((c, i) => equalFormat(c.patch, before[i].patch))) return;
    this.applyFormats(after); this.history.push({ kind: "formats", before, after });
    if (this.history.length > 100) this.history.shift();
    this.future.length = 0;
  }
  private applyFormats(changes: FormatChange[]) {
    for (const change of changes) {
      const key = cellKey(change.sheet, change.row, change.column);
      const original = this.rows.get(change.sheet)?.get(change.row)?.formats?.[change.column] ?? {};
      if (equalFormat(change.patch, original)) this.formats.delete(key);
      else this.formats.set(key, change);
    }
  }
  private replay(item: History, direction: "before" | "after"): CellChange[] {
    if (item.kind === "cells") { this.apply(item[direction]); return item[direction]; }
    this.applyFormats(item[direction]);
    return item[direction].map(c => ({ ...c, value: this.cell(c.sheet, c.row, c.column)?.value ?? "" }));
  }
  undo() { const item = this.history.pop(); if (item) { const changed = this.replay(item, "before"); this.future.push(item); return changed; } return []; }
  redo() { const item = this.future.pop(); if (item) { const changed = this.replay(item, "after"); this.history.push(item); return changed; } return []; }
  persistedFormats(changes: FormatChange[], revision: number) {
    this.revision = revision; this.pending = true;
    for (const change of changes) {
      const record = this.rows.get(change.sheet)?.get(change.row);
      if (record) { record.formats ??= {}; record.formats[change.column] = change.patch; }
      this.formats.delete(cellKey(change.sheet, change.row, change.column));
    }
  }
  persisted(changes: CellChange[], revision: number) {
    this.revision = revision; this.pending = true;
    for (const change of changes) {
      const record = this.rows.get(change.sheet)?.get(change.row);
      if (record) {
        record.values[change.column] = change.formula ? "" : change.value;
        record.formulas ??= {};
        if (change.formula) record.formulas[change.column] = change.value;
        else delete record.formulas[change.column];
        record.pending_formulas = (record.pending_formulas ?? []).filter(c => c !== change.column);
        if (change.formula) record.pending_formulas.push(change.column);
        if (record.number_values?.[change.column] !== undefined) {
          const text = change.value.replaceAll(" ", "").replaceAll("\u00a0", "").replace(",", ".");
          if (!change.formula && text && Number.isFinite(Number(text))) record.number_values[change.column] = text;
          else delete record.number_values[change.column];
        }
      }
      this.changes.delete(cellKey(change.sheet, change.row, change.column));
    }
  }
}

function cleanFormat(patch: FormatPatch): FormatPatch { return Object.fromEntries(Object.entries(patch).filter(([, value]) => value != null).map(([key, value]) => [key, typeof value === "string" && value.startsWith("#") ? value.toUpperCase() : value])); }
function equalFormat(a: FormatPatch, b: FormatPatch) { return (Object.keys(formatDefaults()) as (keyof FormatPatch)[]).every(key => (a[key] ?? undefined) === (b[key] ?? undefined)); }
export function formatDefaults(appearance?: { bold?: boolean | null; italic?: boolean | null; wrap?: boolean | null; size?: number | null; color?: string | null; background?: string | null; alignment?: string | null }): Required<FormatPatch> {
  const alignment = appearance?.alignment;
  return { bold: appearance?.bold ?? false, italic: appearance?.italic ?? false, wrap: appearance?.wrap ?? false, size: appearance?.size ?? 11, color: appearance?.color ?? "auto", background: appearance?.background ?? "none", alignment: alignment === "left" || alignment === "right" || alignment === "center" ? alignment : "general" };
}

export function columnLetter(column: number): string {
  let result = "";
  for (let n = column + 1; n > 0; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + (n - 1) % 26) + result;
  return result;
}
export function parseAddress(value: string) {
  const match = /^([A-Z]{1,3})([1-9]\d*)$/i.exec(value.trim());
  if (!match) return null;
  return { column: [...match[1].toUpperCase()].reduce((v, c) => v * 26 + c.charCodeAt(0) - 64, 0) - 1, row: Number(match[2]) - 1 };
}
