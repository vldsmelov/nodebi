import type { Dashboard } from "./api";

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown) => typeof v === "string";
const scalar = (v: unknown) => v === null || text(v) || typeof v === "boolean" || typeof v === "number" && Number.isFinite(v);
const optional = (v: unknown, check: (v: unknown) => boolean) => v == null || check(v);
const list = (v: unknown, max: number, check: (v: unknown) => boolean) => v === undefined || Array.isArray(v) && v.length <= max && v.every(check);
const strings = (v: Record<string, unknown>, keys: string[]) => keys.every(key => text(v[key]));
const known = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).every(key => keys.includes(key));
const integer = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
function action(v: unknown): boolean {
  return record(v) && known(v, ["dashboard_id", "values"]) && text(v.dashboard_id) && (v.values === undefined || record(v.values)
    && Object.keys(v.values).length <= 64 && Object.values(v.values).every(item => record(item)
      && known(item, ["source", "name", "value"])
      && ["field", "parameter", "constant"].includes(String(item.source))
      && optional(item.name, text) && optional(item.value, scalar)));
}
function parameter(v: unknown): boolean {
  return record(v) && known(v, ["name", "label", "logical_type", "default", "precision", "scale", "required", "options"]) && text(v.name) && ["string", "integer", "float", "decimal", "boolean", "date", "datetime"].includes(String(v.logical_type))
    && optional(v.label, text) && optional(v.required, value => typeof value === "boolean") && optional(v.default, scalar)
    && optional(v.precision, value => typeof value === "number" && Number.isFinite(value))
    && optional(v.scale, value => typeof value === "number" && Number.isFinite(value))
    && optional(v.options, value => record(value) && known(value, ["workflow_id", "node_id", "column_id", "label_column_id"]) && strings(value, ["workflow_id", "node_id", "column_id"]) && optional(value.label_column_id, text));
}
function configuration(v: unknown): boolean {
  return record(v) && known(v, ["period_enabled", "parameters", "bindings", "links"]) && optional(v.period_enabled, value => typeof value === "boolean")
    && list(v.parameters, 64, parameter)
    && list(v.bindings, 256, value => record(value) && known(value, ["workflow_id", "workflow_parameter", "dashboard_parameter"]) && strings(value, ["workflow_id", "workflow_parameter", "dashboard_parameter"]))
    && list(v.links, 32, value => record(value) && known(value, ["label", "action"]) && text(value.label) && action(value.action));
}
function widget(v: unknown): boolean {
  return record(v) && known(v, ["id", "visualization_id", "title", "config", "x", "y", "width", "height"]) && strings(v, ["id", "visualization_id"]) && optional(v.title, text)
    && integer(v.x, 0, 11) && integer(v.y, 0, 10000) && integer(v.width, 2, 12) && integer(v.height, 2, 40)
    && Number(v.x) + Number(v.width) <= 12
    && optional(v.config, value => record(value) && known(value, ["highlight_only", "show_title", "action"]) && list(value.highlight_only, 1, text)
      && optional(value.show_title, item => typeof item === "boolean") && optional(value.action, action));
}

/** Render-safety checks, not a second business validator. Incomplete editable names/bindings
 * and the original CAS revision are preserved; the backend still validates an explicit save. */
export function parseDashboardDraft(raw: string, id: string, projectId: string): Dashboard {
  if (raw.length > 10_000_000) throw new Error("Invalid dashboard draft");
  const v: unknown = JSON.parse(raw);
  if (!record(v) || !known(v, ["id", "project_id", "name", "revision", "widgets", "configuration"]) || v.id !== id || v.project_id !== projectId || !text(v.name)
    || !integer(v.revision, 1, Number.MAX_SAFE_INTEGER) || !Array.isArray(v.widgets)
    || !list(v.widgets, 100, widget) || new Set(v.widgets.map(item => item.id)).size !== v.widgets.length
    || !optional(v.configuration, configuration)) throw new Error("Invalid dashboard draft");
  return v as Dashboard;
}
