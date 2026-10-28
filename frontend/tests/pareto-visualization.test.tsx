import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { init } from "echarts";
import { expectPaletteMarks } from "./mark-contrast";
import { render } from "./render";
import { ParetoView } from "@/features/dashboard/ParetoView";
import { paretoOptions } from "@/features/dashboard/pareto";
import { comboSelection } from "@/features/dashboard/combo";
import { chartSetupHints } from "@/features/dashboard/authoring-guidance";
import { VisualizationConfiguration } from "@/features/workflow/VisualizationConfiguration";
import type { VisualizationResult } from "@/features/dashboard/api";

const roles = { point_id: "point", rank: "rank", category: "category", value: "value", cumulative_value: "cumulative", share_percent: "share", cumulative_percent: "percent", share_exact: "fraction", cumulative_exact: "cumulative_fraction" };
const columns = Object.values(roles).map(name => ({ column_id: name, engine_name: name, display_name: name, logical_type: "string" as const, nullable: true, metadata: {} }));
const row = { point: "stable", rank: 2, category: "Region", value: "9007199254740993.11", cumulative: "18014398509481986.22", share: "33.333333333333", percent: "66.666666666667", fraction: "1/3", cumulative_fraction: "2/3" };
const result: VisualizationResult = {
  type: "pareto_chart", orientation: "vertical", visualization_revision: 1, visualization_id: "pareto", revision: 1,
  title: "Contributions", category_field: "category", value_field: null, number_format: "number", decimals: 2, currency: "RUB", show_legend: true, show_labels: false,
  spec: { version: 1, type: "pareto_chart", rows: roles, summary: { input_count: "count", zero_count: "zeros", total_value: "total" }, threshold_percent: 80 },
  columns, rows: [row], total_rows: 3, offset: 1, limit: 1, truncated: true,
  combo: { primary: { minimum: "0", maximum: row.value, lower: 0, upper: 1, ticks: [{ position: 0, label: "0" }, { position: 1, label: row.value }] }, secondary: { minimum: "0", maximum: "100", lower: 0, upper: 1, ticks: [{ position: 0, label: "0" }, { position: 1, label: "100" }] }, observations: [{ id: "stable", positions: [1, 2 / 3] }] },
  datasets: { summary: { columns: ["count", "zeros", "total"].map(name => ({ column_id: name, engine_name: name, display_name: name, logical_type: "string", nullable: false, metadata: {} })), rows: [{ count: 3, zeros: 0, total: "27021597764222979.33" }], total_rows: 1, offset: 0, limit: 1, truncated: false } },
};

it.each(["light", "dark"] as const)("renders contrasting Pareto contribution/share and reference in %s", theme => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 700, height: 400 });
  try {
    const fixture = { ...result, show_legend: false, rows: [row, { ...row, point: "second", category: "Other" }],
      combo: { ...result.combo!, observations: [{ id: "stable", positions: [1, 2 / 3] }, { id: "second", positions: [0.5, 1] }] } };
    const option = paretoOptions(fixture, "en", theme);
    chart.setOption(option);
    const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
    const colors = (option.series as { itemStyle: { color: string } }[]).map(series => series.itemStyle.color);
    expect(colors).toHaveLength(2);
    expectPaletteMarks(svg, [...colors, theme === "dark" ? "#c4cbd7" : "#566275"], theme);
    const zero = { ...fixture, combo: { ...fixture.combo, observations: fixture.combo.observations.map(item => ({ ...item, positions: [0, null] })) } };
    chart.setOption(paretoOptions(zero, "en", theme), true);
    expect((paretoOptions(zero, "en", theme).series as { markLine?: unknown }[])[1].markLine).toBeUndefined();
    const empty = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
    const remaining = [...empty.querySelectorAll("path,polyline")].filter(mark => [colors[1], theme === "dark" ? "#c4cbd7" : "#566275"].includes(mark.getAttribute("stroke")!) || mark.getAttribute("fill") === colors[1]);
    // ECharts may retain an empty path element; it must not contain drawable geometry.
    expect(remaining.filter(mark => (mark.getAttribute("d") ?? mark.getAttribute("points") ?? "").trim())).toHaveLength(0);
  } finally { chart.dispose(); context.mockRestore(); }
});

it("uses full-input server coordinates, exact values, stable identity and an explicit reference", () => {
  const option = paretoOptions(result, "en", "light");
  expect(option.tooltip).toMatchObject({ renderMode: "html", appendToBody: true, confine: true });
  expect(option.series).toMatchObject([{ type: "bar", data: [{ value: 1, exactValue: row.value }] }, { type: "line", yAxisIndex: 1, data: [{ value: 2 / 3, exactValue: row.percent }], markLine: { data: [{ yAxis: 0.8 }] } }]);
  expect(option.yAxis).toMatchObject([{ min: 0, max: 1 }, { min: 0, max: 1 }]);
  for (const axis of option.yAxis as { axisLabel: { hideOverlap: boolean; showMinLabel: boolean; showMaxLabel: boolean; customValues: number[] } }[]) {
    expect(axis.axisLabel).toMatchObject({ hideOverlap: true, showMinLabel: true, showMaxLabel: true, customValues: [0, 1] });
  }
  expect(comboSelection(result, { data: { observationIdentity: "stable" }, dataIndex: 99 })).toEqual(row);
  expect(comboSelection(result, { dataIndex: 0 })).toBeUndefined();
  const adjusted = { ...result, spec: { ...result.spec!, threshold_percent: 90 } } as VisualizationResult;
  expect(paretoOptions(adjusted, "tt", "dark").series).toMatchObject([{}, { markLine: { data: [{ yAxis: 0.9 }] } }]);
});

it.each(["light", "dark"] as const)("preserves opaque exact contribution/share labels under highlights in %s", theme => {
  const option = paretoOptions({ ...result, show_labels: true, highlight_field: "category", highlight_value: "Other" }, "en", theme);
  expect(option.series).toMatchObject([
    { label: { show: true, opacity: 1, color: theme === "dark" ? "#d7dfef" : "#34415b" }, data: [{ exactValue: row.value, itemStyle: { opacity: 0.3 } }] },
    { label: { show: true, opacity: 1 }, data: [{ exactValue: row.percent, itemStyle: { opacity: 0.3 } }] },
  ]);
});

it("keeps exact fractions, population and keyboard selection while paging", () => {
  const setOffset = vi.fn(), select = vi.fn();
  render(<ParetoView result={result} setOffset={setOffset} onSelect={select}>Canvas</ParetoView>);
  expect(screen.getByText(/Only the current page/)).toBeVisible();
  fireEvent.click(screen.getByText("Pareto population"));
  expect(screen.getByText(/27021597764222979.33/)).toBeVisible();
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
  expect(screen.getByRole("cell", { name: row.value })).toBeVisible();
  expect(screen.getByRole("cell", { name: "1/3" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Select" }));
  expect(select).toHaveBeenCalledWith(row);
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(setOffset).toHaveBeenLastCalledWith(2);
  fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
  expect(setOffset).toHaveBeenLastCalledWith(0);
});

it("distinguishes undefined zero-total shares from empty data and removes the reference line", () => {
  const zero = { ...result, combo: { ...result.combo!, observations: [{ id: "stable", positions: [0, null] }] } };
  const option = paretoOptions(zero, "en", "light");
  expect((option.series as { markLine?: unknown }[])[1].markLine).toBeUndefined();
  const view = render(<ParetoView result={zero}>Canvas</ParetoView>);
  expect(screen.getByText(/The total is zero/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  view.rerender(<ParetoView result={{ ...zero, rows: [], total_rows: 0, combo: { ...zero.combo, observations: [] } }}>Canvas</ParetoView>);
  expect(screen.getByText("No rows to visualize.")).toBeVisible();
  expect(screen.queryByText(/The total is zero/)).not.toBeInTheDocument();
});

it("authors the reference without hiding the chart legend controls", () => {
  const change = vi.fn();
  render(<VisualizationConfiguration type="pareto_chart" config={{ spec: result.spec }} columns={columns} onChange={change} />);
  expect(screen.getByLabelText("Show legend")).toBeChecked();
  fireEvent.change(screen.getByLabelText("Cumulative share reference (%)"), { target: { value: "90" } });
  expect(change).toHaveBeenCalledWith({ spec: { ...result.spec, threshold_percent: 90 } });
  expect(chartSetupHints("pareto_chart", "dataset", { spec: result.spec }, columns)).toEqual([]);
  expect(chartSetupHints("pareto_chart", "dataset", { spec: { ...result.spec, threshold_percent: 0 } }, columns)).toEqual(["Choose a whole-number cumulative share reference from 1 to 100%."]);
});
