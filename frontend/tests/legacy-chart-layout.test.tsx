import { fireEvent, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { init } from "echarts";
import { render } from "./render";
import { LegacyChartView } from "@/features/dashboard/LegacyChartView";
import { axisTick, legacyAxisLayout } from "@/features/dashboard/legacy-chart-layout";
import { chartOptions } from "@/features/dashboard/VisualizationView";
import type { VisualizationResult } from "@/features/dashboard/api";
import { tokens, contrast, composite } from "./mark-contrast";

const result: VisualizationResult = {
  visualization_revision: 1, visualization_id: "chart", revision: 1,
  type: "bar_chart", orientation: "horizontal", title: "Revenue", value_field: "amount", category_field: "region",
  number_format: "number", decimals: 2, currency: "USD", show_labels: false, show_legend: true,
  total_rows: 2, offset: 0, limit: 100, truncated: false,
  columns: [
    { column_id: "category", engine_name: "region", display_name: "Full region name", logical_type: "string", nullable: false, metadata: {} },
    { column_id: "value", engine_name: "amount", display_name: "Revenue", logical_type: "decimal", nullable: true, metadata: {} },
    { column_id: "plan", engine_name: "plan", display_name: "Plan", logical_type: "decimal", nullable: true, metadata: {} },
    { column_id: "key", engine_name: "identity", display_name: "Internal ID", logical_type: "integer", nullable: false, metadata: {} },
  ],
  additional_series: [{ field: "plan", name: "Plan" }], context_column_ids: ["key"],
  rows: [{ region: "Repeated", amount: "9007199254740993.25", plan: null, identity: 1 }, { region: "Repeated", amount: "0.00", plan: "-123.4567", identity: 2 }],
};

it.each(["bar_chart", "line_chart", "area_chart", "scatter_chart"] as const)("renders contrasting normal %s marks in both themes", type => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  try {
    for (const theme of ["light", "dark"] as const) {
      const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 640, height: 400 });
      try {
        const fixture = { ...result, type, additional_series: [], show_legend: false, show_labels: false,
          rows: [{ region: 1, amount: 10 }, { region: 2, amount: 20 }, { region: 3, amount: 15 }] };
        chart.setOption({ ...chartOptions(fixture, "en", theme), animation: false });
        const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
        const marks = [...svg.querySelectorAll('path[ecmeta_ssr_type="chart"]')];
        expect(marks.length).toBeGreaterThanOrEqual(3);
        const palette = tokens(theme === "light" ? ":root" : ':root[data-theme="dark"]');
        const ink = palette.accent;
        const lines = [...svg.querySelectorAll("path")].filter(mark => mark.getAttribute("stroke") === ink && mark.getAttribute("fill") === "none");
        if (type === "line_chart" || type === "area_chart") expect(lines.length).toBeGreaterThan(0);
        const markers = marks.filter(mark => mark.getAttribute("stroke") === ink || mark.getAttribute("fill") === ink);
        expect(markers.length).toBeGreaterThanOrEqual(3);
        const filled = marks.filter(mark => mark.getAttribute("fill") === ink && Number(mark.getAttribute("fill-opacity") ?? 1) > 0.3);
        if (type === "bar_chart" || type === "scatter_chart") expect(filled).toHaveLength(3);
        for (const background of [palette.panel, palette.surface]) {
          for (const line of lines) expect(contrast(composite(ink, Number(line.getAttribute("stroke-opacity") ?? 1), background), background)).toBeGreaterThanOrEqual(3);
          for (const mark of filled) expect(contrast(composite(ink, Number(mark.getAttribute("fill-opacity") ?? 1), background), background)).toBeGreaterThanOrEqual(3);
          for (const marker of markers.filter(mark => mark.getAttribute("stroke") === ink)) expect(contrast(composite(ink, Number(marker.getAttribute("stroke-opacity") ?? 1), background), background)).toBeGreaterThanOrEqual(3);
          if (type === "area_chart") {
            const areas = [...svg.querySelectorAll("path")].filter(mark => mark.getAttribute("fill") === ink && Number(mark.getAttribute("fill-opacity")) === 0.3);
            expect(areas.length).toBeGreaterThan(0);
            expect(contrast(ink, composite(ink, 0.3, background))).toBeGreaterThanOrEqual(3);
          }
        }
      } finally { chart.dispose(); }
    }
  } finally { context.mockRestore(); }
});

it.each(["pie_chart", "donut_chart"] as const)("gives eight %s categories stable non-colour cues without aggregating repeated rows", type => {
  const rows = Array.from({ length: 8 }, (_, index) => ({ region: `Category ${index}`, amount: index + 1 }));
  type Slice = { name: string; value: number; itemStyle: { decal?: unknown; opacity?: number } };
  for (const theme of ["light", "dark"] as const) {
    const slices = (values: typeof rows) => (chartOptions({ ...result, type, additional_series: [], rows: values, highlight_field: "region", highlight_value: "Category 0" }, "en", theme).series as { data: Slice[] }[])[0].data;
    const forward = slices(rows), reverse = slices([...rows].reverse());
    expect(new Set(forward.map(slice => JSON.stringify(slice.itemStyle.decal ?? null))).size).toBe(8);
    for (const slice of forward) expect(reverse.find(item => item.name === slice.name)).toEqual(slice);
    expect(forward.map(slice => slice.value)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(forward[0].itemStyle.opacity).toBe(1);
    expect(forward[1].itemStyle.opacity).toBe(0.35);
    const repeated = slices([rows[0], rows[0], rows[1]]);
    expect(repeated).toHaveLength(3);
    expect(repeated[0]).toEqual(repeated[1]);
  }
});

it("explains pie pattern reuse above eight categories without removing any data", () => {
  const rows = Array.from({ length: 9 }, (_, index) => ({ region: `Category ${index}`, amount: index + 1 }));
  render(<LegacyChartView result={{ ...result, type: "pie_chart", additional_series: [], rows }}>Chart</LegacyChartView>);
  expect(screen.getByRole("status")).toHaveTextContent("Patterns repeat after eight categories");
  fireEvent.click(screen.getByRole("button", { name: "Data table" }));
  expect(screen.getAllByRole("row")).toHaveLength(10);
});

it("scatter uses signed coordinates and excludes incomplete pairs without turning missing values into the origin", () => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const chart = init(null, undefined, { renderer: "svg", ssr: true, width: 640, height: 400 });
  try {
    const option = chartOptions({ ...result, type: "scatter_chart", additional_series: [], rows: [
      { region: -2, amount: 3 }, { region: null, amount: 3 }, { region: 2, amount: null }, { region: 0, amount: 0 },
    ] }, "en", "light");
    expect(option.series).toMatchObject([{ data: [[-2, 3], [null, 3], [2, null], [0, 0]] }]);
    chart.setOption(option);
    const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
    const identities = [...svg.querySelectorAll('[ecmeta_ssr_type="chart"]')].map(point => point.getAttribute("ecmeta_data_index"));
    expect(identities).toEqual(["0", "3"]);
  } finally { chart.dispose(); context.mockRestore(); }
});

it.each(["pie_chart", "donut_chart"] as const)("renders matching %s patterns on slices and legend icons", type => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  try {
    for (const theme of ["light", "dark"] as const) {
      const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 900, height: 500 });
      try {
        chart.setOption(chartOptions({ ...result, type, additional_series: [], rows: Array.from({ length: 8 }, (_, i) => ({ region: `C${i}`, amount: 10 })) }, "en", theme));
        const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
        const fills = [...svg.querySelectorAll("path")].map(path => path.getAttribute("fill")).filter(fill => fill?.startsWith("url(#"));
        expect(fills.length).toBeGreaterThanOrEqual(14); // Seven patterned sectors and their legend swatches.
      } finally { chart.dispose(); }
    }
  } finally { context.mockRestore(); }
});

it.each(["pie_chart", "donut_chart"] as const)("does not invent equal %s shares when the positive category is hidden", type => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const chart = init(null, undefined, { renderer: "svg", ssr: true, width: 640, height: 400 });
  try {
    const fixture = { ...result, type, additional_series: [], rows: [{ region: "Active", amount: 10 }, { region: "Zero", amount: 0 }, { region: "Missing", amount: null }] };
    const option = chartOptions(fixture, "en", "light");
    chart.setOption({ ...option, animation: false });
    const drawnSectors = () => [...new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml").querySelectorAll("path")]
      .filter(path => path.getAttribute("ecmeta_ssr_type") === "chart" && path.getAttribute("d")?.includes("A"));
    expect(drawnSectors().length).toBeGreaterThan(0);
    chart.dispatchAction({ type: "legendUnSelect", name: "Active" });
    expect(drawnSectors()).toHaveLength(0);
    expect(option.series).toMatchObject([{ stillShowZeroSum: false, showEmptyCircle: false }]);
    expect(option.series).toMatchObject([{ data: [{ value: 10 }, { value: 0 }, { value: "-" }] }]);
    chart.dispatchAction({ type: "legendSelect", name: "Active" });
    expect(drawnSectors().length).toBeGreaterThan(0);
  } finally { chart.dispose(); context.mockRestore(); }
});

it.each(["bar_chart", "line_chart"] as const)("distinguishes all eight %s series without colour and preserves field cues after reordering", type => {
  const fields = Array.from({ length: 8 }, (_, index) => ({ column_id: `measure-${index}`, engine_name: `m${index}`, display_name: `Measure ${index}`, logical_type: "float" as const, nullable: true, metadata: {} }));
  for (const theme of ["light", "dark"] as const) {
    const fixture = (ordered: typeof fields): VisualizationResult => ({ ...result, type,
      columns: [result.columns[0], ...fields], value_field: ordered[0].engine_name,
      additional_series: ordered.slice(1).map(field => ({ field: field.engine_name, name: field.display_name })),
      rows: [{ region: "North", ...Object.fromEntries(fields.map((field, index) => [field.engine_name, index + 1])) }],
    });
    type Series = { id: string; symbol?: string; itemStyle: { decal?: unknown }; data: unknown[] };
    const original = chartOptions(fixture(fields), "en", theme).series as Series[];
    const reordered = chartOptions(fixture([...fields].reverse()), "en", theme).series as Series[];
    const cue = (series: Series) => type === "bar_chart" ? JSON.stringify(series.itemStyle.decal ?? null) : series.symbol;
    expect(new Set(original.map(cue)).size).toBe(8);
    expect(original.map(series => series.id)).toEqual(fields.map(field => JSON.stringify([field.column_id, 0])));
    for (const series of original) {
      const counterpart = reordered.find(item => item.id === series.id)!;
      expect(cue(counterpart)).toEqual(cue(series));
      expect(counterpart.data).toEqual(series.data);
    }
  }
});

it("keeps legacy repeated-field series identities unique", () => {
  const option = chartOptions({ ...result, additional_series: [{ field: "amount", name: "Repeated revenue" }] });
  const series = option.series as { id: string; data: unknown[] }[];
  expect(new Set(series.map(item => item.id)).size).toBe(2);
  expect(series[0].data).toEqual(series[1].data);
});

it("renders bar patterns in both the plot and legend, retaining them after legend toggles", () => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  try {
    for (const theme of ["light", "dark"] as const) {
      const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 640, height: 400 });
      try {
        // plan sorts before value, making the primary amount series patterned.
        chart.setOption(chartOptions({ ...result, rows: [{ region: "North", amount: 10, plan: 20 }] }, "en", theme));
        const patternedMarks = () => Array.from(new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml").querySelectorAll("path, rect"))
          .filter(node => node.getAttribute("fill")?.startsWith("url(#"));
        expect(patternedMarks().length).toBeGreaterThanOrEqual(2);
        chart.dispatchAction({ type: "legendUnSelect", name: "amount" });
        const hidden = patternedMarks().length;
        chart.dispatchAction({ type: "legendSelect", name: "amount" });
        expect(patternedMarks().length).toBeGreaterThan(hidden);
      } finally { chart.dispose(); }
    }
  } finally { context.mockRestore(); }
});

it.each(["bar_chart", "line_chart", "area_chart", "scatter_chart", "pie_chart", "donut_chart"] as const)("keeps optional %s labels readable when other observations are muted", type => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  try {
    for (const theme of ["light", "dark"] as const) for (const orientation of (type === "bar_chart" ? ["vertical", "horizontal"] : ["vertical"]) as ("vertical" | "horizontal")[]) {
      const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 640, height: 400 });
      try {
        const fixture = { ...result, type, orientation, additional_series: [], show_labels: true,
          columns: result.columns.map(column => column.engine_name === "region" && type === "scatter_chart" ? { ...column, logical_type: "integer" as const } : column),
          rows: [{ region: type === "scatter_chart" ? 1 : "North", amount: "13.25" }, { region: type === "scatter_chart" ? 2 : "South", amount: "27.75" }] };
        for (const muted of [true, false]) {
          const option = chartOptions({ ...fixture, ...(muted ? { highlight_field: "region", highlight_value: fixture.rows[0].region } : {}) }, "en", theme);
          chart.setOption(option, true);
          const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
          const text = Array.from(svg.querySelectorAll("text")).find(node => node.textContent === (["pie_chart", "donut_chart"].includes(type) ? "South" : "27.75"));
          expect(text).toBeDefined();
          expect(Number(text?.getAttribute("fill-opacity") ?? 1)).toBe(1);
          expect(text?.getAttribute("fill")).toBe(theme === "dark" ? "#d7dfef" : "#34415b");
          if (muted) expect(option.series).toMatchObject([{ data: [{ itemStyle: { opacity: 1 } }, { itemStyle: { opacity: 0.35 } }] }]);
        }
      } finally { chart.dispose(); }
    }
  } finally { context.mockRestore(); }
});
it("changes only tick/layout presentation when width and height shrink", () => {
  const wide = legacyAxisLayout(result, "en", { width: 1000, height: 600 });
  const narrow = legacyAxisLayout(result, "en", { width: 260, height: 200 });
  expect(narrow.xAxis.splitNumber).toBeLessThan(wide.xAxis.splitNumber);
  expect(narrow.yAxis.splitNumber).toBeLessThan(wide.yAxis.splitNumber);
  expect(narrow.xAxis.axisLabel.hideOverlap).toBe(true);
  expect("width" in narrow.yAxis.axisLabel && narrow.yAxis.axisLabel.width).toBeLessThan(narrow.grid.left);
  expect(Object.keys(narrow).sort()).toEqual(["grid", "xAxis", "yAxis"]);
  const large = chartOptions(result, "en", "light", undefined, { width: 1000, height: 600 });
  const small = chartOptions(result, "en", "light", undefined, { width: 260, height: 200 });
  expect(JSON.stringify(small.series)).toEqual(JSON.stringify(large.series));
  expect(small.series).toMatchObject([{ data: ["9007199254740993.25", "0.00"] }, { data: [null, "-123.4567"] }]);
});
it("uses readable localized ticks without turning tiny nonzero values into zero or changing percent meaning", () => {
  expect(axisTick(50, "en", result)).toBe("50");
  expect(axisTick(1_000_000, "en", result)).toBe("1M");
  expect(axisTick(-0.0000001, "en", result)).toBe("-1E-7");
  expect(axisTick(0.125, "en", { ...result, number_format: "percent" })).toBe("12.5%");
  expect(axisTick(0, "en", result)).toBe("0");
  for (const locale of ["ru", "tt"] as const) expect(axisTick(1234.5, locale, result)).toContain("1");
  expect(axisTick(5, "en", { ...result, number_format: "currency", currency: "INVALID" })).toBe("5");
});

it.each(["bar_chart", "line_chart", "area_chart", "scatter_chart", "pie_chart", "donut_chart"] as const)("uses original rows for exact escaped %s tooltip values", type => {
  const option = chartOptions({ ...result, type, additional_series: [], rows: [{ ...result.rows[0], region: '<img src=x onerror=alert(1)> & "Region"' }] }, "en", "light");
  const tooltip = option.tooltip as { formatter: (event: unknown) => string };
  expect(tooltip).toMatchObject({ renderMode: "html", appendToBody: true, confine: true });
  const parsed = new DOMParser().parseFromString(tooltip.formatter({ dataIndex: 0, seriesIndex: 0, value: 9007199254740994 }), "text/html");
  expect(parsed.querySelector("img")).toBeNull();
  const text = parsed.querySelector('[role="tooltip"]')?.textContent;
  expect(text).toContain('<img src=x onerror=alert(1)> & "Region"');
  expect(text).toContain("9007199254740993.25");
});

it("resolves additional-series tooltips against that series' original field", () => {
  const option = chartOptions(result, "en", "light");
  const tooltip = option.tooltip as { formatter: (event: unknown) => string };
  const text = new DOMParser().parseFromString(tooltip.formatter({ dataIndex: 1, seriesIndex: 1 }), "text/html").body.textContent;
  expect(text).toContain("Plan: -123.4567");
  expect(text).not.toContain("0.00");
});

it("does not substitute drawing coordinates for source dates, numeric X or missing values", () => {
  for (const [type, category, logicalType] of [["line_chart", "2026-01-03T12:30:00+03:00", "datetime"], ["scatter_chart", "9007199254740993.01", "decimal"]] as const) {
    const option = chartOptions({ ...result, type, additional_series: [], columns: result.columns.map(field => field.engine_name === "region" ? { ...field, logical_type: logicalType } : field), rows: [{ region: category, amount: null }] }, "en", "light");
    const tooltip = option.tooltip as { formatter: (event: unknown) => string };
    const text = new DOMParser().parseFromString(tooltip.formatter({ dataIndex: 0, value: [0, 0] }), "text/html").body.textContent;
    expect(text).toContain(category);
    expect(text).toContain("Revenue: —");
    expect(tooltip.formatter({ dataIndex: -1 })).toBe("");
    expect(tooltip.formatter({ dataIndex: 0, seriesIndex: 9 })).toBe("");
  }
});
it("preserves exact strings, missing versus zero and stable selection behind a keyboard table alternative", () => {
  const select = vi.fn();
  render(<LegacyChartView result={result} onSelect={select}><div>Chart content</div></LegacyChartView>);
  fireEvent.click(screen.getByRole("button", { name: "Data table" }));
  expect(screen.queryByText("Chart content")).not.toBeInTheDocument();
  const table = screen.getByRole("table");
  expect(screen.getByRole("columnheader", { name: "Revenue" })).toHaveClass("text-right");
  expect(screen.getByRole("columnheader", { name: "Plan" })).toHaveClass("text-right");
  expect(table.parentElement).toHaveAccessibleName("Revenue · Chart data table");
  expect(table.parentElement).toHaveClass("min-w-0");
  expect(within(table).getByText("9007199254740993.25")).toBeVisible();
  expect(within(table).getByText("0.00")).toBeVisible();
  expect(within(table).getByText("—")).toBeVisible();
  expect(within(table).queryByText("Internal ID")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Select row 2" }));
  expect(select).toHaveBeenCalledWith({ category: "Repeated", value: "0.00", plan: "-123.4567", key: 2 });
});
it("pages only the same returned result and explains server truncation and empty rows", () => {
  const rows = Array.from({ length: 101 }, (_, i) => ({ ...result.rows[0], region: `Region ${i}` }));
  const { rerender } = render(<LegacyChartView result={{ ...result, rows, total_rows: 1000, truncated: true }}>Chart</LegacyChartView>);
  expect(screen.getByRole("status")).toHaveTextContent("Showing 101 returned rows of 1000");
  fireEvent.click(screen.getByRole("button", { name: "Data table" }));
  expect(screen.getAllByRole("row")).toHaveLength(101);
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByText("Region 100")).toBeVisible();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  rerender(<LegacyChartView result={{ ...result, rows: [], total_rows: 0 }}>Chart</LegacyChartView>);
  expect(screen.getByRole("status")).toHaveTextContent("No rows on this page.");
});
