import type { EChartsOption } from "echarts";
import { formatCell, translate, type Locale } from "@/lib/locale";
import type { Theme } from "@/lib/theme";
import type { VisualizationResult } from "./api";
import { comboField, comboUnit } from "./combo";
import { boundedPlainTextTooltip } from "./chart-tooltip";

export function bubbleSelection(result: VisualizationResult, event: unknown) {
  const id = (event as { data?: { observationIdentity?: unknown } })?.data?.observationIdentity;
  const index = typeof id === "string" ? result.bubble?.points.findIndex(point => point.id === id) : -1;
  return index != null && index >= 0 ? result.rows[index] : undefined;
}

export function bubbleOptions(result: VisualizationResult, locale: Locale, theme: Theme, viewport = { width: 640, height: 320 }): EChartsOption {
  const spec = result.spec, bubble = result.bubble;
  if (spec?.type !== "bubble_chart" || !bubble) throw new Error("The statistical field is unavailable. Reload the visualization.");
  const key = comboField(result, spec.key_column_id), label = comboField(result, spec.label_column_id ?? spec.key_column_id);
  const x = comboField(result, spec.x_column_id), y = comboField(result, spec.y_column_id), size = comboField(result, spec.size_column_id);
  const group = spec.group_column_id ? comboField(result, spec.group_column_id) : undefined;
  const colors = theme === "dark" ? ["#93b4ff", "#edb078", "#da9def", "#6acbb6", "#f49eb1", "#a8c977", "#b4adee", "#87c5db"] : ["#315cba", "#ad5b13", "#7a439e", "#217763", "#b33d60", "#587927", "#6452ae", "#2b728c"];
  const colour = (identity: string) => colors[Array.from(identity).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0) % colors.length];
  const groups = new Map<string, { label: string; points: object[] }>();
  bubble.points.forEach((point, index) => {
    const row = result.rows[index], identity = point.group_id ?? "observations";
    if (!groups.has(identity)) groups.set(identity, { label: group ? row[group.engine_name] == null ? translate(locale, "(empty)") : row[group.engine_name] === "" ? translate(locale, "Empty text") : formatCell(locale, row[group.engine_name], group.logical_type) : translate(locale, "Observations"), points: [] });
    if (point.state !== "visible") return;
    const name = formatCell(locale, row[label.engine_name], label.logical_type);
    const details = [key, ...(label.column_id === key.column_id ? [] : [label]), x, y, size, ...(group ? [group] : [])].map(field => `${field.display_name}: ${row[field.engine_name] == null ? "—" : String(row[field.engine_name])}${comboUnit(field.metadata) ? ` ${comboUnit(field.metadata)}` : ""}`).join("\n");
    groups.get(identity)!.points.push({ id: point.id, observationIdentity: point.id, name, value: [point.x, point.y], symbolSize: 48 * point.radius_ratio!, exactTooltip: details,
      itemStyle: { opacity: result.highlight_field && result.highlight_value != null && row[result.highlight_field] !== result.highlight_value ? 0.2 : 0.75 },
    });
  });
  // A 24px radius needs real pixel clearance from axis labels, including in short widgets.
  const padding = (pixels: number) => Math.min(2, 27 / Math.max(14, pixels - 54));
  const axis = (scale: typeof bubble.x_axis, field: typeof x, pixels: number) => ({
    type: "value" as const, min: -padding(pixels), max: 1 + padding(pixels), interval: 0.25,
    name: `${field.display_name}${comboUnit(field.metadata) ? ` (${comboUnit(field.metadata)})` : ""}`,
    nameLocation: "middle" as const, nameGap: 40, nameTextStyle: { overflow: "truncate" as const, width: 180 },
    axisLabel: { customValues: scale.ticks.map(tick => tick.position), hideOverlap: true, width: 76, overflow: "truncate" as const, formatter: (value: number) => { const tick = scale.ticks.find(tick => Math.abs(tick.position - value) < 1e-8); return tick?.display_label ?? tick?.label ?? ""; } },
    axisTick: { customValues: scale.ticks.map(tick => tick.position) },
  });
  return {
    animation: false, backgroundColor: "transparent", aria: { enabled: true, label: { description: result.title || translate(locale, "Bubble chart") } },
    grid: { left: 100, right: 36, top: 32, bottom: 86 },
    xAxis: axis(bubble.x_axis, x, viewport.width - 136), yAxis: { ...axis(bubble.y_axis, y, viewport.height - 118), nameGap: 82 },
    legend: { show: result.show_legend && !!group, type: "scroll", bottom: 0, formatter: (id: string) => groups.get(id)?.label ?? id },
    tooltip: boundedPlainTextTooltip(),
    series: [...groups].map(([id, entry]) => ({ id, name: id, type: "scatter", clip: false, symbol: "circle", itemStyle: { color: colour(id), borderWidth: 0 }, labelLayout: { hideOverlap: true }, label: { show: result.show_labels, position: "top", opacity: 1, color: theme === "dark" ? "#d7dfef" : "#34415b", backgroundColor: theme === "dark" ? "#1c2738" : "#ffffff", padding: 1, formatter: "{b}" }, data: entry.points })),
  } as EChartsOption;
}
