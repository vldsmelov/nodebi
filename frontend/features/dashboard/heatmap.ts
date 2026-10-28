import type { EChartsOption, HeatmapSeriesOption } from "echarts";
import { formatCell, translate, type Locale } from "@/lib/locale";
import { themePalette, type Theme } from "@/lib/theme";
import type { VisualizationResult } from "./api";
import type { components } from "@/lib/api-schema";
import { plainTextTooltip } from "./chart-tooltip";

type Role = keyof components["schemas"]["HeatmapRoles"];
export function heatmapField(result: VisualizationResult, role: Role) {
  const spec = result.spec;
  const field = spec?.type === "heatmap_chart" ? result.columns.find(column => column.column_id === spec.cells[role]) : undefined;
  if (!field) throw new Error("The statistical field is unavailable. Reload the visualization.");
  return field;
}

export function heatmapSelection(result: VisualizationResult, event: unknown) {
  const id = (event as { data?: { cellIdentity?: unknown } })?.data?.cellIdentity;
  if (typeof id !== "string") return;
  return result.rows.find(row => row[heatmapField(result, "cell_id").engine_name] === id);
}

export function heatmapColors(result: VisualizationResult) {
  return result.heatmap_scale?.mode === "zero_centered" ? ["#b34d0b", "#f4f1ec", "#315cba"] : ["#eef0fb", "#8b77cb", "#3c227c"];
}

/** Equal-stop sRGB interpolation, matching the visualMap's rounded RGB channels. */
function cellAppearance(colors: string[], position: number, muted: boolean) {
  const rgb = (hex: string) => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
  const coordinate = Math.max(0, Math.min(1, position)) * (colors.length - 1);
  const lower = Math.floor(coordinate), fraction = coordinate - lower;
  const start = rgb(colors[lower]), end = rgb(colors[Math.min(lower + 1, colors.length - 1)]);
  const channels = start.map((value, index) => Math.round(value + (end[index] - value) * fraction));
  const linear = channels.map(value => value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4);
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  const color = (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#000000" : "#ffffff";
  // ECharts otherwise inherits the cell's dimmed opacity for text. A small opaque
  // backing keeps excluded-cell values readable on any surrounding chart surface.
  const fill = `rgb(${channels.join(",")})`;
  return { fill, label: { color, opacity: 1, ...(muted ? { backgroundColor: fill, padding: 1 } : {}) } };
}

export function heatmapCategory(value: unknown, locale: Locale, type: string) {
  return value == null ? translate(locale, "Empty category") : value === "" ? translate(locale, "Empty text") : formatCell(locale, value, type);
}

export function heatmapOptions(result: VisualizationResult, locale: Locale, theme: Theme): EChartsOption {
  const scale = result.heatmap_scale;
  if (!scale) throw new Error("The statistical field is unavailable. Reload the visualization.");
  const field = (role: Role) => heatmapField(result, role).engine_name;
  const xField = heatmapField(result, "x"), yField = heatmapField(result, "y");
  const x = new Map<string, string>(), y = new Map<string, string>();
  for (const row of result.rows) {
    x.set(String(row[field("x_id")]), heatmapCategory(row[xField.engine_name], locale, xField.logical_type));
    y.set(String(row[field("y_id")]), heatmapCategory(row[yField.engine_name], locale, yField.logical_type));
  }
  const xKeys = [...x.keys()], yKeys = [...y.keys()];
  const xIndices = new Map(xKeys.map((id, index) => [id, index])), yIndices = new Map(yKeys.map((id, index) => [id, index]));
  const data = result.rows.map(row => {
    const id = String(row[field("cell_id")]), position = scale.positions[id];
    const missing = row[field("value")] == null, absent = row[field("present")] === false;
    const status = absent ? "No source rows" : missing ? "Missing measure" : "Observed value";
    const muted = !!result.highlight_field && result.highlight_value != null && row[result.highlight_field] !== result.highlight_value;
    const fills = missing ? [theme === "dark" ? (absent ? "#202635" : "#465168") : (absent ? "#fafafa" : "#d9dfe9")] : heatmapColors(result);
    if (!missing && (position == null || !Number.isFinite(position))) throw new Error("The statistical field is unavailable. Reload the visualization.");
    const appearance = cellAppearance(fills, position ?? 0, muted);
    const exactValue = missing ? translate(locale, status) : String(row[field("value")]);
    const exactTooltip = `${x.get(String(row[field("x_id")]))} · ${y.get(String(row[field("y_id")]))}\n${heatmapField(result, "value").display_name}: ${exactValue}\n${translate(locale, "Source rows")}: ${row[field("row_count")]}\n${translate(locale, "Numeric observations")}: ${row[field("valid_count")]}\n${translate(locale, "Missing values")}: ${row[field("missing_count")]}`;
    return { id, cellIdentity: id, status, exactTooltip, exactValue,
      value: [xIndices.get(String(row[field("x_id")]))!, yIndices.get(String(row[field("y_id")]))!, position ?? 0],
      itemStyle: { opacity: muted ? 0.25 : 1 },
      label: appearance.label,
      // Preserve the encoded value and text contrast; the series border marks hover.
      emphasis: { itemStyle: { color: appearance.fill } },
    };
  });
  const series: HeatmapSeriesOption[] = ["Observed value", "No source rows", "Missing measure"].map((status, index) => ({
    type: "heatmap", name: translate(locale, status), data: data.filter(row => row.status === status),
    progressive: 0, itemStyle: { borderColor: themePalette[theme].grid, borderWidth: 1, ...(index ? { color: theme === "dark" ? (index === 1 ? "#202635" : "#465168") : (index === 1 ? "#fafafa" : "#d9dfe9") } : {}) },
    label: { show: index > 0 || result.show_labels, formatter: (event: unknown) => index === 1 ? "×" : index === 2 ? "—" : (event as { data: { exactValue: string } }).data.exactValue },
    emphasis: { itemStyle: { borderColor: themePalette[theme].accent, borderWidth: 2 } },
  }));
  return {
    backgroundColor: "transparent", animation: false,
    aria: { enabled: true, label: { description: result.title || translate(locale, "Heatmap") } },
    grid: { left: 100, right: y.size > 20 ? 40 : 20, top: 8, bottom: x.size > 20 ? 55 : 30 },
    xAxis: { type: "category", data: xKeys, splitArea: { show: false }, axisLabel: { formatter: value => x.get(value) ?? value, width: 100, overflow: "truncate" } },
    yAxis: { type: "category", data: yKeys, inverse: true, splitArea: { show: false }, axisLabel: { formatter: value => y.get(value) ?? value, width: 85, overflow: "truncate" } },
    dataZoom: [
      { type: "slider", show: x.size > 20, xAxisIndex: 0, filterMode: "none", startValue: 0, endValue: Math.min(19, x.size - 1), bottom: 4, height: 18 },
      { type: "slider", show: y.size > 20, yAxisIndex: 0, filterMode: "none", startValue: 0, endValue: Math.min(19, y.size - 1), right: 4, width: 18 },
    ],
    visualMap: [0, 1, 2].map(index => ({ type: "continuous" as const, show: false, min: 0, max: 1, dimension: 2, seriesIndex: index, inRange: { color: index === 0 ? heatmapColors(result) : [theme === "dark" ? (index === 1 ? "#202635" : "#465168") : (index === 1 ? "#fafafa" : "#d9dfe9")] } })),
    tooltip: { trigger: "item", renderMode: "html", appendToBody: true, formatter: (event: unknown) => plainTextTooltip((event as { data: { exactTooltip: string } }).data.exactTooltip) },
    series,
  };
}
