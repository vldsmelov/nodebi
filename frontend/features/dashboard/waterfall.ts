import type { EChartsOption, CustomSeriesRenderItem } from "echarts";
import { translate, type Locale } from "@/lib/locale";
import { themePalette, type Theme } from "@/lib/theme";
import type { VisualizationResult } from "./api";
import { boundedPlainTextTooltip } from "./chart-tooltip";

export const waterfallKindLabels: Record<string, string> = { initial: "Initial balance", change: "Contribution", subtotal: "Subtotal", total: "Final total" };
export const waterfallColors = (theme: Theme) => theme === "dark" ? { increase: "#93b4ff", decrease: "#edb078", total: "#da9def", zero: "#afb8ca" } : { increase: "#315cba", decrease: "#ad5b13", total: "#7a439e", zero: "#667085" };

export function waterfallField(result: VisualizationResult, id: string) {
  const column = result.columns.find(column => column.column_id === id);
  if (!column) throw new Error("The statistical field is unavailable. Reload the visualization.");
  return column.engine_name;
}

export function waterfallSelection(result: VisualizationResult, event: unknown) {
  const spec = result.spec;
  if (spec?.type !== "waterfall_chart") return;
  const id = (event as { data?: { stepIdentity?: unknown } })?.data?.stepIdentity;
  const field = waterfallField(result, spec.steps.step_id);
  return typeof id === "string" ? result.rows.find(row => row[field] === id) : undefined;
}

export function waterfallOptions(result: VisualizationResult, locale: Locale, theme: Theme, window?: [number, number]): EChartsOption {
  const spec = result.spec, scale = result.waterfall_scale;
  if (spec?.type !== "waterfall_chart" || !scale) throw new Error("The statistical field is unavailable. Reload the visualization.");
  const field = (role: keyof typeof spec.steps) => waterfallField(result, spec.steps[role]);
  const colors = waterfallColors(theme), horizontal = result.orientation === "horizontal";
  const foreground = theme === "dark" ? "#d7dfef" : "#34415b";
  const rows = result.rows.map((row, index) => {
    const id = String(row[field("step_id")]), position = scale.positions[id];
    if (!position) throw new Error("The statistical field is unavailable. Reload the visualization.");
    const kind = String(row[field("kind")]);
    const color = kind === "initial" ? colors.increase : kind !== "change" ? colors.total : position.sign > 0 ? colors.increase : position.sign < 0 ? colors.decrease : colors.zero;
    const opacity = result.highlight_field && result.highlight_value != null && row[result.highlight_field] !== result.highlight_value ? 0.3 : 1;
    return { id, stepIdentity: id, category: String(row[field("category")]), kind, color, opacity,
      sign: position.sign, value: [index, position.start, position.end], exactValue: String(row[field("value")]),
      exactTooltip: `${row[field("category")]} · ${translate(locale, waterfallKindLabels[kind] ?? kind)}\n${["value", "start", "end", "balance"].map(role => `${translate(locale, { value: "Contribution or total", start: "Bar start", end: "Bar end", balance: "Running balance" }[role]!)}: ${row[field(role as keyof typeof spec.steps)]}`).join("\n")}`,
    };
  });
  const renderItem: CustomSeriesRenderItem = (params, api) => {
    const index = Number(api.value(0)), row = rows[index];
    const coord = (i: number, value: number) => api.coord(horizontal ? [value, i] : [i, value]);
    const start = coord(index, row.value[1]), end = coord(index, row.value[2]);
    const size = api.size!(horizontal ? [0, 1] : [1, 0]) as number[];
    const width = Math.min(48, Math.abs(size[horizontal ? 1 : 0]) * 0.65);
    const grid = params.coordSys as { type: string; x: number; y: number; width: number; height: number };
    const shape = horizontal ? { x: Math.min(start[0], end[0]), y: start[1] - width / 2, width: Math.abs(end[0] - start[0]), height: width }
      : { x: start[0] - width / 2, y: Math.min(start[1], end[1]), width, height: Math.abs(end[1] - start[1]) };
    const flat = row.value[1] === row.value[2];
    const subpixel = row.sign !== 0 && Math.abs(end[horizontal ? 0 : 1] - start[horizontal ? 0 : 1]) < 1;
    const previous = index ? coord(index - 1, rows[index - 1].value[2]) : undefined;
    const next = previous ? coord(index, rows[index - 1].value[2]) : undefined;
    return { type: "group", clipPath: { type: "rect", shape: { x: grid.x, y: grid.y - 1, width: grid.width, height: grid.height + 2 } }, children: [
      ...(previous && next ? [{ type: "line" as const, silent: true, shape: horizontal ? { x1: previous[0], y1: previous[1] + width / 2, x2: next[0], y2: next[1] - width / 2 } : { x1: previous[0] + width / 2, y1: previous[1], x2: next[0] - width / 2, y2: next[1] }, style: { stroke: themePalette[theme].grid, lineDash: [3, 3] } }] : []),
      subpixel ? { type: "circle", shape: { cx: end[0], cy: end[1], r: 2.5 }, style: { fill: row.color, opacity: row.opacity } }
        : flat ? { type: "line", shape: horizontal ? { x1: end[0], x2: end[0], y1: end[1] - width / 2, y2: end[1] + width / 2 } : { x1: end[0] - width / 2, x2: end[0] + width / 2, y1: end[1], y2: end[1] }, style: { stroke: row.color, lineWidth: 2, opacity: row.opacity } }
        : { type: "rect", shape, style: { fill: ["initial", "subtotal"].includes(row.kind) ? `${row.color}26` : row.color, stroke: row.color, lineWidth: row.kind === "change" ? 1 : 2, lineDash: row.kind === "subtotal" ? [4, 2] : undefined, opacity: row.opacity } },
      ...(result.show_labels && Math.abs(size[horizontal ? 1 : 0]) >= 16 ? [{ type: "text" as const, silent: true, style: { text: row.exactValue, x: horizontal ? Math.max(grid.x + 40, Math.min(grid.x + grid.width - 40, end[0])) : end[0], y: horizontal ? end[1] : Math.max(grid.y + 9, Math.min(grid.y + grid.height - 9, end[1] - 9)), align: "center" as const, verticalAlign: "middle" as const, fill: foreground, stroke: theme === "dark" ? "#1c2637" : "#ffffff", lineWidth: 2, fontSize: 11, width: 85, overflow: "truncate" as const, opacity: 1 } }] : []),
    ] };
  };
  const category = { type: "category" as const, data: rows.map(row => row.id), inverse: horizontal, axisLabel: { width: 110, overflow: "truncate" as const, formatter: (id: string) => rows.find(row => row.id === id)?.category ?? "" }, axisTick: { alignWithLabel: true } };
  const value = { type: "value" as const, min: 0, max: 1, interval: 0.25, axisLabel: { width: 110, overflow: "truncate" as const, formatter: (position: number) => scale.ticks.find(tick => Math.abs(tick.position - position) < 1e-8)?.label ?? "" } };
  return {
    animation: false, backgroundColor: "transparent", aria: { enabled: true, label: { description: result.title || translate(locale, "Waterfall") } },
    grid: { left: horizontal ? 120 : 90, right: 25, top: 18, bottom: rows.length > 20 ? 60 : 35 },
    xAxis: horizontal ? value : category, yAxis: horizontal ? category : value,
    tooltip: boundedPlainTextTooltip(),
    dataZoom: rows.length > 20 ? [{ type: "slider", ...(horizontal ? { yAxisIndex: 0, right: 4, width: 12 } : { xAxisIndex: 0, bottom: 6, height: 14 }), handleSize: "80%", filterMode: "none", ...(window ? { startValue: window[0], endValue: window[1] } : { start: 0, end: 100 }), showDataShadow: false, labelFormatter: (index: number) => rows[Math.round(index)]?.category ?? "" }] : [],
    series: [{ type: "custom", coordinateSystem: "cartesian2d", renderItem, data: rows, encode: horizontal ? { x: [1, 2], y: 0 } : { x: 0, y: [1, 2] },
      markLine: { silent: true, symbol: "none", lineStyle: { color: foreground, width: 1 }, label: { show: true, formatter: "0" }, data: [horizontal ? { xAxis: scale.zero } : { yAxis: scale.zero }] },
    }],
  };
}
