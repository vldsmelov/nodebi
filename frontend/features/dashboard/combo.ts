import type { EChartsOption } from "echarts";
import { formatCell, translate, type Locale } from "@/lib/locale";
import type { Theme } from "@/lib/theme";
import type { VisualizationResult } from "./api";
import { boundedPlainTextTooltip } from "./chart-tooltip";

export function comboField(result: VisualizationResult, id: string) {
  const field = result.columns.find(c => c.column_id === id);
  if (!field) throw new Error("The statistical field is unavailable. Reload the visualization.");
  return field;
}
export const comboUnit = (metadata: Record<string, unknown>) => [metadata.unit, metadata.currency].filter(Boolean).join(" · ");

export function comboSelection(result: VisualizationResult, event: unknown) {
  const id = (event as { data?: { observationIdentity?: unknown } })?.data?.observationIdentity;
  const index = typeof id === "string" ? result.combo?.observations.findIndex(row => row.id === id) : undefined;
  return index != null && index >= 0 ? result.rows[index] : undefined;
}

export function comboOptions(result: VisualizationResult, locale: Locale, theme: Theme, window?: [number, number]): EChartsOption {
  const spec = result.spec, combo = result.combo;
  if (spec?.type !== "combo_chart" || !combo) throw new Error("The statistical field is unavailable. Reload the visualization.");
  const category = comboField(result, spec.category_column_id);
  const barIds = spec.series.filter(series => series.kind === "bar").map(series => series.column_id).sort();
  const lineIds = spec.series.filter(series => series.kind === "line").map(series => series.column_id).sort();
  const symbols = ["circle", "rect", "triangle", "diamond", "roundRect", "pin", "arrow"];
  // The contract allows at most seven of either kind (both kinds are required).
  // ECharts reuses item decals in the legend, keeping the key and bars consistent.
  const barPatterns = [
    undefined,
    { symbol: "rect", dashArrayX: [1, 0], dashArrayY: [2, 5], rotation: Math.PI / 4 },
    { symbol: "rect", dashArrayX: [1, 0], dashArrayY: [2, 5], rotation: -Math.PI / 4 },
    { symbol: "rect", dashArrayX: [1, 0], dashArrayY: [2, 5], rotation: 0 },
    { symbol: "rect", dashArrayX: [1, 0], dashArrayY: [2, 5], rotation: Math.PI / 2 },
    { symbol: "circle", dashArrayX: [2, 4], dashArrayY: [2, 4], symbolSize: 1 },
    { symbol: "triangle", dashArrayX: [3, 4], dashArrayY: [3, 4], symbolSize: 1 },
  ];
  const colors = theme === "dark" ? ["#93b4ff", "#edb078", "#da9def", "#6acbb6", "#f49eb1", "#a8c977", "#b4adee", "#87c5db"] : ["#315cba", "#ad5b13", "#7a439e", "#217763", "#b33d60", "#587927", "#6452ae", "#2b728c"];
  const label = (id: string) => {
    const index = combo.observations.findIndex(item => item.id === id);
    return index < 0 ? "" : formatCell(locale, result.rows[index][category.engine_name], category.logical_type);
  };
  const seriesNames = Object.fromEntries(spec.series.map(s => [s.column_id, s.name?.trim() || comboField(result, s.column_id).display_name]));
  const axes = [combo.primary, ...(combo.secondary ? [combo.secondary] : [])].map((scale, index) => ({
    type: "value" as const, min: scale.lower, max: scale.upper, interval: (scale.upper - scale.lower) / 4,
    name: translate(locale, index ? "Right axis" : "Left axis"), position: index ? "right" as const : "left" as const,
    axisTick: { customValues: scale.ticks.map(tick => tick.position) },
    axisLabel: { customValues: scale.ticks.map(tick => tick.position), width: 90, overflow: "truncate" as const, formatter: (value: number) => scale.ticks.find(tick => Math.abs(tick.position - value) < 1e-8)?.label ?? "" },
    splitLine: { show: index === 0 },
  }));
  return {
    animation: false, backgroundColor: "transparent", aria: { enabled: true, label: { description: result.title || translate(locale, "Combination chart") } },
    grid: { left: 90, right: combo.secondary ? 90 : 20, top: 28, bottom: result.rows.length > 20 ? 80 : 60 },
    xAxis: { type: "category", data: combo.observations.map(row => row.id), axisLabel: { formatter: label, width: 100, overflow: "truncate" }, axisTick: { alignWithLabel: true } },
    yAxis: axes,
    legend: { show: result.show_legend, type: "scroll", bottom: result.rows.length > 20 ? 25 : 0, formatter: (id: string) => seriesNames[id] ?? id },
    tooltip: boundedPlainTextTooltip(),
    dataZoom: result.rows.length > 20 ? [{ type: "slider", xAxisIndex: 0, bottom: 6, height: 14, handleSize: "80%", filterMode: "none", showDataShadow: false, showDetail: false, ...(window ? { startValue: window[0], endValue: window[1] } : { start: 0, end: 100 }) }] : [],
    series: spec.series.map((series, seriesIndex) => {
      const field = comboField(result, series.column_id), unit = comboUnit(field.metadata);
      const pattern = series.kind === "bar" ? barPatterns[barIds.indexOf(series.column_id)] : undefined;
      return {
        id: series.column_id, name: series.column_id, type: series.kind, yAxisIndex: series.axis === "secondary" ? 1 : 0,
        ...(series.kind === "line" ? { connectNulls: false, smooth: false, showSymbol: true, symbol: symbols[lineIds.indexOf(series.column_id)], symbolSize: 7, lineStyle: { width: 2, type: series.axis === "secondary" ? "dashed" as const : "solid" as const } } : { barMaxWidth: 48 }),
        itemStyle: { color: colors[seriesIndex], ...(pattern ? { decal: { ...pattern, color: theme === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)" } } : {}) },
        labelLayout: { hideOverlap: true },
        label: { show: result.show_labels, position: "top", opacity: 1, color: theme === "dark" ? "#d7dfef" : "#34415b", backgroundColor: theme === "dark" ? "#1c2738" : "#ffffff", padding: 1, formatter: (event: unknown) => (event as { data: { exactValue: string } }).data.exactValue },
        data: combo.observations.map((item, index) => {
          const row = result.rows[index], raw = row[field.engine_name], exactValue = raw == null ? "—" : String(raw);
          return { id: item.id, observationIdentity: item.id, value: item.positions[seriesIndex], exactValue,
            itemStyle: { opacity: result.highlight_field && result.highlight_value != null && row[result.highlight_field] !== result.highlight_value ? 0.3 : 1 },
            exactTooltip: `${label(item.id)}\n${seriesNames[series.column_id]} · ${translate(locale, series.axis === "secondary" ? "Right axis" : "Left axis")}: ${exactValue}${unit ? ` ${unit}` : ""}`,
          };
        }),
      };
    }),
  } as EChartsOption;
}
