import type { ResolvedColumn } from "@/features/workflow/types";
import { radarDraft } from "./radar-draft";
import { comboDraft } from "./combo-draft";
import { bubbleDraft } from "./bubble-draft";
import { bulletDraft } from "./bullet-draft";
import type { components } from "@/lib/api-schema";

/** Incomplete form guidance only; the backend remains authoritative for execution validation. */
export function chartSetupHints(type: string, kind: string, config: Record<string, unknown>, columns: ResolvedColumn[]): string[] {
  if (kind === "scalar") return [];
  if (type === "funnel_chart") return (config.spec as { type?: string } | undefined)?.type === type ? [] : ["Select the ordered publication of a Funnel stages node."];
  if (type === "bullet_chart") {
    const spec = bulletDraft(config), decimal = /^[+-]?(?:\d{1,38}(?:\.\d{1,38})?|\.\d{1,38})$/;
    // Syntax/readiness only; exact ordering, scale and population validation belong to the backend.
    return [spec.category_column_id, spec.actual_column_id, spec.target_column_id].every(id => columns.some(c => c.column_id === id)) && decimal.test(spec.minimum) && decimal.test(spec.maximum) && spec.bands.length > 0 && spec.bands.every(b => b.label.trim() && decimal.test(b.upper)) ? [] : ["Choose bullet category, actual, target and explicit scale ranges."];
  }
  if (type === "treemap_chart" || type === "sunburst_chart") {
    const spec = config.spec as components["schemas"]["HierarchySpec"] | undefined;
    return spec?.type === type && columns.some(c => c.column_id === spec.value_column_id && ["sum", "count", "count_rows"].includes(String(c.metadata.aggregation))) ? [] : ["Select a grouped analytical-table publication with all subtotals and a grand total."];
  }
  if (type === "pareto_chart") {
    const spec = config.spec as components["schemas"]["ParetoSpec"] | undefined;
    if (spec?.type !== "pareto_chart") return ["Select the ranked publication of a Pareto contributions node."];
    return Number.isInteger(spec.threshold_percent ?? 80) && (spec.threshold_percent ?? 80) >= 1 && (spec.threshold_percent ?? 80) <= 100 ? [] : ["Choose a whole-number cumulative share reference from 1 to 100%."];
  }
  if (type === "bubble_chart") {
    const spec = bubbleDraft(config);
    const category = (id: string) => columns.some(c => c.column_id === id && ["string", "integer", "boolean", "date"].includes(c.logical_type));
    return category(spec.key_column_id) && [spec.x_column_id, spec.y_column_id, spec.size_column_id].every(id => columns.some(c => c.column_id === id && ["integer", "float", "decimal"].includes(c.logical_type))) && [spec.label_column_id, spec.group_column_id].every(id => !id || category(id)) ? [] : ["Choose a unique observation key and numeric X, Y and size fields."];
  }
  if (type === "analytical_table") {
    const spec = config.spec as components["schemas"]["AnalyticalTableSpec"] | undefined;
    if (!spec) return ["Select the dataset publication of an Analytical table totals node."];
    const decimal = /^[+-]?(?:\d{1,38}(?:\.\d{1,38})?|\.\d{1,38})$/;
    return (spec.visible_measures ?? spec.measures).length && (spec.rules ?? []).every(r => r.label.trim() && (r.operator === "is_empty" || decimal.test(r.threshold ?? "") && (r.operator !== "between" || decimal.test(r.upper ?? "")))) ? [] : ["Choose at least one measure and complete the rule labels and decimal thresholds."];
  }
  if (type === "combo_chart") {
    const spec = comboDraft(config), ids = [spec.category_column_id, ...spec.series.map(s => s.column_id)];
    const axes = new Set(spec.series.map(s => s.axis ?? "primary"));
    return spec.series.length >= 2 && spec.series.length <= 8 && new Set(ids).size === ids.length && ids.every(id => columns.some(c => c.column_id === id)) && new Set(spec.series.map(s => s.kind)).size === 2 && axes.has("primary") && (spec.secondary_axis ? axes.has("secondary") : !axes.has("secondary")) ? [] : ["Choose a category, distinct bar and line measures, and assign enabled axes."];
  }
  if (type === "radar_chart") {
    const spec = radarDraft(config);
    const selected = [spec.profile_column_id, ...spec.axes.map(axis => axis.column_id)];
    return ["shared", "min_max"].includes(spec.normalization) && spec.axes.length >= 3 && spec.axes.length <= 8 && new Set(selected).size === selected.length && selected.every(id => columns.some(c => c.column_id === id)) && spec.axes.every(axis => axis.minimum.trim() && axis.maximum.trim()) ? [] : ["Choose a profile, 3–8 different numeric axes, normalization and every scale bound."];
  }
  if (type === "waterfall_chart") return config.spec ? [] : ["Select the dataset publication of a Waterfall steps node."];
  if (type === "box_plot") return config.spec ? [] : ["Select a Box plot statistics summary publication."];
  if (type === "histogram_chart") return config.spec ? [] : ["Select the intervals publication of a Histogram statistics node."];
  if (type === "heatmap_chart") return config.spec ? [] : ["Select the dataset publication of a Heatmap cells node."];
  const exists = (id: unknown) => typeof id === "string" && columns.some(column => column.column_id === id);
  const hints: string[] = [];
  if (!["table", "kpi"].includes(type) && !exists(config.category_column_id)) hints.push("Choose a category field.");
  if (type !== "table" && !exists(config.value_column_id)) hints.push("Choose a value field.");
  if (type === "table" && Array.isArray(config.column_ids) && (!config.column_ids.length || config.column_ids.some(id => !exists(id)))) hints.push("Select available table columns and remove unavailable ones.");
  const series = (config.additional_series ?? []) as { column_id: string; name: string }[];
  if (series.some(item => !exists(item.column_id) || !item.name.trim())) hints.push("Choose a field and name for every additional series.");
  if (series.length && new Set([config.value_column_id, ...series.map(item => item.column_id)]).size !== series.length + 1) hints.push("Choose different value fields for the series.");
  return hints;
}

export const chartPurpose: Record<string, string> = {
  bullet_chart: "Compare prepared actual and target with explicit ranges. One row per category; aggregate or align upstream.",
  funnel_chart: "Compare explicit ordered stages, retention and loss from the same prepared population.",
  treemap_chart: "Compare additive contributions across a hierarchy using nested rectangles.",
  sunburst_chart: "Compare additive contributions across a hierarchy using concentric rings.",
  pareto_chart: "Compare ranked contributions and cumulative share. Prepare categories in Pareto contributions.",
  bubble_chart: "Compare X and Y with a third measure encoded as area. Prepare one row per unique key upstream.",
  analytical_table: "Inspect prepared groups and totals. Pin columns and set exact threshold rules on Appearance.",
  combo_chart: "Compare prepared bars and lines. Each category needs one row; group and sort in the calculation graph.",
  waterfall_chart: "Explain signed contributions and explicit totals. Configure the sequence in Waterfall steps.",
  radar_chart: "Compare prepared profiles on explicit scales. Missing profiles remain visible in the exact table.",
  histogram_chart: "Show frequencies in equal-width intervals. Configure the field, interval count and range in Histogram statistics.",
  heatmap_chart: "Compare two dimensions. Configure fields and aggregation in Heatmap cells; colour never replaces exact values.",
  box_plot: "Compare distributions using prepared quartiles, whiskers and outliers from one calculation.",
  table: "Show individual records. Choose and arrange columns on Appearance.",
  kpi: "Show one prepared value. Aggregate to one row in the workflow first.",
  bar_chart: "Compare prepared values by category. Totals are calculated in the workflow.",
  line_chart: "Show a trend over dates or an ordered category.",
  area_chart: "Show a trend with a filled area below the line.",
  pie_chart: "Show parts of a total using prepared category values.",
  donut_chart: "Show parts of a total using prepared category values.",
  scatter_chart: "Compare two numeric fields as points.",
};
