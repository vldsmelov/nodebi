import type { ResolvedColumn } from "./types";

export type FormulaPart = { start: number; end: number; text: string; reference?: string; column?: ResolvedColumn };

/** Presentation only; quoted strings are opaque, matching backend reference recognition. */
export function formulaParts(expression: string, columns: ResolvedColumn[] | null): FormulaPart[] {
  const byId = new Map(columns?.map(column => [column.column_id, column]));
  const parts: FormulaPart[] = [];
  const pattern = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\[([^\[\]]+)\]/g;
  let offset = 0;
  for (const match of expression.matchAll(pattern)) {
    if (!match[1]) continue;
    const start = match.index;
    if (start > offset) parts.push({ start: offset, end: start, text: expression.slice(offset, start) });
    const end = start + match[0].length;
    parts.push({ start, end, text: match[0], reference: match[1], column: byId.get(match[1]) });
    offset = end;
  }
  if (offset < expression.length) parts.push({ start: offset, end: expression.length, text: expression.slice(offset) });
  return parts;
}

export function replaceFormulaSelection(expression: string, value: string, start: number, end: number) {
  const from = Math.max(0, Math.min(expression.length, start));
  const to = Math.max(from, Math.min(expression.length, end));
  return { expression: expression.slice(0, from) + value + expression.slice(to), cursor: from + value.length };
}

export function formulaFieldLabel(column: ResolvedColumn, columns: ResolvedColumn[]) {
  const duplicate = columns.some(other => other.column_id !== column.column_id && other.display_name === column.display_name);
  // Engine name disambiguates source columns; full stable ID is the final unambiguous fallback.
  return duplicate ? `${column.display_name} · ${column.engine_name} · ${column.column_id}` : column.display_name;
}
