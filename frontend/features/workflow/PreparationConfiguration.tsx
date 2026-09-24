"use client";

import { useI18n } from "@/lib/i18n";
import type { ResolvedColumn } from "./types";
import { SortConfiguration } from "./ArithmeticConfiguration";

type Props = { version?: number; config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void };
const control = "mt-2 w-full rounded-lg border border-outline bg-control px-2 py-2 text-xs";
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

function Fields({ label, columns, selected, onChange }: { label: string; columns: ResolvedColumn[]; selected: string[]; onChange: (value: string[]) => void }) {
  const { t } = useI18n();
  return <fieldset className="mt-4"><legend className="text-xs text-muted">{t(label)}</legend>{columns.map(column => <label key={column.column_id} className="mt-2 flex gap-2 text-xs"><input type="checkbox" checked={selected.includes(column.column_id)} onChange={event => onChange(event.target.checked ? [...selected, column.column_id] : selected.filter(key => key !== column.column_id))} />{column.display_name}</label>)}</fieldset>;
}

export function ConvertTypesConfiguration({ config, columns, onChange }: Props) {
  const { t } = useI18n();
  const rules = (Array.isArray(config.conversions) ? config.conversions : []) as { column_id: string; target: string; on_error?: string }[];
  const update = (index: number, patch: Partial<typeof rules[number]>) => onChange({ ...config, conversions: rules.map((rule, i) => i === index ? { ...rule, ...patch } : rule) });
  return <div className="mt-6"><h2>{t("Convert Types")}</h2>{rules.map((rule, index) => <div key={index} className="mt-3 border-b border-outline pb-3">
    <select aria-label={t("Conversion field")} className={control} value={rule.column_id} onChange={event => update(index, { column_id: event.target.value })}><option value="">{t("Select field")}</option>{columns?.map(column => <option key={column.column_id} value={column.column_id}>{column.display_name}</option>)}</select>
    <select aria-label={t("Target type")} className={control} value={rule.target} onChange={event => update(index, { target: event.target.value })}>{["string", "integer", "float", "boolean", "date", "datetime"].map(type => <option key={type} value={type}>{t(type)}</option>)}</select>
    <select aria-label={t("Invalid values")} className={control} value={rule.on_error ?? "error"} onChange={event => update(index, { on_error: event.target.value })}><option value="error">{t("Stop with an error")}</option><option value="null">{t("Replace with null")}</option></select>
    <button className={control} onClick={() => onChange({ ...config, conversions: rules.filter((_, i) => i !== index) })}>{t("Remove")}</button>
  </div>)}<button className={control} disabled={!columns?.length} onClick={() => onChange({ ...config, conversions: [...rules, { column_id: columns?.find(column => !rules.some(rule => rule.column_id === column.column_id))?.column_id ?? "", target: "float", on_error: "error" }] })}>{t("Add conversion")}</button></div>;
}

export function UnpivotConfiguration({ config, columns, onChange }: Props) {
  const { t } = useI18n();
  return <div className="mt-6"><h2>{t("Unpivot")}</h2><Fields label="Identifier fields" columns={columns ?? []} selected={strings(config.identifiers)} onChange={identifiers => onChange({ ...config, identifiers, columns: strings(config.columns).filter(key => !identifiers.includes(key)), labels: Object.fromEntries(Object.entries((config.labels ?? {}) as Record<string, string>).filter(([id]) => !identifiers.includes(id))) })} /><Fields label="Fields to turn into rows" columns={(columns ?? []).filter(column => !strings(config.identifiers).includes(column.column_id))} selected={strings(config.columns)} onChange={fields => onChange({ ...config, columns: fields, labels: Object.fromEntries(Object.entries((config.labels ?? {}) as Record<string, string>).filter(([id]) => fields.includes(id))) })} />
    {strings(config.columns).map(id => { const field = columns?.find(column => column.column_id === id); const labels = (config.labels ?? {}) as Record<string, string>; return <label key={id} className="mt-3 block text-xs">{field?.display_name ?? id}<input aria-label={t("Unpivot label {0}", { 0: id })} className={control} placeholder={field?.display_name} value={labels[id] ?? ""} onChange={event => { const next = { ...labels }; if (event.target.value) next[id] = event.target.value; else delete next[id]; onChange({ ...config, labels: next }); }} /></label>; })}
    <p className="mt-2 text-xs text-muted">{t("Labels may repeat; original field IDs remain distinct. Leave a label empty to use the source name.")}</p>
  </div>;
}

export function WindowConfiguration({ version = 1, config, columns, onChange }: Props) {
  const { t } = useI18n();
  return <div className="mt-6"><h2>{t("Window")}</h2>
    <label className="mt-3 block text-xs">{t("Output field name")}<input className={control} value={String(config.name ?? "")} onChange={event => onChange({ ...config, name: event.target.value })} /></label>
    <label className="mt-3 block text-xs">{t("Operation")}<select className={control} value={String(config.operation ?? "sum")} onChange={event => onChange({ ...config, operation: event.target.value })}><option value="sum">{t("Partition sum")}</option><option value="row_number">{t("Row number")}</option>{version >= 2 && ["cumulative_sum", "cumulative_max", "previous"].map(operation => <option key={operation} value={operation}>{t(operation)}</option>)}</select></label>
    {config.operation !== "row_number" ? <select aria-label={t("Value field")} className={control} value={String(config.column_id ?? "")} onChange={event => onChange({ ...config, operation: config.operation ?? "sum", column_id: event.target.value })}><option value="">{t("Select field")}</option>{columns?.filter(column => ["integer", "float", "unknown"].includes(column.logical_type)).map(column => <option key={column.column_id} value={column.column_id}>{column.display_name}</option>)}</select> : null}
    {!!config.operation && config.operation !== "sum" && <SortConfiguration columns={columns} config={{ keys: config.order_by ?? [] }} onChange={value => onChange({ ...config, order_by: value.keys })} />}
    <Fields label="Partition fields" columns={columns ?? []} selected={strings(config.partitions)} onChange={partitions => onChange({ ...config, partitions })} />
  </div>;
}
