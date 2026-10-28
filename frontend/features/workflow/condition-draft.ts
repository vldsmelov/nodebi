import { isVolatileDraft, readDocumentDraft, removeDocumentDraft, volatileDraftNotice, writeDocumentDraft } from "@/features/workspace/document-drafts";

export type ConditionDraft = { field: string; operator: string; value: string; yes: string; no: string; kind: string };
export const emptyCondition: ConditionDraft = { field: "", operator: "==", value: "", yes: "", no: "", kind: "string" };
const operators = ["==", "!=", ">", ">=", "<", "<=", "is_null"];
function valid(value: unknown): value is ConditionDraft {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return Object.keys(row).length === 6 && Object.keys(emptyCondition).every(key => typeof row[key] === "string" && (row[key] as string).length <= 4096)
    && operators.includes(String(row.operator)) && ["string", "number"].includes(String(row.kind));
}
export function loadConditionDraft(key: string | undefined, exact: boolean) {
  const fallback = { values: emptyCondition, baseline: emptyCondition, restored: false, error: null as string | null };
  if (!key || typeof window === "undefined") return fallback;
  try {
    const raw = readDocumentDraft(key);
    if (!raw) return fallback;
    if (raw.length > 200_000) throw new Error("Oversized condition draft");
    const saved = JSON.parse(raw);
    if (saved.version !== 1 || saved.exact !== exact || !valid(saved.values) || !valid(saved.baseline)) throw new Error("Invalid condition draft");
    return { values: saved.values as ConditionDraft, baseline: saved.baseline as ConditionDraft, restored: true, error: isVolatileDraft(key) ? volatileDraftNotice : null };
  } catch { return { ...fallback, error: "The local draft could not be restored." }; }
}
export function saveConditionDraft(key: string | undefined, exact: boolean, values: ConditionDraft, baseline: ConditionDraft): string | null {
  if (!key) return null;
  try {
    if (!valid(values) || !valid(baseline)) throw new Error("Invalid condition draft");
    if (JSON.stringify(values) === JSON.stringify(baseline)) removeDocumentDraft(key, true);
    else writeDocumentDraft(key, JSON.stringify({ version: 1, exact, values, baseline }));
    return null;
  } catch { return isVolatileDraft(key) ? volatileDraftNotice : "The condition draft could not be saved. Keep this form open."; }
}
