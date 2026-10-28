import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { init } from "echarts";
import { render } from "./render";
import { HistogramConfiguration } from "@/features/workflow/HistogramConfiguration";
import { chartOptions } from "@/features/dashboard/VisualizationView";
import { HistogramView } from "@/features/dashboard/HistogramView";
import { expectMarkBoundary } from "./mark-contrast";
import { histogramOptions, histogramSelection } from "@/features/dashboard/histogram";
import type { VisualizationResult } from "@/features/dashboard/api";
import type { components } from "@/lib/api-schema";

const binNames = ["bin_id", "bin_index", "lower", "upper", "upper_inclusive", "interval", "count"];
const summaryNames = ["input_count", "valid_count", "missing_count", "included_count", "below_count", "above_count", "bin_count", "range_min", "range_max"];
const bindings = (names: string[]) => Object.fromEntries(names.map(name => [name, `id_${name}`]));
const columns = (names: string[]) => names.map(name => ({ column_id: `id_${name}`, engine_name: name, display_name: name, logical_type: "string" as const, nullable: false, metadata: {} }));
const spec: components["schemas"]["HistogramSpec"] = { version: 1, type: "histogram_chart", bins: bindings(binNames) as components["schemas"]["HistogramRoles"], summary: bindings(summaryNames) as components["schemas"]["HistogramSummaryRoles"] };
const rows = [{ bin_id: "b2", bin_index: 1, interval: "[9007199254740993.11; 9007199254740993.12)", count: 2 }, { bin_id: "b1", bin_index: 2, interval: "[9007199254740993.12; 9007199254740993.13]", count: 3 }];
const result: VisualizationResult = { type: "histogram_chart", spec, rows, columns: columns(binNames),
  visualization_id: "h", revision: 1, visualization_revision: 1, title: "Distribution", category_field: "interval", value_field: "count",
  total_rows: 2, offset: 0, limit: 2, truncated: false, number_format: "number", decimals: 0, currency: "USD", orientation: "vertical", show_legend: false, show_labels: true,
  datasets: { bins: { columns: columns(binNames), rows, total_rows: 2, offset: 0, limit: 2, truncated: false },
    summary: { columns: columns(summaryNames), rows: [{ included_count: 5, missing_count: 1, below_count: 2, above_count: 3 }], total_rows: 1, offset: 0, limit: 1, truncated: false } },
};

it.each(["light", "dark"] as const)("renders contrasting histogram boundaries in %s", theme => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 640, height: 400 });
  try {
    for (const orientation of ["vertical", "horizontal"] as const) for (const highlighted of [false, true]) {
      chart.setOption({ ...histogramOptions({ ...result, orientation,
        ...(highlighted ? { highlight_field: "interval", highlight_value: rows[0].interval } : {}),
      }, "en", theme), animation: false }, true);
      const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
      const bars = [...svg.querySelectorAll('path[ecmeta_ssr_type="chart"][stroke]')];
      expect(bars).toHaveLength(2);
      for (const [index, mark] of bars.entries()) expectMarkBoundary(mark, theme, 1, highlighted && index === 1 ? 0.3 : 1);
    }
  } finally { chart.dispose(); context.mockRestore(); }
});

it("configures 20 default intervals and preserves decimal range strings", () => {
  const changed = vi.fn();
  render(<HistogramConfiguration config={{ value_column_id: "v", range_min: "0", range_max: "1" }} columns={[]} onChange={changed} />);
  expect(screen.getByLabelText("Interval count")).toHaveValue(20);
  fireEvent.change(screen.getByLabelText("Histogram upper bound"), { target: { value: "9007199254740993.13" } });
  expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ range_max: "9007199254740993.13" }));
});

it("plots prepared counts on equal-width categories without converting exact boundaries", () => {
  const option = chartOptions(result, "en", "light");
  expect(option.xAxis).toMatchObject({ data: rows.map(row => row.interval) });
  expect(option.series).toMatchObject([{ barCategoryGap: "0%", data: [{ id: "b2", value: 2 }, { id: "b1", value: 3 }] }]);
  expect(chartOptions({ ...result, orientation: "horizontal" }).yAxis).toMatchObject({ type: "category" });
  expect(histogramSelection(result, { dataIndex: 0, data: { binIdentity: "b1" } })).toBe(rows[1]);
});

it("keeps exact interval boundaries in escaped bounded tooltips", () => {
  const option = histogramOptions(result, "en", "light");
  const tooltip = option.tooltip as { formatter: (event: unknown) => string };
  expect(tooltip).toMatchObject({ renderMode: "html", appendToBody: true, confine: true });
  const data = (option.series as { data: { exactTooltip: string }[] }[])[0].data[1];
  const parsed = new DOMParser().parseFromString(tooltip.formatter({ data }), "text/html");
  expect(parsed.querySelector('[role="tooltip"]')?.textContent).toBe(`${rows[1].interval}\nObservations: 3`);
  const unsafe = new DOMParser().parseFromString(tooltip.formatter({ data: { exactTooltip: '<img src=x onerror=alert(1)> & "interval"' } }), "text/html");
  expect(unsafe.querySelector("img")).toBeNull();
  expect(unsafe.querySelector('[role="tooltip"]')?.textContent).toBe('<img src=x onerror=alert(1)> & "interval"');
});

it.each(["light", "dark"] as const)("keeps histogram count labels opaque in normal and muted states in %s", theme => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 640, height: 400 });
  try {
    for (const orientation of ["vertical", "horizontal"] as const) for (const muted of [true, false]) {
      const option = histogramOptions({ ...result, orientation, rows: rows.map((row, i) => ({ ...row, count: i ? 23 : 17 })), ...(muted ? { highlight_field: "interval", highlight_value: rows[0].interval } : {}) }, "en", theme);
      chart.setOption(option, true);
      const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
      const label = Array.from(svg.querySelectorAll("text")).find(node => node.textContent === "23");
      expect(label).toBeDefined();
      expect(Number(label?.getAttribute("fill-opacity") ?? 1)).toBe(1);
      expect(label?.getAttribute("fill")).toBe(theme === "dark" ? "#d7dfef" : "#34415b");
      expect(option.series).toMatchObject([{ data: [{ value: 17, itemStyle: { opacity: 1 } }, { value: 23, itemStyle: { opacity: muted ? 0.3 : 1 } }] }]);
    }
  } finally { chart.dispose(); context.mockRestore(); }
});

it("shows complete observation accounting and exact interval table", () => {
  render(<HistogramView result={result}><div>Canvas</div></HistogramView>);
  expect(screen.getByText("Included: 5. Missing: 1. Below range: 2. Above range: 3.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Histogram intervals" }));
  expect(screen.getByRole("table")).toHaveClass("text-sm");
  expect(screen.getByRole("table")).toHaveAccessibleName();
  expect(screen.getByRole("table").parentElement).toHaveAttribute("role", "region");
  expect(screen.getByRole("table").parentElement).toHaveAccessibleName();
  expect(screen.getByRole("table").parentElement).toHaveAttribute("tabindex", "0");
  expect(screen.getByRole("table").parentElement).toHaveClass("min-w-0", "overflow-auto");
  expect(screen.getByRole("columnheader", { name: "count" })).toHaveClass("text-right");
  expect(screen.getByRole("columnheader", { name: "count" })).toHaveAttribute("scope", "col");
  expect(screen.getByRole("cell", { name: "2" })).toHaveClass("text-right", "tabular-nums");
  expect(screen.getByRole("cell", { name: rows[0].interval })).toHaveClass("text-left");
  expect(screen.getByRole("cell", { name: rows[0].interval })).toBeVisible();
});
