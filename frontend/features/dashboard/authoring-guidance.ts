import type { ResolvedColumn } from "@/features/workflow/types";

/** Incomplete form guidance only; the backend remains authoritative for execution validation. */
export function chartSetupHints(type: string, kind: string, config: Record<string, unknown>, columns: ResolvedColumn[]): string[] {
  if (kind === "scalar") return [];
  const exists = (id: unknown) => typeof id === "string" && columns.some(column => column.column_id === id);
  const hints: string[] = [];
  if (!["table", "kpi"].includes(type) && !exists(config.category_column_id)) hints.push("Choose a category field.");
  if (type !== "table" && !exists(config.value_column_id)) hints.push("Choose a value field.");
  if (type === "table" && Array.isArray(config.column_ids) && (!config.column_ids.length || config.column_ids.some(id => !exists(id)))) hints.push("Select available table columns and remove unavailable ones.");
  const series = (config.additional_series ?? []) as { column_id: string; name: string }[];
  if (series.some(item => !exists(item.column_id) || !item.name.trim())) hints.push("Choose a field and name for every additional series.");
  if (series.length && new Set([config.value_column_id, ...series.map(item => item.column_id)]).size !== series.length + 1) hints.push("Choose different value fields for the series.");
  return hints;
}

export const chartPurpose: Record<string, string> = {
  table: "Show individual records. Choose and arrange columns on Appearance.",
  kpi: "Show one prepared value. Aggregate to one row in the workflow first.",
  bar_chart: "Compare prepared values by category. Totals are calculated in the workflow.",
  line_chart: "Show a trend over dates or an ordered category.",
  area_chart: "Show a trend with a filled area below the line.",
  pie_chart: "Show parts of a total using prepared category values.",
  donut_chart: "Show parts of a total using prepared category values.",
  scatter_chart: "Compare two numeric fields as points.",
};
