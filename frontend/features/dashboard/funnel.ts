import type { CustomSeriesRenderItem, EChartsOption } from "echarts";
import { formatCell, translate, type Locale } from "@/lib/locale";
import type { Theme } from "@/lib/theme";
import type { VisualizationResult } from "./api";
import { comboField, comboUnit } from "./combo";
import { boundedPlainTextTooltip } from "./chart-tooltip";

export function funnelSelection(result: VisualizationResult, event: unknown) {
  const id = (event as { data?: { stageIdentity?: unknown } })?.data?.stageIdentity;
  const index = typeof id === "string" ? result.funnel?.points.findIndex(p => p.id === id) : -1;
  return index != null && index >= 0 ? result.rows[index] : undefined;
}

export function funnelOptions(result: VisualizationResult, locale: Locale, theme: Theme): EChartsOption {
  const spec = result.spec, funnel = result.funnel;
  if (spec?.type !== "funnel_chart" || !funnel) throw new Error("The statistical field is unavailable. Reload the visualization.");
  const fields = Object.fromEntries(Object.entries(spec.rows).map(([role, id]) => [role, comboField(result, id)]));
  const ink = theme === "dark" ? "#e5edfc" : "#24334f", fill = theme === "dark" ? "#83afff" : "#315ad0";
  const rows = result.rows.map((row, index) => {
    const label = formatCell(locale, row[fields.stage.engine_name], fields.stage.logical_type);
    const raw = (role: string) => row[fields[role].engine_name] == null ? "—" : String(row[fields[role].engine_name]);
    return { value: [index], stageIdentity: funnel.points[index].id, label, amount: raw("value"),
      opacity: result.highlight_field && result.highlight_value != null && row[result.highlight_field] !== result.highlight_value ? 0.3 : 1,
      exactTooltip: `${label}\n${fields.value.display_name}: ${raw("value")} ${comboUnit(fields.value.metadata)}\n${translate(locale, "Previous-stage retention (%)")}: ${raw("previous_percent")}\n${translate(locale, "Initial-stage retention (%)")}: ${raw("initial_percent")}\n${translate(locale, "Loss from previous stage")}: ${raw("loss")}` };
  });
  const renderItem: CustomSeriesRenderItem = (params, api) => {
    const index = Number(api.value(0)), point = funnel.points[index], row = rows[index];
    const coord = (x: number, y = index) => api.coord([x, y]);
    const y = coord(0)[1], step = Math.abs((api.size!([0, 1]) as number[])[1]), halfHeight = Math.min(14, step * 0.24);
    const left = coord((1 - point.width) / 2)[0], right = coord((1 + point.width) / 2)[0];
    const next = funnel.points[index + 1], middle = coord(0.5)[0];
    const grid = params.coordSys as { type: string; x: number; y: number; width: number; height: number };
    return { type: "group", children: [
      ...(next ? [{ type: "polygon" as const, silent: true, shape: { points: [[left, y + halfHeight], [right, y + halfHeight], [coord((1 + next.width) / 2)[0], coord(0, index + 1)[1] - halfHeight], [coord((1 - next.width) / 2)[0], coord(0, index + 1)[1] - halfHeight]] }, style: { fill, opacity: 0.15 } }] : []),
      ...(point.zero ? [{ type: "line" as const, shape: { x1: middle, x2: middle, y1: y - halfHeight, y2: y + halfHeight }, style: { stroke: ink, lineWidth: 1, lineDash: [2, 2], opacity: row.opacity } }] : [{ type: "rect" as const, shape: { x: left, y: y - halfHeight, width: right - left, height: halfHeight * 2 }, style: { fill, opacity: row.opacity } }]),
      ...(result.show_labels ? [{ type: "text" as const, silent: true, style: { x: grid.x + grid.width, y: y - halfHeight - 2, text: row.amount, fill: ink, align: "right" as const, verticalAlign: "bottom" as const, fontSize: 11, width: grid.width, overflow: "truncate" as const } }] : []),
    ] };
  };
  return { animation: false, backgroundColor: "transparent", aria: { enabled: true, label: { description: result.title || translate(locale, "Funnel") } },
    grid: { left: 105, right: 24, top: 18, bottom: 10 },
    xAxis: { type: "value", min: 0, max: 1, show: false },
    yAxis: { type: "category", inverse: true, data: rows.map(r => r.stageIdentity), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { interval: 0, width: 90, overflow: "truncate", formatter: (id: string) => rows.find(r => r.stageIdentity === id)?.label ?? "" } },
    tooltip: boundedPlainTextTooltip(),
    series: [{ type: "custom", renderItem, data: rows, encode: { y: 0 } }],
  };
}
