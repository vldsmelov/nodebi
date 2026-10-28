"use client";

import type { components } from "@/lib/api-schema";
import type { ResolvedColumn } from "@/features/workflow/types";
import { HistogramConfiguration } from "@/features/workflow/HistogramConfiguration";
import { BoxPlotStatsConfiguration } from "@/features/workflow/BoxPlotStatsConfiguration";
import { HeatmapConfiguration } from "@/features/workflow/HeatmapConfiguration";
import { TableRollupConfiguration } from "@/features/workflow/TableRollupConfiguration";
import { ParetoConfiguration } from "@/features/workflow/ParetoConfiguration";
import { FunnelConfiguration } from "@/features/workflow/FunnelConfiguration";
import { WaterfallConfiguration } from "@/features/workflow/WaterfallConfiguration";

type ServerAnalysis = components["schemas"]["StatisticalReportRequest"]["analysis"];
type Heatmap = Extract<ServerAnalysis, { type: "heatmap_stats" }>;
type Rollup = Extract<ServerAnalysis, { measures: unknown }>;
export type Analysis = Exclude<ServerAnalysis, Heatmap | Rollup>
  | (Omit<Heatmap, "aggregation"> & { aggregation: Heatmap["aggregation"] | "" })
  | (Omit<Rollup, "measures"> & { measures: (Omit<Rollup["measures"][number], "operation"> & { operation: Rollup["measures"][number]["operation"] | "" })[] });
export function newAnalysis(type: Analysis["type"], previous: Analysis): Analysis {
  const value_column_id = "value_column_id" in previous ? previous.value_column_id : "";
  if (type === "table_rollup" || type === "treemap_chart" || type === "sunburst_chart") return { type, dimensions: [], measures: [], subtotals: true, grand_total: true };
  if (type === "pareto") return { type, category_column_id: "", value_column_id };
  if (type === "funnel_steps") return { type, stage_column_id: "", order_column_id: "", value_column_id };
  if (type === "waterfall_steps") return { type, category_column_id: "", order_column_id: "", value_column_id, initial_marker: "initial", change_marker: "change", subtotal_marker: "subtotal", total_marker: "total", append_total: false, total_label: "Total" };
  // The form deliberately starts incomplete; only the server validates the submitted node config.
  if (type === "heatmap_stats") return { type, x_column_id: "", y_column_id: "", value_column_id, aggregation: "", average_scale: 6 };
  return type === "boxplot_stats" ? { type, value_column_id } : { type: "histogram", value_column_id, bin_count: 20 };
}
export function analysisComplete(analysis: Analysis): analysis is ServerAnalysis {
  if ("measures" in analysis) {
    const completeTotals = analysis.type === "table_rollup" || (
      !!analysis.dimensions?.length && analysis.measures.length === 1
      && ["sum", "count", "count_rows"].includes(analysis.measures[0].operation)
      && analysis.subtotals !== false && analysis.grand_total !== false
    );
    return completeTotals && !!analysis.measures.length && (analysis.dimensions ?? []).every(Boolean)
      && analysis.measures.every(m => !!m.name.trim() && !!m.operation && (m.operation === "count_rows" || !!m.column_id) && (m.operation !== "ratio_of_sums" || !!m.denominator_column_id));
  }
  if (!analysis.value_column_id) return false;
  if (analysis.type === "pareto") return !!analysis.category_column_id;
  if (analysis.type === "funnel_steps") return !!analysis.stage_column_id && !!analysis.order_column_id;
  if (analysis.type === "waterfall_steps") return !!analysis.category_column_id && analysis.order_column_id !== undefined && analysis.order_column_id !== "" && (!analysis.append_total || !!(analysis.total_label ?? "Total").trim());
  return analysis.type !== "heatmap_stats" || !!analysis.x_column_id && !!analysis.y_column_id && !!analysis.aggregation;
}
export function StatisticalAnalysisConfiguration({ analysis, columns, onChange }: { analysis: Analysis; columns: ResolvedColumn[]; onChange: (analysis: Analysis) => void }) {
  const props = { config: analysis, columns, onChange: (config: Record<string, unknown>) => onChange(config as Analysis) };
  if ("measures" in analysis) return <TableRollupConfiguration {...props} hierarchyOnly={analysis.type !== "table_rollup"} />;
  if (analysis.type === "pareto") return <ParetoConfiguration {...props} />;
  if (analysis.type === "funnel_steps") return <FunnelConfiguration {...props} />;
  if (analysis.type === "waterfall_steps") return <WaterfallConfiguration {...props} />;
  if (analysis.type === "heatmap_stats") return <HeatmapConfiguration {...props} />;
  return analysis.type === "boxplot_stats" ? <BoxPlotStatsConfiguration {...props} /> : <HistogramConfiguration {...props} />;
}
