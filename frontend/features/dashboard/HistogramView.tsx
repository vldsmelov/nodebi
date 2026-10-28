"use client";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import type { VisualizationResult } from "./api";
import { histogramField } from "./histogram";

export function HistogramView({ result, children, onSelect }: { result: VisualizationResult; children: ReactNode; onSelect?: (row: Record<string, unknown>) => void }) {
  const { t, cell } = useI18n();
  const [table, setTable] = useState(false);
  const spec = result.spec, summary = result.datasets?.summary;
  if (spec?.type !== "histogram_chart" || !summary?.rows[0]) return <p role="alert">{t("The statistical field is unavailable. Reload the visualization.")}</p>;
  const count = (role: keyof typeof spec.summary) => Number(summary.rows[0][histogramField(result, "summary", spec.summary[role])]);
  const fields = result.columns.filter(column => [spec.bins.interval, spec.bins.count].includes(column.column_id));
  const id = histogramField(result, "bins", spec.bins.bin_id);
  const tableLabel = [result.title, t("Chart data table")].filter(Boolean).join(" · ");
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col"><div className="flex flex-wrap gap-3 px-4 py-2 text-xs"><button className="rounded border border-outline px-2 py-1" aria-pressed={!table} onClick={() => setTable(false)}>{t("Chart")}</button><button className="rounded border border-outline px-2 py-1" aria-pressed={table} onClick={() => setTable(true)}>{t("Histogram intervals")}</button></div>
    <p className="px-4 text-xs text-muted">{t("Included: {0}. Missing: {1}. Below range: {2}. Above range: {3}.", { 0: cell(count("included_count")), 1: cell(count("missing_count")), 2: cell(count("below_count")), 3: cell(count("above_count")) })}</p>
    <p className="px-4 text-xs text-muted">{t("Equal-width intervals; counts use the entire selected dataset. Brackets include a boundary, parentheses exclude it.")}</p>
    {table ? <div tabIndex={0} role="region" aria-label={tableLabel} className="min-h-0 min-w-0 flex-1 overflow-auto p-3"><table className="min-w-full text-sm"><caption className="sr-only">{tableLabel}</caption><thead><tr>{fields.map(column => <th scope="col" key={column.column_id} className={`p-2 ${column.column_id === spec.bins.count ? "text-right" : "text-left"}`}>{t(column.display_name)}</th>)}{onSelect && <th scope="col">{t("Selection")}</th>}</tr></thead><tbody>{result.rows.map(row => <tr key={String(row[id])}>{fields.map(column => <td key={column.column_id} className={`border-t border-outline p-2 ${column.column_id === spec.bins.count ? "text-right tabular-nums" : "text-left"}`}>{cell(row[column.engine_name], column.logical_type)}</td>)}{onSelect && <td><button onClick={() => onSelect(Object.fromEntries(result.columns.map(column => [column.column_id, row[column.engine_name]])))}>{t("Select")}</button></td>}</tr>)}</tbody></table>{!result.rows.length && <p>{t("No rows on this page.")}</p>}</div>
      : count("included_count") ? <div className="min-h-40 flex-1">{children}</div> : <p className="p-4">{t("No observations inside the histogram range.")}</p>}
  </div>;
}
