"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-provider";
import type { VisualizationResult } from "./api";
import { comboField, comboUnit } from "./combo";
import { bulletTones, bulletWindowSize } from "./bullet";

export function BulletView({ result, children, onSelect, setOffset }: { result: VisualizationResult; children: (window: [number, number]) => ReactNode; onSelect?: (row: Record<string, unknown>) => void; setOffset?: (offset: number) => void }) {
  const { t, cell } = useI18n(), { theme } = useTheme();
  const [table, setTable] = useState(false), [start, setStart] = useState(0);
  const chartArea = useRef<HTMLDivElement>(null), [visibleCount, setVisibleCount] = useState(5);
  useEffect(() => {
    if (!chartArea.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(entries => {
      if (entries[0]) setVisibleCount(bulletWindowSize(entries[0].contentRect.height));
    });
    observer.observe(chartArea.current);
    return () => observer.disconnect();
  }, [table, result.rows.length]);
  const spec = result.spec, bullet = result.bullet;
  if (spec?.type !== "bullet_chart" || !bullet) return <p role="alert">{t("The statistical field is unavailable. Reload the visualization.")}</p>;
  const fields = [spec.category_column_id, spec.actual_column_id, spec.target_column_id].map(id => comboField(result, id));
  const safeStart = Math.min(start, Math.max(0, result.rows.length - 1));
  const nextPage = (offset: number) => { setStart(0); setOffset?.(offset); };
  const tableLabel = [result.title, t("Chart data table")].filter(Boolean).join(" · ");
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
    <div className="max-h-32 shrink-0 overflow-auto px-3 text-xs"><div className="flex flex-wrap gap-2 py-1"><button className="rounded border border-outline px-2 py-1" aria-pressed={!table} onClick={() => setTable(false)}>{t("Chart")}</button><button className="rounded border border-outline px-2 py-1" aria-pressed={table} onClick={() => setTable(true)}>{t("Data table")}</button></div>
      <p>{t("Bar: actual · tall marker: target · short zero marker: actual zero.")}</p>
      {(result.offset > 0 || result.truncated) && <p role="status" className="text-warning">{t("Only the current page is drawn; scales and counts use the complete selected dataset.")}</p>}
      <details><summary>{t("Bullet scale and ranges")}</summary><p>{spec.minimum} … {spec.maximum} {comboUnit(fields[1].metadata)}</p><p>{t("Population: {0} · missing actual: {1} · missing target: {2}", { 0: bullet.input_count, 1: bullet.missing_actual_count, 2: bullet.missing_target_count })}</p><p>{t("Ranges include the lower bound; only the final upper bound is included. Missing values are not zero. Small bars may be invisible; use exact values in the table.")}</p>{spec.bands.map((band, i) => <p key={i}>{band.label}: [{i ? spec.bands[i - 1].upper : spec.minimum}, {band.upper}{i === spec.bands.length - 1 ? "]" : ")"}</p>)}</details>
      {result.show_legend && <div className="flex flex-wrap gap-3">{spec.bands.map((band, i) => <span className="flex items-center gap-1" key={i}><span aria-hidden="true" className="inline-block h-2 w-3" style={{ background: bulletTones(theme)[band.tone] }} />{band.label}</span>)}</div>}
    </div>
    {table ? <div tabIndex={0} role="region" aria-label={tableLabel} className="min-h-0 min-w-0 flex-1 overflow-auto p-3"><table className="min-w-full text-sm"><caption className="sr-only">{tableLabel}</caption><thead><tr>{fields.map((field, i) => <th scope="col" key={i} className={`p-2 ${i ? "text-right" : "text-left"}`}>{i ? `${t(i === 1 ? "Actual" : "Target")} · ` : ""}{field.display_name}{comboUnit(field.metadata) && ` (${comboUnit(field.metadata)})`}</th>)}<th scope="col">{t("Actual range")}</th>{onSelect && <th scope="col">{t("Selection")}</th>}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={bullet.points[index].id}>{fields.map((field, i) => i === 0 ? <th scope="row" className="border-t border-outline p-2 text-left font-normal" key={i}>{cell(row[field.engine_name], field.logical_type)}</th> : <td className="border-t border-outline p-2 text-right tabular-nums" key={i}>{row[field.engine_name] == null ? "—" : String(row[field.engine_name])}</td>)}<td className="border-t border-outline p-2">{bullet.points[index].actual_band == null ? t("Missing actual") : spec.bands[bullet.points[index].actual_band!].label}</td>{onSelect && <td><button className="underline" onClick={() => onSelect(Object.fromEntries(result.columns.map(c => [c.column_id, row[c.engine_name]])))}>{t("Select")}</button></td>}</tr>)}</tbody></table>{!result.rows.length && <p>{t("No rows on this page.")}</p>}</div>
      : result.rows.length ? <><div className="flex shrink-0 justify-between px-3 py-1 text-xs"><button disabled={!safeStart} onClick={() => setStart(Math.max(0, safeStart - visibleCount))}>{t("Previous indicators")}</button><span>{t("Indicators {0}–{1}", { 0: result.offset + safeStart + 1, 1: result.offset + Math.min(safeStart + visibleCount, result.rows.length) })}</span><button disabled={safeStart + visibleCount >= result.rows.length} onClick={() => setStart(safeStart + visibleCount)}>{t("Next indicators")}</button></div><div ref={chartArea} className="min-h-0 min-w-0 flex-1">{children([safeStart, safeStart + visibleCount - 1])}</div></> : <p className="p-4">{t("No rows to visualize.")}</p>}
    <div className="flex shrink-0 justify-between gap-2 p-2 text-xs"><button disabled={!setOffset || !result.offset} onClick={() => nextPage(Math.max(0, result.offset - result.limit))}>{t("Previous page")}</button><span>{t("Rows {0}–{1} of {2}", { 0: result.rows.length ? result.offset + 1 : 0, 1: result.offset + result.rows.length, 2: result.total_rows })}</span><button disabled={!setOffset || !result.truncated} onClick={() => nextPage(result.offset + result.limit)}>{t("Next page")}</button></div>
  </div>;
}
