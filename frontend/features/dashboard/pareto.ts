import type { EChartsOption } from "echarts";
import { translate, type Locale } from "@/lib/locale";
import type { Theme } from "@/lib/theme";
import type { VisualizationResult } from "./api";
import { comboOptions } from "./combo";

export function paretoOptions(result: VisualizationResult, locale: Locale, theme: Theme): EChartsOption {
  const spec = result.spec;
  if (spec?.type !== "pareto_chart" || !result.combo) throw new Error("The statistical field is unavailable. Reload the visualization.");
  // Only a renderer binding adapter: the graph already owns ranks, cumulative amounts and shares.
  const option = comboOptions({ ...result, title: result.title || translate(locale, "Pareto chart"), type: "combo_chart", spec: {
    version: 1, type: "combo_chart", category_column_id: spec.rows.category, secondary_axis: true,
    series: [{ column_id: spec.rows.value, kind: "bar", axis: "primary", name: translate(locale, "Contribution") }, { column_id: spec.rows.cumulative_percent, kind: "line", axis: "secondary", name: translate(locale, "Cumulative share (%)") }],
  } }, locale, theme);
  // Paging already bounds the drawing. Keep the axes, legend and navigation usable in short cards.
  option.dataZoom = [];
  option.grid = { left: 90, right: 90, top: 22, bottom: 45 };
  option.legend = { ...option.legend, bottom: 0 };
  // Retain the server scale and exact tick labels; let the renderer omit only labels
  // that collide at the current card height. Its resize pass restores them when space permits.
  if (Array.isArray(option.yAxis)) for (const axis of option.yAxis) {
    axis.axisLabel ??= {};
    axis.axisLabel.hideOverlap = true;
    axis.axisLabel.showMinLabel = true;
    axis.axisLabel.showMaxLabel = true;
  }
  if (Array.isArray(option.series) && option.series[1] && result.combo.observations.some(row => row.positions[1] != null)) {
    option.series[1] = { ...option.series[1], markLine: { silent: true, symbol: "none", label: { formatter: `${spec.threshold_percent}%`, position: "insideEndTop" }, lineStyle: { type: "dotted", color: theme === "dark" ? "#c4cbd7" : "#566275" }, data: [{ yAxis: spec.threshold_percent / 100 }] } };
  }
  return option;
}
