import type { EChartsOption } from "echarts";
import { formatCell, translate, type Locale } from "@/lib/locale";
import type { Theme } from "@/lib/theme";
import type { VisualizationResult } from "./api";
import { comboField, comboUnit } from "./combo";
import { boundedPlainTextTooltip } from "./chart-tooltip";

export function hierarchyRows(result: VisualizationResult, locale: Locale) {
  const spec = result.spec;
  if (!result.hierarchy || !spec || !(spec.type === "treemap_chart" || spec.type === "sunburst_chart")) throw new Error("The statistical field is unavailable. Reload the visualization.");
  const key = comboField(result, spec.rows.row_id), measure = comboField(result, spec.value_column_id);
  const dimensions = spec.dimensions.map(id => comboField(result, id));
  const indexed = new Map(result.rows.map(row => [String(row[key.engine_name]), row]));
  return result.hierarchy.points.map(point => {
    const row = indexed.get(point.id)!;
    const path = dimensions.slice(0, point.depth).map(field => row[field.engine_name] == null ? translate(locale, "Missing category") : row[field.engine_name] === "" ? translate(locale, "Empty text") : formatCell(locale, row[field.engine_name], field.logical_type));
    return { ...point, row, path, label: path.at(-1) ?? translate(locale, "Grand total"), value: row[measure.engine_name] == null ? "—" : String(row[measure.engine_name]) };
  });
}

export function hierarchySelection(result: VisualizationResult, event: unknown) {
  const id = (event as { data?: { hierarchyIdentity?: unknown } })?.data?.hierarchyIdentity;
  return typeof id === "string" ? hierarchyRows(result, "en").find(point => point.id === id)?.row : undefined;
}

type DrawingNode = { id: string; hierarchyIdentity: string; name: string; value: number; exactTooltip: string; children: DrawingNode[]; itemStyle: { color: string } };
export function hierarchyOptions(result: VisualizationResult, locale: Locale, theme: Theme): EChartsOption {
  const points = hierarchyRows(result, locale), root = result.hierarchy!.root_id;
  const spec = result.spec;
  if (!spec || !(spec.type === "treemap_chart" || spec.type === "sunburst_chart")) throw new Error("The statistical field is unavailable. Reload the visualization.");
  const measure = comboField(result, spec.value_column_id), unit = comboUnit(measure.metadata);
  const palette = theme === "dark" ? ["#93b4ff", "#edb078", "#da9def", "#6acbb6", "#f49eb1", "#a8c977"] : ["#315cba", "#ad5b13", "#7a439e", "#217763", "#b33d60", "#587927"];
  const nodes = new Map<string, DrawingNode>(points.map(point => {
    const hash = [...point.id].reduce((h, char) => (h * 31 + char.charCodeAt(0)) >>> 0, 0);
    return [point.id, { id: point.id, hierarchyIdentity: point.id, name: point.label, value: point.weight,
      exactTooltip: `${point.path.join(" / ") || point.label}\n${measure.display_name}: ${point.value}${unit ? ` ${unit}` : ""}\n${translate(locale, "Share of complete total")}: ${point.share_exact ?? "—"}`,
      itemStyle: { color: palette[hash % palette.length] }, children: [] } satisfies DrawingNode];
  }));
  for (const point of points) if (point.parent_id) nodes.get(point.parent_id)?.children.push(nodes.get(point.id)!);
  const data = nodes.get(root)?.children ?? [];
  // A text halo preserves category fills: treemap label boxes cover whole tiles.
  const labelInk = { color: theme === "dark" ? "#d7dfef" : "#34415b", textBorderColor: theme === "dark" ? "#1c2738" : "#ffffff", textBorderWidth: 3, opacity: 1 };
  const label = { ...labelInk, show: result.show_labels, overflow: "truncate" };
  const common = { data, animation: false, nodeClick: false, label,
    emphasis: { focus: "ancestor", label: labelInk, upperLabel: labelInk },
    blur: { label: labelInk, upperLabel: labelInk },
  };
  return {
    animation: false, backgroundColor: "transparent", aria: { enabled: true, label: { description: result.title } },
    tooltip: boundedPlainTextTooltip(),
    series: [result.type === "treemap_chart" ? { ...common, type: "treemap", roam: false, sort: false, visibleMin: 0, childrenVisibleMin: 0, breadcrumb: { show: false }, left: 8, right: 8, top: 8, bottom: 8,
      upperLabel: { ...label, height: 18 }, itemStyle: { borderColor: theme === "dark" ? "#202a3a" : "#fff", borderWidth: 1, gapWidth: 1 } }
      : { ...common, type: "sunburst", sort: null, radius: [0, "90%"], label: { ...label, rotate: "radial" }, itemStyle: { borderColor: theme === "dark" ? "#202a3a" : "#fff", borderWidth: 1 } }],
  } as EChartsOption;
}
