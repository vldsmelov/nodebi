import { beforeEach, expect, it } from "vitest";
import { readVisualizationDraft, visualizationDraftKey } from "@/features/dashboard/visualization-draft";

const draft = { version: 1, projectId: "one", name: "Report", type: "table", selection: "flow/pub", revision: 2, config: { column_ids: ["stable"] } };
beforeEach(() => sessionStorage.clear());
it("isolates new and copied drafts by project and dashboard, and keeps the legacy saved-visualization key", () => {
  expect(visualizationDraftKey("one", "chart")).toBe("nodebi:visualization-draft:chart");
  expect(new Set([visualizationDraftKey("one"), visualizationDraftKey("two"), visualizationDraftKey("one", undefined, false, "board"), visualizationDraftKey("one", "chart", true)])).toHaveProperty("size", 4);
});
it("validates envelope, ownership, revision and configuration before restoring", () => {
  const key = visualizationDraftKey("one");
  sessionStorage.setItem(key, JSON.stringify(draft));
  expect(readVisualizationDraft(key, "one")).toEqual(draft);
  expect(() => readVisualizationDraft(key, "two")).toThrow();
  for (const invalid of [{ ...draft, revision: -1 }, { ...draft, config: [] }, { ...draft, type: "arbitrary" }, { ...draft, version: 2 }, null, "invalid JSON"]) {
    sessionStorage.setItem(key, typeof invalid === "string" ? invalid : JSON.stringify(invalid));
    expect(() => readVisualizationDraft(key, "one")).toThrow();
  }
});

it("validates the pending request identity and retains its original payload", () => {
  const key = visualizationDraftKey("one");
  const saveAttempt = { asCopy: true, body: { request_id: crypto.randomUUID(), workflow_id: "flow", publication_id: "pub", expected_revision: 2 } };
  sessionStorage.setItem(key, JSON.stringify({ ...draft, saveAttempt }));
  expect(readVisualizationDraft(key, "one")?.saveAttempt).toEqual(saveAttempt);
  for (const invalid of [null, {}, { ...saveAttempt, asCopy: "true" }, { ...saveAttempt, body: { ...saveAttempt.body, request_id: "invalid" } }]) {
    sessionStorage.setItem(key, JSON.stringify({ ...draft, saveAttempt: invalid }));
    expect(() => readVisualizationDraft(key, "one")).toThrow();
  }
});
