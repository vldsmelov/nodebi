import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen } from "@testing-library/react";
import { render } from "./render";
import { afterEach, expect, it, vi } from "vitest";
import type { VisualizationResult } from "@/features/dashboard/api";
import { chartOptions, format, isHighlighted, VisualizationView } from "@/features/dashboard/VisualizationView";

const result: VisualizationResult = {
  orientation: "vertical",
  visualization_revision: 1, visualization_id: "chart", revision: 1, type: "line_chart", title: "Revenue", value_field: "total", category_field: "day",
  number_format: "number", decimals: 2, currency: "USD", show_labels: false, show_legend: true,
  total_rows: 2, offset: 0, limit: 2, truncated: false,
  columns: [
    { column_id: "date", engine_name: "day", display_name: "Day", logical_type: "date", nullable: false, metadata: {} },
    { column_id: "total", engine_name: "total", display_name: "Total", logical_type: "float", nullable: false, metadata: {} },
  ],
  rows: [{ day: "2026-01-01", total: 10 }, { day: "2026-01-02", total: 20 }],
};
afterEach(() => vi.unstubAllGlobals());

it("highlights stable identities without changing values or prepared row order", () => {
  const selected = { ...result, type: "bar_chart" as const, orientation: "horizontal" as const, highlight_field: "identity", highlight_value: 0, rows: [{ day: "Repeated", total: 10, identity: 1 }, { day: "Repeated", total: 20, identity: 0 }] };
  expect(isHighlighted(selected, selected.rows[0])).toBe(false);
  expect(isHighlighted(selected, selected.rows[1])).toBe(true);
  const options = chartOptions(selected);
  expect(options.series).toMatchObject([{ data: [{ value: 10, itemStyle: { opacity: 0.35 } }, { value: 20, itemStyle: { opacity: 1 } }] }]);
  expect(options.yAxis).toMatchObject({ data: ["Repeated", "Repeated"] });
});

it("passes the selected row's stable IDs while keeping context fields out of the table", async () => {
  const table = { ...result, type: "table", context_column_ids: ["identity"], columns: [...result.columns, { column_id: "identity", engine_name: "row_id", display_name: "Stable ID", logical_type: "integer", nullable: false, metadata: {} }], rows: [{ day: "Same label", total: 10, row_id: 1 }, { day: "Same label", total: 20, row_id: 2 }] };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(table))));
  const selected = vi.fn();
  render(<QueryClientProvider client={new QueryClient()}><VisualizationView id="navigation-table" onSelect={selected} /></QueryClientProvider>);
  const labels = await screen.findAllByText("Same label");
  expect(screen.queryByText("Stable ID")).toBeNull();
  fireEvent.click(labels[1]);
  expect(selected).toHaveBeenCalledWith({ date: "Same label", total: 20, identity: 2 });
});

it("formats table ratios independently and preserves text KPI values", () => {
  const settings = { ...result, column_formats: { ratio: { number_format: "percent" as const, decimals: 1, currency: "USD" } } };
  expect(format(0.125, settings, "en", "float", "ratio")).toBe("12.5%");
  expect(format(0.125, settings, "en", "float", "total")).toBe("0.13");
  expect(format("Class A", settings, "ru", "string")).toBe("Class A");
});

it("uses horizontal bars without changing the prepared ordering", () => {
  const options = chartOptions({ ...result, type: "bar_chart", orientation: "horizontal" });
  expect(options.xAxis).toMatchObject({ type: "value" });
  expect(options.yAxis).toMatchObject({ type: "category", inverse: true, data: ["2026-01-01", "2026-01-02"] });
  expect(options.series).toMatchObject([{ type: "bar", data: [10, 20] }]);
  const percent = chartOptions({ ...result, type: "bar_chart", orientation: "horizontal", number_format: "percent", decimals: 1 }, "en");
  const series = percent.series as { label: { formatter: (params: { value: number }) => string } }[];
  expect(series[0].label.formatter({ value: 0.125 })).toBe("12.5%");
});

it("uses a temporal axis for dates and preserves prepared values", () => {
  const options = chartOptions(result);
  expect(options.aria).toMatchObject({ label: { description: "Revenue" } });
  expect(options.xAxis).toMatchObject({ type: "time" });
  expect(options.series).toMatchObject([{ type: "line", data: [[Date.parse("2026-01-01T00:00:00Z"), 10], [Date.parse("2026-01-02T00:00:00Z"), 20]] }]);
  expect(chartOptions({ ...result, type: "area_chart" }).series).toMatchObject([{ areaStyle: { opacity: 0.3 } }]);
});

it("uses separate pie slices without aggregating them in the browser", () => {
  expect(chartOptions({ ...result, type: "donut_chart" }).series).toMatchObject([
    { type: "pie", radius: ["40%", "65%"], data: [{ name: "2026-01-01", value: 10 }, { name: "2026-01-02", value: 20 }] },
  ]);
});

it("loads table pages from the backend while retaining the full row count", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ ...result, type: "table", total_rows: 101, limit: 100, truncated: true })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ ...result, type: "table", rows: [{ day: "last", total: 999 }], total_rows: 101, offset: 100, limit: 100, truncated: false })));
  vi.stubGlobal("fetch", fetcher);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><VisualizationView id="table" /></QueryClientProvider>);
  expect(await screen.findByText(/Total rows: 101/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(await screen.findByText("last")).toBeVisible();
  expect(fetcher.mock.calls[1][0]).toContain("offset=100&limit=100");
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
});
