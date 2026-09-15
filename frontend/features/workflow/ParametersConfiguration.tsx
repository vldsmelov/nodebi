"use client";

import { useI18n } from "@/lib/i18n";
import type { WorkflowParameter, ParameterValues } from "./types";

const control = "mt-2 w-full rounded-lg border border-outline bg-control px-2 py-2 text-xs";
const types = ["string", "integer", "float", "boolean", "date", "datetime"] as const;

export function ParameterInput({ definition, value, onChange, label }: {
  definition: WorkflowParameter; value: string | number | boolean | null | undefined;
  onChange: (value: string | number | boolean | null) => void; label: string;
}) {
  const { t } = useI18n();
  if (definition.logical_type === "boolean") return <select aria-label={label} className={control} value={value == null ? "" : String(value)} onChange={e => onChange(e.target.value === "" ? null : e.target.value === "true")}>
    <option value="">{t("Not set")}</option><option value="true">{t("true")}</option><option value="false">{t("false")}</option>
  </select>;
  const numeric = ["integer", "float"].includes(definition.logical_type);
  return <input aria-label={label} className={control} value={value == null ? "" : String(value)}
    type={numeric ? "number" : definition.logical_type === "date" ? "date" : definition.logical_type === "datetime" ? "datetime-local" : "text"}
    step={definition.logical_type === "integer" ? 1 : "any"} maxLength={2000}
    onChange={e => onChange(e.target.value === "" ? null : numeric ? Number(e.target.value) : e.target.value)} />;
}

export function ParametersConfiguration({ definitions, onChange, values, onValuesChange }: {
  definitions: WorkflowParameter[]; onChange: (items: WorkflowParameter[]) => void;
  values: ParameterValues; onValuesChange: (values: ParameterValues) => void;
}) {
  const { t } = useI18n();
  const update = (index: number, patch: Partial<WorkflowParameter>) => onChange(definitions.map((item, i) => i === index ? { ...item, ...patch } : item));
  return <details className="mb-4 rounded-lg border border-outline p-3">
    <summary className="cursor-pointer text-sm">{t("Workflow parameters")}</summary>
    <p className="mt-2 text-xs text-muted">{t("Definitions are saved. Preview values do not change the graph.")}</p>
    {definitions.map((definition, index) => <fieldset key={index} className="mt-3 border-t border-outline pt-2">
      <input aria-label={t("Parameter name {0}", { 0: index + 1 })} className={control} value={definition.name} maxLength={64} onChange={e => update(index, { name: e.target.value })} />
      <input aria-label={t("Parameter label {0}", { 0: index + 1 })} className={control} value={definition.label ?? ""} maxLength={200} onChange={e => update(index, { label: e.target.value })} />
      <select aria-label={t("Parameter type {0}", { 0: index + 1 })} className={control} value={definition.logical_type} onChange={e => { update(index, { logical_type: e.target.value as WorkflowParameter["logical_type"], default: null }); const next = { ...values }; delete next[definition.name]; onValuesChange(next); }}>{types.map(type => <option key={type} value={type}>{t(type)}</option>)}</select>
      <label className="mt-2 block text-xs">{t("Default value")}<ParameterInput definition={definition} value={definition.default} label={t("Parameter default {0}", { 0: index + 1 })} onChange={value => update(index, { default: value })} /></label>
      <label className="mt-2 block text-xs">{t("Preview value")}<ParameterInput definition={definition} value={Object.hasOwn(values, definition.name) ? values[definition.name] : definition.default} label={t("Parameter preview {0}", { 0: index + 1 })} onChange={value => onValuesChange({ ...values, [definition.name]: value })} /></label>
      <button className="mt-2 text-xs text-danger" onClick={() => { onChange(definitions.filter((_, i) => i !== index)); const next = { ...values }; delete next[definition.name]; onValuesChange(next); }}>{t("Remove parameter")}</button>
    </fieldset>)}
    <button className="mt-3 text-xs text-accent" disabled={definitions.length >= 64} onClick={() => { let n = 1; while (definitions.some(item => item.name === `parameter_${n}`)) n++; onChange([...definitions, { name: `parameter_${n}`, logical_type: "string", label: "", default: null }]); }}>{t("Add parameter")}</button>
  </details>;
}
