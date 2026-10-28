import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n";
import { translate } from "@/lib/locale";
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

it("disables plain-table pagination while retaining a requested page and restores it after arrival", async () => {
  const table: VisualizationResult = { ...result, type: "table", total_rows: 201, limit: 100, truncated: true };
  let finish!: (response: Response) => void;
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(table)))
    .mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
  vi.stubGlobal("fetch", fetcher);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><VisualizationView id="paged-table" /></QueryClientProvider>);
  const next = await screen.findByRole("button", { name: "Next page" });
  fireEvent.click(next);
  await screen.findByText("Showing previous result. Waiting for updated data.");
  expect(next).toBeDisabled();
  expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  expect(screen.getByText("Total rows: 201 · page 1")).toBeVisible();
  fireEvent.click(next);
  expect(fetcher).toHaveBeenCalledTimes(2);
  await act(async () => finish(new Response(JSON.stringify({ ...table, offset: 100, rows: [{ day: "2026-01-03", total: 30 }] }))));
  await screen.findByText("Total rows: 201 · page 2");
  expect(next).toBeEnabled();
  expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
  expect(String(fetcher.mock.calls[1][0])).toContain("offset=100");
  client.clear();
});

for (const locale of ["en", "ru", "tt"] as const) it(`labels retained results and blocks stale selection during refetch/error/retry (${locale})`, async () => {
  const table: VisualizationResult = { ...result, type: "table" };
  let finish!: (response: Response) => void;
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(table)))
    .mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ ...table, rows: [{ day: "2026-01-03", total: 30 }] })));
  vi.stubGlobal("fetch", fetcher);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const select = vi.fn();
  render(<I18nProvider initialLocale={locale}><QueryClientProvider client={client}><VisualizationView id="refresh" onSelect={select} /></QueryClientProvider></I18nProvider>);
  const oldCell = await screen.findByRole("cell", { name: /^10[.,]00$/ });
  fireEvent.click(oldCell);
  expect(select).toHaveBeenCalledTimes(1);
  act(() => { void client.invalidateQueries({ queryKey: ["visualization-result"] }); });
  const notice = await screen.findByRole("status");
  expect(notice).toHaveTextContent(translate(locale, "Showing previous result. Waiting for updated data."));
  expect(notice).not.toHaveClass("sr-only");
  expect(oldCell).toBeVisible();
  await waitFor(() => expect(oldCell.closest("tr")).not.toHaveAttribute("tabindex"));
  fireEvent.click(oldCell);
  expect(select).toHaveBeenCalledTimes(1);
  await act(async () => finish(new Response(JSON.stringify({ detail: { message: "Unavailable", code: "UNAVAILABLE" } }), { status: 503 })));
  expect(await screen.findByRole("alert")).toHaveTextContent(translate(locale, "Unavailable"));
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: translate(locale, "Retry visualization") }));
  const newCell = await screen.findByRole("cell", { name: /^30[.,]00$/ });
  expect(screen.queryByText(translate(locale, "Showing previous result. Waiting for updated data."))).not.toBeInTheDocument();
  fireEvent.click(newCell);
  expect(select).toHaveBeenCalledTimes(2);
  client.clear();
});

it("formats exact KPI percentages/currency but keeps raw table cells and text codes unchanged", () => {
  const kpi: VisualizationResult = { ...result, type: "kpi", number_format: "percent", columns: [{ ...result.columns[1], logical_type: "decimal" }] };
  expect(format("0.300570", kpi, "en")).toBe("30.06%");
  expect(format("9007199254740993.12", { ...kpi, number_format: "currency" }, "en")).toBe("$9,007,199,254,740,993.12");
  expect(format("0.300570", { ...kpi, type: "table" }, "en", "decimal")).toBe("0.300570");
  expect(format("001", { ...kpi, columns: [{ ...result.columns[1], logical_type: "string" }] }, "en")).toBe("001");
});

it("aligns decimal strings by their schema while retaining leading-zero text codes", async () => {
  const table = { ...result, type: "table", columns: [
    { ...result.columns[0], engine_name: "code", display_name: "Code", logical_type: "string" },
    { ...result.columns[1], logical_type: "decimal" },
  ], rows: [{ code: "001", total: "0.35" }] };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(table))));
  render(<QueryClientProvider client={new QueryClient()}><VisualizationView id="numeric-alignment" /></QueryClientProvider>);
  expect(await screen.findByRole("cell", { name: "0.35" })).toHaveClass("text-right", "tabular-nums");
  expect(screen.getByRole("cell", { name: "001" })).toHaveClass("text-left");
  expect(screen.getByRole("columnheader", { name: "Total" })).toHaveClass("text-right");
  expect(screen.getByRole("columnheader", { name: "Code" })).toHaveAttribute("scope", "col");
  expect(screen.getByRole("table")).toHaveClass("text-sm");
  expect(screen.getByRole("table")).toHaveAccessibleName();
  expect(screen.getByRole("table").parentElement).toHaveAttribute("role", "region");
  expect(screen.getByRole("table").parentElement).toHaveAttribute("tabindex", "0");
  expect(screen.getByRole("table").parentElement).toHaveClass("min-w-0");
});

it("renders multiple prepared series with gaps and no implicit aggregation", () => {
  const options = chartOptions({ ...result, additional_series: [{ field: "plan", name: "Plan" }],
    rows: [{ day: "2026-01-01", total: 10, plan: 15 }, { day: "2026-01-02", total: 20, plan: null }] });
  expect(options.series).toMatchObject([
    { data: [[Date.parse("2026-01-01T00:00:00Z"), 10], [Date.parse("2026-01-02T00:00:00Z"), 20]] },
    { name: "Plan", data: [[Date.parse("2026-01-01T00:00:00Z"), 15], [Date.parse("2026-01-02T00:00:00Z"), null]] },
  ]);
});

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

it("keeps missing comparison baselines as gaps and exact strings unchanged", () => {
  const options = chartOptions({ ...result, additional_series: [{ field: "previous", name: "Previous period" }], rows: [{ day: "2026-01-01", total: "9007199254740993.25", previous: null }, { day: "2026-02-01", total: "0.00", previous: "9007199254740993.25" }] });
  expect(options.series).toMatchObject([
    { connectNulls: false, data: [[Date.parse("2026-01-01T00:00:00Z"), "9007199254740993.25"], [Date.parse("2026-02-01T00:00:00Z"), "0.00"]] },
    { name: "Previous period", connectNulls: false, data: [[Date.parse("2026-01-01T00:00:00Z"), null], [Date.parse("2026-02-01T00:00:00Z"), "9007199254740993.25"]] },
  ]);
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
