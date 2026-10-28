"use client";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import type { VisualizationResult } from "./api";
import { heatmapCategory, heatmapColors, heatmapField } from "./heatmap";

export function HeatmapView({ result, children, onSelect }: { result: VisualizationResult; children: ReactNode; onSelect?: (row: Record<string, unknown>) => void }) {
  const { t, locale, cell } = useI18n();
  const [table, setTable] = useState(false), [page, setPage] = useState(0);
  const scale = result.heatmap_scale;
  if (result.spec?.type !== "heatmap_chart" || !scale) return <p role="alert">{t("The statistical field is unavailable. Reload the visualization.")}</p>;
  const field = (role: Parameters<typeof heatmapField>[1]) => heatmapField(result, role).engine_name;
  const fields = (["x", "y", "value", "row_count", "valid_count", "missing_count"] as const).map(role => heatmapField(result, role));
  const current = Math.min(page, Math.max(0, Math.ceil(result.rows.length / 100) - 1));
  const mode = scale.mode === "fixed" ? "Fixed colour bounds" : scale.mode === "zero_centered" ? "Symmetric around zero" : "Data minimum to maximum";
  const aggregate = String(heatmapField(result, "value").metadata.aggregation ?? "");
  const operations: Record<string, string> = { sum: "Sum", average: "Average", min: "Minimum", max: "Maximum", count: "Count numeric values" };
  const tableLabel = [result.title, t("Chart data table")].filter(Boolean).join(" · ");
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
    <div className="flex flex-wrap gap-3 px-4 py-1 text-xs"><button className="rounded border border-outline px-2 py-1" aria-pressed={!table} onClick={() => setTable(false)}>{t("Chart")}</button><button className="rounded border border-outline px-2 py-1" aria-pressed={table} onClick={() => setTable(true)}>{t("Cell table")}</button><span>{t("Cell aggregation")}: {t(operations[aggregate] ?? aggregate)} · {fields[0].display_name} × {fields[1].display_name}</span><details><summary>{t("How to read")}</summary><p>{t("Colours use all prepared cells. Zoom and table pages change only the view.")}</p></details></div>
    <p className="px-4 text-xs text-muted">{t("× No source rows · — Missing measure · numeric zero is a measured value.")}</p>
    {result.show_legend && <div className="mx-4 my-2 text-xs" aria-label={t("Colour scale")}><p>{t(mode)}</p>{scale.minimum !== null && scale.maximum !== null ? <><div className="my-1 h-2 rounded" style={{ background: `linear-gradient(to right, ${heatmapColors(result).join(",")})` }} /><div className="flex justify-between gap-2 tabular-nums"><span>{scale.minimum}</span>{scale.mode === "zero_centered" && <span>0</span>}<span>{scale.maximum}</span></div></> : <p>{t("No numeric values for the colour scale.")}</p>}</div>}
    {(scale.below_count > 0 || scale.above_count > 0) && <p className="px-4 text-xs" role="status">{t("Saturated colours: {0} cells below and {1} above the fixed range. Values are unchanged.", { 0: scale.below_count, 1: scale.above_count })}</p>}
    {table ? <><div tabIndex={0} role="region" aria-label={tableLabel} className="min-h-0 min-w-0 flex-1 overflow-auto p-3"><table className="min-w-full text-sm"><caption className="sr-only">{tableLabel}</caption><thead><tr>{fields.map((column, index) => <th key={column.column_id} scope="col" className={`p-2 ${index > 1 ? "text-right" : "text-left"}`}>{t(column.display_name)}</th>)}<th scope="col">{t("Cell state")}</th>{onSelect && <th scope="col">{t("Selection")}</th>}</tr></thead><tbody>{result.rows.slice(current * 100, (current + 1) * 100).map(row => <tr key={String(row[field("cell_id")])}>{fields.map((column, index) => <td key={column.column_id} className={`border-t border-outline p-2 tabular-nums ${index > 1 ? "text-right" : "text-left"}`}>{index < 2 ? heatmapCategory(row[column.engine_name], locale, column.logical_type) : cell(row[column.engine_name], column.logical_type)}</td>)}<td className="border-t border-outline p-2">{t(row[field("present")] === false ? "No source rows" : row[field("value")] == null ? "Missing measure" : "Observed value")}</td>{onSelect && <td><button className="rounded border border-outline px-2 py-1" onClick={() => onSelect(Object.fromEntries(result.columns.map(column => [column.column_id, row[column.engine_name]])))}>{t("Select")}</button></td>}</tr>)}</tbody></table>{!result.rows.length && <p>{t("No rows on this page.")}</p>}</div>
      <div className="flex items-center gap-3 p-2 text-xs"><button disabled={current === 0} onClick={() => setPage(current - 1)}>{t("Previous")}</button><span>{t("Cells {0}–{1} of {2}", { 0: result.rows.length ? current * 100 + 1 : 0, 1: Math.min((current + 1) * 100, result.rows.length), 2: result.rows.length })}</span><button disabled={(current + 1) * 100 >= result.rows.length} onClick={() => setPage(current + 1)}>{t("Next")}</button></div></>
      : result.rows.length ? <div className="min-h-24 flex-1">{children}</div> : <p className="p-4">{t("No rows to visualize.")}</p>}
  </div>;
}
