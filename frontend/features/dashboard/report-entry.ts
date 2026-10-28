import type { Dashboard } from "./api";

/** A direct entry should work without a drill-through selection from another report. */
export function requiresReportSelection(dashboard: Dashboard): boolean {
  return (dashboard.configuration?.parameters ?? []).some(parameter => parameter.required && parameter.default == null);
}

export function defaultReport(dashboards: Dashboard[]): Dashboard | undefined {
  return dashboards.find(dashboard => dashboard.widgets.length > 0 && !requiresReportSelection(dashboard))
    ?? dashboards.find(dashboard => dashboard.widgets.length > 0)
    ?? dashboards[0];
}
