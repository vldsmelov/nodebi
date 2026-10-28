import { BooleanNumber, BorderStyleTypes, CellValueType, HorizontalAlign, VerticalAlign, WrapStrategy } from "@univerjs/presets";
import type { ICellData, IStyleData } from "@univerjs/presets";
import type { SpreadsheetSession } from "./session";

const borderLines: Record<string, BorderStyleTypes> = {
  thin: BorderStyleTypes.THIN, medium: BorderStyleTypes.MEDIUM, thick: BorderStyleTypes.THICK,
  dashed: BorderStyleTypes.DASHED, dotted: BorderStyleTypes.DOTTED, double: BorderStyleTypes.DOUBLE,
  hair: BorderStyleTypes.HAIR, dashDot: BorderStyleTypes.DASH_DOT, dashDotDot: BorderStyleTypes.DASH_DOT_DOT,
  mediumDashed: BorderStyleTypes.MEDIUM_DASHED, mediumDashDot: BorderStyleTypes.MEDIUM_DASH_DOT,
  mediumDashDotDot: BorderStyleTypes.MEDIUM_DASH_DOT_DOT, slantDashDot: BorderStyleTypes.SLANT_DASH_DOT,
};
const borderSides = { top: "t", right: "r", bottom: "b", left: "l" } as const;

export function sourceStyle(session: SpreadsheetSession, sheet: string, row: number, column: number): IStyleData {
  const cell = session.cell(sheet, row, column), source = cell?.appearance;
  const header = !session.workspace.page.workbook && row === 0;
  const numeric = cell?.numberValue !== undefined && cell.numberValue !== "";
  const alignment = source?.alignment;
  const bd: NonNullable<IStyleData["bd"]> = {};
  for (const [side, border] of Object.entries(source?.borders ?? {})) {
    const key = borderSides[side as keyof typeof borderSides];
    if (key) bd[key] = { s: borderLines[border.line] ?? BorderStyleTypes.THIN, cl: { rgb: border.color } };
  }
  return {
    ff: source?.font || "Arial", fs: source?.size ?? 11,
    bl: source?.bold || header ? BooleanNumber.TRUE : BooleanNumber.FALSE,
    it: source?.italic ? BooleanNumber.TRUE : BooleanNumber.FALSE,
    cl: { rgb: source?.color && source.color !== "auto" ? source.color : "#18212c" },
    bg: source?.background && source.background !== "none" ? { rgb: source.background } : header ? { rgb: "#edf3fc" } : undefined,
    ht: alignment === "right" ? HorizontalAlign.RIGHT : alignment === "center" ? HorizontalAlign.CENTER : alignment === "left" ? HorizontalAlign.LEFT : numeric ? HorizontalAlign.RIGHT : HorizontalAlign.LEFT,
    vt: VerticalAlign.MIDDLE, tb: source?.wrap ? WrapStrategy.WRAP : WrapStrategy.CLIP,
    n: { pattern: source?.number_format || "General" }, bd,
  };
}

/** Raw source data stays text. Numeric conversion is confined to the render interceptor. */
export function sourceCell(session: SpreadsheetSession, sheet: string, row: number, column: number): ICellData {
  const cell = session.cell(sheet, row, column);
  const literalFormula = !cell?.formula && cell?.value.startsWith("=");
  return { v: cell?.value ?? "", t: literalFormula ? CellValueType.FORCE_STRING : CellValueType.STRING, f: cell?.formula ?? null, p: null, s: sourceStyle(session, sheet, row, column) };
}

export function displayNumber(value: string | undefined): number | undefined {
  if (value === undefined || !value.trim()) return undefined;
  const number = Number(value);
  const significant = value.split(/[eE]/)[0].replace(/[-+.]/g, "").replace(/^0+|0+$/g, "").length;
  // Keep the exact source string when native numeric presentation would round its digits.
  return Number.isFinite(number) && Math.abs(number) <= Number.MAX_SAFE_INTEGER && significant <= 15 ? number : undefined;
}
