"use client";

import { useI18n } from "@/lib/i18n";
import { ParameterInput } from "@/features/workflow/ParametersConfiguration";
import type { WorkflowSummary, ParameterValues } from "@/features/workflow/types";
import type { Dashboard, DashboardConfiguration, DashboardParameter, NavigationAction } from "./api";
import { useState } from "react";
import { ParameterOptionsConfiguration, ParameterChoices } from "./ParameterOptions";
import { emptyConfiguration, workflowValues } from "./view-state";

import { compatibleNavigationType, type NavigationField } from "./navigation-plan";

const control = "rounded-lg border border-outline bg-control px-2 py-2 text-xs";

export function NavigationConfiguration({ action, onChange, dashboards, parameters, fields = [], typed = false }: {
  action?: NavigationAction | null; onChange: (action: NavigationAction | null) => void;
  dashboards: Dashboard[]; parameters: DashboardParameter[];
  fields?: NavigationField[]; typed?: boolean;
}) {
  const { t } = useI18n();
  const target = dashboards.find(item => item.id === action?.dashboard_id);
  return <div className="space-y-2"><select aria-label={t("Destination dashboard")} className={control} value={action?.dashboard_id ?? ""} onChange={e => onChange(e.target.value ? { dashboard_id: e.target.value, values: {} } : null)}>
    <option value="">{t("No navigation")}</option>{dashboards.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
  </select>{(target?.configuration?.parameters ?? []).map(definition => {
    const value = action?.values?.[definition.name];
    const eligibleParameters = parameters.filter(item => !typed || compatibleNavigationType(item.logical_type, definition.logical_type));
    const eligibleFields = fields.filter(item => !typed || compatibleNavigationType(item.logical_type, definition.logical_type));
    const unavailable = value?.source === "field" ? !eligibleFields.some(item => item.column_id === value.name) : value?.source === "parameter" ? !eligibleParameters.some(item => item.name === value.name) : false;
    const update = (next: NonNullable<NavigationAction["values"]>[string] | null) => { const values = { ...action!.values }; if (next) values[definition.name] = next; else delete values[definition.name]; onChange({ ...action!, values }); };
    return <div key={definition.name} className="flex flex-wrap items-center gap-2 text-xs"><span>{definition.label || definition.name}{typed ? ` (${t(definition.logical_type)})${definition.required ? " *" : ""}` : ""}</span>
      <select aria-label={t("Navigation value for {0}", { 0: definition.name })} className={control} value={!value ? "default" : value.source === "constant" ? "constant" : `${value.source}:${value.name}`} onChange={e => { const selected = e.target.value; if (selected === "default") update(null); else if (selected === "constant") update({ source: "constant", name: "", value: definition.default ?? null }); else { const separator = selected.indexOf(":"); update({ source: selected.slice(0, separator) as "parameter" | "field", name: selected.slice(separator + 1) }); } }}>
        {unavailable && value ? <option value={`${value.source}:${value.name}`} disabled>{t("Unavailable mapping")}: {value.name}</option> : null}
        <option value="default">{t("Use default value")}</option><option value="constant">{t("Constant")}</option>
        {eligibleParameters.map(item => <option key={`p:${item.name}`} value={`parameter:${item.name}`}>{t("Parameter")}: {item.label || item.name}</option>)}
        {eligibleFields.map(item => <option key={`f:${item.column_id}`} value={`field:${item.column_id}`}>{t("Field")}: {item.display_name}</option>)}
      </select>{value?.source === "constant" ? <ParameterInput label={t("Navigation constant for {0}", { 0: definition.name })} definition={definition} value={value.value} onChange={next => update({ source: "constant", name: "", value: next })} /> : null}
    </div>;
  })}</div>;
}

export function DashboardSettings({ config, onChange, workflows, dashboards }: {
  config: DashboardConfiguration; onChange: (config: DashboardConfiguration) => void;
  workflows: WorkflowSummary[]; dashboards: Dashboard[];
}) {
  const { t } = useI18n();
  const definitions = config.parameters ?? [], bindings = config.bindings ?? [], links = config.links ?? [];
  const update = (index: number, patch: Partial<DashboardParameter>) => onChange({ ...config, bindings: patch.name !== undefined ? bindings.map(item => item.dashboard_parameter === definitions[index].name ? { ...item, dashboard_parameter: patch.name! } : item) : bindings, parameters: definitions.map((item, i) => i === index ? { ...item, ...patch } : item) });
  return <details className="my-4 rounded-xl border border-outline p-4"><summary className="cursor-pointer text-sm">{t("Dashboard settings")}</summary>
    <p className="my-3 text-xs text-muted">{t("Bind dashboard selections to explicit workflow parameters.")}</p>
    {definitions.map((definition, index) => <fieldset key={index} className="my-3 flex flex-wrap items-center gap-3 border-t border-outline pt-3">
      <input aria-label={t("Dashboard parameter name {0}", { 0: index + 1 })} className={control} maxLength={64} value={definition.name} onChange={e => update(index, { name: e.target.value })} />
      <input aria-label={t("Dashboard parameter label {0}", { 0: index + 1 })} className={control} maxLength={200} value={definition.label ?? ""} onChange={e => update(index, { label: e.target.value })} />
      <select aria-label={t("Dashboard parameter type {0}", { 0: index + 1 })} className={control} value={definition.logical_type} onChange={e => update(index, { logical_type: e.target.value as DashboardParameter["logical_type"], default: null })}>{["string", "integer", "float", "boolean", "date", "datetime"].map(kind => <option key={kind} value={kind}>{t(kind)}</option>)}</select>
      <label className="text-xs"><input type="checkbox" checked={definition.required ?? false} onChange={e => update(index, { required: e.target.checked })} /> {t("Required parameter")}</label>
      <label className="text-xs">{t("Default value")}<ParameterInput definition={definition} value={definition.default} label={t("Dashboard parameter default {0}", { 0: index + 1 })} onChange={value => update(index, { default: value })} /></label>
      <select aria-label={t("Bind workflow parameter {0}", { 0: index + 1 })} className={control} value="" onChange={e => { if (e.target.value) { const [workflow_id, workflow_parameter] = e.target.value.split(":"); onChange({ ...config, bindings: [...bindings.filter(item => !(item.workflow_id === workflow_id && item.workflow_parameter === workflow_parameter)), { workflow_id, workflow_parameter, dashboard_parameter: definition.name }] }); } }}><option value="">{t("Add workflow binding")}</option>{workflows.flatMap(workflow => (workflow.parameters ?? []).filter(item => item.logical_type === definition.logical_type || (definition.logical_type === "integer" && item.logical_type === "float")).map(item => <option key={`${workflow.id}:${item.name}`} value={`${workflow.id}:${item.name}`}>{workflow.name} / {item.label || item.name}</option>))}</select>
      {bindings.filter(item => item.dashboard_parameter === definition.name).map(item => <button key={`${item.workflow_id}:${item.workflow_parameter}`} className="text-xs text-accent" title={t("Remove binding")} onClick={() => onChange({ ...config, bindings: bindings.filter(binding => binding !== item) })}>{workflows.find(w => w.id === item.workflow_id)?.name} / {item.workflow_parameter} ×</button>)}
      <ParameterOptionsConfiguration definition={definition} workflows={workflows} onChange={options => update(index, { options })} />
      <button className="text-xs text-danger" onClick={() => onChange({ ...config, parameters: definitions.filter((_, i) => i !== index), bindings: bindings.filter(item => item.dashboard_parameter !== definition.name) })}>{t("Remove parameter")}</button>
    </fieldset>)}
    <button className="text-xs text-accent" disabled={definitions.length >= 64} onClick={() => { let i = 1; while (definitions.some(item => item.name === `selection_${i}`)) i++; onChange({ ...config, parameters: [...definitions, { name: `selection_${i}`, logical_type: "string", required: false, default: null, label: "" }] }); }}>{t("Add dashboard parameter")}</button>
    <h3 className="my-3 text-sm">{t("Navigation links")}</h3>
    {links.map((link, index) => <div key={index} className="my-3 space-y-2 border-t border-outline pt-3"><input aria-label={t("Navigation link label {0}", { 0: index + 1 })} className={control} value={link.label} onChange={e => onChange({ ...config, links: links.map((item, i) => i === index ? { ...item, label: e.target.value } : item) })} /><NavigationConfiguration action={link.action} parameters={definitions} dashboards={dashboards} onChange={action => onChange({ ...config, links: action ? links.map((item, i) => i === index ? { ...item, action } : item) : links.filter((_, i) => i !== index) })} /></div>)}
    <button className="text-xs text-accent" disabled={!dashboards.length || links.length >= 32} onClick={() => onChange({ ...config, links: [...links, { label: t("Dashboard"), action: { dashboard_id: dashboards[0].id, values: {} } }] })}>{t("Add navigation link")}</button>
  </details>;
}

export function DashboardValueForm({ dashboard, supplied, onApply }: { dashboard: Dashboard; supplied: Record<string, unknown>; onApply: (values: ParameterValues) => void }) {
  const { t } = useI18n();
  const definitions = (dashboard.configuration ?? emptyConfiguration).parameters ?? [];
  const [values, setValues] = useState<ParameterValues>(() => Object.fromEntries(definitions.map(item => [item.name, Object.hasOwn(supplied, item.name) ? supplied[item.name] : item.default ?? null])) as ParameterValues);
  if (!definitions.length) return null;
  return <form className="my-4 flex flex-wrap items-end gap-4" onSubmit={e => { e.preventDefault(); onApply(values); }}>
    {definitions.map(item => <label className="text-xs" key={item.name}>{item.label || item.name}{item.required ? " *" : ""}{item.options ? <ParameterChoices definition={item} value={values[item.name]} parameters={workflowValues(dashboard.configuration ?? emptyConfiguration, item.options.workflow_id, values)} onChange={value => setValues(current => ({ ...current, [item.name]: value }))} /> : <ParameterInput definition={item} value={values[item.name]} label={t("Dashboard selection {0}", { 0: item.name })} onChange={value => setValues(current => ({ ...current, [item.name]: value }))} />}</label>)}
    <button className="rounded-lg bg-primary px-4 py-2 text-sm text-on-primary">{t("Apply selections")}</button>
  </form>;
}
