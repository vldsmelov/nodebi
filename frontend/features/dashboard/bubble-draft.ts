import type { components } from "@/lib/api-schema";

export type BubbleDraft = components["schemas"]["BubbleSpec"];
export function bubbleDraft(config: Record<string, unknown>): BubbleDraft {
  const spec = config.spec as BubbleDraft | undefined;
  return spec?.type === "bubble_chart" ? spec : {
    type: "bubble_chart", version: 1, key_column_id: "", x_column_id: "", y_column_id: "",
    size_column_id: "", label_column_id: null, group_column_id: null, size_encoding: "area",
  };
}
