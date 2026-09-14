"use client";

import { useI18n } from "@/lib/i18n";

import type { ResolvedColumn } from "./types";

type Props = {
  config: Record<string, unknown>;
  columns: ResolvedColumn[] | null;
  onChange: (config: Record<string, unknown>) => void;
};
const control = "mt-2 w-full rounded-lg border border-outline bg-control px-2 py-2 text-xs";
const action = "mt-3 rounded-lg border border-outline px-3 py-2 text-xs";
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
const records = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.filter((v): v is Record<string, unknown> => v !== null && typeof v === "object") : [];

export function SortConfiguration({ config, columns, onChange }: Props) {
  const { t } = useI18n();
  const keys = records(config.keys);
  const update = (index: number, patch: Record<string, unknown>) => onChange({ keys: keys.map((key, i) => i === index ? { ...key, ...patch } : key) });
  return <div className="mt-6"><h2>{t("Sort")}</h2><p className="mt-2 text-xs text-muted">{t("Fields are applied in order. Nulls sort last.")}</p>
    {keys.map((key, index) => <div key={index} className="mt-3 border-b border-outline pb-3">
      <select aria-label={t("Sort field {0}", {"0": index + 1})} className={control} value={String(key.column_id ?? "")} onChange={e => update(index, { column_id: e.target.value })}><option value="">{t("Select field")}</option>{columns?.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}</select>
      <select aria-label={t("Sort direction {0}", {"0": index + 1})} className={control} value={String(key.direction ?? "ascending")} onChange={e => update(index, { direction: e.target.value })}><option value="ascending">{t("Ascending")}</option><option value="descending">{t("Descending")}</option></select>
      <button className={action} onClick={() => onChange({ keys: keys.filter((_, i) => i !== index) })}>{t("Remove sort field")}{" "}{index + 1}</button>
    </div>)}
    <button className={action} disabled={!columns?.some(c => !keys.some(k => k.column_id === c.column_id))} onClick={() => onChange({ keys: [...keys, { column_id: columns?.find(c => !keys.some(k => k.column_id === c.column_id))?.column_id, direction: "ascending" }] })}>{t("Add sort field")}</button>
  </div>;
}

export function LimitConfiguration({ config, onChange }: Props) {
  const { t } = useI18n();
  return <div className="mt-6"><h2>{t("Limit")}</h2><label className="mt-3 block text-xs">{t("Maximum rows")}<input aria-label={t("Maximum rows")} className={control} type="number" min={1} step={1} value={typeof config.limit === "number" ? config.limit : ""} onChange={e => onChange({ limit: e.target.value === "" ? null : Number(e.target.value) })} /></label></div>;
}

export function CalculatedColumnConfiguration({ config, columns, onChange }: Props) {
  const { t } = useI18n();
  const expression = typeof config.expression === "string" ? config.expression : "";
  return <div className="mt-6"><h2>{t("Calculated Column")}</h2>
    <label className="mt-3 block text-xs">{t("Output field name")}<input aria-label={t("Output field name")} className={control} value={String(config.name ?? "")} onChange={e => onChange({ ...config, name: e.target.value })} /></label>
    <label className="mt-3 block text-xs">{t("Expression")}<textarea aria-label={t("Expression")} className={control} rows={4} value={expression} onChange={e => onChange({ ...config, expression: e.target.value })} placeholder={t("quantity * price")} /></label>
    <select aria-label={t("Insert formula field")} className={control} value="" onChange={e => { if (e.target.value) onChange({ ...config, expression: `${expression}[${e.target.value}]` }); }}><option value="">{t("Select field")}</option>{columns?.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}</select>
    <p className="mt-3 text-xs leading-5 text-muted">{t("Formula functions: trim, lower, coalesce, safe_divide. Field references survive renaming.")}</p>
  </div>;
}

export function GroupByConfiguration({ config, columns, onChange }: Props) {
  const { t } = useI18n();
  const dimensions = strings(config.dimensions);
  const aggregations = records(config.aggregations);
  const update = (index: number, patch: Record<string, unknown>) => onChange({ ...config, aggregations: aggregations.map((a, i) => i === index ? { ...a, ...patch } : a) });
  return <div className="mt-6"><h2>{t("Group By")}</h2><p className="mt-2 text-xs text-muted">{t("Choose dimensions, or leave empty for one global total.")}</p>
    <div className="mt-3 space-y-2">{columns?.map(c => <label key={c.column_id} className="flex gap-2 text-xs"><input type="checkbox" checked={dimensions.includes(c.column_id)} onChange={() => onChange({ ...config, dimensions: dimensions.includes(c.column_id) ? dimensions.filter(id => id !== c.column_id) : [...dimensions, c.column_id] })} />{c.display_name}</label>)}</div>
    {aggregations.map((aggregation, index) => {
      const field = columns?.find(c => c.column_id === aggregation.column_id);
      const numeric = field && ["integer", "float", "unknown"].includes(field.logical_type);
      return <div key={index} className="mt-4 rounded-lg border border-outline p-2">
        <select aria-label={t("Aggregate field {0}", {"0": index + 1})} className={control} value={String(aggregation.column_id ?? "")} onChange={e => { const next = columns?.find(c => c.column_id === e.target.value); const operation = !next || (["sum", "average"].includes(String(aggregation.operation)) && !["integer", "float", "unknown"].includes(next.logical_type)) ? "count" : aggregation.operation; update(index, { column_id: e.target.value || null, operation }); }}><option value="">{t("All rows")}</option>{columns?.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}</select>
        <select aria-label={t("Aggregation {0}", {"0": index + 1})} className={control} value={String(aggregation.operation ?? "count")} onChange={e => update(index, { operation: e.target.value })}>{["count", "sum", "average", "min", "max", "distinct_count"].map(op => <option key={op} value={op} disabled={op !== "count" && (!field || (["sum", "average"].includes(op) && !numeric))}>{t(op.replaceAll("_", " "))}</option>)}</select>
        <input aria-label={t("Aggregate name {0}", {"0": index + 1})} className={control} value={String(aggregation.name ?? "")} onChange={e => update(index, { name: e.target.value })} placeholder={t("Output name")} />
        <button className={action} onClick={() => onChange({ ...config, aggregations: aggregations.filter((_, i) => i !== index) })}>{t("Remove aggregation")}{" "}{index + 1}</button>
      </div>;
    })}
    <button className={action} onClick={() => onChange({ ...config, aggregations: [...aggregations, { column_id: null, operation: "count", name: `count_${aggregations.length + 1}` }] })}>{t("Add aggregation")}</button>
  </div>;
}
