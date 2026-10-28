"use client";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import type { VisualizationResult } from "./api";
import { comboField, comboUnit } from "./combo";

export function FunnelView({ result, children, onSelect }: { result: VisualizationResult; children: ReactNode; onSelect?: (row: Record<string, unknown>) => void }) {
  const { t, cell } = useI18n(), [table, setTable] = useState(false);
  if (result.spec?.type !== "funnel_chart" || !result.funnel) return <p role="alert">{t("The statistical field is unavailable. Reload the visualization.")}</p>;
  const fields = Object.fromEntries(Object.entries(result.spec.rows).map(([role, id]) => [role, comboField(result, id)]));
  const summary = result.datasets?.summary, summaryRoles = result.spec.summary;
  const overallField = summary?.columns.find(c => c.column_id === summaryRoles.overall_percent);
  const overall = overallField && summary?.rows[0]?.[overallField.engine_name];
  const roles = ["order", "stage", "value", "previous_percent", "initial_percent", "loss", "previous_exact", "initial_exact"];
  const headings: Record<string, string> = { order: "Stage order", stage: "Funnel stage", previous_percent: "Previous-stage retention (%)", initial_percent: "Initial-stage retention (%)", loss: "Loss from previous stage", previous_exact: "Exact previous-stage retention", initial_exact: "Exact initial-stage retention" };
  const tableLabel = [result.title, t("Chart data table")].filter(Boolean).join(" · ");
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
    <div className="max-h-32 shrink-0 overflow-auto px-3 text-xs"><div className="flex flex-wrap gap-2 py-1"><button className="rounded border border-outline px-2 py-1" aria-pressed={!table} onClick={() => setTable(false)}>{t("Chart")}</button><button className="rounded border border-outline px-2 py-1" aria-pressed={table} onClick={() => setTable(true)}>{t("Data table")}</button></div>
      <p>{t("Overall retention (%)")}: {overall == null ? t("Undefined") : String(overall)}</p>
      {!table && result.rows.length > 0 && <p>{t("All {0} stages are retained. Scroll to see the complete sequence.", { 0: result.rows.length })}</p>}
      <details><summary>{t("Funnel population and reading")}</summary><p>{t("Width, not area, encodes the value relative to the initial stage. The final stage does not imply a further loss. Zero has a dashed marker; very small widths may be invisible. Exact values remain in the table.")}</p><p>{t("These ratios do not prove individual transitions. Prepare a consistent cohort upstream; use a bar chart for unrelated stage populations.")}</p><p>{t("Stages use ascending integer order, never value sorting. Retention compares each stage with the previous and initial stages. Zero denominators are undefined; percentages are rounded half-even to 12 places with exact fractions available.")}</p><p>{fields.value.display_name} {comboUnit(fields.value.metadata)}</p></details>
    </div>
    {!result.rows.length ? <p className="p-4">{t("No rows to visualize.")}</p> : table ? <div className="min-h-0 min-w-0 flex-1 overflow-auto p-3" tabIndex={0} role="region" aria-label={tableLabel}><table className="min-w-full text-sm"><caption className="sr-only">{tableLabel}</caption><thead><tr>{roles.map(role => <th scope="col" key={role} className={`p-2 ${role === "stage" ? "text-left" : "text-right"}`}>{role === "value" ? fields.value.display_name : t(headings[role])}{["value", "loss"].includes(role) && comboUnit(fields.value.metadata) && ` (${comboUnit(fields.value.metadata)})`}</th>)}{onSelect && <th scope="col">{t("Selection")}</th>}</tr></thead><tbody>{result.rows.map((row, i) => <tr key={result.funnel!.points[i].id}>{roles.map(role => role === "stage" ? <th scope="row" className="border-t border-outline p-2 text-left font-normal" key={role}>{cell(row[fields[role].engine_name], fields[role].logical_type)}</th> : <td className="border-t border-outline p-2 text-right tabular-nums" key={role}>{row[fields[role].engine_name] == null ? "—" : String(row[fields[role].engine_name])}</td>)}{onSelect && <td><button className="underline" onClick={() => onSelect(Object.fromEntries(result.columns.map(c => [c.column_id, row[c.engine_name]])))}>{t("Select")}</button></td>}</tr>)}</tbody></table></div> : <div className="min-h-0 min-w-0 flex-1 overflow-auto" tabIndex={0} aria-label={t("Funnel chart stages")}><div style={{ height: Math.max(190, result.rows.length * 64 + 28) }}>{children}</div></div>}
  </div>;
}
