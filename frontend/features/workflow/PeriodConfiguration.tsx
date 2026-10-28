"use client";

import { useI18n } from "@/lib/i18n";
import type { ResolvedColumn } from "./types";

export function PeriodConfiguration({ type, config, columns, onChange }: {
  type: string; config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (value: Record<string, unknown>) => void;
}) {
  const { t } = useI18n();
  const comparison = type === "period_comparison";
  const update = (patch: Record<string, unknown>) => onChange({ ...config, ...patch });
  const partitions = Array.isArray(config.partitions) ? config.partitions.filter((v): v is string => typeof v === "string") : [];
  const select = (label: string, key: string, choices: ResolvedColumn[]) => <label className="block">{t(label)}<select className="form-control" value={String(config[key] ?? "")} onChange={e => update({ [key]: e.target.value })}><option value="">{t("Select field")}</option>{!!config[key] && !choices.some(c => c.column_id === config[key]) && <option value={String(config[key])}>{t("Unavailable field")}</option>}{choices.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}</select></label>;
  return <section className="mt-5 space-y-3 text-sm">
    <h2>{t(comparison ? "Period Comparison" : "Calendar Period")}</h2>
    {select("Period date field", "date_column_id", columns?.filter(c => c.logical_type === "date") ?? [])}
    <label className="block">{t("Calendar grouping")}<select className="form-control" value={String(config.unit ?? "month")} onChange={e => update({ unit: e.target.value })}>{["month", "quarter", "year"].map(unit => <option key={unit} value={unit}>{t(unit)}</option>)}</select></label>
    {comparison ? <>
      {select("Compared measure", "value_column_id", columns?.filter(c => ["integer", "decimal", "float"].includes(c.logical_type)) ?? [])}
      <label className="block">{t("Comparison baseline")}<select className="form-control" value={String(config.compare_to ?? "previous_period")} onChange={e => update({ compare_to: e.target.value })}><option value="previous_period">{t("Previous calendar period")}</option><option value="previous_year">{t("Same period last year")}</option></select></label>
      <label className="block">{t("Comparison name")}<input className="form-control" value={String(config.name ?? "Comparison")} onChange={e => update({ name: e.target.value })} /></label>
      <label className="block">{t("Percentage decimal places")}<input className="form-control" type="number" min={0} max={18} value={Number(config.ratio_scale ?? 6)} onChange={e => update({ ratio_scale: Number(e.target.value) })} /></label>
      <fieldset><legend>{t("Compare separately within")}</legend>{columns?.filter(c => c.column_id !== config.date_column_id && c.column_id !== config.value_column_id).map(c => <label className="flex min-h-10 gap-2 items-center" key={c.column_id}><input type="checkbox" checked={partitions.includes(c.column_id)} onChange={e => update({ partitions: e.target.checked ? [...partitions, c.column_id] : partitions.filter(id => id !== c.column_id) })} />{c.display_name}</label>)}</fieldset>
      <p className="text-muted">{t("Missing periods stay empty, not zero. Change % is (current − previous) / previous × 100; a zero or empty baseline has no percentage.")}</p>
    </> : <p className="text-muted">{t("Dates become the first day of their calendar period. Add Group By after this step.")}</p>}
  </section>;
}
