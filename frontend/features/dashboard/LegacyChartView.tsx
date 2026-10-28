"use client";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import type { VisualizationResult } from "./api";
import { basicPatternCount } from "./basic-series-cues";
import { pieCategories } from "./pie-categories";

export function LegacyChartView({ result, children, onSelect }: { result: VisualizationResult; children: ReactNode; onSelect?: (row: Record<string, unknown>) => void }) {
  const { t, cell, locale } = useI18n();
  const [table, setTable] = useState(false), [page, setPage] = useState(0);
  const names = new Set([result.category_field, result.value_field, ...(result.additional_series ?? []).map(s => s.field)]);
  const fields = result.columns.filter(c => names.has(c.engine_name) && !result.context_column_ids?.includes(c.column_id));
  const safePage = Math.min(page, Math.max(0, Math.ceil(result.rows.length / 100) - 1));
  const tableLabel = [result.title, t("Chart data table")].filter(Boolean).join(" · ");
  const repeatedPatterns = ["pie_chart", "donut_chart"].includes(result.type) && pieCategories(result, locale).length > basicPatternCount;
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto" data-testid="legacy-chart-view">
    <div className="flex flex-wrap gap-2 px-4 py-1 text-xs"><button className="min-h-8 rounded border border-outline px-2" aria-pressed={!table} onClick={() => setTable(false)}>{t("Chart")}</button><button className="min-h-8 rounded border border-outline px-2" aria-pressed={table} onClick={() => setTable(true)}>{t("Data table")}</button></div>
    <p className="px-4 py-1 text-xs text-muted">{t("Chart labels may be shortened. The data table preserves the returned values and full names.")}</p>
    {["pie_chart", "donut_chart"].includes(result.type) && <p className="px-4 py-1 text-xs text-muted">{t("Zero and missing values do not form slices. If no slices are visible, restore a category in the legend or inspect the data table.")}</p>}
    {repeatedPatterns && <p role="status" className="px-4 py-1 text-xs text-warning">{t("Patterns repeat after eight categories. Use the data table or a bar chart to compare many categories.")}</p>}
    {result.truncated && <p role="status" className="px-4 text-xs text-warning">{t("Showing {0} returned rows of {1}. The chart and table use the same result.", { 0: result.rows.length, 1: result.total_rows })}</p>}
    {table ? <><div tabIndex={0} role="region" aria-label={tableLabel} className="min-h-0 min-w-0 flex-1 overflow-auto p-3"><table className="min-w-full text-sm"><caption className="sr-only">{tableLabel}</caption><thead><tr>{fields.map(c => <th scope="col" key={c.column_id} className={`border-b border-outline p-2 ${["integer", "float", "decimal"].includes(c.logical_type) ? "text-right" : "text-left"}`}>{c.display_name}</th>)}{onSelect && <th scope="col">{t("Selection")}</th>}</tr></thead><tbody>{result.rows.slice(safePage * 100, safePage * 100 + 100).map((row, index) => <tr key={safePage * 100 + index}>{fields.map(c => <td key={c.column_id} className={`border-b border-outline p-2 ${["integer", "float", "decimal"].includes(c.logical_type) ? "text-right tabular-nums" : "text-left"}`}>{row[c.engine_name] == null ? "—" : ["integer", "float", "decimal"].includes(c.logical_type) ? String(row[c.engine_name]) : cell(row[c.engine_name], c.logical_type)}</td>)}{onSelect && <td><button className="min-h-8 rounded border border-outline px-2" aria-label={t("Select row {0}", { 0: safePage * 100 + index + 1 })} onClick={() => onSelect(Object.fromEntries(result.columns.map(c => [c.column_id, row[c.engine_name]])))}>{t("Select")}</button></td>}</tr>)}</tbody></table>{!result.rows.length && <p role="status" className="py-3">{t("No rows on this page.")}</p>}</div><nav aria-label={t("Table pages")} className="flex flex-wrap justify-between gap-2 p-3 text-xs"><button disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>{t("Previous page")}</button><span>{t("Total rows: {0} · page {1}", { 0: result.rows.length, 1: safePage + 1 })}</span><button disabled={(safePage + 1) * 100 >= result.rows.length} onClick={() => setPage(safePage + 1)}>{t("Next page")}</button></nav></> : result.rows.length ? <div className="min-h-40 flex-1">{children}</div> : <p role="status" className="p-5 text-muted">{t("No rows to visualize.")}</p>}
  </div>;
}
