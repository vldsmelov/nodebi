import type { components } from "@/lib/api-schema";

/** Convert form fields to one transport spec. Drafts and saved legacy configs remain compatible. */
export function basicInput(type: string, config: Record<string, unknown>, kind: string): Record<string, unknown> {
  if (config.spec) return config;
  let spec: components["schemas"]["BasicVisualizationInput"]["spec"];
  const value = String(config.value_column_id ?? ""), category = String(config.category_column_id ?? "");
  if (["bar_chart", "line_chart", "area_chart"].includes(type)) {
    spec = { version: 1, type: type as "bar_chart" | "line_chart" | "area_chart", x: category, y: [
      { column_id: value, name: String(config.primary_series_name ?? "") },
      ...((config.additional_series ?? []) as { column_id: string; name?: string }[]).map(series => ({ column_id: series.column_id, name: series.name ?? "" })),
    ] };
  } else if (type === "pie_chart" || type === "donut_chart") spec = { version: 1, type, category, value };
  else if (type === "scatter_chart") spec = { version: 1, type, x: category, y: value };
  else if (type === "kpi") spec = { version: 1, type, value: kind === "scalar" ? null : value };
  else if (type === "table") spec = { version: 1, type, columns: (config.column_ids as string[] | null | undefined) ?? null };
  else return config;
  const appearance = Object.fromEntries(Object.entries(config).filter(([key]) => !["value_column_id", "category_column_id", "column_ids", "additional_series", "primary_series_name"].includes(key)));
  return { ...appearance, spec };
}
