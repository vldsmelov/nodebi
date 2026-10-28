import type { components } from "@/lib/api-schema";

export type BulletDraft = components["schemas"]["BulletSpec"];
export function bulletDraft(config: Record<string, unknown>): BulletDraft {
  const spec = config.spec as BulletDraft | undefined;
  return spec?.type === "bullet_chart" ? spec : {
    version: 1, type: "bullet_chart", category_column_id: "", actual_column_id: "", target_column_id: "",
    minimum: "0", maximum: "100", bands: [{ label: "", upper: "100", tone: "neutral" }],
  };
}
