"use client";
import { useI18n } from "@/lib/i18n";
import type { ResolvedColumn } from "./types";

export function FunnelConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const { t } = useI18n();
  const roles = [["stage_column_id", "Funnel stage", ["string", "integer", "date", "boolean"]], ["order_column_id", "Stage order", ["integer"]], ["value_column_id", "Stage value", ["integer", "decimal", "float"]]] as const;
  return <section className="mt-5 space-y-3"><h2>{t("Funnel stages")}</h2>
    <p className="text-sm text-muted">{t("Prepare one row per stage of the same population and unit. Order must be unique; values must be non-negative, non-empty and non-increasing. Up to 50 stages.")}</p>
    {roles.map(([key, label, types]) => {
      const fields = (columns ?? []).filter(c => (types as readonly string[]).includes(c.logical_type)), selected = String(config[key] ?? "");
      return <label className="block" key={key}>{t(label)}<select className="form-control" aria-label={t(label)} value={selected} onChange={e => onChange({ ...config, [key]: e.target.value })}><option value="">{t("Select field")}</option>{selected && !fields.some(c => c.column_id === selected) && <option value={selected}>{t("Unavailable field")}</option>}{fields.map(c => <option key={c.column_id} value={c.column_id} disabled={roles.some(([other]) => other !== key && config[other] === c.column_id)}>{c.display_name}</option>)}</select></label>;
    })}
    <p className="text-xs text-muted">{t("Stages use ascending integer order, never value sorting. Retention compares each stage with the previous and initial stages. Zero denominators are undefined; percentages are rounded half-even to 12 places with exact fractions available.")}</p>
    <p className="text-xs text-muted">{t("These ratios do not prove individual transitions. Prepare a consistent cohort upstream; use a bar chart for unrelated stage populations.")}</p>
  </section>;
}
