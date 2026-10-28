"use client";

import { useI18n } from "@/lib/i18n";
import type { ResolvedColumn } from "./types";

export function HeatmapConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const { t } = useI18n();
  const selectors = [
    ["x_column_id", "Heatmap X dimension"],
    ["y_column_id", "Heatmap Y dimension"],
    ["value_column_id", "Heatmap value"],
  ] as const;
  const operations = [["sum", "Sum"], ["average", "Average"], ["min", "Minimum"], ["max", "Maximum"], ["count", "Count numeric values"]] as const;
  return <section className="mt-5 space-y-3"><h2>{t("Heatmap cells")}</h2>
    <p className="text-sm text-muted">{t("Choose two dimensions and an explicit aggregation for repeated cells. Calculations use all selected rows, not the preview.")}</p>
    {selectors.map(([key, label]) => {
      const numeric = key === "value_column_id";
      const kinds = numeric ? ["integer", "decimal", "float"] : ["string", "integer", "boolean", "date"];
      const choices = (columns ?? []).filter(column => kinds.includes(column.logical_type));
      const selected = String(config[key] ?? "");
      return <label className="block" key={key}>{t(label)}<select className="form-control" aria-label={t(label)} value={selected} onChange={event => onChange({ ...config, [key]: event.target.value })}>
        <option value="">{t(numeric ? "Select numeric field" : "Select field")}</option>
        {selected && !choices.some(column => column.column_id === selected) && <option value={selected}>{t("Unavailable field")}</option>}
        {choices.map(column => <option key={column.column_id} value={column.column_id} disabled={selectors.some(([other]) => other !== key && config[other] === column.column_id)}>{column.display_name}</option>)}
      </select></label>;
    })}
    <label className="block">{t("Cell aggregation")}<select className="form-control" aria-label={t("Cell aggregation")} value={String(config.aggregation ?? "")} onChange={event => onChange({ ...config, aggregation: event.target.value })}>
      <option value="">{t("Choose aggregation explicitly")}</option>{operations.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
    </select></label>
    {config.aggregation === "average" && <label className="block">{t("Exact average decimal places")}<input className="form-control" aria-label={t("Exact average decimal places")} type="number" min={0} max={18} step={1} value={Number(config.average_scale ?? 6)} onChange={event => onChange({ ...config, average_scale: Number(event.target.value) })} /></label>}
    <p className="text-xs text-muted">{t("Absent combinations, empty values and zero stay distinct. Count counts non-empty numeric values; source and missing row counts remain separate.")}</p>
    <p className="text-xs text-muted">{t("Up to 200 categories per axis and 10000 cells. Filter or group more detailed data upstream. Exact averages use half-even rounding; floating-point values remain approximate.")}</p>
  </section>;
}
