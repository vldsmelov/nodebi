"use client";

import { useI18n } from "@/lib/i18n";
import type { ResolvedColumn } from "./types";

export function HistogramConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const { t } = useI18n();
  const numeric = (columns ?? []).filter(column => ["integer", "float", "decimal"].includes(column.logical_type));
  const selected = String(config.value_column_id ?? ""), explicit = config.range_min != null || config.range_max != null;
  return <section className="mt-5 space-y-3"><h2>{t("Histogram statistics")}</h2>
    <p className="text-sm text-muted">{t("Equal-width intervals use all observations. Left bounds are included; the final right bound is included too. Missing and outside values are counted separately.")}</p>
    <label className="block">{t("Distribution value")}<select className="form-control" aria-label={t("Distribution value")} value={selected} onChange={event => onChange({ ...config, value_column_id: event.target.value })}><option value="">{t("Select numeric field")}</option>{selected && !numeric.some(column => column.column_id === selected) && <option value={selected}>{t("Unavailable field")}</option>}{numeric.map(column => <option key={column.column_id} value={column.column_id}>{column.display_name}</option>)}</select></label>
    <label className="block">{t("Interval count")}<input aria-label={t("Interval count")} className="form-control" type="number" min={1} max={200} step={1} value={Number(config.bin_count ?? 20)} onChange={event => onChange({ ...config, bin_count: Number(event.target.value) })} /></label>
    <label className="flex gap-2"><input type="checkbox" checked={explicit} onChange={event => onChange({ ...config, range_min: event.target.checked ? "0" : null, range_max: event.target.checked ? "1" : null })} />{t("Set histogram range")}</label>
    {explicit && <>{(["range_min", "range_max"] as const).map(key => <label className="block" key={key}>{t(key === "range_min" ? "Histogram lower bound" : "Histogram upper bound")}<input className="form-control" inputMode="decimal" aria-label={t(key === "range_min" ? "Histogram lower bound" : "Histogram upper bound")} value={String(config[key] ?? "")} onChange={event => onChange({ ...config, [key]: event.target.value })} /></label>)}</>}
    <p className="text-xs text-muted">{t("Constant data uses one interval. Repeating boundaries are shown as exact fractions, without rounding observations into another interval.")}</p>
  </section>;
}
