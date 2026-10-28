import type { components } from "@/lib/api-schema";

export type ComboDraft = components["schemas"]["ComboSpec"];
export type ComboSeriesDraft = components["schemas"]["ComboSeries"];
export function comboDraft(config: Record<string, unknown>): ComboDraft {
  return config.spec as ComboDraft ?? { type: "combo_chart", version: 1, category_column_id: "", secondary_axis: false, series: [
    { column_id: "", kind: "bar", axis: "primary", name: "" },
    { column_id: "", kind: "line", axis: "primary", name: "" },
  ] };
}
