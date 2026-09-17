import { expect, it } from "vitest";
import type { Dashboard, DashboardParameter } from "@/features/dashboard/api";
import { navigationIssues, suggestNavigation } from "@/features/dashboard/navigation-plan";
const parameter = (name: string, kind: DashboardParameter["logical_type"] = "integer"): DashboardParameter => ({ name, logical_type: kind, label: "", required: true, default: null });
const target: Dashboard = { id: "detail", project_id: "project", name: "Detail", revision: 1, widgets: [], configuration: { parameters: [parameter("id"), parameter("region", "string")] } };
const fields = [{ column_id: "col_id", engine_name: "id", display_name: "Identifier", logical_type: "integer" }, { column_id: "col_text", engine_name: "label", display_name: "Name", logical_type: "string" }];
it("suggests only unique type-compatible matches and preserves explicit assignments", () => {
  const action = { dashboard_id: target.id, values: { region: { source: "constant" as const, name: "", value: "North" } } };
  const result = suggestNavigation(action, target, [], fields);
  expect(result.values?.id).toEqual({ source: "field", name: "col_id" });
  expect(result.values?.region).toEqual(action.values.region);
  expect(navigationIssues(result, target, [], fields)).toEqual([]);
  expect(suggestNavigation(action, target, [parameter("id")], fields).values?.id).toBeUndefined();
  expect(suggestNavigation(action, target, [], [{ ...fields[0], logical_type: "string" }]).values?.id).toBeUndefined();
});
it("reports required, missing, incompatible and removed destination mappings", () => {
  expect(navigationIssues({ dashboard_id: target.id }, target, [], fields)).toHaveLength(2);
  const action = { dashboard_id: target.id, values: { id: { source: "field" as const, name: "col_text" }, region: { source: "parameter" as const, name: "missing" }, removed: { source: "constant" as const, name: "", value: 1 } } };
  expect(navigationIssues(action, target, [], fields).map(item => item.message)).toEqual([
    "An undeclared dashboard parameter was supplied.", "The mapped value has an incompatible type.", "The navigation field or parameter is unavailable.",
  ]);
  expect(navigationIssues(action, undefined, [], fields)).toHaveLength(1);
  expect(navigationIssues(null, undefined, [], fields)).toEqual([]);
});
