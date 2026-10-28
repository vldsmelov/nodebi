"use client";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import type { VisualizationResult } from "./api";
import { comboField, comboUnit } from "./combo";

export function ComboView({ result, children, onSelect }: { result: VisualizationResult; children: (window?: [number, number]) => ReactNode; onSelect?: (row: Record<string, unknown>) => void }) {
  const { t, cell } = useI18n();
  const [table, setTable] = useState(false), [page, setPage] = useState(0), [start, setStart] = useState<number | null>(null);
  const spec = result.spec, combo = result.combo;
  if (spec?.type !== "combo_chart" || !combo) return <p role="alert">{t("The statistical field is unavailable. Reload the visualization.")}</p>;
  const category = comboField(result, spec.category_column_id), fields = spec.series.map(s => comboField(result, s.column_id));
  const total = result.rows.length, safePage = Math.min(page, Math.max(0, Math.ceil(total / 100) - 1));
  const safeStart = start == null ? null : Math.min(start, Math.max(0, Math.floor((total - 1) / 20) * 20));
  const tableLabel = [result.title, t("Chart data table")].filter(Boolean).join(" · ");
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
    <div className="flex flex-wrap gap-2 px-4 py-1 text-xs"><button className="rounded border border-outline px-2 py-1" aria-pressed={!table} onClick={() => setTable(false)}>{t("Chart")}</button><button className="rounded border border-outline px-2 py-1" aria-pressed={table} onClick={() => setTable(true)}>{t("Data table")}</button></div>
    {spec.secondary_axis && <p className="px-4 text-xs text-muted">{t("Two independent scales: compare each series with its assigned axis, not with the height of another series.")}</p>}
    <details className="px-4 text-xs"><summary>{t("Series and scales")}</summary><p>{t("Missing values stay empty. Both axes include zero. Zoom and pages do not recalculate values or scales.")}</p>{spec.series.map((s, i) => <p key={s.column_id}>{s.name?.trim() || fields[i].display_name} · {t(s.kind === "bar" ? "Bars" : "Line")} · {t(s.axis === "secondary" ? "Right axis" : "Left axis")} · {comboUnit(fields[i].metadata) || t("Not specified")}</p>)}{[combo.primary, ...(combo.secondary ? [combo.secondary] : [])].map((scale, i) => <p className="tabular-nums" key={i}>{t(i ? "Right axis" : "Left axis")}: {scale.minimum} … {scale.maximum}</p>)}</details>
    {table ? <><div tabIndex={0} role="region" aria-label={tableLabel} className="min-h-0 min-w-0 flex-1 overflow-auto p-3"><table className="min-w-full text-sm"><caption className="sr-only">{tableLabel}</caption><thead><tr><th scope="col" className="p-2 text-left">{category.display_name}</th>{fields.map((field, i) => <th scope="col" className="p-2 text-right" key={field.column_id}>{spec.series[i].name?.trim() || field.display_name}{comboUnit(field.metadata) && ` (${comboUnit(field.metadata)})`}</th>)}{onSelect && <th scope="col">{t("Selection")}</th>}</tr></thead><tbody>{result.rows.slice(safePage * 100, safePage * 100 + 100).map((row, i) => <tr key={combo.observations[safePage * 100 + i].id}><th scope="row" className="border-t border-outline p-2 text-left font-normal">{cell(row[category.engine_name], category.logical_type)}</th>{fields.map(field => <td className="border-t border-outline p-2 text-right tabular-nums" key={field.column_id}>{row[field.engine_name] == null ? "—" : String(row[field.engine_name])}</td>)}{onSelect && <td><button className="rounded border border-outline px-2 py-1" onClick={() => onSelect(Object.fromEntries(result.columns.map(c => [c.column_id, row[c.engine_name]])))}>{t("Select")}</button></td>}</tr>)}</tbody></table>{!total && <p>{t("No rows on this page.")}</p>}</div><div className="flex justify-between gap-2 p-3 text-xs"><button disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>{t("Previous page")}</button><span>{t("Total rows: {0} · page {1}", { 0: total, 1: safePage + 1 })}</span><button disabled={(safePage + 1) * 100 >= total} onClick={() => setPage(safePage + 1)}>{t("Next page")}</button></div></> : total ? <>
      {total > 20 && <div className="flex flex-wrap gap-2 px-4 text-xs"><button onClick={() => setStart(safeStart == null ? 0 : null)}>{t(safeStart == null ? "Show 20 categories" : "Show all categories")}</button>{safeStart != null && <><button disabled={safeStart === 0} onClick={() => setStart(safeStart - 20)}>{t("Previous categories")}</button><span>{safeStart + 1}–{Math.min(safeStart + 20, total)} / {total}</span><button disabled={safeStart + 20 >= total} onClick={() => setStart(safeStart + 20)}>{t("Next categories")}</button></>}</div>}
      <div className="min-h-40 flex-1">{children(safeStart == null ? undefined : [safeStart, Math.min(safeStart + 19, total - 1)])}</div>
    </> : <p className="p-4">{t("No rows to visualize.")}</p>}
  </div>;
}
