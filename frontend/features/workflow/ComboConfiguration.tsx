"use client";
import { useI18n } from "@/lib/i18n";
import { comboDraft, type ComboDraft, type ComboSeriesDraft } from "@/features/dashboard/combo-draft";
import type { ResolvedColumn } from "./types";

export function ComboConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const { t } = useI18n(), spec = comboDraft(config);
  const numeric = (columns ?? []).filter(c => ["integer", "decimal", "float"].includes(c.logical_type));
  const categories = (columns ?? []).filter(c => ["string", "integer", "boolean", "date"].includes(c.logical_type));
  const change = (patch: Partial<ComboDraft>) => onChange({ ...config, orientation: "vertical", spec: { ...spec, ...patch } });
  const update = (index: number, patch: Partial<ComboSeriesDraft>) => change({ series: spec.series.map((item, i) => i === index ? { ...item, ...patch } : item) });
  const swap = (index: number, step: number) => { const series = [...spec.series]; [series[index], series[index + step]] = [series[index + step], series[index]]; change({ series }); };
  return <section className="space-y-3 text-xs">
    <p>{t("Compare prepared bars and lines. Each category needs one row; group and sort in the calculation graph.")}</p>
    <label className="block">{t("Combination category")}<select className="form-control" aria-label={t("Combination category")} value={spec.category_column_id} onChange={e => change({ category_column_id: e.target.value })}>
      <option value="">{t("Select field")}</option>{spec.category_column_id && !categories.some(c => c.column_id === spec.category_column_id) && <option value={spec.category_column_id}>{t("Unavailable field")}</option>}{categories.map(c => <option key={c.column_id} value={c.column_id} disabled={spec.series.some(s => s.column_id === c.column_id)}>{c.display_name}</option>)}
    </select></label>
    <label className="flex gap-2"><input type="checkbox" checked={spec.secondary_axis ?? false} onChange={e => change({ secondary_axis: e.target.checked, ...(!e.target.checked ? { series: spec.series.map(s => ({ ...s, axis: "primary" as const })) } : {}) })} />{t("Enable secondary axis")}</label>
    <p className="text-muted">{t("Series on the same axis must share units. Two axes use independent scales; equal heights do not mean equal values.")}</p>
    {spec.series.map((series, index) => <fieldset key={index} className="rounded border border-outline p-2"><legend>{t("Combination series {0}", { 0: index + 1 })}</legend>
      <select className="form-control" aria-label={t("Combination field {0}", { 0: index + 1 })} value={series.column_id} onChange={e => update(index, { column_id: e.target.value })}>
        <option value="">{t("Select numeric field")}</option>{series.column_id && !numeric.some(c => c.column_id === series.column_id) && <option value={series.column_id}>{t("Unavailable field")}</option>}{numeric.map(c => <option key={c.column_id} value={c.column_id} disabled={c.column_id === spec.category_column_id || spec.series.some((s, i) => i !== index && s.column_id === c.column_id)}>{c.display_name}</option>)}
      </select>
      <label className="block">{t("Series name {0}", { 0: index + 1 })}<input className="form-control" aria-label={t("Series name {0}", { 0: index + 1 })} maxLength={200} value={series.name ?? ""} placeholder={numeric.find(c => c.column_id === series.column_id)?.display_name} onChange={e => update(index, { name: e.target.value })} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label>{t("Series style {0}", { 0: index + 1 })}<select className="form-control" aria-label={t("Series style {0}", { 0: index + 1 })} value={series.kind} onChange={e => update(index, { kind: e.target.value as "bar" | "line" })}><option value="bar">{t("Bars")}</option><option value="line">{t("Line")}</option></select></label>
        <label>{t("Series axis {0}", { 0: index + 1 })}<select className="form-control" aria-label={t("Series axis {0}", { 0: index + 1 })} value={series.axis ?? "primary"} onChange={e => update(index, { axis: e.target.value as "primary" | "secondary" })}><option value="primary">{t("Left axis")}</option><option value="secondary" disabled={!spec.secondary_axis}>{t("Right axis")}</option></select></label>
      </div>
      <div className="mt-2 flex gap-3"><button type="button" aria-label={t("Move combination series {0} up", { 0: index + 1 })} disabled={index === 0} onClick={() => swap(index, -1)}>↑</button><button type="button" aria-label={t("Move combination series {0} down", { 0: index + 1 })} disabled={index === spec.series.length - 1} onClick={() => swap(index, 1)}>↓</button><button type="button" disabled={spec.series.length <= 2} onClick={() => change({ series: spec.series.filter((_, i) => i !== index) })}>{t("Remove")}</button></div>
    </fieldset>)}
    <button type="button" disabled={spec.series.length >= 8} onClick={() => change({ series: [...spec.series, { column_id: "", kind: "line", axis: "primary", name: "" }] })}>{t("Add series")}</button>
  </section>;
}
