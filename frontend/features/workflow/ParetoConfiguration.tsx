"use client";
import { useI18n } from "@/lib/i18n";
import type { ResolvedColumn } from "./types";

export function ParetoConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const { t } = useI18n();
  return <section className="mt-5 space-y-3"><h2>{t("Pareto contributions")}</h2>
    <p className="text-sm text-muted">{t("Prepare one row per category. Contributions must be non-negative and non-empty; aggregate or filter explicitly upstream.")}</p>
    {([["category_column_id", "Pareto category"], ["value_column_id", "Pareto contribution"]] as const).map(([key, label]) => {
      const types = key === "category_column_id" ? ["string", "integer", "date", "boolean"] : ["integer", "decimal", "float"];
      const choices = (columns ?? []).filter(c => types.includes(c.logical_type)), selected = String(config[key] ?? "");
      const other = key === "category_column_id" ? "value_column_id" : "category_column_id";
      return <label className="block" key={key}>{t(label)}<select className="form-control" aria-label={t(label)} value={selected} onChange={e => onChange({ ...config, [key]: e.target.value })}>
        <option value="">{t("Select field")}</option>{selected && !choices.some(c => c.column_id === selected) && <option value={selected}>{t("Unavailable field")}</option>}
        {choices.map(c => <option value={c.column_id} key={c.column_id} disabled={config[other] === c.column_id}>{c.display_name}</option>)}
      </select></label>;
    })}
    <p className="text-xs text-muted">{t("Contributions are sorted descending; ties use ascending category order. Shares use the entire selected input, not the preview page.")}</p>
    <p className="text-xs text-muted">{t("Percentages are rounded half-even to 12 decimal places; exact fractions remain available. With a zero total, shares are undefined. The population output retains the total and zero count.")}</p>
  </section>;
}
