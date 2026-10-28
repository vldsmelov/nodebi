"use client";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-provider";
import type { VisualizationResult } from "./api";
import { waterfallColors, waterfallField, waterfallKindLabels } from "./waterfall";

export function WaterfallView({ result, children, onSelect }: { result: VisualizationResult; children: ReactNode | ((window?: [number, number]) => ReactNode); onSelect?: (row: Record<string, unknown>) => void }) {
  const { t } = useI18n(), { theme } = useTheme();
  const [table, setTable] = useState(false), [page, setPage] = useState(0);
  const [chartPage, setChartPage] = useState<number | null>(null);
  const spec = result.spec;
  if (spec?.type !== "waterfall_chart" || !result.waterfall_scale) return <p role="alert">{t("The statistical field is unavailable. Reload the visualization.")}</p>;
  const field = (role: keyof typeof spec.steps) => waterfallField(result, spec.steps[role]);
  const roles = ["category", "kind", "value", "start", "end", "balance"] as const;
  const labels = ["Step", "Step type", "Contribution or total", "Bar start", "Bar end", "Running balance"];
  const colors = waterfallColors(theme), offset = Math.min(page * 100, Math.max(0, Math.floor((result.rows.length - 1) / 100) * 100));
  const unitMetadata = result.columns.find(column => column.column_id === spec.steps.value)?.metadata;
  const unit = [...new Set([unitMetadata?.unit, unitMetadata?.currency].filter(value => typeof value === "string" && value))].join(" · ");
  const first = Math.min((chartPage ?? 0) * 20, Math.max(0, Math.floor((result.rows.length - 1) / 20) * 20));
  const window: [number, number] | undefined = chartPage === null ? undefined : [first, Math.min(first + 19, result.rows.length - 1)];
  const tableLabel = [result.title, t("Chart data table")].filter(Boolean).join(" · ");
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
    <div className="flex flex-wrap gap-2 px-4 py-1 text-xs"><button className="rounded border border-outline px-2 py-1" aria-pressed={!table} onClick={() => setTable(false)}>{t("Chart")}</button><button className="rounded border border-outline px-2 py-1" aria-pressed={table} onClick={() => setTable(true)}>{t("Step table")}</button>{unit && <span>{unit}</span>}</div>
    <p className="px-4 text-xs text-muted">{t("Totals start at zero; contributions connect prepared balances. Zoom and table pages never recalculate them.")}</p>
    <p className="px-4 text-xs text-muted">{t("A dot marks a non-zero step smaller than a pixel; inspect its exact value.")}</p>
    {!table && result.rows.length > 20 && <div className="flex flex-wrap gap-3 px-4 py-1 text-xs"><button onClick={() => setChartPage(chartPage === null ? 0 : null)}>{t(chartPage === null ? "Show 20 steps" : "Show all steps")}</button>{window && <><button disabled={first === 0} onClick={() => setChartPage(Math.max(0, (chartPage ?? 0) - 1))}>{t("Previous steps")}</button><span>{t("Steps {0}–{1} of {2}", { 0: first + 1, 1: window[1] + 1, 2: result.rows.length })}</span><button disabled={window[1] === result.rows.length - 1} onClick={() => setChartPage((chartPage ?? 0) + 1)}>{t("Next steps")}</button></>}</div>}
    {result.show_legend && !table && <div className="flex flex-wrap gap-x-3 px-4 text-xs"><span style={{ color: colors.increase }}>{t("+ Increase")}</span><span style={{ color: colors.decrease }}>{t("− Decrease")}</span><span style={{ color: colors.total }}>{t("= Final total")}</span><span>{t("Outline: initial · dashed: subtotal · stroke: zero")}</span></div>}
    {!result.rows.length ? <p className="p-4">{t("No rows to visualize.")}</p> : table ? <><div tabIndex={0} role="region" aria-label={tableLabel} className="min-h-0 min-w-0 flex-1 overflow-auto p-3"><table className="min-w-full text-sm"><caption className="sr-only">{tableLabel}</caption><thead><tr>{labels.map((label, index) => <th scope="col" key={label} className={`p-2 ${index > 1 ? "text-right" : "text-left"}`}>{t(label)}</th>)}{onSelect && <th scope="col">{t("Selection")}</th>}</tr></thead><tbody>{result.rows.slice(offset, offset + 100).map(row => <tr key={String(row[field("step_id")])}>{roles.map(role => <td className={`border-t border-outline p-2 ${["category", "kind"].includes(role) ? "" : "text-right tabular-nums"}`} key={role}>{role === "kind" ? t(waterfallKindLabels[String(row[field(role)])] ?? String(row[field(role)])) : String(row[field(role)])}</td>)}{onSelect && <td><button className="rounded border border-outline px-2 py-1" onClick={() => onSelect(Object.fromEntries(result.columns.map(column => [column.column_id, row[column.engine_name]])))}>{t("Select")}</button></td>}</tr>)}</tbody></table></div><div className="flex justify-between gap-2 px-4 py-1 text-xs"><button disabled={offset === 0} onClick={() => setPage(Math.max(0, page - 1))}>{t("Previous")}</button><span>{t("Steps {0}–{1} of {2}", { 0: offset + 1, 1: Math.min(offset + 100, result.rows.length), 2: result.rows.length })}</span><button disabled={offset + 100 >= result.rows.length} onClick={() => setPage(page + 1)}>{t("Next")}</button></div></>
      : <div className="min-h-24 flex-1">{typeof children === "function" ? children(window) : children}</div>}
  </div>;
}
