"use client";

import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-provider";
import { themePalette, type Theme } from "@/lib/theme";
import { formatCell, nodeNames, numberLocale, parseDataDate, translate, type Locale } from "@/lib/locale";

import { useQuery } from "@tanstack/react-query";
import type { EChartsOption } from "echarts";
import { useEffect, useRef, useState } from "react";
import type { components } from "@/lib/api-schema";
import type { ParameterValues } from "@/features/workflow/types";
import { getVisualizationResult, type VisualizationResult } from "./api";

export function format(value: unknown, result: VisualizationResult, locale: Locale, type?: string, columnId?: string): string {
  const settings = (columnId && result.column_formats?.[columnId]) || result;
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.map((item, index) => index === 0
    ? formatCell(locale, item, result.columns.find(column => column.engine_name === result.category_field)?.logical_type)
    : format(item, result, locale)).join(" · ");
  if (typeof value !== "number") return formatCell(locale, value, type);
  try {
    return new Intl.NumberFormat(numberLocale[locale], {
      style: settings.number_format === "number" ? "decimal" : settings.number_format,
      currency: settings.currency, minimumFractionDigits: settings.decimals,
      maximumFractionDigits: settings.decimals,
    }).format(value);
  } catch { return value.toFixed(settings.decimals); }
}

export function isHighlighted(result: VisualizationResult, row: Record<string, unknown>): boolean {
  return !!result.highlight_field && result.highlight_value != null && row[result.highlight_field] === result.highlight_value;
}

export function chartOptions(result: VisualizationResult, locale: Locale = "ru", theme: Theme = "dark"): EChartsOption {
  const x = result.category_field!;
  const y = result.value_field!;
  const seriesName = result.columns.find(column => column.engine_name === y)?.metadata?.visualization_role === "value" ? translate(locale, "Value") : y;
  const hasHighlight = !!result.highlight_field && result.highlight_value != null;
  const highlightStyle = (row: Record<string, unknown>) => hasHighlight ? { itemStyle: { opacity: isHighlighted(result, row) ? 1 : 0.35, borderWidth: isHighlighted(result, row) ? 2 : 0, borderColor: themePalette[theme].accent } } : {};
  const point = (value: unknown, row: Record<string, unknown>) => hasHighlight ? { value, ...highlightStyle(row) } : value;
  const base: EChartsOption = {
    useUTC: true,
    backgroundColor: "transparent", aria: { enabled: true, label: { description: result.title || translate(locale, nodeNames[result.type]) } },
    tooltip: { trigger: "item", renderMode: "richText", valueFormatter: value => format(value, result, locale) },
    legend: { show: result.show_legend, bottom: 0, type: "scroll" },
  };
  if (["pie_chart", "donut_chart"].includes(result.type)) return {
    ...base, series: [{ type: "pie", radius: result.type === "donut_chart" ? ["40%", "65%"] : "65%",
      label: { show: result.show_labels },
      data: result.rows.map(row => ({ name: String(row[x] ?? translate(locale, "(empty)")), value: Number(row[y] ?? 0), ...highlightStyle(row) })),
    }],
  };
  if (result.type === "bar_chart" && result.orientation === "horizontal") return {
    ...base, grid: { left: "30%", right: 45, top: 25, bottom: 55 },
    xAxis: { type: "value", axisLabel: { formatter: value => format(value, result, locale) } },
    yAxis: { type: "category", inverse: true, data: result.rows.map(row => String(row[x] ?? "")),
      axisLabel: { width: 170, overflow: "truncate" } },
    series: [{ type: "bar", name: seriesName, data: result.rows.map(row => point(row[y], row)),
      itemStyle: { color: themePalette[theme].accent },
      label: { show: result.show_labels, position: "right", formatter: (parameters: { value?: unknown }) => format(parameters.value, result, locale) } }],
  } as EChartsOption;
  const xType = result.columns.find(c => c.engine_name === x)?.logical_type;
  const scatter = result.type === "scatter_chart";
  const line = ["line_chart", "area_chart"].includes(result.type);
  const temporal = line && ["date", "datetime"].includes(xType ?? "");
  const numeric = scatter || (line && ["integer", "float"].includes(xType ?? ""));
  const points = result.rows.map(row => temporal ? [row[x] == null ? null : parseDataDate(String(row[x])).valueOf(), row[y]] : numeric ? [row[x], row[y]] : row[y]);
  return {
    ...base, grid: { left: 70, right: 20, bottom: 65, top: 25 },
    xAxis: { type: temporal ? "time" : numeric ? "value" : "category",
      data: temporal || numeric ? undefined : result.rows.map(row => String(row[x] ?? translate(locale, "(empty)"))),
      axisLabel: { rotate: temporal || numeric ? 0 : 20,
        ...(temporal ? { formatter: (value: number) => new Intl.DateTimeFormat(numberLocale[locale], { dateStyle: "short", timeZone: "UTC" }).format(value) } : numeric ? { formatter: (value: number) => formatCell(locale, value) } : {}),
      },
    },
    yAxis: { type: "value", axisLabel: { formatter: value => format(value, result, locale) } },
    series: [{ type: scatter ? "scatter" : line ? "line" : "bar", name: seriesName,
      data: points.map((value, index) => point(value, result.rows[index])), itemStyle: { color: themePalette[theme].accent },
      label: { show: result.show_labels, position: "top", formatter: (parameters: { value?: unknown }) => format(Array.isArray(parameters.value) ? parameters.value[1] : parameters.value, result, locale) },
      ...(result.type === "area_chart" ? { areaStyle: { opacity: 0.3 } } : {}),
    }],
  } as EChartsOption;
}

function Chart({ result, onSelect }: { result: VisualizationResult; onSelect?: (row: Record<string, unknown>) => void }) {
  const { locale, errorText, nodeName } = useI18n();
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import("echarts").then(echarts => {
      if (disposed || !ref.current) return;
      const chart = echarts.init(ref.current, theme === "dark" ? "dark" : undefined);
      const observer = new ResizeObserver(() => chart.resize());
      cleanup = () => { observer.disconnect(); chart.dispose(); };
      chart.setOption(chartOptions(result, locale, theme));
      if (onSelect) chart.on("click", (event: unknown) => {
        const index = (event as { dataIndex?: number }).dataIndex;
        if (typeof index === "number" && result.rows[index]) onSelect(Object.fromEntries(result.columns.map(column => [column.column_id, result.rows[index][column.engine_name]])));
      });
      observer.observe(ref.current);
    }).catch(() => { if (!disposed) setError("The chart could not be rendered. Reload to retry."); });
    return () => { disposed = true; cleanup?.(); };
  }, [result, locale, theme, onSelect]);
  if (error) return <p role="alert" className="p-5 text-danger">{errorText(error)}</p>;
  return <div ref={ref} role="img" aria-label={result.title || nodeName(result.type)} className="h-full min-h-40 w-full" />;
}

function VisualizationPanel({ id, revision, titleOverride, hideTitle, parameters, context, onSelect }: { id: string; revision?: number; titleOverride?: string; hideTitle?: boolean; parameters?: ParameterValues; context?: components["schemas"]["ViewContext"]; onSelect?: (row: Record<string, unknown>) => void }) {
  const { t, errorText } = useI18n();
  const [offset, setOffset] = useState(0);
  const query = useQuery({ queryKey: ["visualization-result", id, revision, offset, parameters, context], queryFn: () => getVisualizationResult(id, offset, parameters, context), retry: false });
  if (query.isPending || query.isFetching) return <p className="p-5 text-sm text-muted">{t("Loading visualization…")}</p>;
  if (query.error) return <div className="p-5 text-sm text-danger" role="alert">{errorText(query.error)}<button onClick={() => void query.refetch()} className="mt-3 block underline">{t("Retry visualization")}</button></div>;
  return <VisualizationResultView result={query.data} titleOverride={titleOverride} hideTitle={hideTitle} onSelect={onSelect} offset={offset} setOffset={setOffset} />;
}

export function VisualizationResultView({ result, titleOverride, hideTitle, onSelect, offset = 0, setOffset }: { result: VisualizationResult; titleOverride?: string; hideTitle?: boolean; onSelect?: (row: Record<string, unknown>) => void; offset?: number; setOffset?: (value: number) => void }) {
  const { t, locale, cell } = useI18n();
  const visibleColumns = result.columns.filter(column => !result.context_column_ids?.includes(column.column_id));
  const selectRow = (row: Record<string, unknown>) => onSelect?.(Object.fromEntries(result.columns.map(column => [column.column_id, row[column.engine_name]])));
  return <div className="flex h-full min-h-0 flex-col">{!hideTitle ? <h3 className="px-4 pt-2 text-sm text-muted">{titleOverride ?? result.title}</h3> : null}
    {!!result.applied_context?.length && <details className="px-4 text-xs text-muted"><summary>{t("Applied view restrictions")}</summary>{[...new Set(result.applied_context)].map(label => <p key={label}>{label === "period" ? t("Applied period") : t("Applied selection")}</p>)}</details>}
    {result.unsupported_filters?.length ? <p role="status" className="px-4 text-sm text-warning">{t("Period is not connected to this visualization.")}</p> : null}
    {result.type === "table" ? <>
      <div className="min-h-0 flex-1 overflow-auto p-3"><table className="min-w-full text-xs"><thead><tr>{visibleColumns.map(column => <th key={column.column_id} className="border-b border-outline px-3 py-2 text-left">{column.display_name}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index} tabIndex={onSelect ? 0 : undefined} aria-selected={result.highlight_field ? isHighlighted(result, row) : undefined} className={`${onSelect ? "cursor-pointer hover:bg-accent/10" : ""} ${isHighlighted(result, row) ? "bg-accent/15 font-semibold" : ""}`} onClick={onSelect ? () => selectRow(row) : undefined} onKeyDown={onSelect ? event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectRow(row); } } : undefined}>{visibleColumns.map(column => <td key={column.column_id} className="border-b border-outline px-3 py-2 whitespace-nowrap">{format(row[column.engine_name], result, locale, column.logical_type, column.column_id)}</td>)}</tr>)}</tbody></table>{!result.rows.length ? <p className="mt-3 text-muted">{t("No rows on this page.")}</p> : null}</div>
      <div className="flex items-center justify-between gap-3 p-3 text-xs"><button disabled={offset === 0} onClick={() => setOffset?.(Math.max(0, offset - 100))} className="disabled:opacity-30">{t("Previous page")}</button><span>{t("Total rows: {0} · page {1}", { 0: cell(result.total_rows), 1: cell(Math.floor(offset / 100) + 1) })}</span><button disabled={!result.truncated} onClick={() => setOffset?.(offset + 100)} className="disabled:opacity-30">{t("Next page")}</button></div>
    </> : result.type === "kpi" ? <div className="grid flex-1 place-items-center p-5 text-4xl font-semibold text-accent" data-testid="kpi-value" role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined} onClick={onSelect ? () => result.rows[0] && selectRow(result.rows[0]) : undefined} onKeyDown={onSelect ? event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (result.rows[0]) selectRow(result.rows[0]); } } : undefined}>{result.rows[0]?.[result.value_field!] == null ? t("No value") : format(result.rows[0][result.value_field!], result, locale)}</div> : result.rows.length ? <div className="min-h-0 flex-1"><Chart result={result} onSelect={onSelect} /></div> : <p className="p-5 text-muted">{t("No rows to visualize.")}</p>}
  </div>;
}

export function VisualizationView(props: { id: string; revision?: number; titleOverride?: string; hideTitle?: boolean; parameters?: ParameterValues; context?: components["schemas"]["ViewContext"]; onSelect?: (row: Record<string, unknown>) => void }) {
  return <VisualizationPanel key={`${props.id}:${props.revision}:${JSON.stringify(props.parameters)}:${JSON.stringify(props.context)}`} {...props} />;
}
