import type { EChartsOption } from "echarts";

export type LegendEntry = { name: string; label: string; selected: boolean };
const nameOf = (value: unknown): string | undefined => typeof value === "string" ? value
  : value && typeof value === "object" && "name" in value && typeof value.name === "string" ? value.name : undefined;

/** Project only the renderer's existing legend. No data filtering or calculations live here. */
export function chartLegend(option: EChartsOption): LegendEntry[] {
  const legend = Array.isArray(option.legend) ? option.legend[0] : option.legend;
  if (!legend || legend.show === false || legend.selectedMode === false) return [];
  const series = Array.isArray(option.series) ? option.series : option.series ? [option.series] : [];
  const names = legend.data ? legend.data.map(nameOf) : series.flatMap(item =>
    (item.type === "pie" || item.type === "radar") && Array.isArray(item.data)
      ? item.data.map(nameOf) : [nameOf(item)]);
  return [...new Set(names.filter((name): name is string => !!name))].map(name => ({
    name,
    label: typeof legend.formatter === "function" ? legend.formatter(name)
      : typeof legend.formatter === "string" ? legend.formatter.replaceAll("{name}", name) : name,
    selected: legend.selected?.[name] !== false,
  }));
}
