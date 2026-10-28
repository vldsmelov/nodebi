import type { Visualization } from "./api";
import { readDocumentDraft } from "@/features/workspace/document-drafts";

export type VisualizationSaveAttempt = { asCopy: boolean; body: Record<string, unknown> };
export type VisualizationDraft = {
  version: 1; projectId: string; selection: string; name: string; type: Visualization["type"];
  config: Record<string, unknown>; revision: number;
  saveAttempt?: VisualizationSaveAttempt;
};
const types = new Set(["table", "kpi", "bar_chart", "line_chart", "area_chart", "pie_chart", "donut_chart", "scatter_chart", "box_plot", "histogram_chart", "heatmap_chart", "radar_chart", "waterfall_chart", "combo_chart", "bubble_chart", "bullet_chart", "analytical_table", "pareto_chart", "funnel_chart", "treemap_chart", "sunburst_chart"]);
export const draftStorageError = "Local draft storage is unavailable. Save before leaving this page.";
export function visualizationDraftKey(projectId: string, id?: string, copy = false, scope = "library") {
  return id && !copy ? `nodebi:visualization-draft:${id}` : `nodebi:visualization-draft:${copy ? `copy:${id}` : "new"}:${projectId}:${scope}`;
}
export function readVisualizationDraft(key: string, projectId: string, legacy = false): VisualizationDraft | null {
  const raw = readDocumentDraft(key);
  if (!raw) return null;
  if (raw.length > 1_000_000) throw new Error("The local visualization draft is invalid. Discard it to use saved settings.");
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") throw new Error("The local visualization draft is invalid. Discard it to use saved settings.");
  const draft = value as Partial<VisualizationDraft>;
  const attempt = draft.saveAttempt;
  if (attempt !== undefined && (!attempt || typeof attempt.asCopy !== "boolean"
    || !attempt.body || typeof attempt.body !== "object" || Array.isArray(attempt.body)
    || typeof attempt.body.request_id !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(attempt.body.request_id)
    || typeof attempt.body.workflow_id !== "string" || typeof attempt.body.publication_id !== "string")) {
    throw new Error("The local visualization draft is invalid. Discard it to use saved settings.");
  }
  if ((!legacy || draft.version !== undefined) && (draft.version !== 1 || draft.projectId !== projectId)
    || typeof draft.selection !== "string" || typeof draft.name !== "string" || !types.has(draft.type ?? "")
    || !draft.config || typeof draft.config !== "object" || Array.isArray(draft.config)
    || !Number.isSafeInteger(draft.revision) || Number(draft.revision) < 1) {
    throw new Error("The local visualization draft is invalid. Discard it to use saved settings.");
  }
  return { ...draft, version: 1, projectId } as VisualizationDraft;
}
