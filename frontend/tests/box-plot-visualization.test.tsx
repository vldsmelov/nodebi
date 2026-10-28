import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { init } from "echarts";
import { render } from "./render";
import type { components } from "@/lib/api-schema";
import type { VisualizationResult } from "@/features/dashboard/api";
import { chartOptions } from "@/features/dashboard/VisualizationView";
import { boxPlotSelection } from "@/features/dashboard/box-plot";
import { BoxPlotView } from "@/features/dashboard/BoxPlotView";
import { expectMarkBoundary } from "./mark-contrast";
import { chartSetupHints } from "@/features/dashboard/authoring-guidance";

const names = ["group_id", "group", "count", "missing_count", "minimum", "lower_whisker", "q1", "median", "q3", "upper_whisker", "maximum", "outlier_count"];
const spec: components["schemas"]["BoxPlotSpec"] = {
  version: 1, type: "box_plot",
  summary: Object.fromEntries(names.map(name => [name, `id_${name}`])) as components["schemas"]["BoxSummaryRoles"],
  outliers: { group_id: "id_group_id", group: "id_group", point_id: "id_point_id", value: "id_value" },
};
const columns = (names: string[]) => names.map(name => ({ column_id: `id_${name}`, engine_name: name, display_name: name, logical_type: (name === "group" || name.endsWith("id") ? "string" : "decimal") as "string" | "decimal", nullable: true, metadata: {} }));
const rows = [
  { group_id: "g2", group: "Same", lower_whisker: "1.00", q1: "2.25", median: "4.50", q3: "6.75", upper_whisker: "8.00", count: 10, missing_count: 0 },
  { group_id: "g1", group: "Same", lower_whisker: null, q1: null, median: null, q3: null, upper_whisker: null, count: 0, missing_count: 1 },
];
const points = [{ group_id: "g2", group: "Same", point_id: "p100", value: "9007199254740993.25" }];
const result: VisualizationResult = {
  type: "box_plot", spec, visualization_id: "chart", revision: 1, visualization_revision: 1,
  title: "Distribution", category_field: "group", value_field: "median", rows, columns: columns(names),
  offset: 0, limit: 2, total_rows: 2, truncated: false, number_format: "number", decimals: 2,
  currency: "USD", orientation: "vertical", show_legend: true, show_labels: true,
  datasets: {
    summary: { columns: columns(names), rows, offset: 0, limit: 2, total_rows: 2, truncated: false },
    outliers: { columns: columns(["group_id", "group", "point_id", "value"]), rows: points, offset: 0, limit: 100, total_rows: 101, truncated: true },
  },
};

it.each(["light", "dark"] as const)("renders contrasting box/whisker boundaries in %s", theme => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 640, height: 400 });
  try {
    for (const orientation of ["vertical", "horizontal"] as const) for (const muted of [false, true]) {
      chart.setOption({ ...chartOptions({ ...result, orientation,
        ...(muted ? { highlight_field: "group_id", highlight_value: "g1" } : {}),
      }, "en", theme), animation: false }, true);
      const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
      const outlines = [...svg.querySelectorAll('path[ecmeta_ssr_type="chart"][stroke]')]
        .filter(mark => mark.getAttribute("stroke") !== "none");
      expect(outlines.length).toBeGreaterThan(0);
      for (const mark of outlines) expectMarkBoundary(mark, theme, 2, muted ? 0.3 : 1);
    }
  } finally { chart.dispose(); context.mockRestore(); }
});

it.each(["light", "dark"] as const)("actually renders exact median labels in %s, including muted groups", theme => {
  // SVG SSR uses ECharts' text-metric fallback; jsdom has no canvas context.
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 600, height: 400 });
  try {
    for (const orientation of ["vertical", "horizontal"] as const) {
      chart.setOption({ ...chartOptions({ ...result, orientation, highlight_field: "group_id", highlight_value: "g1" }, "en", theme), animation: false }, true);
      const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
      const median = Array.from(svg.querySelectorAll("text")).find(node => node.textContent === "4.50");
      expect(median).toBeDefined();
      expect(median?.getAttribute("fill")).toBe(theme === "dark" ? "#d7dfef" : "#34415b");
      expect(Number(median?.getAttribute("fill-opacity") ?? 1)).toBe(1);
      chart.dispatchAction({ type: "legendUnSelect", name: "Distribution summary" });
      expect(chart.renderToSVGString()).not.toContain(">4.50</text>");
      chart.dispatchAction({ type: "legendSelect", name: "Distribution summary" });
      expect(chart.renderToSVGString()).toContain(">4.50</text>");
    }
    chart.setOption({ ...chartOptions({ ...result, show_labels: false }, "en", theme), animation: false }, true);
    expect(chart.renderToSVGString()).not.toContain(">4.50</text>");
  } finally { chart.dispose(); context.mockRestore(); }
});

it("renders backend quartiles unchanged, leaves missing boxes empty and preserves exact tooltip data", () => {
  const options = chartOptions(result, "en", "light");
  expect(options.series).toMatchObject([
    { type: "boxplot", itemStyle: { color: "#0956bb26", borderColor: "#0956bb", borderWidth: 2 }, data: [{ id: "g2", value: [1, 2.25, 4.5, 6.75, 8] }, { id: "g1", value: ["-", "-", "-", "-", "-"] }] },
    { type: "scatter", data: [{ id: "p100", groupIdentity: "g2", exactTooltip: "Same\nOutliers: 9007199254740993.25" }] },
    { type: "scatter", silent: true, data: [{ id: "g2", value: [0, 4.5], exactMedian: "4.50" }] },
  ]);
  const horizontal = chartOptions({ ...result, orientation: "horizontal" });
  expect(horizontal.xAxis).toMatchObject({ type: "value" });
  expect(horizontal.series).toMatchObject([{ layout: "horizontal" }, { data: [{ value: [Number(points[0].value), 0] }] }, { data: [{ value: [4.5, 0] }] }]);
  expect(result.rows).toEqual(rows);
});

it("selects group identity rather than scatter index or repeated label", () => {
  expect(boxPlotSelection(result, { dataIndex: 1, data: { groupIdentity: "g2" } })).toBe(rows[0]);
  expect(boxPlotSelection(result, { dataIndex: 0, data: { groupIdentity: "g1" } })).toBe(rows[1]);
  expect(boxPlotSelection(result, { dataIndex: 0 })).toBeUndefined();
});

it("offers exact tables, bounded paging and keyboard-accessible group selection", () => {
  const selected = vi.fn(), page = vi.fn();
  render(<BoxPlotView result={result} setOffset={page} onSelect={selected}><div>Canvas placeholder</div></BoxPlotView>);
  expect(screen.getByRole("status")).toHaveTextContent("Showing 1 of 101 outliers");
  fireEvent.click(screen.getByRole("button", { name: "Outliers" }));
  expect(screen.getByRole("cell", { name: "9007199254740993.25" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Select" }));
  expect(selected).toHaveBeenCalledWith(expect.objectContaining({ id_group_id: "g2", id_median: "4.50" }));
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(page).toHaveBeenCalledWith(100);
  fireEvent.click(screen.getByRole("button", { name: "Distribution summary" }));
  expect(screen.getByRole("table")).toHaveClass("text-sm");
  expect(screen.getByRole("table")).toHaveAccessibleName();
  expect(screen.getByRole("table").parentElement).toHaveAttribute("role", "region");
  expect(screen.getByRole("table").parentElement).toHaveAccessibleName();
  expect(screen.getByRole("table").parentElement).toHaveAttribute("tabindex", "0");
  expect(screen.getByRole("table").parentElement).toHaveClass("min-w-0", "overflow-auto");
  const renderedTable = screen.getByRole("table") as HTMLTableElement;
  const firstRow = renderedTable.tBodies[0].rows[0];
  for (const [index, cell] of Array.from(firstRow.cells).entries()) {
    if (cell.classList.contains("text-right")) expect(renderedTable.tHead!.rows[0].cells[index]).toHaveClass("text-right");
  }
  expect(screen.getByRole("cell", { name: "4.50" })).toBeInTheDocument();
});

it("requires a typed binding instead of generic category/value controls", () => {
  expect(chartSetupHints("box_plot", "dataset", {}, result.columns)).toHaveLength(1);
  expect(chartSetupHints("box_plot", "dataset", { spec }, result.columns)).toEqual([]);
  expect(() => chartOptions({ ...result, spec: { ...spec, summary: { ...spec.summary, median: "missing" } } })).toThrow("statistical field");
});
