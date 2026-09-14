"use client";

import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-provider";
import { themePalette, type Theme } from "@/lib/theme";
import { formatCell, nodeNames, numberLocale, parseDataDate, translate, type Locale } from "@/lib/locale";

import { useQuery } from "@tanstack/react-query";
import type { EChartsOption } from "echarts";
import { useEffect, useRef, useState } from "react";
import { getVisualizationResult, type VisualizationResult } from "./api";

function format(value: unknown, result: VisualizationResult, locale: Locale, type?: string): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.map((item, index) => index === 0
    ? formatCell(locale, item, result.columns.find(column => column.engine_name === result.category_field)?.logical_type)
    : format(item, result, locale)).join(" · ");
  if (typeof value !== "number") return formatCell(locale, value, type);
  try {
    return new Intl.NumberFormat(numberLocale[locale], {
      style: result.number_format === "number" ? "decimal" : result.number_format,
      currency: result.currency, minimumFractionDigits: result.decimals,
      maximumFractionDigits: result.decimals,
    }).format(value);
  } catch { return value.toFixed(result.decimals); }
}

export function chartOptions(result: VisualizationResult, locale: Locale = "ru", theme: Theme = "dark"): EChartsOption {
  const x = result.category_field!;
  const y = result.value_field!;
  const base: EChartsOption = {
    useUTC: true,
    backgroundColor: "transparent", aria: { enabled: true, label: { description: result.title || translate(locale, nodeNames[result.type]) } },
    tooltip: { trigger: "item", renderMode: "richText", valueFormatter: value => format(value, result, locale) },
    legend: { show: result.show_legend, bottom: 0, type: "scroll" },
  };
  if (["pie_chart", "donut_chart"].includes(result.type)) return {
    ...base, series: [{ type: "pie", radius: result.type === "donut_chart" ? ["40%", "65%"] : "65%",
      label: { show: result.show_labels },
      data: result.rows.map(row => ({ name: String(row[x] ?? translate(locale, "(empty)")), value: Number(row[y] ?? 0) })),
    }],
  };
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
    series: [{ type: scatter ? "scatter" : line ? "line" : "bar", name: y,
      data: points, itemStyle: { color: themePalette[theme].accent },
      label: { show: result.show_labels, position: "top", formatter: (parameters: { value?: unknown }) => format(Array.isArray(parameters.value) ? parameters.value[1] : parameters.value, result, locale) },
      ...(result.type === "area_chart" ? { areaStyle: { opacity: 0.3 } } : {}),
    }],
  } as EChartsOption;
}

function Chart({ result }: { result: VisualizationResult }) {
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
      observer.observe(ref.current);
    }).catch(() => { if (!disposed) setError("The chart could not be rendered. Reload to retry."); });
    return () => { disposed = true; cleanup?.(); };
  }, [result, locale, theme]);
  if (error) return <p role="alert" className="p-5 text-danger">{errorText(error)}</p>;
  return <div ref={ref} role="img" aria-label={result.title || nodeName(result.type)} className="h-full min-h-40 w-full" />;
}

function VisualizationPanel({ id, revision, titleOverride, hideTitle }: { id: string; revision?: number; titleOverride?: string; hideTitle?: boolean }) {
  const { t, errorText, locale, cell } = useI18n();
  const [offset, setOffset] = useState(0);
  const query = useQuery({ queryKey: ["visualization-result", id, revision, offset], queryFn: () => getVisualizationResult(id, offset), retry: false });
  if (query.isPending) return <p className="p-5 text-sm text-muted">{t("Loading visualization…")}</p>;
  if (query.error) return <div className="p-5 text-sm text-danger" role="alert">{errorText(query.error)}<button onClick={() => void query.refetch()} className="mt-3 block underline">{t("Retry visualization")}</button></div>;
  const result = query.data;
  return <div className="flex h-full min-h-0 flex-col">{!hideTitle ? <h3 className="px-4 pt-2 text-sm text-muted">{titleOverride ?? result.title}</h3> : null}
    {result.type === "table" ? <>
      <div className="min-h-0 flex-1 overflow-auto p-3"><table className="min-w-full text-xs"><thead><tr>{result.columns.map(column => <th key={column.column_id} className="border-b border-outline px-3 py-2 text-left">{column.display_name}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index}>{result.columns.map(column => <td key={column.column_id} className="border-b border-outline px-3 py-2 whitespace-nowrap">{format(row[column.engine_name], result, locale, column.logical_type)}</td>)}</tr>)}</tbody></table>{!result.rows.length ? <p className="mt-3 text-muted">{t("No rows on this page.")}</p> : null}</div>
      <div className="flex items-center justify-between gap-3 p-3 text-xs"><button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 100))} className="disabled:opacity-30">{t("Previous page")}</button><span>{t("Total rows: {0} · page {1}", { 0: cell(result.total_rows), 1: cell(Math.floor(offset / 100) + 1) })}</span><button disabled={!result.truncated} onClick={() => setOffset(offset + 100)} className="disabled:opacity-30">{t("Next page")}</button></div>
    </> : result.type === "kpi" ? <div className="grid flex-1 place-items-center p-5 text-4xl font-semibold text-accent" data-testid="kpi-value">{result.rows[0]?.[result.value_field!] == null ? t("No value") : format(result.rows[0][result.value_field!], result, locale)}</div> : result.rows.length ? <div className="min-h-0 flex-1"><Chart result={result} /></div> : <p className="p-5 text-muted">{t("No rows to visualize.")}</p>}
  </div>;
}

export function VisualizationView(props: { id: string; revision?: number; titleOverride?: string; hideTitle?: boolean }) {
  return <VisualizationPanel key={`${props.id}:${props.revision}`} {...props} />;
}
