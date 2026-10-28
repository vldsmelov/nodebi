"use client";

import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import type { VisualizationResult } from "./api";
import { boxField, boxPlotSelection } from "./box-plot";

export function BoxPlotView({ result, children, setOffset, onSelect }: {
  result: VisualizationResult; children: ReactNode; setOffset?: (offset: number) => void;
  onSelect?: (row: Record<string, unknown>) => void;
}) {
  const { t, cell } = useI18n();
  const [view, setView] = useState<"chart" | "summary" | "outliers">("chart");
  const [summaryOffset, setSummaryOffset] = useState(0);
  const points = result.datasets?.outliers, summary = result.datasets?.summary, spec = result.spec;
  if (!points || !summary || spec?.type !== "box_plot") return <p role="alert">{t("The statistical field is unavailable. Reload the visualization.")}</p>;
  const page = view === "outliers" ? points : summary;
  const roles = view === "outliers" ? spec.outliers : spec.summary;
  const fields = page.columns.filter(column => ![roles.group_id, spec.outliers.point_id].includes(column.column_id));
  const offset = view === "outliers" ? points.offset : summaryOffset;
  const rows = view === "outliers" ? page.rows : page.rows.slice(summaryOffset, summaryOffset + 100);
  const select = (row: Record<string, unknown>) => {
    const selected = view === "outliers" ? boxPlotSelection(result, { data: { groupIdentity: row[boxField(result, "outliers", spec.outliers.group_id)] } }) : row;
    if (selected) onSelect?.(Object.fromEntries(summary.columns.map(column => [column.column_id, selected[column.engine_name]])));
  };
  const changePage = (next: number) => view === "outliers" ? setOffset?.(next) : setSummaryOffset(next);
  const hasObservations = summary.rows.some(row => Number(row[boxField(result, "summary", spec.summary.count)]) > 0);
  const tableLabel = [result.title, t(view === "outliers" ? "Outliers" : "Distribution summary")].filter(Boolean).join(" · ");
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col">
    <div className="flex flex-wrap gap-3 px-4 py-2 text-xs" aria-label={t("Distribution view")}>{(["chart", "summary", "outliers"] as const).map(key => <button key={key} aria-pressed={view === key} className="rounded border border-outline px-2 py-1 aria-pressed:bg-accent/15" onClick={() => setView(key)}>{t(key === "chart" ? "Chart" : key === "summary" ? "Distribution summary" : "Outliers")}</button>)}</div>
    <p className="px-4 text-xs text-muted">{t("Quartiles and whiskers use all observations. Exact values are available in the tables.")}</p>
    {(points.truncated || points.offset > 0) && <p role="status" className="px-4 text-xs text-warning">{t("Showing {0} of {1} outliers. Statistics are unchanged.", { 0: cell(points.rows.length), 1: cell(points.total_rows) })}</p>}
    {view === "chart" ? hasObservations ? <div className="min-h-40 flex-1">{children}</div> : <p className="p-4">{t("No numeric observations. See missing-value counts in the summary.")}</p> : <>
      <div tabIndex={0} role="region" aria-label={tableLabel} className="min-h-0 min-w-0 flex-1 overflow-auto p-3"><table className="min-w-full text-sm"><caption className="sr-only">{tableLabel}</caption><thead><tr>{onSelect && <th scope="col">{t("Selection")}</th>}{fields.map(column => <th scope="col" key={column.column_id} className={`border-b border-outline p-2 ${["integer", "float", "decimal"].includes(column.logical_type) ? "text-right" : "text-left"}`}>{t(column.display_name)}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={String(row[boxField(result, view, view === "outliers" ? spec.outliers.point_id : spec.summary.group_id)])}>{onSelect && <td><button onClick={() => select(row)}>{t("Select")}</button></td>}{fields.map(column => <td key={column.column_id} className={`border-b border-outline p-2 whitespace-nowrap ${["integer", "float", "decimal"].includes(column.logical_type) ? "text-right tabular-nums" : ""}`}>{cell(row[column.engine_name], column.logical_type)}</td>)}</tr>)}</tbody></table>{!rows.length && <p className="p-3">{t("No rows on this page.")}</p>}</div>
      <div className="flex justify-between gap-3 p-3 text-xs"><button disabled={offset === 0 || view === "outliers" && !setOffset} onClick={() => changePage(Math.max(0, offset - 100))}>{t("Previous page")}</button><span>{t("Total rows: {0} · page {1}", { 0: cell(page.total_rows), 1: cell(Math.floor(offset / 100) + 1) })}</span><button disabled={offset + rows.length >= page.total_rows || view === "outliers" && !setOffset} onClick={() => changePage(offset + 100)}>{t("Next page")}</button></div>
    </>}
  </div>;
}
