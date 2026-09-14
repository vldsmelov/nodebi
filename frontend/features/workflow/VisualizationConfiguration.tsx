"use client";

import { useI18n } from "@/lib/i18n";

import type { ResolvedColumn } from "./types";

export function VisualizationConfiguration({ type, config, columns, onChange }: {
  type: string; config: Record<string, unknown>; columns: ResolvedColumn[] | null;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const { t, nodeName } = useI18n();
  const control = "mt-2 w-full rounded-lg border border-outline bg-control px-2 py-2 text-xs";
  const selected = Array.isArray(config.column_ids) ? config.column_ids : columns?.map(c => c.column_id) ?? [];
  return <div className="mt-6"><h2>{nodeName(type)}</h2>
    <label className="mt-3 block text-xs">{t("Title")}<input aria-label={t("Chart title")} className={control} value={String(config.title ?? "")} onChange={e => onChange({ ...config, title: e.target.value })} /></label>
    {!["kpi", "table"].includes(type) ? <label className="mt-3 block text-xs">{t("Category")}<select aria-label={t("Chart category")} className={control} value={String(config.category_column_id ?? "")} onChange={e => onChange({ ...config, category_column_id: e.target.value })}><option value="">{t("Select field")}</option>{columns?.filter(c => type !== "scatter_chart" || ["integer", "float", "unknown"].includes(c.logical_type)).map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}</select></label> : type === "kpi" ? <p className="mt-3 text-xs text-muted">{t("Connect a Group By with no dimensions to produce one total row.")}</p> : null}
    {type !== "table" ? <label className="mt-3 block text-xs">{t("Value")}<select aria-label={t("Chart value")} className={control} value={String(config.value_column_id ?? "")} onChange={e => onChange({ ...config, value_column_id: e.target.value })}><option value="">{t("Select numeric field")}</option>{columns?.filter(c => ["integer", "float", "unknown"].includes(c.logical_type)).map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}</select></label> : <div className="mt-3 space-y-2">{columns?.map(c => <label key={c.column_id} className="flex gap-2 text-xs"><input type="checkbox" checked={selected.includes(c.column_id)} onChange={() => onChange({ ...config, column_ids: selected.includes(c.column_id) ? selected.filter(id => id !== c.column_id) : [...selected, c.column_id] })} />{c.display_name}</label>)}</div>}
    <label className="mt-3 block text-xs">{t("Number format")}<select aria-label={t("Number format")} className={control} value={String(config.number_format ?? "number")} onChange={e => onChange({ ...config, number_format: e.target.value })}><option value="number">{t("Number")}</option><option value="currency">{t("Currency")}</option><option value="percent">{t("Percent")}</option></select></label>
    <label className="mt-3 block text-xs">{t("Decimal places")}<input aria-label={t("Decimal places")} className={control} type="number" min={0} max={8} value={Number(config.decimals ?? 2)} onChange={e => onChange({ ...config, decimals: Number(e.target.value) })} /></label>
    {config.number_format === "currency" ? <label className="mt-3 block text-xs">{t("Currency")}<input aria-label={t("Currency")} className={control} maxLength={3} value={String(config.currency ?? "USD")} onChange={e => onChange({ ...config, currency: e.target.value.toUpperCase() })} /></label> : null}
    {!["kpi", "table"].includes(type) ? <div className="mt-3 space-y-2 text-xs"><label className="flex gap-2"><input type="checkbox" checked={config.show_legend !== false} onChange={e => onChange({ ...config, show_legend: e.target.checked })} />{t("Show legend")}</label><label className="flex gap-2"><input type="checkbox" checked={config.show_labels === true} onChange={e => onChange({ ...config, show_labels: e.target.checked })} />{t("Show labels")}</label></div> : null}
  </div>;
}
