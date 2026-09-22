import type { ParameterValues, WorkflowParameter } from "@/features/workflow/types";
import type { Dashboard, DashboardConfiguration, NavigationAction } from "./api";

export const emptyConfiguration: DashboardConfiguration = { period_enabled: false, parameters: [], bindings: [], links: [] };

export function checkedValue(definition: WorkflowParameter, value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  const kind = definition.logical_type;
  const valid = kind === "string" ? typeof value === "string" && value.length <= 2000
    : kind === "boolean" ? typeof value === "boolean"
    : kind === "integer" ? typeof value === "number" && Number.isSafeInteger(value)
    : kind === "float" ? typeof value === "number" && Number.isFinite(value)
    : typeof value === "string" && (kind === "date" ? /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value : /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value)));
  if (!valid) throw new Error(`Parameter '${definition.name}' requires ${kind}.`);
  return value as string | number | boolean;
}

export function parseViewValues(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    if (raw.length > 140000) throw new Error();
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length > 64) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new Error("Invalid dashboard URL parameters."); }
}

export function resolveViewValues(config: DashboardConfiguration, supplied: Record<string, unknown>): ParameterValues {
  const definitions = config.parameters ?? [];
  if (Object.keys(supplied).some(name => !definitions.some(item => item.name === name))) throw new Error("An undeclared dashboard parameter was supplied.");
  return Object.fromEntries(definitions.map(definition => {
    const value = checkedValue(definition, Object.hasOwn(supplied, definition.name) ? supplied[definition.name] : definition.default);
    if (definition.required && value === null) throw new Error(`Dashboard parameter '${definition.name}' is required.`);
    return [definition.name, value];
  }));
}

export function workflowValues(config: DashboardConfiguration, workflowId: string, values: ParameterValues): ParameterValues {
  return Object.fromEntries((config.bindings ?? []).filter(binding => binding.workflow_id === workflowId).map(binding => [binding.workflow_parameter, values[binding.dashboard_parameter] ?? null]));
}

export function navigationValues(action: NavigationAction, dashboards: Dashboard[], values: ParameterValues, row?: Record<string, unknown>): ParameterValues {
  const target = dashboards.find(item => item.id === action.dashboard_id);
  if (!target) throw new Error("The navigation dashboard is unavailable.");
  const mapped = Object.fromEntries(Object.entries(action.values ?? {}).map(([name, mapping]) => {
    const source = mapping.source === "field" ? row : values;
    if (mapping.source !== "constant" && (!source || !Object.hasOwn(source, mapping.name ?? ""))) throw new Error("The navigation field or parameter is unavailable.");
    return [name, mapping.source === "constant" ? mapping.value : source![mapping.name!]];
  }));
  const inherited = Object.fromEntries((target.configuration?.parameters ?? []).filter(item => Object.hasOwn(values, item.name)).flatMap(item => { try { return [[item.name, checkedValue(item, values[item.name])]]; } catch { return []; } }));
  return resolveViewValues(target.configuration ?? emptyConfiguration, { ...inherited, ...mapped });
}

export function dashboardUrl(projectId: string, dashboardId: string, values: ParameterValues = {}, viewOnly = false, period?: string | null): string {
  const query = new URLSearchParams({ dashboard: dashboardId });
  if (period) query.set("period", period);
  if (viewOnly) query.set("mode", "view");
  if (Object.keys(values).length) query.set("parameters", JSON.stringify(values));
  return `/projects/${encodeURIComponent(projectId)}/dashboard?${query}`;
}
