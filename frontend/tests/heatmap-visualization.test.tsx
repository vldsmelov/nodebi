import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { color } from "echarts";
import { render } from "./render";
import { HeatmapView } from "@/features/dashboard/HeatmapView";
import { I18nProvider } from "@/lib/i18n";
import { HeatmapAppearance } from "@/features/workflow/HeatmapAppearance";
import { chartOptions } from "@/features/dashboard/VisualizationView";
import { heatmapColors, heatmapSelection } from "@/features/dashboard/heatmap";
import { plainTextTooltip as heatmapTooltip } from "@/features/dashboard/chart-tooltip";
import type { VisualizationResult } from "@/features/dashboard/api";
import type { components } from "@/lib/api-schema";

const names = ["cell_id", "x_id", "y_id", "x", "y", "value", "present", "row_count", "valid_count", "missing_count"];
it("escapes source text in the page-level heatmap tooltip", () => {
  const element = document.createElement("div");
  const text = '<img src=x onerror="alert(1)"> & \'value\'\n9007199254740993.11';
  element.innerHTML = heatmapTooltip(text);
  expect(element.querySelector("img")).toBeNull();
  expect(element.querySelector('[role="tooltip"]')?.textContent).toBe(text);
});
const roles = Object.fromEntries(names.map(name => [name, `id_${name}`])) as components["schemas"]["HeatmapRoles"];
const columns = names.map(name => ({ column_id: `id_${name}`, engine_name: name, display_name: name, logical_type: "string" as const, nullable: true, metadata: name === "value" ? { aggregation: "sum" } : {} }));
const rows = [
  { cell_id: "a", x_id: "x1", y_id: "y1", x: null, y: "Feb", value: "9007199254740993.11", present: true, row_count: 2, valid_count: 1, missing_count: 1 },
  { cell_id: "b", x_id: "x2", y_id: "y1", x: "Empty category", y: "Feb", value: "9007199254740993.12", present: true, row_count: 1, valid_count: 1, missing_count: 0 },
  { cell_id: "c", x_id: "x1", y_id: "y2", x: null, y: "Mar", value: null, present: false, row_count: 0, valid_count: 0, missing_count: 0 },
  { cell_id: "d", x_id: "x2", y_id: "y2", x: "Empty category", y: "Mar", value: null, present: true, row_count: 1, valid_count: 0, missing_count: 1 },
];
const result: VisualizationResult = { type: "heatmap_chart", spec: { type: "heatmap_chart", version: 1, cells: roles, color_scale: { mode: "extent" } },
  visualization_id: "heat", visualization_revision: 1, orientation: "vertical", revision: 1, title: "Heatmap", category_field: "x", value_field: "value", number_format: "number", decimals: 2, currency: "RUB", show_legend: true, show_labels: true,
  columns, rows, total_rows: 4, offset: 0, limit: 4, truncated: false,
  heatmap_scale: { mode: "extent", minimum: rows[0].value, maximum: rows[1].value, positions: { a: 0, b: 1, c: null, d: null }, below_count: 0, above_count: 0 },
};

it.each([
  ["sum", "Sum", "Сумма", "Сумма"],
  ["average", "Average", "Среднее", "Уртача"],
  ["min", "Minimum", "Минимум", "Минимум"],
  ["max", "Maximum", "Максимум", "Максимум"],
] as const)("localizes the %s aggregation without changing the result", (aggregation, en, ru, tt) => {
  const localizedResult = { ...result, columns: columns.map(column => column.engine_name === "value"
    ? { ...column, metadata: { aggregation } } : column) };
  for (const [locale, label, prefix] of [["en", en, "Cell aggregation"], ["ru", ru, "Агрегация ячеек"], ["tt", tt, "Күзәнәкләрне агрегатлау"]] as const) {
    const view = render(<I18nProvider initialLocale={locale}><HeatmapView result={localizedResult}>Canvas</HeatmapView></I18nProvider>);
    expect(screen.getByText(`${prefix}: ${label} · x × y`)).toBeVisible();
    expect(screen.getByText(rows[0].value!)).toBeVisible();
    view.unmount();
  }
});

it("uses server colour positions, exact tooltips and stable cell/axis identities", () => {
  const option = chartOptions(result, "en", "light");
  expect(option.xAxis).toMatchObject({ data: ["x1", "x2"] });
  expect(option.series).toMatchObject([
    { type: "heatmap", data: [{ id: "a", value: [0, 0, 0], exactValue: rows[0].value }, { id: "b", value: [1, 0, 1], exactValue: rows[1].value }] },
    { data: [{ id: "c", status: "No source rows" }] }, { data: [{ id: "d", status: "Missing measure" }] },
  ]);
  expect(option.visualMap).toHaveLength(3); // Each ECharts heatmap layer needs a visual map.
  expect(heatmapSelection(result, { dataIndex: 0, data: { cellIdentity: "d" } })).toBe(rows[3]);
  expect(chartOptions(result, "tt", "dark").series).toHaveLength(3);
});

it.each(["extent", "fixed", "zero_centered"] as const)("keeps numeric labels readable across the %s colour scale", mode => {
  // Independent sRGB oracle: use ECharts' installed interpolator for the actual cell fill,
  // not the foreground selector under test. Do not round the ratio before comparison.
  const luminance = (value: string) => {
    const rgb = color.parse(value);
    if (!rgb) throw new Error(`Invalid chart colour: ${value}`);
    const linear = rgb.slice(0, 3).map(channel => {
      const normalized = channel / 255;
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const positions = Array.from({ length: 1001 }, (_, index) => index / 1000);
  const sweep: VisualizationResult = {
    ...result,
    rows: positions.map((position, index) => ({ ...rows[0], cell_id: String(index), value: String(position) })),
    heatmap_scale: { ...result.heatmap_scale!, mode, positions: Object.fromEntries(positions.map((position, index) => [String(index), position])) },
  };
  for (const theme of ["light", "dark"] as const) {
    const option = chartOptions(sweep, "en", theme);
    const series = option.series as { data: { label: { color: string }; emphasis?: { itemStyle?: { color?: string } } }[] }[];
    const muted = chartOptions({ ...sweep, highlight_field: "x", highlight_value: "not-in-this-result" }, "en", theme).series as {
      data: { itemStyle: { opacity: number }; label: { color: string; opacity: number; backgroundColor: string } }[];
    }[];
    positions.forEach((position, index) => {
      const background = color.lerp(position, heatmapColors(sweep));
      if (!background) throw new Error("Missing interpolated cell colour");
      expect(muted[0].data[index].itemStyle.opacity).toBe(0.25);
      expect(muted[0].data[index].label.opacity).toBe(1);
      expect(muted[0].data[index].label.color).toBe(series[0].data[index].label.color);
      expect(color.parse(muted[0].data[index].label.backgroundColor)).toEqual(color.parse(background));
      const foregroundLuminance = luminance(series[0].data[index].label.color);
      const backgroundLuminance = luminance(background);
      const ratio = (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
        / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
      expect(ratio, `${theme} ${mode} position=${position} fill=${background}`).toBeGreaterThanOrEqual(4.5);
      // ECharts' default emphasis darkens an unspecified fill with lift(-0.1).
      const hoverFill = series[0].data[index].emphasis?.itemStyle?.color ?? color.lift(background, -0.1);
      const hoverLuminance = luminance(hoverFill);
      const hoverRatio = (Math.max(foregroundLuminance, hoverLuminance) + 0.05)
        / (Math.min(foregroundLuminance, hoverLuminance) + 0.05);
      expect(hoverRatio, `${theme} ${mode} hover position=${position}`).toBeGreaterThanOrEqual(4.5);
    });
  }
});

it.each(["light", "dark"] as const)("keeps muted missing-cell markers opaque in %s", theme => {
  const option = chartOptions({ ...result, highlight_field: "cell_id", highlight_value: "a" }, "en", theme);
  const series = option.series as { data: { label: { color: string; opacity: number; backgroundColor: string } }[] }[];
  for (const [index, fill] of [[1, theme === "dark" ? "#202635" : "#fafafa"], [2, theme === "dark" ? "#465168" : "#d9dfe9"]] as const) {
    expect(series[index].data[0].label.opacity).toBe(1);
    expect(series[index].data[0].label.color).toBe(theme === "dark" ? "#ffffff" : "#000000");
    expect(color.parse(series[index].data[0].label.backgroundColor)).toEqual(color.parse(fill));
  }
});

it("retains exact fixed bounds as strings and removes them for automatic modes", () => {
  const change = vi.fn();
  render(<HeatmapAppearance config={{ spec: { ...result.spec, color_scale: { mode: "fixed", minimum: "0", maximum: "1" } } }} onChange={change} />);
  fireEvent.change(screen.getByLabelText("Colour minimum"), { target: { value: "9007199254740993.11" } });
  expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ spec: expect.objectContaining({ color_scale: { mode: "fixed", minimum: "9007199254740993.11", maximum: "1" } }) }));
  fireEvent.change(screen.getByLabelText("Colour range"), { target: { value: "zero_centered" } });
  expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ spec: expect.objectContaining({ color_scale: { mode: "zero_centered" } }) }));
});

it("shows separate empty states, exact table values and keyboard selection", () => {
  const select = vi.fn();
  render(<HeatmapView result={result} onSelect={select}>Canvas</HeatmapView>);
  expect(screen.getByText(rows[0].value!)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Cell table" }));
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
  expect(screen.getByRole("cell", { name: rows[1].value! })).toBeVisible();
  expect(screen.getByRole("cell", { name: "No source rows" })).toBeVisible();
  expect(screen.getByRole("cell", { name: "Missing measure" })).toBeVisible();
  fireEvent.click(screen.getAllByRole("button", { name: "Select" })[3]);
  expect(select).toHaveBeenCalledWith(expect.objectContaining({ id_cell_id: "d", id_present: true, id_value: null }));
});

it("pages the full cell table locally and exposes fixed-range saturation", () => {
  const many = { ...result, rows: Array.from({ length: 101 }, (_, index) => ({ ...rows[0], cell_id: String(index) })), heatmap_scale: { ...result.heatmap_scale!, mode: "fixed" as const, below_count: 1, above_count: 2 } };
  render(<HeatmapView result={many}>Canvas</HeatmapView>);
  expect(screen.getByText("Saturated colours: 1 cells below and 2 above the fixed range. Values are unchanged.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Cell table" }));
  expect(screen.getByText("Cells 1–100 of 101")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Cells 101–101 of 101")).toBeVisible();
  expect(screen.getAllByRole("row")).toHaveLength(2);
});
