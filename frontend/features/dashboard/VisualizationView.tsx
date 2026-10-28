"use client";

import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-provider";
import { themePalette, type Theme } from "@/lib/theme";
import { formatCell, nodeNames, numberLocale, parseDataDate, translate, type Locale } from "@/lib/locale";
import { formatExactNumber } from "@/lib/exact-number-format";
import { basicBindings } from "./basic-bindings";
import { basicTooltip } from "./basic-tooltip";
import { basicPatternCount, basicSeriesColors, basicSeriesCue } from "./basic-series-cues";
import { pieCategories, pieCategoryName } from "./pie-categories";
import { chartLegend, type LegendEntry } from "./chart-legend";
import { ChartLegend } from "./ChartLegend";

import { useQuery } from "@tanstack/react-query";
import type { EChartsOption } from "echarts";
import { useEffect, useRef, useState } from "react";
import type { components } from "@/lib/api-schema";
import type { ParameterValues } from "@/features/workflow/types";
import { getVisualizationResult, type VisualizationResult } from "./api";
import { boxPlotOptions, boxPlotSelection } from "./box-plot";
import { BoxPlotView } from "./BoxPlotView";
import { HistogramView } from "./HistogramView";
import { histogramOptions, histogramSelection } from "./histogram";
import { heatmapOptions, heatmapSelection } from "./heatmap";
import { HeatmapView } from "./HeatmapView";
import { RadarView } from "./RadarView";
import { radarOptions, radarSelection } from "./radar";
import { waterfallOptions, waterfallSelection } from "./waterfall";
import { WaterfallView } from "./WaterfallView";
import { ComboView } from "./ComboView";
import { BubbleView } from "./BubbleView";
import { BulletView } from "./BulletView";
import { FunnelView } from "./FunnelView";
import { funnelOptions, funnelSelection } from "./funnel";
import { bulletOptions, bulletSelection } from "./bullet";
import { ParetoView } from "./ParetoView";
import { HierarchyView } from "./HierarchyView";
import { hierarchyOptions, hierarchySelection } from "./hierarchy";
import { paretoOptions } from "./pareto";
import { bubbleOptions, bubbleSelection } from "./bubble";
import { AnalyticalTableView } from "./AnalyticalTableView";
import { comboOptions, comboSelection } from "./combo";
import { LegacyChartView } from "./LegacyChartView";
import { legacyAxisLayout, legacyCartesian, type ChartSize } from "./legacy-chart-layout";

export function format(value: unknown, result: VisualizationResult, locale: Locale, type?: string, columnId?: string): string {
  const settings = (columnId && result.column_formats?.[columnId]) || result;
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.map((item, index) => index === 0
    ? formatCell(locale, item, result.columns.find(column => column.engine_name === result.category_field)?.logical_type)
    : format(item, result, locale)).join(" · ");
  const valueType = type ?? result.columns.find(column => column.engine_name === result.value_field)?.logical_type;
  if (result.type === "kpi" && typeof value === "string" && ["integer", "decimal"].includes(valueType ?? "")) {
    return formatExactNumber(value, settings, locale) ?? formatCell(locale, value, valueType);
  }
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

export function chartOptions(result: VisualizationResult, locale: Locale = "ru", theme: Theme = "dark", waterfallWindow?: [number, number], size?: ChartSize): EChartsOption {
  if (result.type === "funnel_chart") return funnelOptions(result, locale, theme);
  if (result.type === "bullet_chart") return bulletOptions(result, locale, theme, waterfallWindow);
  if (result.type === "treemap_chart" || result.type === "sunburst_chart") return hierarchyOptions(result, locale, theme);
  if (result.type === "pareto_chart") return paretoOptions(result, locale, theme);
  if (result.type === "bubble_chart") return bubbleOptions(result, locale, theme, size);
  if (result.type === "combo_chart") return comboOptions(result, locale, theme, waterfallWindow);
  if (result.type === "waterfall_chart") return waterfallOptions(result, locale, theme, waterfallWindow);
  if (result.type === "radar_chart") return radarOptions(result, locale, theme);
  if (result.type === "heatmap_chart") return heatmapOptions(result, locale, theme);
  if (result.type === "histogram_chart") return histogramOptions(result, locale, theme);
  if (result.type === "box_plot") return boxPlotOptions(result, locale, theme, value => format(value, result, locale));
  if (result.additional_series?.length && ["bar_chart", "line_chart"].includes(result.type)) {
    const first = chartOptions({ ...result, additional_series: [] }, locale, theme, undefined, size);
    const colors = basicSeriesColors(theme);
    const ids = [result.value_field!, ...result.additional_series.map(item => item.field)]
      .map(field => result.columns.find(column => column.engine_name === field)?.column_id ?? field);
    const sortedIds = [...ids].sort();
    const series = [first.series, ...result.additional_series.map(item => {
      const option = chartOptions({ ...result, value_field: item.field, additional_series: [] }, locale, theme, undefined, size);
      return (Array.isArray(option.series) ? option.series : [option.series]).map(value => ({ ...value, name: item.name }));
    })].flat().filter(Boolean).map((value, index) => {
      const cue = basicSeriesCue(result.type, sortedIds.indexOf(ids[index]), theme);
      // Legacy configs may repeat a field under different display names.
      const id = JSON.stringify([ids[index], ids.slice(0, index).filter(field => field === ids[index]).length]);
      return { ...value, ...cue, id, itemStyle: { ...cue.itemStyle, color: colors[index] } };
    });
    return { ...first, series, tooltip: basicTooltip(result, locale, (value, type, id) => format(value, result, locale, type, id)) } as EChartsOption;
  }
  const x = result.category_field!;
  const y = result.value_field!;
  const typedSeries = result.spec && ["bar_chart", "line_chart", "area_chart"].includes(result.spec.type ?? "") && "y" in result.spec && Array.isArray(result.spec.y) ? result.spec.y : [];
  const valueId = result.columns.find(column => column.engine_name === y)?.column_id;
  const seriesName = typedSeries.find(series => series.column_id === valueId)?.name || (result.columns.find(column => column.engine_name === y)?.metadata?.visualization_role === "value" ? translate(locale, "Value") : y);
  const hasHighlight = !!result.highlight_field && result.highlight_value != null;
  const highlightStyle = (row: Record<string, unknown>) => hasHighlight ? { itemStyle: { opacity: isHighlighted(result, row) ? 1 : 0.35, borderWidth: isHighlighted(result, row) ? 2 : 0, borderColor: themePalette[theme].accent } } : {};
  const point = (value: unknown, row: Record<string, unknown>) => hasHighlight ? { value, ...highlightStyle(row) } : value;
  const labelInk = { opacity: 1, color: theme === "dark" ? "#d7dfef" : "#34415b", backgroundColor: theme === "dark" ? "#1c2738" : "#ffffff", padding: 1 };
  const layout = legacyAxisLayout(result, locale, size);
  const base: EChartsOption = {
    useUTC: true,
    backgroundColor: "transparent", aria: { enabled: true, label: { description: result.title || translate(locale, nodeNames[result.type]) } },
    tooltip: basicTooltip(result, locale, (value, type, id) => format(value, result, locale, type, id)),
    legend: { show: result.show_legend, bottom: 0, type: "scroll" },
  };
  if (["pie_chart", "donut_chart"].includes(result.type)) {
    const colors = basicSeriesColors(theme);
    const cues = new Map(pieCategories(result, locale).map((name, index) => [name, {
      ...basicSeriesCue("bar_chart", index % basicPatternCount, theme).itemStyle,
      color: colors[index % colors.length], borderColor: themePalette[theme].panel, borderWidth: 2,
    }]));
    return {
      ...base, series: [{ type: "pie", radius: result.type === "donut_chart" ? ["40%", "65%"] : "65%",
        stillShowZeroSum: false, showEmptyCircle: false,
        label: { ...labelInk, show: result.show_labels },
        data: result.rows.map(row => {
          const name = pieCategoryName(row[x], locale);
          return { name, value: row[y] == null ? "-" : Number(row[y]), itemStyle: { ...cues.get(name), ...(hasHighlight ? { opacity: isHighlighted(result, row) ? 1 : 0.35 } : {}) },
            emphasis: { itemStyle: { color: cues.get(name)?.color } } };
        }),
      }],
    };
  }
  if (result.type === "bar_chart" && result.orientation === "horizontal") return {
    ...base, grid: layout.grid,
    xAxis: { ...layout.xAxis, type: "value" },
    yAxis: { type: "category", inverse: true, data: result.rows.map(row => String(row[x] ?? "")),
      axisLabel: layout.yAxis.axisLabel },
    series: [{ type: "bar", name: seriesName, data: result.rows.map(row => point(row[y], row)),
      itemStyle: { color: themePalette[theme].accent },
      labelLayout: { hideOverlap: true }, label: { ...labelInk, show: result.show_labels, position: "right", formatter: (parameters: { value?: unknown }) => format(parameters.value, result, locale) } }],
  } as EChartsOption;
  const xType = result.columns.find(c => c.engine_name === x)?.logical_type;
  const scatter = result.type === "scatter_chart";
  const line = ["line_chart", "area_chart"].includes(result.type);
  const temporal = line && ["date", "datetime"].includes(xType ?? "");
  const numeric = scatter || (line && ["integer", "float"].includes(xType ?? ""));
  const points = result.rows.map(row => temporal ? [row[x] == null ? null : parseDataDate(String(row[x])).valueOf(), row[y]] : numeric ? [row[x], row[y]] : row[y]);
  return {
    ...base, grid: layout.grid,
    xAxis: { ...layout.xAxis, type: temporal ? "time" : numeric ? "value" : "category",
      data: temporal || numeric ? undefined : result.rows.map(row => String(row[x] ?? translate(locale, "(empty)"))),
      axisLabel: { rotate: temporal || numeric ? 0 : 20,
        ...(temporal ? { formatter: (value: number) => new Intl.DateTimeFormat(numberLocale[locale], { dateStyle: "short", timeZone: "UTC" }).format(value) } : numeric ? { formatter: (value: number) => formatCell(locale, value) } : {}),
        ...layout.xAxis.axisLabel,
      },
    },
    yAxis: { ...layout.yAxis, type: "value" },
    series: [{ type: scatter ? "scatter" : line ? "line" : "bar", name: seriesName,
      ...(line ? { connectNulls: false } : {}),
      data: points.map((value, index) => point(value, result.rows[index])), itemStyle: { color: themePalette[theme].accent },
      labelLayout: { hideOverlap: true }, label: { ...labelInk, show: result.show_labels, position: "top", formatter: (parameters: { value?: unknown }) => format(Array.isArray(parameters.value) ? parameters.value[1] : parameters.value, result, locale) },
      ...(result.type === "area_chart" ? { areaStyle: { opacity: 0.3 } } : {}),
    }],
  } as EChartsOption;
}

function Chart({ result, onSelect, waterfallWindow }: { waterfallWindow?: [number, number]; result: VisualizationResult; onSelect?: (row: Record<string, unknown>) => void }) {
  const { locale, t, nodeName } = useI18n();
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const focusAfterRetry = useRef(false);
  const [failure, setFailure] = useState<{ result: VisualizationResult; locale: Locale; theme: Theme; window?: [number, number] } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [legend, setLegend] = useState<{ result: VisualizationResult; locale: Locale; theme: Theme; window?: [number, number]; entries: LegendEntry[] } | null>(null);
  const toggleLegend = useRef<((name: string) => void) | null>(null);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import("echarts").then(echarts => {
      if (disposed || !ref.current) return;
      const chart = echarts.init(ref.current, theme === "dark" ? "dark" : undefined);
      cleanup = () => chart.dispose();
      let width = ref.current.clientWidth, height = ref.current.clientHeight;
      const observer = new ResizeObserver(() => {
        if (!ref.current || disposed || ref.current.clientWidth === width && ref.current.clientHeight === height) return;
        width = ref.current.clientWidth; height = ref.current.clientHeight;
        chart.resize();
        if (legacyCartesian.has(result.type)) chart.setOption(legacyAxisLayout(result, locale, { width, height }));
        if (result.type === "bubble_chart") chart.setOption(bubbleOptions(result, locale, theme, { width, height }));
      });
      cleanup = () => { observer.disconnect(); chart.dispose(); };
      const options = chartOptions(result, locale, theme, waterfallWindow, { width, height });
      chart.setOption({ ...options, textStyle: { fontFamily: "Alabuga Sans, Arial, sans-serif", ...options.textStyle } });
      setLegend({ result, locale, theme, window: waterfallWindow, entries: chartLegend(options) });
      toggleLegend.current = name => { if (!disposed) chart.dispatchAction({ type: "legendToggleSelect", name }); };
      chart.on("legendselectchanged", (event: unknown) => {
        const selected = (event as { selected?: Record<string, boolean> }).selected;
        if (!disposed && selected) setLegend(current => current?.result === result ? { ...current, entries: current.entries.map(entry => ({ ...entry, selected: selected[entry.name] !== false })) } : current);
      });
      if (onSelect) chart.on("click", (event: unknown) => {
        if (result.type === "funnel_chart") {
          const row = funnelSelection(result, event);
          if (row) onSelect(Object.fromEntries(result.columns.map(column => [column.column_id, row[column.engine_name]])));
          return;
        }
        if (result.type === "bullet_chart") {
          const row = bulletSelection(result, event);
          if (row) onSelect(Object.fromEntries(result.columns.map(column => [column.column_id, row[column.engine_name]])));
          return;
        }
        if (result.hierarchy) {
          const row = hierarchySelection(result, event);
          if (row) onSelect(Object.fromEntries(result.columns.map(column => [column.column_id, row[column.engine_name]])));
          return;
        }
        if (result.type === "bubble_chart") {
          const row = bubbleSelection(result, event);
          if (row) onSelect(Object.fromEntries(result.columns.map(column => [column.column_id, row[column.engine_name]])));
          return;
        }
        if (result.type === "combo_chart" || result.type === "pareto_chart") {
          const row = comboSelection(result, event);
          if (row) onSelect(Object.fromEntries(result.columns.map(column => [column.column_id, row[column.engine_name]])));
          return;
        }
        if (result.type === "waterfall_chart") {
          const row = waterfallSelection(result, event);
          if (row) onSelect(Object.fromEntries(result.columns.map(column => [column.column_id, row[column.engine_name]])));
          return;
        }
        if (result.type === "radar_chart") {
          const row = radarSelection(result, event);
          if (row) onSelect(Object.fromEntries(result.columns.map(column => [column.column_id, row[column.engine_name]])));
          return;
        }
        if (result.type === "heatmap_chart") {
          const row = heatmapSelection(result, event);
          if (row) onSelect(Object.fromEntries(result.columns.map(column => [column.column_id, row[column.engine_name]])));
          return;
        }
        if (result.type === "histogram_chart") {
          const row = histogramSelection(result, event);
          if (row) onSelect(Object.fromEntries(result.columns.map(column => [column.column_id, row[column.engine_name]])));
          return;
        }
        if (result.type === "box_plot") {
          const row = boxPlotSelection(result, event);
          if (row) onSelect(Object.fromEntries(result.columns.map(column => [column.column_id, row[column.engine_name]])));
          return;
        }
        const index = (event as { dataIndex?: number }).dataIndex;
        if (typeof index === "number" && result.rows[index]) onSelect(Object.fromEntries(result.columns.map(column => [column.column_id, result.rows[index][column.engine_name]])));
      });
      observer.observe(ref.current);
      setFailure(null);
      if (focusAfterRetry.current) {
        focusAfterRetry.current = false;
        ref.current.focus({ preventScroll: true });
      }
    }).catch(() => {
      cleanup?.(); cleanup = undefined;
      toggleLegend.current = null;
      focusAfterRetry.current = false;
      if (!disposed) setFailure({ result, locale, theme, window: waterfallWindow });
    });
    return () => { disposed = true; toggleLegend.current = null; cleanup?.(); cleanup = undefined; };
  }, [result, locale, theme, onSelect, waterfallWindow, attempt]);
  if (failure?.result === result && failure.locale === locale && failure.theme === theme && failure.window === waterfallWindow) return <div role="alert" className="p-5 text-danger">
    <p>{t("The chart could not be rendered. Retry the chart or inspect the data table.")}</p>
    <button className="mt-3 min-h-8 rounded border border-outline px-3 text-foreground" onClick={() => { focusAfterRetry.current = true; setFailure(null); setAttempt(value => value + 1); }}>{t("Retry chart")}</button>
  </div>;
  const entries = legend?.result === result && legend.locale === locale && legend.theme === theme && legend.window === waterfallWindow ? legend.entries : [];
  return <div className={`flex h-full flex-col ${result.hierarchy || result.type === "bullet_chart" || result.type === "pareto_chart" ? "min-h-0" : ["heatmap_chart", "waterfall_chart"].includes(result.type) ? "min-h-24" : "min-h-40"} w-full`}>
    {!!entries.length && <ChartLegend title={result.title || nodeName(result.type)} entries={entries} onToggle={name => toggleLegend.current?.(name)} />}
    <div ref={ref} tabIndex={-1} role="img" aria-label={result.title || nodeName(result.type)} className="min-h-0 w-full flex-1" />
  </div>;
}

function VisualizationPanel({ id, revision, titleOverride, hideTitle, parameters, context, onSelect }: { id: string; revision?: number; titleOverride?: string; hideTitle?: boolean; parameters?: ParameterValues; context?: components["schemas"]["ViewContext"]; onSelect?: (row: Record<string, unknown>) => void }) {
  const { t, errorText } = useI18n();
  const [offset, setOffset] = useState(0);
  const query = useQuery({ queryKey: ["visualization-result", id, revision, offset, parameters, context], queryFn: () => getVisualizationResult(id, offset, parameters, context), retry: false, placeholderData: previous => previous });
  if (query.isPending) return <p role="status" className="p-5 text-sm text-muted">{t("Loading visualization…")}</p>;
  if (query.error) return <div className="p-5 text-sm text-danger" role="alert">{errorText(query.error)}<button onClick={() => void query.refetch()} className="mt-3 block underline">{t("Retry visualization")}</button></div>;
  const awaitingResult = query.isFetching || query.isPlaceholderData;
  return <div className="flex h-full min-h-0 min-w-0 flex-col">{awaitingResult && <p role="status" className="shrink-0 border-b border-outline bg-panel px-3 py-2 text-sm text-warning">{t("Showing previous result. Waiting for updated data.")}</p>}<div className="min-h-0 flex-1"><VisualizationResultView result={query.data} titleOverride={titleOverride} hideTitle={hideTitle} onSelect={awaitingResult ? undefined : onSelect} offset={query.data.offset} setOffset={awaitingResult ? undefined : setOffset} /></div></div>;
}

export function VisualizationResultView(props: Parameters<typeof PreparedVisualizationResultView>[0]) {
  const { errorText } = useI18n();
  let result: VisualizationResult;
  try { result = basicBindings(props.result); }
  catch (error) { return <p role="alert" className="p-5 text-danger">{errorText(error)}</p>; }
  return <PreparedVisualizationResultView {...props} result={result} />;
}

function PreparedVisualizationResultView({ result, titleOverride, hideTitle, onSelect, offset = 0, setOffset }: { result: VisualizationResult; titleOverride?: string; hideTitle?: boolean; onSelect?: (row: Record<string, unknown>) => void; offset?: number; setOffset?: (value: number) => void }) {
  const { t, locale, cell } = useI18n();
  const visibleColumns = result.columns.filter(column => !result.context_column_ids?.includes(column.column_id));
  const tableLabel = [titleOverride ?? result.title, t("Chart data table")].filter(Boolean).join(" · ");
  const selectRow = (row: Record<string, unknown>) => onSelect?.(Object.fromEntries(result.columns.map(column => [column.column_id, row[column.engine_name]])));
  return <div className="flex h-full min-h-0 min-w-0 flex-col">{!hideTitle ? <h3 className="px-4 pt-2 text-sm text-muted">{titleOverride ?? result.title}</h3> : null}
    {!!result.applied_context?.length && <details className="px-4 text-xs text-muted"><summary>{t("Applied view restrictions")}</summary>{[...new Set(result.applied_context)].map(label => <p key={label}>{label === "period" ? t("Applied period") : t("Applied selection")}</p>)}</details>}
    {result.unsupported_filters?.length ? <p role="status" className="px-4 text-sm text-warning">{t("Period is not connected to this visualization.")}</p> : null}
    {result.type === "funnel_chart" ? <FunnelView result={result} onSelect={onSelect}><Chart result={result} onSelect={onSelect} /></FunnelView> : result.type === "bullet_chart" ? <BulletView result={result} setOffset={setOffset} onSelect={onSelect}>{window => <Chart result={result} onSelect={onSelect} waterfallWindow={window} />}</BulletView> : result.hierarchy ? <HierarchyView result={result} onSelect={onSelect}>{root => <Chart result={{ ...result, hierarchy: { ...result.hierarchy!, root_id: root } }} onSelect={onSelect} />}</HierarchyView> : result.type === "pareto_chart" ? <ParetoView result={result} setOffset={setOffset} onSelect={onSelect}><Chart result={result} onSelect={onSelect} /></ParetoView> : result.type === "bubble_chart" ? <BubbleView result={result} setOffset={setOffset} onSelect={onSelect}><Chart result={result} onSelect={onSelect} /></BubbleView> : result.type === "analytical_table" ? <AnalyticalTableView result={result} setOffset={setOffset} onSelect={onSelect} /> : result.type === "combo_chart" ? <ComboView result={result} onSelect={onSelect}>{window => <Chart result={result} onSelect={onSelect} waterfallWindow={window} />}</ComboView> : result.type === "waterfall_chart" ? <WaterfallView result={result} onSelect={onSelect}>{window => <Chart result={result} onSelect={onSelect} waterfallWindow={window} />}</WaterfallView> : result.type === "radar_chart" ? <RadarView result={result} onSelect={onSelect}><Chart result={result} onSelect={onSelect} /></RadarView> : result.type === "heatmap_chart" ? <HeatmapView result={result} onSelect={onSelect}><Chart result={result} onSelect={onSelect} /></HeatmapView> : result.type === "histogram_chart" ? <HistogramView result={result} onSelect={onSelect}><Chart result={result} onSelect={onSelect} /></HistogramView> : result.type === "box_plot" ? <BoxPlotView result={result} setOffset={setOffset} onSelect={onSelect}><Chart result={result} onSelect={onSelect} /></BoxPlotView> : result.type === "table" ? <>
      <div tabIndex={0} role="region" aria-label={tableLabel} className="min-h-0 min-w-0 flex-1 overflow-auto p-3"><table className="min-w-full text-sm"><caption className="sr-only">{tableLabel}</caption><thead><tr>{visibleColumns.map(column => <th scope="col" key={column.column_id} className={`border-b border-outline px-3 py-2 ${["integer", "float", "decimal"].includes(column.logical_type) ? "text-right" : "text-left"}`}>{column.display_name}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index} tabIndex={onSelect ? 0 : undefined} aria-selected={result.highlight_field ? isHighlighted(result, row) : undefined} className={`${onSelect ? "cursor-pointer hover:bg-accent/10" : ""} ${isHighlighted(result, row) ? "bg-accent/15 font-semibold" : ""}`} onClick={onSelect ? () => selectRow(row) : undefined} onKeyDown={onSelect ? event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectRow(row); } } : undefined}>{visibleColumns.map(column => <td key={column.column_id} className={`border-b border-outline px-3 py-2 whitespace-nowrap ${["integer", "float", "decimal"].includes(column.logical_type) ? "text-right tabular-nums" : "text-left"}`}>{format(row[column.engine_name], result, locale, column.logical_type, column.column_id)}</td>)}</tr>)}</tbody></table>{!result.rows.length ? <p className="mt-3 text-muted">{t("No rows on this page.")}</p> : null}</div>
      <div className="flex items-center justify-between gap-3 p-3 text-xs"><button disabled={!setOffset || offset === 0} onClick={() => setOffset?.(Math.max(0, offset - 100))} className="disabled:opacity-30">{t("Previous page")}</button><span>{t("Total rows: {0} · page {1}", { 0: cell(result.total_rows), 1: cell(Math.floor(offset / 100) + 1) })}</span><button disabled={!setOffset || !result.truncated} onClick={() => setOffset?.(offset + 100)} className="disabled:opacity-30">{t("Next page")}</button></div>
    </> : result.type === "kpi" ? <div className="grid flex-1 place-items-center p-5 text-4xl font-semibold text-accent" data-testid="kpi-value" role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined} onClick={onSelect ? () => result.rows[0] && selectRow(result.rows[0]) : undefined} onKeyDown={onSelect ? event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (result.rows[0]) selectRow(result.rows[0]); } } : undefined}>{result.rows[0]?.[result.value_field!] == null ? t("No value") : format(result.rows[0][result.value_field!], result, locale)}</div> : <LegacyChartView result={result} onSelect={onSelect}><Chart result={result} onSelect={onSelect} /></LegacyChartView>}
  </div>;
}

export function VisualizationView(props: { id: string; revision?: number; titleOverride?: string; hideTitle?: boolean; parameters?: ParameterValues; context?: components["schemas"]["ViewContext"]; onSelect?: (row: Record<string, unknown>) => void }) {
  return <VisualizationPanel key={`${props.id}:${props.revision}:${JSON.stringify(props.parameters)}:${JSON.stringify(props.context)}`} {...props} />;
}
