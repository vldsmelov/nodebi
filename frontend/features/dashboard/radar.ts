import type { EChartsOption } from "echarts";
import { formatCell, translate, type Locale } from "@/lib/locale";
import { themePalette, type Theme } from "@/lib/theme";
import type { VisualizationResult } from "./api";
import { boundedPlainTextTooltip } from "./chart-tooltip";

export function radarField(result: VisualizationResult, id: string) {
  const field = result.columns.find(column => column.column_id === id);
  if (!field) throw new Error("The statistical field is unavailable. Reload the visualization.");
  return field;
}

export function radarUnit(metadata: Record<string, unknown>) {
  return [...new Set([metadata.unit, metadata.currency].filter(value => typeof value === "string" && value))].join(" · ");
}

export function radarRow(result: VisualizationResult, id: string) {
  const profile = result.radar?.profiles.find(item => item.id === id);
  if (!profile || !result.category_field) return;
  return result.rows.find(row => row[result.category_field!] === profile.category);
}

export function radarSelection(result: VisualizationResult, event: unknown) {
  const id = (event as { data?: { profileIdentity?: unknown } })?.data?.profileIdentity;
  return typeof id === "string" ? radarRow(result, id) : undefined;
}

export function radarOptions(result: VisualizationResult, locale: Locale, theme: Theme): EChartsOption {
  const spec = result.spec;
  if (spec?.type !== "radar_chart" || !result.radar) throw new Error("The statistical field is unavailable. Reload the visualization.");
  const axes = spec.axes.map(axis => radarField(result, axis.column_id));
  const palette = theme === "dark" ? ["#93b4ff", "#edb078", "#79d5cc", "#da9def", "#f49faf", "#c5d981", "#c7b6a3", "#afb8ca"] : ["#315cba", "#ad5b13", "#187e75", "#8b409e", "#b64059", "#667d19", "#826341", "#566277"];
  const identities = result.radar.profiles.map(profile => profile.id).sort();
  const symbols = ["circle", "rect", "triangle", "diamond", "roundRect", "pin", "arrow", "emptyCircle"];
  const symbolFor = (id: string) => symbols[identities.indexOf(id) % symbols.length];
  const profiles = result.radar.profiles.filter(profile => profile.complete);
  return {
    backgroundColor: "transparent", aria: { enabled: true, label: { description: result.title || translate(locale, "Radar") } },
    legend: { show: result.show_legend, type: "scroll", bottom: 0, data: profiles.map(profile => ({ name: profile.id, icon: symbolFor(profile.id) })), formatter: name => formatCell(locale, profiles.find(profile => profile.id === name)?.category) },
    radar: { indicator: axes.map(column => ({ name: column.display_name, min: 0, max: 1 })), center: ["50%", result.show_legend ? "46%" : "50%"], radius: "55%", splitNumber: 4, axisName: { color: theme === "dark" ? "#d7dfef" : "#34415b", width: 120, overflow: "truncate" }, axisLine: { lineStyle: { color: themePalette[theme].grid } }, splitLine: { lineStyle: { color: themePalette[theme].grid } }, splitArea: { show: false } },
    tooltip: boundedPlainTextTooltip(),
    series: [{ type: "radar", symbolSize: 7, lineStyle: { width: 2 }, areaStyle: { opacity: 0.05 },
      label: { show: result.show_labels, opacity: 1, color: theme === "dark" ? "#d7dfef" : "#34415b", backgroundColor: theme === "dark" ? "#1c2738" : "#ffffff", padding: 1, formatter: (event: unknown) => { const value = event as { dimensionIndex: number; data: { exactValues: string[] } }; return value.data.exactValues[value.dimensionIndex] ?? ""; } },
      data: profiles.map(profile => {
        const row = radarRow(result, profile.id);
        if (!row) throw new Error("The statistical field is unavailable. Reload the visualization.");
        const index = identities.indexOf(profile.id), color = palette[index % palette.length];
        const lineType = (["solid", "dashed", "dotted"] as const)[Math.floor(index / palette.length)];
        const exactValues = axes.map(column => String(row[column.engine_name]));
        const opacity = result.highlight_field && result.highlight_value != null && row[result.highlight_field] !== result.highlight_value ? 0.25 : 1;
        return { id: profile.id, name: profile.id, profileIdentity: profile.id, symbol: symbolFor(profile.id), value: profile.positions as number[], exactValues,
          itemStyle: { color, opacity }, lineStyle: { color, opacity, type: lineType }, areaStyle: { color, opacity: 0.05 * opacity },
          exactTooltip: `${formatCell(locale, profile.category)}\n${axes.map((column, index) => `${column.display_name}: ${exactValues[index]} ${radarUnit(column.metadata)}`).join("\n")}`,
        };
      }),
    }],
  };
}
