import type { ResolvedColumn } from "./types";
import { calculatedId, normalizedName } from "./calculated-chain";
import type { PlannedStep } from "./unary-chain";
export type PreparationRow = { id: string; keep: boolean; name: string; target: string; onError: "error" | "null"; nulls: "keep" | "drop" | "zero" | "empty" };
export const preparationRows = (columns: ResolvedColumn[]): PreparationRow[] => columns.map(column => ({ id: column.column_id, keep: true, name: column.engine_name, target: "", onError: "error", nulls: "keep" }));
export const conversionTypes = ["string", "integer", "float", "boolean", "date", "datetime"];

export function preparationPlan(columns: ResolvedColumn[], rows: PreparationRow[], uuid = () => crypto.randomUUID()): PlannedStep[] | null {
  const kept = rows.filter(row => row.keep), byId = new Map(columns.map(column => [column.column_id, column]));
  const names = kept.map(row => normalizedName(row.name));
  if (!kept.length || kept.length > 1024 || new Set(kept.map(row => row.id)).size !== kept.length || new Set(names).size !== names.length || names.some(name => !name || name.length > 255)) return null;
  if (kept.filter(row => row.nulls === "zero" || row.nulls === "empty").length > 20) return null;
  for (const row of kept) {
    const column = byId.get(row.id); if (!column || (row.target && !conversionTypes.includes(row.target))) return null;
    const type = row.target || column.logical_type;
    if (row.nulls === "zero" && !["integer", "float"].includes(type)) return null;
    if (row.nulls === "empty" && type !== "string") return null;
  }
  const steps: PlannedStep[] = [];
  const add = (type: string, config: Record<string, unknown>, fields: string[]) => { const id = uuid(); steps.push({ id, type, config, fields }); return id; };
  add("select_columns", { column_ids: kept.map(row => row.id) }, names);
  const conversions = kept.filter(row => row.target).map(row => ({ column_id: row.id, target: row.target, on_error: row.onError }));
  if (conversions.length) add("convert_types", { conversions }, kept.filter(row => row.target).map(row => normalizedName(row.name)));
  const drops = kept.filter(row => row.nulls === "drop");
  if (drops.length) add("filter", { mode: "and", conditions: drops.map(row => ({ column_id: row.id, operator: "is_not_null" })) }, drops.map(row => normalizedName(row.name)));
  // Formula numeric results are Float64. Fill integers via exact decimal text to avoid rounding.
  const integerFills = kept.filter(row => row.nulls === "zero" && (row.target || byId.get(row.id)!.logical_type) === "integer");
  if (integerFills.length) add("convert_types", { conversions: integerFills.map(row => ({ column_id: row.id, target: "string", on_error: "error" })) }, integerFills.map(row => normalizedName(row.name)));
  const replacements = new Map<string, string>();
  const occupied = new Set([...columns.map(column => column.engine_name), ...names]);
  const restoreIntegers: { column_id: string; target: string; on_error: string }[] = [];
  for (const row of kept.filter(row => row.nulls === "zero" || row.nulls === "empty")) {
    let suffix = 1; while (occupied.has(`__filled_${suffix}`)) suffix++;
    const temporary = `__filled_${suffix}`; occupied.add(temporary);
    const fallback = integerFills.includes(row) ? '"0"' : row.nulls === "zero" ? "0" : '""';
    const id = add("calculated_column", { name: temporary, expression: `coalesce([${row.id}], ${fallback})` }, [normalizedName(row.name)]);
    const output = calculatedId(id); replacements.set(row.id, output);
    if ((row.target || byId.get(row.id)!.logical_type) === "integer") restoreIntegers.push({ column_id: output, target: "integer", on_error: "error" });
  }
  if (replacements.size) add("select_columns", { column_ids: kept.map(row => replacements.get(row.id) ?? row.id) }, names);
  if (restoreIntegers.length) add("convert_types", { conversions: restoreIntegers }, kept.filter(row => restoreIntegers.some(rule => rule.column_id === replacements.get(row.id))).map(row => normalizedName(row.name)));
  const renames = kept.filter(row => replacements.has(row.id) || normalizedName(row.name) !== byId.get(row.id)!.engine_name).map(row => ({ column_id: replacements.get(row.id) ?? row.id, new_name: normalizedName(row.name) }));
  if (renames.length) add("rename_columns", { renames }, renames.map(rule => rule.new_name));
  return steps;
}
