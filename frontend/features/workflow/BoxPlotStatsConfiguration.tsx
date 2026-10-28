"use client";

import { useI18n } from "@/lib/i18n";
import type { ResolvedColumn } from "./types";

export function BoxPlotStatsConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const { t } = useI18n();
  const select = (field: string, label: string, kinds: string[], optional = false) => {
    const value = String(config[field] ?? "");
    const choices = (columns ?? []).filter(c => kinds.includes(c.logical_type) && (field !== "group_column_id" || c.column_id !== config.value_column_id));
    return <label className="block">{t(label)}<select className="form-control" aria-label={t(label)} value={value} onChange={e => onChange({ ...config, [field]: e.target.value || null })}>
      <option value="">{t(optional ? "All rows" : "Select numeric field")}</option>
      {value && !choices.some(c => c.column_id === value) && <option value={value}>{t("Unavailable field")}</option>}
      {choices.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}
    </select></label>;
  };
  return <section className="mt-5 space-y-3"><h2>{t("Box-plot statistics")}</h2>
    <p className="text-sm text-muted">{t("Linear quartiles and 1.5 IQR whiskers use all non-empty observations. Empty values are counted separately, not replaced by zero. Summary and outliers are separate outputs.")}</p>
    {select("value_column_id", "Distribution value", ["integer", "float", "decimal"])}
    {select("group_column_id", "Distribution grouping", ["string", "integer", "boolean", "date"], true)}
  </section>;
}
