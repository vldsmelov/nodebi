"use client";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import type { VisualizationResult } from "./api";
import { comboField } from "./combo";

export function ParetoView({ result, children, setOffset, onSelect }: { result: VisualizationResult; children: ReactNode; setOffset?: (value: number) => void; onSelect?: (row: Record<string, unknown>) => void }) {
  const { t, cell } = useI18n(), [table, setTable] = useState(false);
  const spec = result.spec, summary = result.datasets?.summary;
  if (spec?.type !== "pareto_chart" || !result.combo || !summary?.rows[0]) return <p role="alert">{t("The statistical field is unavailable. Reload the visualization.")}</p>;
  const summaryValue = (id: string) => summary.rows[0][summary.columns.find(c => c.column_id === id)!.engine_name];
  const total = summaryValue(spec.summary.total_value), zeros = summaryValue(spec.summary.zero_count);
  const fields = [spec.rows.rank, spec.rows.category, spec.rows.value, spec.rows.cumulative_value, spec.rows.share_percent, spec.rows.cumulative_percent, spec.rows.share_exact, spec.rows.cumulative_exact].map(id => comboField(result, id));
  const undefinedShare = result.rows.length > 0 && result.combo.observations.every(row => row.positions[1] == null);
  const tableLabel = [result.title, t("Chart data table")].filter(Boolean).join(" · ");
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
    <div className="max-h-32 shrink-0 overflow-auto">
    <div className="flex flex-wrap gap-2 px-4 py-1 text-xs"><button aria-pressed={!table} className="rounded border border-outline px-2 py-1" onClick={() => setTable(false)}>{t("Chart")}</button><button aria-pressed={table} className="rounded border border-outline px-2 py-1" onClick={() => setTable(true)}>{t("Data table")}</button></div>
    {(result.truncated || result.offset > 0) && <p role="status" className="px-4 text-xs text-warning">{t("Only the current page is drawn; scales and counts use the complete selected dataset.")}</p>}
    <p className="px-4 text-xs text-muted">{t("Bars: contribution on the left. Line: cumulative share from 0 to 100% on the right.")}</p>
    <details className="px-4 text-xs"><summary>{t("Pareto population")}</summary><p>{t("Categories: {0} · zero contributions: {1} · total: {2}", { 0: result.total_rows, 1: String(zeros), 2: String(total) })}</p><p>{t("Reference line: {0}%. It is a visual guide, not a rule that classifies categories.", { 0: spec.threshold_percent })}</p><p>{t("Percentages are rounded half-even to 12 decimal places; exact fractions remain available. With a zero total, shares are undefined. The population output retains the total and zero count.")}</p></details>
    {undefinedShare && <p role="status" className="px-4 text-xs text-warning">{t("The total is zero: cumulative share and its reference line are undefined.")}</p>}
    </div>
    {table ? <div tabIndex={0} role="region" aria-label={tableLabel} className="min-h-0 min-w-0 flex-1 overflow-auto p-3"><table className="min-w-full text-sm"><caption className="sr-only">{tableLabel}</caption><thead><tr>{fields.map(field => <th scope="col" key={field.column_id} className={`p-2 ${field.column_id === spec.rows.category ? "text-left" : "text-right"}`}>{field.display_name}</th>)}{onSelect && <th scope="col">{t("Selection")}</th>}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={result.combo!.observations[index].id}>{fields.map(field => field.column_id === spec.rows.category ? <th scope="row" key={field.column_id} className="border-t border-outline p-2 text-left font-normal">{cell(row[field.engine_name], field.logical_type)}</th> : <td className="border-t border-outline p-2 text-right tabular-nums" key={field.column_id}>{row[field.engine_name] == null ? "—" : String(row[field.engine_name])}</td>)}{onSelect && <td><button className="rounded border border-outline px-2 py-1" onClick={() => onSelect(Object.fromEntries(result.columns.map(c => [c.column_id, row[c.engine_name]])))}>{t("Select")}</button></td>}</tr>)}</tbody></table></div> : result.rows.length ? <div className="min-h-0 min-w-0 flex-1">{children}</div> : <p className="p-4">{t("No rows to visualize.")}</p>}
    <div className="flex shrink-0 flex-wrap justify-between gap-2 p-2 text-xs"><button disabled={!setOffset || !result.offset} onClick={() => setOffset?.(Math.max(0, result.offset - result.limit))}>{t("Previous page")}</button><span>{t("Rows {0}–{1} of {2}", { 0: result.rows.length ? result.offset + 1 : 0, 1: result.rows.length ? result.offset + result.rows.length : 0, 2: result.total_rows })}</span><button disabled={!setOffset || !result.truncated} onClick={() => setOffset?.(result.offset + result.limit)}>{t("Next page")}</button></div>
  </div>;
}
