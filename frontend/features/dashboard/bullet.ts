import type { EChartsOption, CustomSeriesRenderItem } from "echarts";
import { formatCell, translate, type Locale } from "@/lib/locale";
import type { Theme } from "@/lib/theme";
import type { VisualizationResult } from "./api";
import { comboField, comboUnit } from "./combo";
import { boundedPlainTextTooltip } from "./chart-tooltip";

export const bulletTones = (theme: Theme) => theme === "dark" ? { neutral: "#56647a", negative: "#854659", warning: "#806337", positive: "#326b5f" } : { neutral: "#e2e6ed", negative: "#efcbd2", warning: "#f0dfb8", positive: "#c3e3d9" };
export const bulletWindowSize = (height: number) => Math.max(1, Math.min(5, Math.floor((height - 43) / 28)));
export function bulletSelection(result: VisualizationResult, event: unknown) {
  const id = (event as { data?: { bulletIdentity?: unknown } })?.data?.bulletIdentity;
  const index = typeof id === "string" ? result.bullet?.points.findIndex(p => p.id === id) : -1;
  return index != null && index >= 0 ? result.rows[index] : undefined;
}

export function bulletOptions(result: VisualizationResult, locale: Locale, theme: Theme, window?: [number, number]): EChartsOption {
  const spec = result.spec, bullet = result.bullet;
  if (spec?.type !== "bullet_chart" || !bullet) throw new Error("The statistical field is unavailable. Reload the visualization.");
  const category = comboField(result, spec.category_column_id), actual = comboField(result, spec.actual_column_id), target = comboField(result, spec.target_column_id), unit = comboUnit(actual.metadata);
  const start = window?.[0] ?? 0, end = window?.[1] ?? 4, points = bullet.points.slice(start, end + 1);
  const foreground = theme === "dark" ? "#e5edfc" : "#24334f", tones = bulletTones(theme);
  const rows = points.map((point, index) => {
    const row = result.rows[start + index], label = formatCell(locale, row[category.engine_name], category.logical_type);
    const raw = (name: string) => row[name] == null ? "—" : String(row[name]);
    return { value: [index], bulletIdentity: point.id, point, label, exactActual: raw(actual.engine_name),
      opacity: result.highlight_field && result.highlight_value != null && row[result.highlight_field] !== result.highlight_value ? 0.3 : 1,
      exactTooltip: `${label}\n${translate(locale, "Actual")}: ${raw(actual.engine_name)}\n${translate(locale, "Target")}: ${raw(target.engine_name)}${unit ? `\n${unit}` : ""}\n${point.actual_band == null ? translate(locale, "Missing actual") : spec.bands[point.actual_band].label}` };
  });
  const renderItem: CustomSeriesRenderItem = (params, api) => {
    const index = Number(api.value(0)), row = rows[index];
    const coord = (value: number) => api.coord([value, index]);
    const height = Math.min(40, Math.abs((api.size!([0, 1]) as number[])[1]) * 0.68), y = coord(0)[1];
    const zero = coord(bullet.zero)[0];
    const grid = params.coordSys as { type: string; x: number; y: number; width: number; height: number };
    // Optional labels sit above their bands and may use the existing top padding.
    // Keep horizontal/bottom clipping; do not crop the first label at the plot edge.
    const clipTop = result.show_labels ? 0 : grid.y;
    return { type: "group", clipPath: { type: "rect", shape: { x: grid.x - 2, y: clipTop, width: grid.width + 4, height: grid.y + grid.height - clipTop } }, children: [
      ...bullet.band_ends.map((end, i) => ({ type: "rect" as const, shape: { x: coord(i ? bullet.band_ends[i - 1] : 0)[0], y: y - height / 2, width: coord(end)[0] - coord(i ? bullet.band_ends[i - 1] : 0)[0], height }, style: { fill: tones[spec.bands[i].tone], opacity: row.opacity } })),
      ...(row.point.actual == null ? [] : row.point.actual_zero ? [{ type: "line" as const, shape: { x1: zero, x2: zero, y1: y - height * 0.18, y2: y + height * 0.18 }, style: { stroke: foreground, lineWidth: 2, opacity: row.opacity } }] : [{ type: "rect" as const, shape: { x: Math.min(zero, coord(row.point.actual)[0]), y: y - height * 0.18, width: Math.abs(coord(row.point.actual)[0] - zero), height: height * 0.36 }, style: { fill: foreground, opacity: row.opacity } }]),
      ...(row.point.target == null ? [] : [{ type: "line" as const, shape: { x1: coord(row.point.target)[0], x2: coord(row.point.target)[0], y1: y - height * 0.42, y2: y + height * 0.42 }, style: { stroke: foreground, lineWidth: 3, opacity: row.opacity } }]),
      ...(result.show_labels ? [{ type: "text" as const, silent: true, style: { x: grid.x + grid.width - 4, y: y - height / 2 - 1, text: row.exactActual, fill: foreground, align: "right" as const, verticalAlign: "bottom" as const, fontSize: 10, width: 150, overflow: "truncate" as const } }] : []),
    ] };
  };
  return { animation: false, backgroundColor: "transparent", aria: { enabled: true, label: { description: result.title || translate(locale, "Bullet chart") } },
    grid: { left: 110, right: 24, top: 15, bottom: 28 },
    xAxis: { type: "value", min: 0, max: 1, interval: 0.25, axisLabel: { hideOverlap: true, formatter: (position: number) => bullet.ticks.find(t => Math.abs(t.position - position) < 1e-8)?.display_label ?? "" } },
    yAxis: { type: "category", inverse: true, data: rows.map(r => r.bulletIdentity), axisLabel: { interval: 0, width: 95, overflow: "truncate", formatter: (id: string) => rows.find(r => r.bulletIdentity === id)?.label ?? "" }, axisTick: { show: false } },
    tooltip: boundedPlainTextTooltip(),
    series: [{ type: "custom", coordinateSystem: "cartesian2d", renderItem, data: rows, encode: { y: 0 }, markLine: { silent: true, symbol: "none", label: { show: false }, lineStyle: { color: foreground, opacity: 0.4 }, data: [{ xAxis: bullet.zero }] } }],
  };
}
