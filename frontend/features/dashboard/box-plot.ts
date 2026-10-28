import type { EChartsOption } from "echarts";
import { formatCell, translate, type Locale } from "@/lib/locale";
import { themePalette, type Theme } from "@/lib/theme";
import type { VisualizationResult } from "./api";
import { plainTextTooltip } from "./chart-tooltip";

/** Resolve a stable field identity inside its named dataset, never by label/row position. */
export function boxField(result: VisualizationResult, dataset: "summary" | "outliers", id: string): string {
  const field = result.datasets?.[dataset]?.columns.find(column => column.column_id === id);
  if (!field) throw new Error("The statistical field is unavailable. Reload the visualization.");
  return field.engine_name;
}

export function boxPlotSelection(result: VisualizationResult, event: unknown): Record<string, unknown> | undefined {
  const id = (event as { data?: { groupIdentity?: unknown } })?.data?.groupIdentity;
  if (typeof id !== "string" || result.spec?.type !== "box_plot") return;
  const field = boxField(result, "summary", result.spec.summary.group_id);
  return result.datasets?.summary.rows.find(row => row[field] === id);
}

export function boxPlotOptions(result: VisualizationResult, locale: Locale, theme: Theme, formatAxis: (value: number) => string): EChartsOption {
  const spec = result.spec;
  if (spec?.type !== "box_plot" || !result.datasets?.summary || !result.datasets?.outliers) throw new Error("The statistical field is unavailable. Reload the visualization.");
  const summary = result.datasets.summary.rows;
  const name = (role: keyof typeof spec.summary) => boxField(result, "summary", spec.summary[role]);
  const outlierName = (role: keyof typeof spec.outliers) => boxField(result, "outliers", spec.outliers[role]);
  const groupIdentity = name("group_id");
  const groups = new Map(summary.map((row, index) => [row[groupIdentity], index]));
  const category = { type: "category" as const, data: summary.map(row => formatCell(locale, row[name("group")])), axisLabel: { width: 100, overflow: "truncate" as const } };
  const value = { type: "value" as const, scale: true, axisLabel: { formatter: formatAxis } };
  const horizontal = result.orientation === "horizontal";
  const style = (row: Record<string, unknown>) => ({ opacity: result.highlight_field && result.highlight_value != null && row[result.highlight_field] !== result.highlight_value ? 0.3 : 1 });
  const statistics = ["lower_whisker", "q1", "median", "q3", "upper_whisker"] as const;
  const labels = ["Lower whisker", "First quartile", "Median", "Third quartile", "Upper whisker", "Observations", "Missing values"];
  // Numeric conversion is only for screen coordinates; tooltips/tables keep exact transport values.
  const boxes = summary.map(row => ({
    id: String(row[groupIdentity]), groupIdentity: row[groupIdentity],
    value: statistics.map(role => row[name(role)] == null ? "-" : Number(row[name(role)])),
    exactTooltip: [formatCell(locale, row[name("group")]), ...[...statistics, "count", "missing_count"].map((role, index) => `${translate(locale, labels[index])}: ${formatCell(locale, row[name(role as keyof typeof spec.summary)])}`)].join("\n"),
    exactMedian: formatCell(locale, row[name("median")]),
    itemStyle: style(row),
  }));
  const points = result.datasets.outliers.rows.flatMap(row => {
    const id = row[outlierName("group_id")], index = groups.get(id);
    if (index === undefined) throw new Error("The statistical field is unavailable. Reload the visualization.");
    const number = Number(row[outlierName("value")]);
    return [{ id: String(row[outlierName("point_id")]), groupIdentity: id,
      value: horizontal ? [number, index] : [index, number], itemStyle: style(summary[index]),
      exactTooltip: `${formatCell(locale, row[outlierName("group")])}\n${translate(locale, "Outliers")}: ${formatCell(locale, row[outlierName("value")])}`,
    }];
  });
  // Native ECharts boxplot ignores labels. A silent scatter layer anchors exact
  // median text; it neither recalculates statistics nor creates another legend item.
  const medians = result.show_labels ? summary.flatMap((row, index) => {
    const median = row[name("median")];
    if (median == null) return [];
    return [{ id: String(row[groupIdentity]), value: horizontal ? [Number(median), index] : [index, Number(median)], exactMedian: formatCell(locale, median) }];
  }) : [];
  return {
    backgroundColor: "transparent", aria: { enabled: true, label: { description: result.title || translate(locale, "Box plot") } },
    grid: { left: horizontal ? 110 : 70, right: 30, top: 25, bottom: 65 },
    legend: { show: result.show_legend, bottom: 0 },
    tooltip: { trigger: "item", renderMode: "html", appendToBody: true, formatter: (event: unknown) => plainTextTooltip((event as { data?: { exactTooltip?: string } }).data?.exactTooltip ?? "") },
    xAxis: horizontal ? value : category, yAxis: horizontal ? category : value,
    series: [
      { type: "boxplot", name: translate(locale, "Distribution summary"), layout: horizontal ? "horizontal" : "vertical", data: boxes, itemStyle: { color: `${themePalette[theme].accent}26`, borderColor: themePalette[theme].accent, borderWidth: 2 } },
      { type: "scatter", name: translate(locale, "Outliers"), data: points, symbolSize: 7, itemStyle: { color: themePalette[theme].accent } },
      { type: "scatter", name: translate(locale, "Distribution summary"), silent: true, data: medians, symbolSize: 1, itemStyle: { opacity: 0 }, tooltip: { show: false }, z: 10,
        label: { show: true, position: horizontal ? "right" : "top", opacity: 1, color: theme === "dark" ? "#d7dfef" : "#34415b", backgroundColor: theme === "dark" ? "#1c2738" : "#ffffff", padding: 1,
          formatter: (event: unknown) => (event as { data: { exactMedian: string } }).data.exactMedian } },
    ],
  } as EChartsOption;
}
