import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen } from "@testing-library/react";
import { render } from "./render";
import { afterEach, expect, it, vi } from "vitest";
import type { VisualizationResult } from "@/features/dashboard/api";
import { chartOptions, VisualizationView } from "@/features/dashboard/VisualizationView";

const result: VisualizationResult = {
  visualization_id: "chart", revision: 1, type: "line_chart", title: "Revenue", value_field: "total", category_field: "day",
  number_format: "number", decimals: 2, currency: "USD", show_labels: false, show_legend: true,
  total_rows: 2, offset: 0, limit: 2, truncated: false,
  columns: [
    { column_id: "date", engine_name: "day", display_name: "Day", logical_type: "date", nullable: false, metadata: {} },
    { column_id: "total", engine_name: "total", display_name: "Total", logical_type: "float", nullable: false, metadata: {} },
  ],
  rows: [{ day: "2026-01-01", total: 10 }, { day: "2026-01-02", total: 20 }],
};
afterEach(() => vi.unstubAllGlobals());

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
