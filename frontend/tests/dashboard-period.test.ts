import { expect, it } from "vitest";
import { parsePeriod } from "@/features/dashboard/DashboardPeriod";
import { dashboardUrl, navigationValues } from "@/features/dashboard/view-state";

it("round-trips a calendar range and rejects malformed dates and reversed ranges", () => {
  const period = { start: "2024-02-29", end: "2024-03-31" };
  const url = new URL(dashboardUrl("project", "dashboard", {}, true, JSON.stringify(period)), "http://localhost");
  expect(parsePeriod(url.searchParams.get("period"))).toEqual(period);
  expect(parsePeriod(null)).toBeNull();
  for (const value of [{ start: "2023-02-29", end: "2023-03-31" }, { start: "2026-02-02", end: "2026-02-01" }, { ...period, unknown: true }, [], null, { start: 1, end: 2 }]) expect(() => parsePeriod(JSON.stringify(value))).toThrow();
});

it("inherits compatible selections and replaces them with the clicked record", () => {
  const target = { id: "detail", project_id: "project", revision: 1, name: "Detail", widgets: [], configuration: { period_enabled: true, parameters: [{ name: "service", label: "Service", logical_type: "integer" as const, required: true }, { name: "cost", label: "Cost", logical_type: "string" as const, required: false }] } };
  expect(navigationValues({ dashboard_id: "detail", values: { service: { source: "field", name: "identity" } } }, [target], { service: 1, cost: "direct", irrelevant: 5 }, { identity: 2 })).toEqual({ service: 2, cost: "direct" });
  expect(navigationValues({ dashboard_id: "detail" }, [target], { service: 1, cost: "direct" })).toEqual({ service: 1, cost: "direct" });
});
