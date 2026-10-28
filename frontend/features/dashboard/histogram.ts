import type { EChartsOption } from "echarts";
import { translate, numberLocale, type Locale } from "@/lib/locale";
import { themePalette, type Theme } from "@/lib/theme";
import type { VisualizationResult } from "./api";
import { boundedPlainTextTooltip } from "./chart-tooltip";

export function histogramField(result: VisualizationResult, dataset: "bins" | "summary", id: string) {
  const field = result.datasets?.[dataset]?.columns.find(column => column.column_id === id);
  if (!field) throw new Error("The statistical field is unavailable. Reload the visualization.");
  return field.engine_name;
}

export function histogramSelection(result: VisualizationResult, event: unknown) {
  if (result.spec?.type !== "histogram_chart") return;
  const id = (event as { data?: { binIdentity?: unknown } })?.data?.binIdentity;
  if (typeof id !== "string") return;
  const field = histogramField(result, "bins", result.spec.bins.bin_id);
  return result.rows.find(row => row[field] === id);
}

export function histogramOptions(result: VisualizationResult, locale: Locale, theme: Theme): EChartsOption {
  const spec = result.spec;
  if (spec?.type !== "histogram_chart") throw new Error("The statistical field is unavailable. Reload the visualization.");
  const name = (role: keyof typeof spec.bins) => histogramField(result, "bins", spec.bins[role]);
  const horizontal = result.orientation === "horizontal";
  const category = { type: "category" as const, data: result.rows.map(row => String(row[name("interval")])), axisLabel: { width: 110, overflow: "truncate" as const } };
  const count = { type: "value" as const, minInterval: 1, name: translate(locale, "Observations") };
  return {
    backgroundColor: "transparent", aria: { enabled: true, label: { description: result.title || translate(locale, "Histogram") } },
    grid: { left: horizontal ? 130 : 70, right: 25, top: 30, bottom: 65 },
    xAxis: horizontal ? count : category, yAxis: horizontal ? category : count,
    legend: { show: result.show_legend, bottom: 0 },
    tooltip: boundedPlainTextTooltip(),
    series: [{ type: "bar", barCategoryGap: "0%", name: translate(locale, "Observations"),
      itemStyle: { color: `${themePalette[theme].accent}55`, borderColor: themePalette[theme].accent, borderWidth: 1 },
      label: { show: result.show_labels, opacity: 1, color: theme === "dark" ? "#d7dfef" : "#34415b", backgroundColor: theme === "dark" ? "#1c2738" : "#ffffff", padding: 1 },
      data: result.rows.map(row => ({ id: String(row[name("bin_id")]), binIdentity: row[name("bin_id")], value: Number(row[name("count")]),
        itemStyle: { opacity: result.highlight_field && result.highlight_value != null && row[result.highlight_field] !== result.highlight_value ? 0.3 : 1 },
        exactTooltip: `${row[name("interval")]}\n${translate(locale, "Observations")}: ${new Intl.NumberFormat(numberLocale[locale]).format(Number(row[name("count")]))}`,
      })),
    }],
  };
}
