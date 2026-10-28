import type { CustomSeriesRenderItem, CustomSeriesOption } from "echarts";
import { init } from "echarts";
import { tokens, contrast, composite, expectMarkBoundary } from "./mark-contrast";
import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { WaterfallView } from "@/features/dashboard/WaterfallView";
import { waterfallColors, waterfallOptions, waterfallSelection } from "@/features/dashboard/waterfall";
import type { VisualizationResult } from "@/features/dashboard/api";
import type { components } from "@/lib/api-schema";

const names = ["step_id", "step_index", "category", "kind", "value", "start", "end", "balance", "generated"];
const roles = Object.fromEntries(names.map(name => [name, `id_${name}`])) as components["schemas"]["WaterfallRoles"];
const columns = names.map(name => ({ column_id: `id_${name}`, engine_name: name, display_name: name, logical_type: "string" as const, nullable: false, metadata: name === "value" ? { currency: "RUB" } : {} }));
const rows = [
  { step_id: "opening", category: "Opening", kind: "initial", value: "9007199254740993.11", start: "0", end: "9007199254740993.11", balance: "9007199254740993.11" },
  { step_id: "cross", category: "Cost", kind: "change", value: "-18014398509481986.22", start: "9007199254740993.11", end: "-9007199254740993.11", balance: "-9007199254740993.11" },
  { step_id: "subtotal", category: "Checkpoint", kind: "subtotal", value: "-9007199254740993.11", start: "0", end: "-9007199254740993.11", balance: "-9007199254740993.11" },
  { step_id: "zero", category: "No change", kind: "change", value: "0", start: "-9007199254740993.11", end: "-9007199254740993.11", balance: "-9007199254740993.11" },
  { step_id: "tiny", category: "Tiny change", kind: "change", value: "1e-20", start: "-9007199254740993.11", end: "-9007199254740993.10999999999999999999", balance: "-9007199254740993.10999999999999999999" },
];
const result: VisualizationResult = { type: "waterfall_chart", spec: { type: "waterfall_chart", version: 1, steps: roles }, visualization_id: "waterfall", visualization_revision: 1, revision: 1, orientation: "vertical", title: "Balance", category_field: "category", value_field: "value", number_format: "number", decimals: 2, currency: "RUB", show_legend: true, show_labels: true, columns, rows, total_rows: 5, offset: 0, limit: 5, truncated: false,
  waterfall_scale: { minimum: "-9007199254740993.11", maximum: "9007199254740993.11", zero: 0.5, ticks: [{ position: 0, label: "-9007199254740993.11" }, { position: 0.5, label: "0" }, { position: 1, label: "9007199254740993.11" }], positions: { opening: { start: 0.5, end: 1, sign: 1 }, cross: { start: 1, end: 0, sign: -1 }, subtotal: { start: 0.5, end: 0, sign: -1 }, zero: { start: 0, end: 0, sign: 0 }, tiny: { start: 0, end: 0, sign: 1 } } },
};

function draw(index: number, horizontal = false, band = 100, highlighted = false, theme: "light" | "dark" = "light") {
  const series = (waterfallOptions({ ...result, orientation: horizontal ? "horizontal" : "vertical", ...(highlighted ? { highlight_field: "step_id", highlight_value: "opening" } : {}) }, "en", theme).series as CustomSeriesOption[])[0];
  const data = series.data as { value: number[] }[];
  const renderItem = series.renderItem as CustomSeriesRenderItem;
  return renderItem({ coordSys: { type: "cartesian2d", x: 0, y: 0, width: 1000, height: 1000 } } as unknown as Parameters<CustomSeriesRenderItem>[0], {
    value: (dim: number) => data[index].value[dim], coord: ([x, y]: number[]) => [x * 100, 200 - y * 100], size: () => [band, band],
  } as unknown as Parameters<CustomSeriesRenderItem>[1]);
}

it.each(["light", "dark"] as const)("renders contrasting waterfall fills, outlines and zero/tiny marks in %s", theme => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 800, height: 500 });
  try {
    for (const orientation of ["vertical", "horizontal"] as const) {
      chart.setOption({ ...waterfallOptions({ ...result, orientation, show_labels: false }, "en", theme), animation: false }, true);
      const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
      const colors = Object.values(waterfallColors(theme));
      const marks = [...svg.querySelectorAll("path,rect,circle")].filter(mark => colors.includes(mark.getAttribute("stroke")!) || colors.includes(mark.getAttribute("fill")!));
      expect(marks.length).toBeGreaterThanOrEqual(5);
      for (const color of colors) expect(marks.some(mark => mark.getAttribute("stroke") === color || mark.getAttribute("fill") === color)).toBe(true);
      const palette = tokens(theme === "light" ? ":root" : ':root[data-theme="dark"]');
      for (const mark of marks) {
        const attribute = colors.includes(mark.getAttribute("stroke")!) ? "stroke" : "fill";
        const color = mark.getAttribute(attribute)!;
        const opacity = Number(mark.getAttribute(`${attribute}-opacity`) ?? 1);
        expect(opacity).toBe(1);
        for (const background of [palette.panel, palette.surface]) expect(contrast(composite(color, opacity, background), background)).toBeGreaterThanOrEqual(3);
        if (mark.getAttribute("fill")?.endsWith("26")) expectMarkBoundary(mark, theme, 2, 1);
      }
      const zero = marks.filter(mark => mark.getAttribute("stroke") === waterfallColors(theme).zero);
      expect(zero).toHaveLength(1);
      expect(Number(zero[0].getAttribute("stroke-width"))).toBeGreaterThanOrEqual(2);
    }
  } finally { chart.dispose(); context.mockRestore(); }
});

it.each(["light", "dark"] as const)("retains opaque waterfall label ink while muting unselected marks in %s", theme => {
  for (const horizontal of [false, true]) {
    expect(draw(1, horizontal, 100, true, theme)).toMatchObject({ children: expect.arrayContaining([
      expect.objectContaining({ type: "rect", style: expect.objectContaining({ opacity: 0.3 }) }),
      expect.objectContaining({ type: "text", style: expect.objectContaining({ opacity: 1, fill: theme === "dark" ? "#d7dfef" : "#34415b" }) }),
    ]) });
  }
});

it("renders prepared endpoints across zero without stacked-bar arithmetic", () => {
  expect(draw(1)).toMatchObject({ type: "group", children: expect.arrayContaining([{ type: "rect", shape: { x: 76, y: 100, width: 48, height: 100 }, style: expect.any(Object) }]) });
  expect(draw(1, true)).toMatchObject({ children: expect.arrayContaining([{ type: "rect", shape: { x: 0, y: 76, width: 100, height: 48 }, style: expect.any(Object) }]) });
  expect(draw(2)).toMatchObject({ children: expect.arrayContaining([expect.objectContaining({ type: "rect", style: expect.objectContaining({ lineDash: [4, 2] }) })]) });
  expect(draw(3)).toMatchObject({ children: expect.arrayContaining([expect.objectContaining({ type: "line", shape: { x1: 276, x2: 324, y1: 200, y2: 200 }, style: expect.objectContaining({ lineWidth: 2 }) })]) });
  expect(draw(4)).toMatchObject({ children: expect.arrayContaining([expect.objectContaining({ type: "circle" })]) });
  expect(draw(1, true, 8)).toMatchObject({ children: expect.not.arrayContaining([expect.objectContaining({ type: "text" })]) });
  expect(draw(1)).toMatchObject({ children: expect.arrayContaining([expect.objectContaining({ type: "text", style: expect.not.objectContaining({ backgroundColor: expect.anything() }) })]) });
});

it("keeps exact tooltips and stable step selection independent of row positions", () => {
  const options = waterfallOptions(result, "en", "dark");
  expect(options.tooltip).toMatchObject({ renderMode: "html", appendToBody: true, confine: true });
  const tooltip = options.tooltip as { formatter: (event: unknown) => string };
  const container = document.createElement("div");
  container.innerHTML = tooltip.formatter({ data: { exactTooltip: `<script>alert(1)</script>\n${rows[0].value}` } });
  expect(container.querySelector("script")).toBeNull();
  expect(container.textContent).toBe(`<script>alert(1)</script>\n${rows[0].value}`);
  expect(options.series).toMatchObject([{ data: expect.arrayContaining([expect.objectContaining({ stepIdentity: "opening", exactValue: rows[0].value, exactTooltip: expect.stringContaining(rows[0].value) })]) }]);
  expect((options.series as CustomSeriesOption[])[0].data).toHaveLength(5);
  expect(waterfallSelection(result, { dataIndex: 0, data: { stepIdentity: "cross" } })).toBe(rows[1]);
  expect(waterfallSelection(result, { dataIndex: 0 })).toBeUndefined();
  expect(options.yAxis).toMatchObject({ min: 0, max: 1 });
});

it("shows an exact keyboard-selectable table and pages all prepared steps", () => {
  const select = vi.fn();
  const many = { ...result, rows: Array.from({ length: 101 }, (_, index) => ({ ...rows[0], step_id: String(index), category: `Step${index}` })) };
  render(<WaterfallView result={many} onSelect={select}>Canvas</WaterfallView>);
  fireEvent.click(screen.getByRole("button", { name: "Step table" }));
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
  expect(screen.getByText("Steps 1–100 of 101")).toBeVisible();
  expect(screen.getAllByRole("cell", { name: rows[0].value })).toHaveLength(300);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Steps 101–101 of 101")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Select" }));
  expect(select).toHaveBeenCalledWith(expect.objectContaining({ id_step_id: "100", id_value: rows[0].value }));
});

it("shows an explicit empty state and never invents a zero balance", () => {
  render(<WaterfallView result={{ ...result, rows: [] }}>Canvas</WaterfallView>);
  expect(screen.getByText("No rows to visualize.")).toBeVisible();
  expect(screen.queryByText("Canvas")).not.toBeInTheDocument();
});

it("offers keyboard chart windows without filtering or recalculating prepared data", () => {
  const many = { ...result, rows: Array.from({ length: 41 }, (_, index) => ({ ...rows[0], step_id: String(index) })) };
  const child = vi.fn((window?: [number, number]) => <span>{window ? window.join(":") : "All"}</span>);
  render(<WaterfallView result={many}>{child}</WaterfallView>);
  fireEvent.click(screen.getByRole("button", { name: "Show 20 steps" }));
  expect(child).toHaveBeenLastCalledWith([0, 19]);
  fireEvent.click(screen.getByRole("button", { name: "Next steps" }));
  expect(child).toHaveBeenLastCalledWith([20, 39]);
  fireEvent.click(screen.getByRole("button", { name: "Next steps" }));
  expect(child).toHaveBeenLastCalledWith([40, 40]);
  expect(screen.getByRole("button", { name: "Next steps" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Show all steps" }));
  expect(child).toHaveBeenLastCalledWith(undefined);
  expect(many.rows).toHaveLength(41);
});
