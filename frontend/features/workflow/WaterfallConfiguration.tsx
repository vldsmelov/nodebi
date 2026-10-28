"use client";

import { useI18n } from "@/lib/i18n";
import type { ResolvedColumn } from "./types";

export function WaterfallConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const { t } = useI18n();
  const selectors = [["category_column_id", "Waterfall step label"], ["value_column_id", "Waterfall value"], ["kind_column_id", "Waterfall row type"]] as const;
  return <section className="mt-5 space-y-3"><h2>{t("Waterfall steps")}</h2>
    <p className="text-sm text-muted">{t("Choose input order or an ascending order field. Each step needs a unique non-empty label; order keys must be unique and non-empty.")}</p>
    <label className="block">{t("Waterfall step order")}<select className="form-control" aria-label={t("Waterfall step order")} value={config.order_column_id == null ? "input" : config.order_column_id ? `field:${config.order_column_id}` : ""} onChange={event => onChange({ ...config, order_column_id: event.target.value === "input" ? null : event.target.value.replace(/^field:/, "") })}>
      <option value="">{t("Choose step order explicitly")}</option><option value="input">{t("Use input row order")}</option>
      {typeof config.order_column_id === "string" && config.order_column_id && !(columns ?? []).some(c => c.column_id === config.order_column_id) && <option value={`field:${config.order_column_id}`}>{t("Unavailable field")}</option>}
      {(columns ?? []).filter(c => ["integer", "decimal", "date", "datetime"].includes(c.logical_type)).map(c => <option key={c.column_id} value={`field:${c.column_id}`}>{c.display_name}</option>)}
    </select></label>
    {selectors.map(([key, label]) => {
      const kinds = key === "value_column_id" ? ["integer", "decimal", "float"] : key === "kind_column_id" ? ["string"] : ["string", "integer", "date", "boolean"];
      const choices = (columns ?? []).filter(column => kinds.includes(column.logical_type));
      const selected = String(config[key] ?? "");
      return <label className="block" key={key}>{t(label)}<select className="form-control" aria-label={t(label)} value={selected} onChange={event => onChange({ ...config, [key]: event.target.value || (key === "kind_column_id" ? null : "") })}>
        <option value="">{t(key === "kind_column_id" ? "All rows are contributions" : key === "value_column_id" ? "Select numeric field" : "Select field")}</option>
        {selected && !choices.some(column => column.column_id === selected) && <option value={selected}>{t("Unavailable field")}</option>}
        {choices.map(column => <option key={column.column_id} value={column.column_id} disabled={selectors.some(([other]) => other !== key && config[other] === column.column_id)}>{column.display_name}</option>)}
      </select></label>;
    })}
    {!!config.kind_column_id && <fieldset className="space-y-2 rounded border border-outline p-3"><legend>{t("Match row-type values")}</legend>
      <p className="text-xs text-muted">{t("Enter the exact text used by your source. Initial balance is first; subtotals do not add twice; final total is last. Blank contributions are errors, not zero.")}</p>
      {([["initial", "Initial balance marker"], ["change", "Contribution marker"], ["subtotal", "Subtotal marker"], ["total", "Final total marker"]] as const).map(([kind, label]) => <label className="block" key={kind}>{t(label)}<input className="form-control" aria-label={t(label)} maxLength={200} value={String(config[`${kind}_marker`] ?? kind)} onChange={event => onChange({ ...config, [`${kind}_marker`]: event.target.value })} /></label>)}
      <p className="text-xs text-muted">{t("Leave subtotal/final values empty to calculate them, or supply expected values for exact reconciliation. A mismatch stops the calculation.")}</p>
    </fieldset>}
    <label className="flex gap-2"><input type="checkbox" checked={Boolean(config.append_total)} onChange={event => onChange({ ...config, append_total: event.target.checked, total_label: config.total_label ?? t("Total") })} />{t("Append a final total")}</label>
    {Boolean(config.append_total) && <label className="block">{t("Final total label")}<input className="form-control" aria-label={t("Final total label")} maxLength={200} value={String(config.total_label ?? "Total")} onChange={event => onChange({ ...config, total_label: event.target.value })} /></label>}
    <p className="text-xs text-muted">{t("Do not append a total if the source already has one. Up to 2000 steps including the generated total; group more detailed data upstream.")}</p>
  </section>;
}
