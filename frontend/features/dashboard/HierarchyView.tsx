"use client";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import type { VisualizationResult } from "./api";
import { hierarchyRows } from "./hierarchy";
import { comboField, comboUnit } from "./combo";

export function HierarchyView({ result, children, onSelect }: { result: VisualizationResult; children: (root: string) => ReactNode; onSelect?: (row: Record<string, unknown>) => void }) {
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState<string | null>(null), [table, setTable] = useState(false), [page, setPage] = useState(0);
  const spec = result.spec;
  if (!result.hierarchy || !spec || !(spec.type === "treemap_chart" || spec.type === "sunburst_chart")) return <p role="alert">{t("The statistical field is unavailable. Reload the visualization.")}</p>;
  const measure = comboField(result, spec.value_column_id), unit = comboUnit(measure.metadata);
  const nodes = hierarchyRows(result, locale), root = nodes.find(n => n.id === selected) ?? nodes.find(n => n.id === result.hierarchy!.root_id)!;
  const descendants = nodes.filter(n => n.parent_id === root.id), parents = new Set(nodes.map(n => n.parent_id));
  const safePage = Math.min(page, Math.max(0, Math.ceil(descendants.length / 100) - 1));
  const go = (id: string | null) => { setSelected(id); setPage(0); };
  const tableLabel = [result.title, t("Chart data table")].filter(Boolean).join(" · ");
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
    <div className="max-h-32 shrink-0 overflow-auto px-3 text-xs">
      <div className="flex flex-wrap gap-2 py-1"><button className="rounded border border-outline px-2 py-1" aria-pressed={!table} onClick={() => setTable(false)}>{t("Chart")}</button><button className="rounded border border-outline px-2 py-1" aria-pressed={table} onClick={() => setTable(true)}>{t("Data table")}</button><button disabled={!root.parent_id} onClick={() => go(root.parent_id)}>{t("Parent group")}</button><button disabled={root.id === result.hierarchy.root_id} onClick={() => go(null)}>{t("Entire hierarchy")}</button></div>
      <p>{root.path.join(" / ") || root.label} · {measure.display_name}: {root.value}{unit && ` ${unit}`}</p>
      <details><summary>{t("Hierarchy population")}</summary><p>{t("Complete total: {0} · zero contributions: {1}", { 0: result.hierarchy.total ?? "—", 1: result.hierarchy.zero_count })}</p><p>{t("Areas use one additive measure. Zero values have no area; tiny areas may not be visible. Exact values and group navigation remain in the table.")}</p><p>{t("Share fractions refer to the complete total, including while exploring a group.")}</p></details>
    </div>
    {table ? <><div tabIndex={0} role="region" aria-label={tableLabel} className="min-h-0 min-w-0 flex-1 overflow-auto p-3"><table className="min-w-full text-sm"><caption className="sr-only">{tableLabel}</caption><thead><tr>{["Group", "Value", "Share of complete total", "Actions"].map((label, index) => <th scope="col" key={label} className={`p-2 ${index === 1 || index === 2 ? "text-right" : "text-left"}`}>{t(label)}</th>)}</tr></thead><tbody>{descendants.slice(safePage * 100, safePage * 100 + 100).map(node => <tr key={node.id}><th scope="row" className="border-t border-outline p-2 text-left font-normal">{node.label}</th><td className="border-t border-outline p-2 text-right tabular-nums">{node.value}</td><td className="border-t border-outline p-2 text-right tabular-nums">{node.share_exact ?? "—"}</td><td className="border-t border-outline p-2">{parents.has(node.id) && <button className="mr-3 underline" onClick={() => go(node.id)}>{t("Open group")}</button>}{onSelect && <button className="underline" onClick={() => onSelect(Object.fromEntries(result.columns.map(c => [c.column_id, node.row[c.engine_name]])))}>{t("Select")}</button>}</td></tr>)}</tbody></table>{!descendants.length && <p>{t("No rows to visualize.")}</p>}</div><div className="flex shrink-0 justify-between gap-2 p-2 text-xs"><button disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>{t("Previous page")}</button><span>{t("Total rows: {0} · page {1}", { 0: descendants.length, 1: safePage + 1 })}</span><button disabled={(safePage + 1) * 100 >= descendants.length} onClick={() => setPage(safePage + 1)}>{t("Next page")}</button></div></>
      : !descendants.length ? <p className="p-4">{t("No rows to visualize.")}</p>
      : !root.weight ? <p role="status" className="p-4 text-sm">{t(root.share_exact && root.share_exact !== "0" ? "This group is too small for the drawing scale. Inspect its exact values in the table." : "This group has zero total: no area can be drawn. Inspect the exact table.")}</p>
      : <div className="min-h-0 min-w-0 flex-1">{children(root.id)}</div>}
  </div>;
}
