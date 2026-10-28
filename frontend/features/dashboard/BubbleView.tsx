"use client";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import type { VisualizationResult } from "./api";
import { comboField, comboUnit } from "./combo";

export function BubbleView({ result, children, onSelect, setOffset }: { result: VisualizationResult; children: ReactNode; onSelect?: (row: Record<string, unknown>) => void; setOffset?: (value: number) => void }) {
  const { t, cell } = useI18n(), [table, setTable] = useState(false);
  const spec = result.spec, bubble = result.bubble;
  if (spec?.type !== "bubble_chart" || !bubble) return <p role="alert">{t("The statistical field is unavailable. Reload the visualization.")}</p>;
  const ids = [...new Set([spec.key_column_id, spec.label_column_id, spec.x_column_id, spec.y_column_id, spec.size_column_id, spec.group_column_id].filter((id): id is string => !!id))];
  const fields = ids.map(id => comboField(result, id));
  const partial = result.offset > 0 || result.truncated;
  const states = { visible: "Visible bubble", zero_size: "Zero area", missing: "Missing values" };
  const tableLabel = [result.title, t("Chart data table")].filter(Boolean).join(" · ");
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
    <div className="flex flex-wrap gap-2 px-4 py-1 text-xs"><button className="rounded border border-outline px-2 py-1" aria-pressed={!table} onClick={() => setTable(false)}>{t("Chart")}</button><button className="rounded border border-outline px-2 py-1" aria-pressed={table} onClick={() => setTable(true)}>{t("Data table")}</button></div>
    {partial && <p role="status" className="px-4 text-xs text-warning">{t("Only the current page is drawn; scales and counts use the complete selected dataset.")}</p>}
    {bubble.x_axis.label_offset != null && <p className="break-words px-4 text-xs">{t("X = {0} + axis label", { 0: bubble.x_axis.label_offset })}</p>}
    {bubble.y_axis.label_offset != null && <p className="break-words px-4 text-xs">{t("Y = {0} + axis label", { 0: bubble.y_axis.label_offset })}</p>}
    <details className="px-4 text-xs"><summary>{t("Bubble scales and population")}</summary>
      <p>{t("Area is proportional to a non-negative measure. Zero and missing observations stay in the exact table; scales use all selected rows.")}</p>
      <p>{t("Population: {0} · visible: {1} · zero area: {2} · missing: {3}", { 0: bubble.input_count, 1: bubble.visible_count, 2: bubble.zero_size_count, 3: bubble.missing_count })}</p>
      <p>{t("X measure")}: {bubble.x_axis.minimum ?? "—"} … {bubble.x_axis.maximum ?? "—"}</p>
      <p>{t("Y measure")}: {bubble.y_axis.minimum ?? "—"} … {bubble.y_axis.maximum ?? "—"}</p>
      <p>{t("Maximum bubble area value")}: {bubble.size_maximum ?? "—"}</p>
    </details>
    {table ? <div tabIndex={0} role="region" aria-label={tableLabel} className="min-h-0 min-w-0 flex-1 overflow-auto p-3"><table className="min-w-full text-sm"><caption className="sr-only">{tableLabel}</caption><thead><tr>{fields.map((field, index) => <th scope="col" key={field.column_id} className={`p-2 ${index > 0 && ["integer", "float", "decimal"].includes(field.logical_type) ? "text-right" : "text-left"}`}>{field.display_name}{comboUnit(field.metadata) && ` (${comboUnit(field.metadata)})`}</th>)}<th scope="col">{t("State")}</th>{onSelect && <th scope="col">{t("Selection")}</th>}</tr></thead><tbody>{result.rows.map((row, i) => <tr key={bubble.points[i].id}>{fields.map((field, index) => index === 0 ? <th scope="row" className="border-t border-outline p-2 text-left font-normal" key={field.column_id}>{cell(row[field.engine_name], field.logical_type)}</th> : <td className={`border-t border-outline p-2 ${["integer", "float", "decimal"].includes(field.logical_type) ? "text-right tabular-nums" : "text-left"}`} key={field.column_id}>{row[field.engine_name] == null ? "—" : String(row[field.engine_name])}</td>)}<td className="border-t border-outline p-2">{t(states[bubble.points[i].state])}</td>{onSelect && <td><button className="rounded border border-outline px-2 py-1" onClick={() => onSelect(Object.fromEntries(result.columns.map(c => [c.column_id, row[c.engine_name]])))}>{t("Select")}</button></td>}</tr>)}</tbody></table>{!result.rows.length && <p>{t("No rows on this page.")}</p>}</div> : bubble.points.some(point => point.state === "visible") ? <div className="min-h-56 flex-1">{children}</div> : <p className="p-4">{t("No drawable bubbles on this page. Inspect zero and missing values in the data table.")}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs"><button disabled={!setOffset || result.offset === 0} onClick={() => setOffset?.(Math.max(0, result.offset - result.limit))}>{t("Previous page")}</button><span>{t("Rows {0}–{1} of {2}", { 0: result.rows.length ? result.offset + 1 : 0, 1: result.rows.length ? result.offset + result.rows.length : 0, 2: result.total_rows })}</span><button disabled={!setOffset || !result.truncated} onClick={() => setOffset?.(result.offset + result.limit)}>{t("Next page")}</button></div>
  </div>;
}
