import { useI18n } from "@/lib/i18n";
import type { WorkflowParameter } from "./types";

export const fieldDefaults: Record<string, Record<string, unknown>> = {
  scalar_constant: { value: 1 }, scalar_parameter: { name: "" },
  field_arithmetic: { operation: "multiply", zero_policy: "error" }, field_compare: { operation: "greater" },
  field_logical: { operation: "and" }, append_field: { name: "" }, field_filter: { null_policy: "drop" }, field_sum: {},
};
const control = "mt-1 w-full rounded border border-outline bg-control p-2 text-sm";
export function FieldOperationConfiguration({ type, config, onChange, parameters = [] }: { type: string; config: Record<string, unknown>; onChange: (config: Record<string, unknown>) => void; parameters?: WorkflowParameter[] }) {
  const { t } = useI18n();
  const select = (key: string, label: string, options: string[]) => <label className="block mt-3 text-xs">{t(label)}<select aria-label={t(label)} className={control} value={String(config[key] ?? options[0])} onChange={e => onChange({ ...config, [key]: e.target.value })}>{options.map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label>;
  if (type === "scalar_constant") {
    const kind = config.logical_type as string ?? (typeof config.value === "number" ? "float" : typeof config.value === "boolean" ? "boolean" : config.value === null ? "unknown" : "string");
    return <><label className="block mt-3 text-xs">{t("Value type")}<select className={control} aria-label={t("Value type")} value={kind} onChange={e => onChange({ logical_type: e.target.value, value: e.target.value === "float" ? 1 : e.target.value === "boolean" ? true : e.target.value === "unknown" ? null : "" })}>{["float", "string", "boolean", "unknown"].map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label>{kind === "unknown" ? null : kind === "boolean" ? <label>{t("Value")}<select aria-label={t("Value")} className={control} value={String(config.value)} onChange={e => onChange({ ...config, value: e.target.value === "true" })}><option value="true">{t("true")}</option><option value="false">{t("false")}</option></select></label> : <label>{t("Value")}<input aria-label={t("Value")} className={control} type={kind === "float" ? "number" : "text"} step="any" value={String(config.value ?? "")} onChange={e => onChange({ ...config, value: kind === "float" ? e.target.value === "" ? null : Number(e.target.value) : e.target.value })} /></label>}</>;
  }
  if (type === "scalar_parameter") return <label>{t("Parameter")}<select aria-label={t("Parameter")} className={control} value={String(config.name ?? "")} onChange={e => onChange({ name: e.target.value })}><option value="">{t("Select parameter")}</option>{parameters.map(item => <option key={item.name} value={item.name}>{item.label || item.name}</option>)}</select></label>;
  if (type === "append_field") return <label>{t("Output field name")}<input aria-label={t("Output field name")} className={control} maxLength={200} value={String(config.name ?? "")} onChange={e => onChange({ name: e.target.value })} /></label>;
  if (type === "field_arithmetic") return <>{select("operation", "Operation", ["add", "subtract", "multiply", "divide"])}{select("zero_policy", "Division by zero", ["error", "null"])}</>;
  if (type === "field_compare") return select("operation", "Operation", ["equal", "not_equal", "less", "less_equal", "greater", "greater_equal"]);
  if (type === "field_logical") return select("operation", "Operation", ["and", "or", "not"]);
  if (type === "field_filter") return select("null_policy", "Null predicate", ["drop", "keep", "error"]);
  return <p className="mt-3 text-xs text-muted">{t("Sum requires a table and a field from that table.")}</p>;
}
