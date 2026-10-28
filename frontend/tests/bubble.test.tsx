import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { init } from "echarts";
import { render } from "./render";
import { BubbleView } from "@/features/dashboard/BubbleView";
import { BubbleConfiguration } from "@/features/workflow/BubbleConfiguration";
import { bubbleOptions, bubbleSelection } from "@/features/dashboard/bubble";
import { chartSetupHints } from "@/features/dashboard/authoring-guidance";
import type { VisualizationResult } from "@/features/dashboard/api";

const columns = ["key", "x", "y", "size"].map((name, i) => ({ column_id: `id_${name}`, engine_name: name, display_name: name, logical_type: i ? "decimal" as const : "string" as const, nullable: true, metadata: {} }));
const axis = { minimum: "9007199254740993.01", maximum: "9007199254740993.02", ticks: [{ position: 0, label: "9007199254740993.01" }, { position: 1, label: "9007199254740993.02" }], zero_position: null };
const rows = [{ key: "A", x: axis.minimum, y: "1", size: "1" }, { key: "B", x: axis.maximum, y: "2", size: "4" }, { key: "C", x: "0", y: "0", size: "0" }, { key: "D", x: null, y: "1", size: "4" }];
const result: VisualizationResult = { orientation: "vertical", visualization_revision: 1, type: "bubble_chart", spec: { type: "bubble_chart", version: 1, size_encoding: "area", key_column_id: "id_key", x_column_id: "id_x", y_column_id: "id_y", size_column_id: "id_size" }, bubble: { x_axis: axis, y_axis: axis, size_maximum: "4", input_count: 4, missing_count: 1, zero_size_count: 1, visible_count: 2, group_count: 0, points: [
  { id: "a", key: "A", group_id: null, x: 0, y: 0, radius_ratio: 0.5, state: "visible" },
  { id: "b", key: "B", group_id: null, x: 1, y: 1, radius_ratio: 1, state: "visible" },
  { id: "c", key: "C", group_id: null, x: 0.5, y: 0.5, radius_ratio: 0, state: "zero_size" },
  { id: "d", key: "D", group_id: null, x: null, y: 0.5, radius_ratio: 1, state: "missing" },
] }, visualization_id: "bubble", revision: 1, title: "Bubble", category_field: "key", value_field: null, number_format: "number", decimals: 2, currency: "USD", show_legend: true, show_labels: true, columns, rows, total_rows: 4, offset: 0, limit: 100, truncated: false };

it("uses area-derived server radii and bounded coordinates without rounding exact tooltips", () => {
  const options = bubbleOptions(result, "en", "light");
  expect(options.xAxis).toMatchObject({ axisLabel: { customValues: [0, 1], hideOverlap: true } });
  expect((options.xAxis as { min: number }).min).toBeLessThan(0);
  expect((options.xAxis as { max: number }).max).toBeGreaterThan(1);
  const narrow = bubbleOptions(result, "en", "light", { width: 350, height: 224 });
  expect((narrow.yAxis as { min: number }).min).toBeLessThan((options.yAxis as { min: number }).min);
  const series = options.series as { data: { symbolSize: number; exactTooltip: string }[] }[];
  expect(series[0].data).toHaveLength(2);
  expect(series[0].data[0].symbolSize / series[0].data[1].symbolSize).toBe(0.5);
  expect(series[0].data[0].exactTooltip).toContain(axis.minimum);
  const relativeAxis = { ...axis, label_offset: axis.minimum, ticks: [{ position: 0, label: axis.minimum, display_label: "0" }] };
  const relativeOptions = bubbleOptions({ ...result, bubble: { ...result.bubble!, x_axis: relativeAxis } }, "en", "light");
  const formatter = (relativeOptions.xAxis as { axisLabel: { formatter: (value: number) => string } }).axisLabel.formatter;
  expect(formatter(0)).toBe("0");
  expect(bubbleSelection(result, { dataIndex: 0, data: { observationIdentity: "b" } })).toBe(rows[1]);
  expect(bubbleSelection(result, { dataIndex: 0 })).toBeUndefined();
});

it("escapes source names in bounded tooltips and retains exact bubble coordinates", () => {
  const option = bubbleOptions({ ...result, columns: columns.map(field => ({ ...field, display_name: `<img src=x onerror=alert(1)> & ${field.display_name}` })) }, "en", "light");
  const tooltip = option.tooltip as { formatter: (event: unknown) => string };
  expect(tooltip).toMatchObject({ renderMode: "html", appendToBody: true, confine: true });
  const data = (option.series as { data: { exactTooltip: string }[] }[])[0].data[1];
  const parsed = new DOMParser().parseFromString(tooltip.formatter({ data }), "text/html");
  expect(parsed.querySelector("img")).toBeNull();
  expect(parsed.querySelector('[role="tooltip"]')?.textContent).toBe(data.exactTooltip);
  expect(data.exactTooltip).toContain(axis.maximum);
});

it.each(["light", "dark"] as const)("keeps observation labels opaque in normal and muted bubble views in %s", theme => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 640, height: 400 });
  try {
    for (const highlighted of [false, true]) {
      const option = bubbleOptions({ ...result, ...(highlighted ? { highlight_field: "key", highlight_value: "B" } : {}) }, "en", theme, { width: 640, height: 400 });
      chart.setOption(option, true);
      const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
      for (const name of ["A", "B"]) {
        const text = Array.from(svg.querySelectorAll("text")).find(node => node.textContent === name);
        expect(text).toBeDefined();
        expect(Number(text?.getAttribute("fill-opacity") ?? 1)).toBe(1);
        expect(text?.getAttribute("fill")).toBe(theme === "dark" ? "#d7dfef" : "#34415b");
      }
      expect(option.series).toMatchObject([{ data: [{ symbolSize: 24, itemStyle: { opacity: highlighted ? 0.2 : 0.75 } }, { symbolSize: 48, itemStyle: { opacity: 0.75 } }] }]);
    }
  } finally { chart.dispose(); context.mockRestore(); }
});

it("keeps group colours stable across pages and distinct from display labels", () => {
  const grouped = { ...result, spec: { ...result.spec!, type: "bubble_chart" as const, group_column_id: "id_key" }, bubble: { ...result.bubble!, points: result.bubble!.points.map(point => ({ ...point, group_id: point.id })) } } as VisualizationResult;
  const all = bubbleOptions(grouped, "tt", "dark").series as { id: string; itemStyle: object }[];
  const page = bubbleOptions({ ...grouped, rows: rows.slice(1, 2), bubble: { ...grouped.bubble!, points: grouped.bubble!.points.slice(1, 2) } }, "tt", "dark").series as { id: string; itemStyle: object }[];
  expect(page[0].itemStyle).toEqual(all[1].itemStyle);
});

it("exposes exact rows, zero/missing states, selection and explicit server pagination", () => {
  const select = vi.fn(), next = vi.fn();
  render(<BubbleView result={{ ...result, total_rows: 300, truncated: true }} onSelect={select} setOffset={next}>Canvas</BubbleView>);
  expect(screen.getByRole("status")).toHaveTextContent("Only the current page");
  fireEvent.click(screen.getByRole("button", { name: "Data table" }));
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
  expect(screen.getByRole("cell", { name: axis.minimum })).toBeVisible();
  expect(screen.getByRole("cell", { name: "Zero area" })).toBeVisible();
  expect(screen.getByRole("cell", { name: "Missing values" })).toBeVisible();
  fireEvent.click(screen.getAllByRole("button", { name: "Select" })[1]);
  expect(select).toHaveBeenCalledWith({ id_key: "B", id_x: axis.maximum, id_y: "2", id_size: "4" });
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(next).toHaveBeenCalledWith(100);
});

it("keeps a non-drawable page explicit and disables unavailable preview paging", () => {
  render(<BubbleView result={{ ...result, rows: rows.slice(2), bubble: { ...result.bubble!, points: result.bubble!.points.slice(2) }, truncated: true }}>Canvas</BubbleView>);
  expect(screen.getByText("No drawable bubbles on this page. Inspect zero and missing values in the data table.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
});

it("configures typed roles without imposing accidental distinct-measure restrictions", () => {
  function Editor() { const [config, setConfig] = useState<Record<string, unknown>>({}); return <BubbleConfiguration config={config} columns={columns} onChange={setConfig} />; }
  render(<Editor />);
  for (const name of ["X measure", "Y measure", "Bubble area"]) {
    fireEvent.change(screen.getByLabelText(name), { target: { value: "id_x" } });
    expect(screen.getByLabelText(name)).toHaveValue("id_x");
  }
  expect(chartSetupHints("bubble_chart", "dataset", {}, columns)).toHaveLength(1);
  expect(chartSetupHints("bubble_chart", "dataset", { spec: result.spec }, columns)).toEqual([]);
  expect(chartSetupHints("bubble_chart", "dataset", { spec: { ...result.spec, x_column_id: "id_key" } }, columns)).toHaveLength(1);
});
