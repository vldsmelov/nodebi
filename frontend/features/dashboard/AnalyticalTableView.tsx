"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";
import type { VisualizationResult } from "./api";
import { dataColumnWidth, rowLevelWidth, selectionColumnWidth, tablePinning } from "./analytical-table-layout";

const tones = {
  positive: "bg-success/15 text-success", warning: "bg-warning/15 text-warning",
  negative: "bg-danger/15 text-danger", neutral: "bg-surface text-muted",
};
const symbols = { positive: "+", warning: "!", negative: "−", neutral: "•" };

export function AnalyticalTableView({ result, setOffset, onSelect }: {
  result: VisualizationResult; setOffset?: (offset: number) => void;
  onSelect?: (row: Record<string, unknown>) => void;
}) {
  const { t, cell } = useI18n();
  const spec = result.spec;
  const scrollRegion = useRef<HTMLDivElement>(null);
  const [regionWidth, setRegionWidth] = useState<number | null>(null);
  useEffect(() => {
    const region = scrollRegion.current;
    if (!region || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setRegionWidth(region.clientWidth));
    observer.observe(region);
    return () => observer.disconnect();
  }, [spec?.type]);
  if (spec?.type !== "analytical_table" || !result.analytical_table) return <p role="alert">{t("The statistical field is unavailable. Reload the visualization.")}</p>;
  const ids = [...spec.dimensions, ...(spec.visible_measures ?? spec.measures)];
  const fields = ids.map(id => result.columns.find(c => c.column_id === id));
  const role = (id: string) => result.columns.find(c => c.column_id === id)?.engine_name;
  const rowKey = role(spec.rows.row_id), kindKey = role(spec.rows.kind), depthKey = role(spec.rows.depth), countKey = role(spec.rows.source_count);
  if (fields.some(f => !f) || !rowKey || !kindKey || !depthKey || !countKey) return <p role="alert">{t("The statistical field is unavailable. Reload the visualization.")}</p>;
  const pad = spec.density === "compact" ? "px-3 py-1" : "px-3 py-3";
  const pinning = tablePinning(regionWidth, spec.pinned_columns ?? 0);
  const pinned = (i: number): CSSProperties => ({ width: dataColumnWidth, minWidth: dataColumnWidth, maxWidth: dataColumnWidth, ...(i < pinning.columns ? { position: "sticky", left: rowLevelWidth + i * dataColumnWidth, zIndex: 1 } : {}) });
  const total = result.total_rows, limit = Math.max(1, result.limit), offset = result.offset;
  return <div className="isolate flex min-h-0 min-w-0 flex-1 flex-col" data-testid="analytical-table">
    <details className="px-4 py-1 text-xs"><summary>{t("How totals and rules work")}</summary><p>{t("Totals use all selected observations, not this page. Change grouping and calculations in Analytical table totals. The first matching rule wins; empty values are not zero.")}</p>{(spec.rules ?? []).map(rule => <p key={rule.id}>{rule.label} · {fields.find(f => f?.column_id === rule.column_id)?.display_name ?? result.columns.find(c => c.column_id === rule.column_id)?.display_name} · {rule.operator === "is_empty" ? t("Is empty") : `${rule.operator} ${rule.threshold}${rule.upper ? ` … ${rule.upper}` : ""}`} · {t(rule.scope === "details" ? "Detail rows" : rule.scope === "totals" ? "Total rows" : "All rows")}</p>)}</details>
    {(!pinning.rowLevel || pinning.columns < (spec.pinned_columns ?? 0)) && <p className="px-4 py-1 text-xs text-muted">{t("Some columns are temporarily unpinned to keep values visible. Widen the table to restore pinning.")}</p>}
    <div ref={scrollRegion} className="min-h-0 min-w-0 flex-1 overflow-auto" tabIndex={0} role="region" aria-label={t("Analytical table")}>
      <table className="w-full table-fixed border-separate border-spacing-0 text-sm" style={{ minWidth: rowLevelWidth + fields.length * dataColumnWidth + (onSelect ? selectionColumnWidth : 0) }}>
        <caption className="sr-only">{result.title || t("Analytical table")}</caption>
        <thead><tr><th scope="col" style={{ width: rowLevelWidth }} className={`${pad} sticky ${pinning.rowLevel ? "left-0" : ""} top-0 z-40 border-b border-outline bg-panel text-left`}>{t("Row level")}</th>{fields.map((field, i) => field && <th scope="col" key={field.column_id} style={{ ...pinned(i), position: "sticky", top: 0, zIndex: i < pinning.columns ? 30 : 20 }} className={`${pad} border-b border-outline bg-panel ${i < spec.dimensions.length ? "text-left" : "text-right"}`}><span className="break-words">{field.display_name}</span>{(field.metadata?.unit || field.metadata?.currency) ? <span className="block font-normal text-muted">{String(field.metadata.unit || field.metadata.currency)}</span> : null}</th>)}{onSelect && <th scope="col" style={{ width: selectionColumnWidth }} className="bg-panel">{t("Selection")}</th>}</tr></thead>
        <tbody>{result.rows.map((row, rowIndex) => {
          const kind = String(row[kindKey]), depth = Number(row[depthKey]);
          const label = t(kind === "grand_total" ? "Grand total" : kind === "subtotal" ? "Subtotal" : "Detail rows");
          const highlight = !!result.highlight_field && result.highlight_value != null && String(row[result.highlight_field]) === String(result.highlight_value);
          const bg = highlight ? "bg-raised" : kind === "detail" ? "bg-panel" : "bg-page";
          const weight = kind === "detail" ? "font-normal" : "font-semibold";
          return <tr key={String(row[rowKey])} className={weight} aria-selected={highlight || undefined}>
            <th scope="row" className={`${pad} ${pinning.rowLevel ? "sticky left-0" : ""} z-10 border-b border-outline text-left ${bg} ${weight}`}><span style={{ paddingLeft: Math.max(0, depth - 1) * 8 }}>{label}</span><span className="block font-normal text-muted">{t("Source rows: {0}", { 0: String(row[countKey]) })}</span></th>
            {fields.map((field, i) => {
              if (!field) return null;
              const numeric = i >= spec.dimensions.length, raw = row[field.engine_name];
              const marker = result.analytical_table!.cells?.[String(row[rowKey])]?.[field.column_id];
              const text = !numeric && kind !== "detail" && i >= depth ? "" : raw == null ? t("Empty value") : numeric ? String(raw) : cell(raw, field.logical_type);
              return <td key={field.column_id} style={pinned(i)} className={`${pad} border-b border-outline break-words ${bg} ${numeric ? "text-right tabular-nums" : "text-left"}`}><span>{text}</span>{marker && <span className={`mt-1 block rounded px-1 py-0.5 text-xs ${tones[marker.tone]}`}><span aria-hidden="true">{symbols[marker.tone]} </span><span>{marker.label}</span></span>}</td>;
            })}
            {onSelect && <td className={`${pad} border-b border-outline ${bg}`}><button className="rounded border border-outline px-2 py-1" aria-label={t("Select row {0}", { 0: offset + rowIndex + 1 })} onClick={() => onSelect(Object.fromEntries(result.columns.map(c => [c.column_id, row[c.engine_name]])))}>{t("Select")}</button></td>}
          </tr>;
        })}</tbody>
      </table>{!result.rows.length && <p className="p-4">{t("No rows on this page.")}</p>}
    </div>
    <nav aria-label={t("Table pages")} className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs">
      <button disabled={!setOffset || offset === 0} onClick={() => setOffset?.(Math.max(0, offset - limit))}>{t("Previous page")}</button>
      <span>{t("Total rows: {0} · page {1}", { 0: total, 1: Math.floor(offset / limit) + 1 })}</span>
      <button disabled={!setOffset || offset + limit >= total} onClick={() => setOffset?.(offset + limit)}>{t("Next page")}</button>
      <button disabled={!setOffset || offset + limit >= total} onClick={() => setOffset?.(Math.max(0, Math.floor((total - 1) / limit) * limit))}>{t("Last page")}</button>
    </nav>
  </div>;
}
