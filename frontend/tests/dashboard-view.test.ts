import { expect, it } from "vitest";
import { dashboardUrl, navigationValues, parseViewValues, resolveViewValues, workflowValues } from "@/features/dashboard/view-state";
import type { Dashboard, DashboardConfiguration } from "@/features/dashboard/api";

const configuration: DashboardConfiguration = { period_enabled: false,
  parameters: [{ name: "service", label: "Service", logical_type: "integer", required: true, default: null }],
  bindings: [{ dashboard_parameter: "service", workflow_id: "workflow", workflow_parameter: "chosen" }],
};
const target: Dashboard = { id: "detail", project_id: "project", name: "Detail", revision: 1, widgets: [], configuration };

it("round-trips typed URL selections and uses only explicit workflow bindings", () => {
  const url = new URL(dashboardUrl("project", "detail", { service: 0 }), "http://localhost");
  expect(url.searchParams.get("dashboard")).toBe("detail");
  const values = resolveViewValues(configuration, parseViewValues(url.searchParams.get("parameters")));
  expect(values).toEqual({ service: 0 });
  expect(workflowValues(configuration, "workflow", values)).toEqual({ chosen: 0 });
  expect(workflowValues(configuration, "unrelated", values)).toEqual({});
});

it("rejects malformed, unknown, mistyped and missing URL values", () => {
  for (const raw of ["[1]", "null", "{"]) expect(() => parseViewValues(raw)).toThrow("Invalid dashboard URL");
  for (const value of [{}, { service: null }, { service: "1" }, { service: true }, { service: 1, surprise: 2 }]) expect(() => resolveViewValues(configuration, value)).toThrow();
});

it("passes stable row identifiers and supports current parameters or constants", () => {
  expect(navigationValues({ dashboard_id: "detail", values: { service: { source: "field", name: "row_id" } } }, [target], {}, { row_id: 12, label: "Repeated label" })).toEqual({ service: 12 });
  expect(navigationValues({ dashboard_id: "detail", values: { service: { source: "parameter", name: "selection" } } }, [target], { selection: 7 })).toEqual({ service: 7 });
  expect(navigationValues({ dashboard_id: "detail", values: { service: { source: "constant", name: "", value: 3 } } }, [target], {})).toEqual({ service: 3 });
  expect(() => navigationValues({ dashboard_id: "detail", values: { service: { source: "field", name: "missing" } } }, [target], {}, {})).toThrow("unavailable");
  expect(() => navigationValues({ dashboard_id: "removed" }, [target], {})).toThrow("unavailable");
});
