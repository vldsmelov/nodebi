"use client";

import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";

export type Comparison = components["schemas"]["ReportComparison"];
type Choice = { column_id: string; display_name: string };
export function ReportComparisonControls({ value, onChange, dates, measures }: {
  value: Comparison | null; onChange: (value: Comparison | null) => void; dates: Choice[]; measures: Choice[];
}) {
  const { t } = useI18n();
  const change = (patch: Partial<Comparison>) => value && onChange({ ...value, ...patch });
  return <section className="space-y-3 border-t border-outline pt-4">
    <label className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked ? { date_column_id: dates[0]?.column_id ?? "", value_column_id: measures[0]?.column_id ?? "", unit: "month", compare_to: "previous_period", name: t("Comparison"), ratio_scale: 6 } : null)} />{t("Compare calendar periods")}</label>
    {value && <>
      <p className="text-sm text-muted">{t("Filters apply before calendar grouping. Keep the baseline period in the data; partial periods are not extrapolated.")}</p>
      <p className="text-sm text-muted">{t("Missing periods stay empty, not zero. Change % is (current − previous) / previous × 100; a zero or empty baseline has no percentage.")}</p>
      <label className="block">{t("Period date field")}<select className="form-control" value={value.date_column_id} onChange={e => change({ date_column_id: e.target.value })}><option value="">{t("Select a date grouping dimension")}</option>{dates.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}</select></label>
      <label className="block">{t("Calendar grouping")}<select className="form-control" value={value.unit ?? "month"} onChange={e => change({ unit: e.target.value as Comparison["unit"] })}>{["month", "quarter", "year"].map(unit => <option key={unit} value={unit}>{t(unit)}</option>)}</select></label>
      <label className="block">{t("Comparison baseline")}<select className="form-control" value={value.compare_to ?? "previous_period"} onChange={e => change({ compare_to: e.target.value as Comparison["compare_to"] })}><option value="previous_period">{t("Previous calendar period")}</option><option value="previous_year">{t("Same period last year")}</option></select></label>
      <label className="block">{t("Compared measure")}<select className="form-control" value={value.value_column_id} onChange={e => change({ value_column_id: e.target.value })}><option value="">{t("Check formula fields and select a measure")}</option>{value.value_column_id && !measures.some(c => c.column_id === value.value_column_id) && <option value={value.value_column_id}>{t("Selected output (check fields to view names)")}</option>}{measures.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}</select></label>
      <label className="block">{t("Comparison name")}<input className="form-control" value={value.name ?? ""} onChange={e => change({ name: e.target.value })} /></label>
      <label className="block">{t("Percentage decimal places")}<input type="number" min={0} max={18} className="form-control" value={value.ratio_scale ?? 6} onChange={e => change({ ratio_scale: Number(e.target.value) })} /></label>
      <p className="text-sm text-muted">{t("Comparison reports can be edited in the wizard while their steps remain exclusive. Shared or manually contained calculations stay in the graph.")}</p>
      <p className="text-sm text-muted">{t("Turning off comparison also removes calendar grouping: dates will be grouped by their original values.")}</p>
    </>}
  </section>;
}
