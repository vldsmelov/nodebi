import { afterEach, expect, it } from "vitest";
import { comboDraft } from "@/features/dashboard/combo-draft";
import { readReportDraft, reportDraftKey, type ReportFormDraft } from "@/features/report-builder/report-draft";

afterEach(() => sessionStorage.clear());
const state: ReportFormDraft = {
  kind: "report", requestId: "11111111-1111-4111-8111-111111111111",
  input: { kind: "import", selected: "snapshot" }, step: 4, showSteps: false,
  expectedToken: "a".repeat(64),
  settings: { name: "Plan and actual", presentation: "combo_chart", dimensions: ["month"],
    measures: [], filters: [], decimal_average_scale: 2, rebind_fields: false, combo: comboDraft({}) },
};

it.each(["create", "edit"] as const)("recovers incomplete combo bindings and exact pending %s request", mode => {
  const scope = reportDraftKey("project", mode, mode === "edit" ? "visual" : undefined);
  sessionStorage.setItem(scope, JSON.stringify({ version: 1, scope, state }));
  expect(readReportDraft(scope, mode)?.state).toEqual(state);
  const complete = { ...state, settings: { ...state.settings, combo: {
    ...comboDraft({}), category_column_id: "month", secondary_axis: true,
    series: [{ column_id: "actual", kind: "bar", axis: "primary", name: "Actual" },
      { column_id: "ratio", kind: "line", axis: "secondary", name: "Percent" }],
  } } };
  const pending = JSON.stringify({ request_id: state.requestId, expected_token: state.expectedToken, settings: complete.settings });
  sessionStorage.setItem(scope, JSON.stringify({ version: 1, scope, state: complete, pending }));
  expect(readReportDraft(scope, mode)).toEqual({ version: 1, scope, state: complete, pending });
});

it.each([
  { ...comboDraft({}), series: Array(9).fill(comboDraft({}).series[0]) },
  { ...comboDraft({}), series: [{ column_id: "x", kind: "custom", axis: "primary" }] },
  { ...comboDraft({}), secondary_axis: "true" },
  { ...comboDraft({}), version: 2 },
])("rejects malformed combination drafts", combo => {
  const scope = reportDraftKey("project", "create");
  sessionStorage.setItem(scope, JSON.stringify({ version: 1, scope, state: { ...state, settings: { ...state.settings, combo } } }));
  expect(() => readReportDraft(scope, "create")).toThrow("Invalid report draft");
});
