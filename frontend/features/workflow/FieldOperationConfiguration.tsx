import { useI18n } from "@/lib/i18n";
import type { GraphIssue, WorkflowParameter } from "./types";

export const fieldDefaults: Record<string, Record<string, unknown>> = {
  field_formula: { expression: "coalesce(a, 0)" }, field_scalar: {},
  scalar_constant: { value: 1 }, scalar_parameter: { name: "" },
  field_arithmetic: { operation: "multiply", zero_policy: "error" }, field_compare: { operation: "greater" },
  field_logical: { operation: "and" }, append_field: { name: "" }, field_filter: { null_policy: "drop" }, field_sum: {},
};
const control = "mt-1 w-full rounded border border-outline bg-control p-2 text-sm";
export function fieldConfig(type: string, version: number): Record<string, unknown> {
  if (version === 2 && type === "scalar_constant") return { value: "1.00", precision: 38, scale: 2, rounding: "half_even" };
  if (version === 2 && ["field_arithmetic", "field_formula"].includes(type)) return { ...fieldDefaults[type], precision: 38, scale: 2, rounding: "half_even" };
  return { ...(fieldDefaults[type] ?? {}) };
}
export function FieldOperationConfiguration({ type, version = 1, config, onChange, parameters = [], issues = [] }: { type: string; version?: number; config: Record<string, unknown>; onChange: (config: Record<string, unknown>) => void; parameters?: WorkflowParameter[]; issues?: GraphIssue[] }) {
  const { t, errorText } = useI18n();
  const diagnostic = (key: string) => {
    const errors = issues.filter(issue => issue.severity === "error" && issue.field === `config.${key}`);
    return { "aria-invalid": errors.length > 0, title: errors.map(errorText).join("\n"), style: errors.length ? { borderColor: "var(--danger)" } : undefined };
  };
  const select = (key: string, label: string, options: string[]) => <label className="block mt-3 text-xs">{t(label)}<select {...diagnostic(key)} aria-label={t(label)} className={control} value={String(config[key] ?? options[0])} onChange={e => onChange({ ...config, [key]: e.target.value })}>{options.map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label>;
  if (version === 2 && ["scalar_constant", "field_arithmetic", "field_sum", "field_scalar", "field_formula"].includes(type)) return <div>
    <p className="mt-3 text-xs text-muted">{t(type === "field_formula" ? "Use a, b, c with decimal or integer arithmetic. Text, dates and booleans may be used in conditions." : "Exact decimal and integer inputs only. Float64 requires explicit conversion.")}</p>
    {type === "field_formula" && <label className="block mt-3 text-xs">{t("Expression")}<textarea {...diagnostic("expression")} aria-label={t("Expression")} className={control} maxLength={4096} value={String(config.expression ?? "")} onChange={event => onChange({ ...config, expression: event.target.value })} /><span className="text-xs text-muted">{t("Exact functions: if_else, coalesce, nullif, safe_divide, abs, minimum, maximum. Float64 requires explicit conversion.")}</span></label>}
    {type === "field_arithmetic" && <>{select("operation", "Operation", ["add", "subtract", "multiply", "divide"])}{select("zero_policy", "Division by zero", ["error", "null"])}</>}
    {type === "scalar_constant" && <label className="block mt-3 text-xs">{t("Exact decimal value")}<input className={control} maxLength={80} inputMode="decimal" value={String(config.value ?? "")} onChange={event => onChange({ ...config, value: event.target.value || null })} /></label>}
    {["scalar_constant", "field_arithmetic", "field_formula"].includes(type) && <>{(["precision", "scale"] as const).map(key => <label key={key} className="block mt-3 text-xs">{t(key === "precision" ? "Decimal precision" : "Decimal scale")}<input {...diagnostic(key)} className={control} type="number" min={key === "precision" ? 1 : 0} max={38} value={Number(config[key] ?? (key === "precision" ? 38 : 2))} onChange={event => onChange({ ...config, [key]: Number(event.target.value) })} /></label>)}<p className="mt-3 text-xs text-muted">{t(type === "field_formula" ? "One half-even rounding after the whole expression. Later nodes use this rounded result." : type === "field_arithmetic" ? "Half-even rounding at each arithmetic node; later nodes use the rounded result." : "Enter a decimal string. Extra fractional digits are rejected, not rounded.")}</p></>}
    {type === "field_sum" && <p className="mt-3 text-xs text-muted">{t("Exact sum preserves input scale. Nulls are ignored; an empty sum is zero.")}</p>}
    {type === "field_scalar" && <p className="mt-3 text-xs text-muted">{t("Requires exactly one row. Filter or aggregate upstream; null remains null.")}</p>}
  </div>;
  if (type === "field_formula") return <label>{t("Expression")}<textarea {...diagnostic("expression")} aria-label={t("Expression")} className={control} maxLength={4096} value={String(config.expression ?? "")} onChange={e => onChange({ expression: e.target.value })} /><span className="text-xs text-muted">{t("Use connected inputs a, b, c. Functions: trim, lower, coalesce, nullif, safe_divide.")}</span></label>;
  if (type === "field_scalar") return <p className="mt-3 text-xs text-muted">{t("Requires exactly one row. Filter or aggregate upstream; null remains null.")}</p>;
  if (type === "scalar_constant") {
    const kind = config.logical_type as string ?? (typeof config.value === "number" ? "float" : typeof config.value === "boolean" ? "boolean" : config.value === null ? "unknown" : "string");
    return <><label className="block mt-3 text-xs">{t("Value type")}<select {...diagnostic("logical_type")} className={control} aria-label={t("Value type")} value={kind} onChange={e => onChange({ logical_type: e.target.value, value: e.target.value === "float" ? 1 : e.target.value === "boolean" ? true : e.target.value === "unknown" ? null : "" })}>{["float", "string", "boolean", "unknown"].map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label>{kind === "unknown" ? null : kind === "boolean" ? <label>{t("Value")}<select {...diagnostic("value")} aria-label={t("Value")} className={control} value={String(config.value)} onChange={e => onChange({ ...config, value: e.target.value === "true" })}><option value="true">{t("true")}</option><option value="false">{t("false")}</option></select></label> : <label>{t("Value")}<input {...diagnostic("value")} aria-label={t("Value")} className={control} type={kind === "float" ? "number" : "text"} step="any" value={String(config.value ?? "")} onChange={e => onChange({ ...config, value: kind === "float" ? e.target.value === "" ? null : Number(e.target.value) : e.target.value })} /></label>}</>;
  }
  if (type === "scalar_parameter") return <label>{t("Parameter")}<select {...diagnostic("name")} aria-label={t("Parameter")} className={control} value={String(config.name ?? "")} onChange={e => onChange({ name: e.target.value })}><option value="">{t("Select parameter")}</option>{parameters.map(item => <option key={item.name} value={item.name}>{item.label || item.name}</option>)}</select></label>;
  if (type === "append_field") return <label>{t("Output field name")}<input {...diagnostic("name")} aria-label={t("Output field name")} className={control} maxLength={200} value={String(config.name ?? "")} onChange={e => onChange({ name: e.target.value })} /></label>;
  if (type === "field_arithmetic") return <>{select("operation", "Operation", ["add", "subtract", "multiply", "divide"])}{select("zero_policy", "Division by zero", ["error", "null"])}</>;
  if (type === "field_compare") return select("operation", "Operation", ["equal", "not_equal", "less", "less_equal", "greater", "greater_equal"]);
  if (type === "field_logical") return select("operation", "Operation", ["and", "or", "not"]);
  if (type === "field_filter") return select("null_policy", "Null predicate", ["drop", "keep", "error"]);
  return <p className="mt-3 text-xs text-muted">{t("Sum requires a table and a field from that table.")}</p>;
}
