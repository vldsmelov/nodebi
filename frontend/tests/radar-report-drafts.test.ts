import { afterEach, expect, it } from "vitest";
import { radarDraft } from "@/features/dashboard/radar-draft";
import { readReportDraft, reportDraftKey } from "@/features/report-builder/report-draft";

afterEach(() => sessionStorage.clear());
const state = {
  kind: "report", requestId: "11111111-1111-4111-8111-111111111111",
  input: { kind: "import", selected: "snapshot" }, step: 4, showSteps: false,
  expectedToken: "a".repeat(64),
  settings: { name: "Profiles", presentation: "radar_chart", dimensions: ["profile"],
    measures: [], filters: [], decimal_average_scale: 2, rebind_fields: false, radar: radarDraft({}) },
};

it.each(["create", "edit"] as const)("recovers incomplete radar scales and exact pending %s request", mode => {
  const scope = reportDraftKey("project", mode, mode === "edit" ? "visual" : undefined);
  sessionStorage.setItem(scope, JSON.stringify({ version: 1, scope, state }));
  expect(readReportDraft(scope, mode)?.state).toEqual(state);
  const complete = { ...state, settings: { ...state.settings, radar: {
    ...radarDraft({}), profile_column_id: "profile", normalization: "min_max",
    axes: ["a", "b", "c"].map(column_id => ({ column_id, minimum: "9007199254740993.00", maximum: "9007199254740993.99" })),
  } } };
  const pending = JSON.stringify({ request_id: state.requestId, expected_token: state.expectedToken, settings: complete.settings });
  sessionStorage.setItem(scope, JSON.stringify({ version: 1, scope, state: complete, pending }));
  expect(readReportDraft(scope, mode)).toEqual({ version: 1, scope, state: complete, pending });
});

it.each([
  { ...radarDraft({}), axes: [] },
  { ...radarDraft({}), normalization: "automatic" },
  { ...radarDraft({}), axes: Array(9).fill(radarDraft({}).axes[0]) },
  { ...radarDraft({}), axes: [{ column_id: "a", minimum: 0, maximum: "1" }] },
  { ...radarDraft({}), version: 2 },
])("rejects malformed radar drafts", radar => {
  const scope = reportDraftKey("project", "create");
  sessionStorage.setItem(scope, JSON.stringify({ version: 1, scope, state: { ...state, settings: { ...state.settings, radar } } }));
  expect(() => readReportDraft(scope, "create")).toThrow("Invalid report draft");
});
