import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { init } from "echarts";
import { expectPaletteMarks } from "./mark-contrast";
import { render } from "./render";
import { ComboView } from "@/features/dashboard/ComboView";
import { ComboConfiguration } from "@/features/workflow/ComboConfiguration";
import { comboOptions, comboSelection } from "@/features/dashboard/combo";
import { chartSetupHints } from "@/features/dashboard/authoring-guidance";
import type { VisualizationResult } from "@/features/dashboard/api";

const columns = ["period", "actual", "plan"].map((name, i) => ({ column_id: `id_${name}`, engine_name: name, display_name: name, logical_type: i ? "decimal" as const : "string" as const, nullable: true, metadata: i ? { currency: "RUB" } : {} }));
const rows = [{ period: "Jan", actual: "-9007199254740993.11", plan: "9007199254740993.11" }, { period: "Feb", actual: "0", plan: null }];
const scale = { minimum: rows[0].actual, maximum: rows[0].plan!, lower: -0.5, upper: 0.5, ticks: [{ position: -0.5, label: rows[0].actual }, { position: 0, label: "0" }, { position: 0.5, label: rows[0].plan! }] };
const result: VisualizationResult = { type: "combo_chart", orientation: "vertical", visualization_revision: 1, spec: { type: "combo_chart", version: 1, category_column_id: "id_period", secondary_axis: false, series: [{ column_id: "id_actual", kind: "bar", axis: "primary", name: "" }, { column_id: "id_plan", kind: "line", axis: "primary", name: "" }] }, combo: { primary: scale, observations: [{ id: "jan", positions: [-0.5, 0.5] }, { id: "feb", positions: [0, null] }] }, visualization_id: "combo", revision: 1, title: "Plan / actual", category_field: "period", value_field: null, number_format: "number", decimals: 2, currency: "RUB", show_legend: true, show_labels: true, columns, rows, total_rows: 2, offset: 0, limit: 2, truncated: false };

it.each(["light", "dark"] as const)("renders eight contrasting combo series in %s", theme => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 900, height: 500 });
  try {
    const fields = Array.from({ length: 8 }, (_, i) => ({ ...columns[1], column_id: `measure_${i}`, engine_name: `measure_${i}` }));
    const fixture: VisualizationResult = { ...result, show_labels: false, show_legend: false, columns: [columns[0], ...fields],
      rows: ["Jan", "Feb"].map(period => ({ period, ...Object.fromEntries(fields.map(field => [field.engine_name, "1"])) })),
      spec: { version: 1, type: "combo_chart", category_column_id: "id_period", secondary_axis: false,
        series: fields.map((field, i) => ({ column_id: field.column_id, name: field.display_name, kind: i < 4 ? "bar" : "line", axis: "primary" })) },
      combo: { primary: scale, observations: [{ id: "jan", positions: fields.map(() => 0.2) }, { id: "feb", positions: fields.map(() => 0.4) }] } };
    const option = comboOptions(fixture, "en", theme);
    chart.setOption(option);
    const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
    const colors = (option.series as { itemStyle: { color: string } }[]).map(series => series.itemStyle.color);
    expect(new Set(colors).size).toBe(8);
    expectPaletteMarks(svg, colors, theme);
    for (const color of colors.slice(4)) expect([...svg.querySelectorAll('path[fill="none"],polyline[fill="none"]')].some(line => line.getAttribute("stroke") === color)).toBe(true);
  } finally { chart.dispose(); context.mockRestore(); }
});

it("draws bars and lines from bounded server positions, keeps gaps, exact values and stable selection", () => {
  const option = comboOptions(result, "en", "light");
  expect(option.yAxis).toMatchObject([{ min: -0.5, max: 0.5 }]);
  const irregular = { ...result, combo: { ...result.combo!, primary: { ...scale, lower: -2 / 9, upper: 7 / 9, ticks: [{ position: 1 / 36, label: "5" }] } } };
  expect(comboOptions(irregular, "en", "light").yAxis).toMatchObject([{ axisLabel: { customValues: [1 / 36] }, axisTick: { customValues: [1 / 36] } }]);
  expect(option.series).toMatchObject([{ type: "bar", yAxisIndex: 0, data: [{ value: -0.5, exactValue: rows[0].actual }, { value: 0 }] }, { type: "line", connectNulls: false, smooth: false, data: [{ value: 0.5 }, { value: null, exactValue: "—" }] }]);
  const series = (option.series as { data: { exactTooltip: string }[] }[]);
  expect(series[0].data[0].exactTooltip).toContain("-9007199254740993.11 RUB");
  expect(option.tooltip).toMatchObject({ renderMode: "html", appendToBody: true, confine: true });
  const tooltip = option.tooltip as { formatter: (event: unknown) => string };
  const container = document.createElement("div");
  const text = `<img src=x onerror=alert(1)>\n${series[0].data[0].exactTooltip}`;
  container.innerHTML = tooltip.formatter({ data: { exactTooltip: text } });
  expect(container.querySelector("img")).toBeNull();
  expect(container.textContent).toBe(text);
  expect(comboSelection(result, { dataIndex: 0, data: { observationIdentity: "feb" } })).toBe(rows[1]);
  expect(comboSelection(result, { dataIndex: 0 })).toBeUndefined();
  const second: VisualizationResult = { ...result, spec: { type: "combo_chart", version: 1, category_column_id: "id_period", secondary_axis: true, series: [{ column_id: "id_actual", kind: "bar", axis: "primary", name: "" }, { column_id: "id_plan", kind: "line", axis: "secondary", name: "" }] }, combo: { ...result.combo!, secondary: { ...scale, lower: 0, upper: 1 } } };
  expect(comboOptions(second, "tt", "dark").series).toMatchObject([{}, { yAxisIndex: 1, lineStyle: { type: "dashed" } }]);
  expect(comboOptions(second, "en", "light").yAxis).toHaveLength(2);
});

it.each(["bar", "line"] as const)("distinguishes seven %s series without colour and retains cues on reorder", kind => {
  const fields = Array.from({ length: 8 }, (_, i) => ({ ...columns[1], column_id: `measure_${i}`, engine_name: `measure_${i}`, display_name: `Measure ${i}` }));
  const series = fields.map((field, i) => ({ column_id: field.column_id, name: field.display_name, kind: i < 7 ? kind : kind === "bar" ? "line" as const : "bar" as const, axis: "primary" as const }));
  const many: VisualizationResult = { ...result, columns: [columns[0], ...fields], rows: [{ period: "Jan", ...Object.fromEntries(fields.map(field => [field.engine_name, "1"])) }], spec: { version: 1, type: "combo_chart", category_column_id: "id_period", secondary_axis: false, series }, combo: { primary: scale, observations: [{ id: "jan", positions: fields.map(() => 0.2) }] } };
  const cues = (value: VisualizationResult) => (comboOptions(value, "en", "light").series as { id: string; type: string; symbol?: string; itemStyle: { decal?: unknown } }[])
    .filter(item => item.type === kind).map(item => ({ id: item.id, cue: kind === "line" ? item.symbol : JSON.stringify(item.itemStyle.decal ?? "solid") }));
  const original = cues(many);
  expect(new Set(original.map(item => item.cue)).size).toBe(7);
  expect(cues({ ...many, spec: { ...many.spec!, series: [...series].reverse() } } as VisualizationResult)).toEqual([...original].reverse());
});

it.each(["light", "dark"] as const)("paints exact bar and line labels opaquely when other categories are highlighted in %s", theme => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 900, height: 500 });
  try {
    const muted = { ...result, rows: [{ ...rows[0], actual: "-123.45", plan: "678.90" }, rows[1]], highlight_field: "period", highlight_value: "Feb" };
    chart.setOption(comboOptions(muted, "en", theme));
    const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
    for (const text of ["-123.45", "678.90"]) {
      const label = Array.from(svg.querySelectorAll("text")).find(node => node.textContent === text);
      expect(label).toBeDefined();
      expect(Number(label?.getAttribute("fill-opacity") ?? 1)).toBe(1);
      expect(label?.getAttribute("fill")).toBe(theme === "dark" ? "#d7dfef" : "#34415b");
    }
    expect(comboOptions(muted, "en", theme).series).toMatchObject([{ data: [{ itemStyle: { opacity: 0.3 } }, {}] }, { data: [{ itemStyle: { opacity: 0.3 } }, {}] }]);
  } finally { chart.dispose(); context.mockRestore(); }
});

it("hides colliding labels in a short chart and restores them after resize without losing exact values", () => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const chart = init(null, undefined, { renderer: "svg", ssr: true, width: 600, height: 220 });
  try {
    if (result.spec?.type !== "combo_chart") throw new Error("Expected combo fixture");
    const dense: VisualizationResult = { ...result, columns: [...columns, { ...columns[2], column_id: "id_forecast", engine_name: "forecast", display_name: "Forecast" }],
      rows: [{ period: "Jan", actual: "-20", plan: "10", forecast: "14" }],
      spec: { ...result.spec, series: [...result.spec.series, { column_id: "id_forecast", name: "Forecast", kind: "line", axis: "primary" }] },
      combo: { primary: scale, observations: [{ id: "jan", positions: [-0.2, 0.1, 0.14] }] },
    };
    const option = comboOptions(dense, "en", "light");
    chart.setOption(option);
    const labels = () => Array.from(new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml").querySelectorAll("text")).map(node => node.textContent).filter(text => text === "10" || text === "14");
    expect(labels()).toHaveLength(1);
    chart.resize({ width: 600, height: 900 });
    expect(labels().sort()).toEqual(["10", "14"]);
    expect(option.series).toMatchObject([{}, { data: [{ exactValue: "10", exactTooltip: expect.stringContaining("10 RUB") }] }, { data: [{ exactValue: "14", exactTooltip: expect.stringContaining("14 RUB") }] }]);
  } finally { chart.dispose(); context.mockRestore(); }
});

it("offers exact tables and keyboard selection without converting huge values to numbers", () => {
  const select = vi.fn();
  render(<ComboView result={result} onSelect={select}>{() => "Canvas"}</ComboView>);
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
  expect(screen.getByRole("cell", { name: rows[0].actual })).toBeVisible();
  expect(screen.getByRole("cell", { name: "—" })).toBeVisible();
  fireEvent.click(screen.getAllByRole("button", { name: "Select" })[1]);
  expect(select).toHaveBeenCalledWith({ id_period: "Feb", id_actual: "0", id_plan: null });
});

it("pages tables and provides keyboard zoom without changing the full scale", () => {
  const wide = { ...result, total_rows: 101, rows: Array.from({ length: 101 }, (_, i) => ({ ...rows[0], period: `P${i}` })), combo: { ...result.combo!, observations: Array.from({ length: 101 }, (_, i) => ({ id: `p${i}`, positions: [-0.5, 0.5] })) } };
  const child = vi.fn((window?: [number, number]) => JSON.stringify(window ?? "all"));
  render(<ComboView result={wide}>{child}</ComboView>);
  fireEvent.click(screen.getByRole("button", { name: "Show 20 categories" }));
  expect(child).toHaveBeenLastCalledWith([0, 19]);
  fireEvent.click(screen.getByRole("button", { name: "Next categories" }));
  expect(child).toHaveBeenLastCalledWith([20, 39]);
  expect(comboOptions(wide, "en", "light", [20, 39]).yAxis).toMatchObject([{ min: -0.5, max: 0.5 }]);
  fireEvent.click(screen.getByRole("button", { name: "Show all categories" }));
  expect(child).toHaveBeenLastCalledWith(undefined);
  fireEvent.click(screen.getByRole("button", { name: "Data table" }));
  expect(screen.getAllByRole("row")).toHaveLength(101);
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByRole("rowheader", { name: "P100" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
});

it("shows an explicit empty state", () => {
  render(<ComboView result={{ ...result, rows: [], combo: { ...result.combo!, observations: [] } }}>{() => "Canvas"}</ComboView>);
  expect(screen.getByText("No rows to visualize.")).toBeVisible();
  expect(screen.queryByText("Canvas")).not.toBeInTheDocument();
});

it("authors typed series, requires explicit secondary assignment and supports keyboard ordering", () => {
  const changed = vi.fn();
  function Form() { const [config, setConfig] = useState<Record<string, unknown>>({}); return <ComboConfiguration config={config} columns={columns} onChange={next => { setConfig(next); changed(next); }} />; }
  render(<Form />);
  expect(chartSetupHints("combo_chart", "dataset", {}, columns)).toHaveLength(1);
  expect(screen.getByLabelText("Enable secondary axis")).not.toBeChecked();
  fireEvent.change(screen.getByLabelText("Combination category"), { target: { value: "id_period" } });
  fireEvent.change(screen.getByLabelText("Combination field 1"), { target: { value: "id_actual" } });
  fireEvent.change(screen.getByLabelText("Combination field 2"), { target: { value: "id_plan" } });
  expect(chartSetupHints("combo_chart", "dataset", changed.mock.lastCall![0], columns)).toEqual([]);
  fireEvent.click(screen.getByLabelText("Enable secondary axis"));
  expect(chartSetupHints("combo_chart", "dataset", changed.mock.lastCall![0], columns)).toHaveLength(1);
  fireEvent.change(screen.getByLabelText("Series axis 2"), { target: { value: "secondary" } });
  expect(chartSetupHints("combo_chart", "dataset", changed.mock.lastCall![0], columns)).toEqual([]);
  fireEvent.click(screen.getByRole("button", { name: "Move combination series 2 up" }));
  expect(screen.getByLabelText("Combination field 1")).toHaveValue("id_plan");
  expect(screen.getByLabelText("Series axis 1")).toHaveValue("secondary");
  fireEvent.click(screen.getByLabelText("Enable secondary axis"));
  expect(screen.getByLabelText("Series axis 1")).toHaveValue("primary");
  for (let i = 0; i < 6; i++) fireEvent.click(screen.getByRole("button", { name: "Add series" }));
  expect(screen.getByRole("button", { name: "Add series" })).toBeDisabled();
});
