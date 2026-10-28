import type { EChartsOption } from "echarts";
import { numberLocale, type Locale } from "@/lib/locale";
import type { VisualizationResult } from "./api";

export type ChartSize = { width: number; height: number };
export const legacyCartesian = new Set(["bar_chart", "line_chart", "area_chart", "scatter_chart"]);

/** Tick labels are presentation-only; series, exact tooltips and source rows are never rounded here. */
export function axisTick(value: number, locale: Locale, settings?: VisualizationResult): string {
  if (!Number.isFinite(value)) return "";
  const magnitude = Math.abs(value * (settings?.number_format === "percent" ? 100 : 1));
  const notation = magnitude >= 1e6 ? "compact" : magnitude > 0 && magnitude < 0.001 ? "scientific" : "standard";
  const options: Intl.NumberFormatOptions = { notation, maximumSignificantDigits: 6,
    ...(settings ? { style: settings.number_format === "number" ? "decimal" : settings.number_format, currency: settings.currency, currencyDisplay: "narrowSymbol" } : {}) };
  try { return new Intl.NumberFormat(numberLocale[locale], options).format(value); }
  catch { return new Intl.NumberFormat(numberLocale[locale], { notation, maximumSignificantDigits: 6 }).format(value); }
}

/** This patch deliberately contains no data, axis bounds, interval or series configuration. */
export function legacyAxisLayout(result: VisualizationResult, locale: Locale, size: ChartSize = { width: 800, height: 400 }) {
  const width = Math.max(1, size.width), height = Math.max(1, size.height);
  const horizontal = result.type === "bar_chart" && result.orientation === "horizontal";
  const xType = result.columns.find(c => c.engine_name === result.category_field)?.logical_type;
  const temporal = ["line_chart", "area_chart"].includes(result.type) && ["date", "datetime"].includes(xType ?? "");
  const numericX = result.type === "scatter_chart" || ["line_chart", "area_chart"].includes(result.type) && ["integer", "float"].includes(xType ?? "");
  const left = horizontal ? Math.min(150, Math.max(48, width * 0.3)) : Math.min(100, Math.max(48, width * 0.22));
  const right = result.show_labels ? 40 : 20;
  const bottom = result.show_legend ? 65 : 42;
  const xTicks = Math.max(2, Math.min(6, Math.floor((width - left - right) / 95)));
  const yTicks = Math.max(2, Math.min(6, Math.floor((height - bottom - 25) / 42)));
  return {
    grid: { left, right, top: 25, bottom },
    xAxis: { splitNumber: xTicks, axisLabel: { hideOverlap: true,
      ...(horizontal ? { formatter: (v: number) => axisTick(v, locale, result) }
        : numericX ? { formatter: (v: number) => axisTick(v, locale) }
        : temporal ? {} : { rotate: 0, width: Math.min(110, Math.max(40, (width - left - right) / 3)), overflow: "truncate" }) } },
    yAxis: { splitNumber: yTicks, axisLabel: { hideOverlap: true,
      ...(horizontal ? { width: Math.max(24, left - 16), overflow: "truncate" }
        : { formatter: (v: number) => axisTick(v, locale, result) }) } },
  } satisfies EChartsOption;
}
