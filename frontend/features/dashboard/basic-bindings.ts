import type { VisualizationResult } from "./api";

const basicTypes = new Set(["bar_chart", "line_chart", "area_chart", "pie_chart", "donut_chart", "scatter_chart", "kpi", "table"]);

/** Presentation projection only. Stable semantic IDs resolve against this response's schema.
 * Old frozen releases without specs retain their original rendering contract.
 */
export function basicBindings(result: VisualizationResult): VisualizationResult {
  const spec = result.spec;
  if (!spec || !basicTypes.has(spec.type ?? "")) return result;
  if (spec.type !== result.type) throw new Error("The visualization type does not match its typed specification.");
  const byId = new Map(result.columns.map(column => [column.column_id, column]));
  const field = (id: string) => {
    const column = byId.get(id);
    if (!column) throw new Error("A selected visualization field is unavailable.");
    return column.engine_name;
  };
  if (spec.type === "table") {
    spec.columns.forEach(field);
    const visible = new Set(spec.columns);
    return { ...result, columns: [...spec.columns.map(id => byId.get(id)!), ...result.columns.filter(c => !visible.has(c.column_id))], context_column_ids: result.columns.filter(c => !visible.has(c.column_id)).map(c => c.column_id) };
  }
  if (spec.type === "kpi") return { ...result, value_field: field(spec.value) };
  if (spec.type === "scatter_chart") return { ...result, category_field: field(spec.x), value_field: field(spec.y) };
  if (spec.type === "pie_chart" || spec.type === "donut_chart") return { ...result, category_field: field(spec.category), value_field: field(spec.value) };
  if (spec.type === "bar_chart" || spec.type === "line_chart" || spec.type === "area_chart") {
    return { ...result, category_field: field(spec.x), value_field: field(spec.y[0].column_id), additional_series: spec.y.slice(1).map(series => ({ field: field(series.column_id), name: series.name })) };
  }
  return result;
}
