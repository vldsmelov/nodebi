import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { init } from "echarts";
import { tokens, contrast, composite } from "./mark-contrast";
import { render } from "./render";
import { FunnelView } from "@/features/dashboard/FunnelView";
import { FunnelConfiguration } from "@/features/workflow/FunnelConfiguration";
import { funnelOptions, funnelSelection } from "@/features/dashboard/funnel";
import type { VisualizationResult } from "@/features/dashboard/api";

const roles = { point_id: "point_id", stage: "stage", order: "order", value: "value", previous_percent: "previous_percent", initial_percent: "initial_percent", loss: "loss", previous_exact: "previous_exact", initial_exact: "initial_exact" };
const columns = Object.keys(roles).map(name => ({ column_id: name, engine_name: name, display_name: name, logical_type: name === "stage" || name === "point_id" || name.endsWith("exact") ? "string" as const : name === "order" ? "integer" as const : "decimal" as const, nullable: true, metadata: {} }));
const rows = [{ point_id: "a", stage: "First", order: 1, value: "9007199254740993.01", previous_percent: null, initial_percent: "100", loss: null, previous_exact: null, initial_exact: "1" }, { point_id: "b", stage: "Second", order: 2, value: "3002399751580331.003", previous_percent: "33.333333333333", initial_percent: "33.333333333333", loss: "6004799503160662.007", previous_exact: "1/3", initial_exact: "1/3" }, { point_id: "c", stage: "Zero", order: 3, value: "0", previous_percent: "0", initial_percent: "0", loss: "3002399751580331.003", previous_exact: "0", initial_exact: "0" }];
const result: VisualizationResult = { orientation: "vertical", visualization_revision: 1, visualization_id: "funnel", revision: 1, type: "funnel_chart", title: "Funnel", category_field: "stage", value_field: null, number_format: "number", decimals: 2, currency: "USD", show_legend: false, show_labels: true, columns, rows, total_rows: 3, offset: 0, limit: 3, truncated: false,
  spec: { type: "funnel_chart", version: 1, rows: roles, summary: { stage_count: "count", initial_value: "initial", final_value: "final", overall_percent: "overall", overall_exact: "exact" } },
  funnel: { points: [{ id: "a", width: 1, zero: false }, { id: "b", width: 1 / 3, zero: false }, { id: "c", width: 0, zero: true }] },
  datasets: { summary: { columns: [{ column_id: "overall", engine_name: "overall", display_name: "Overall", logical_type: "decimal", nullable: true, metadata: {} }], rows: [{ overall: "0.000000000000" }], offset: 0, limit: 1, total_rows: 1, truncated: false } },
};

it.each(["light", "dark"] as const)("renders distinct funnel stages and zero markers in %s", theme => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 700, height: 400 });
  try {
    chart.setOption(funnelOptions({ ...result, show_labels: false }, "en", theme));
    const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
    const fill = theme === "dark" ? "#83afff" : "#315ad0", ink = theme === "dark" ? "#e5edfc" : "#24334f";
    const marks = [...svg.querySelectorAll("path,rect,polygon")];
    const filled = marks.filter(mark => mark.getAttribute("fill") === fill);
    expect(filled.filter(mark => Number(mark.getAttribute("fill-opacity") ?? 1) === 1)).toHaveLength(2);
    expect(filled.filter(mark => Number(mark.getAttribute("fill-opacity")) === 0.15)).toHaveLength(2);
    const zeros = marks.filter(mark => mark.getAttribute("stroke") === ink);
    expect(zeros).toHaveLength(1);
    expect(zeros[0].getAttribute("stroke-dasharray")).toBeTruthy();
    const palette = tokens(theme === "light" ? ":root" : ':root[data-theme="dark"]');
    for (const background of [palette.panel, palette.surface]) {
      expect(contrast(fill, background)).toBeGreaterThanOrEqual(3);
      expect(contrast(ink, background)).toBeGreaterThanOrEqual(3);
      expect(contrast(fill, composite(fill, 0.15, background))).toBeGreaterThanOrEqual(3);
    }
  } finally { chart.dispose(); context.mockRestore(); }
});

it("encodes server widths, keeps the final stage flat and marks genuine zeros only", () => {
  const option = funnelOptions(result, "en", "light");
  type Shape = { type: string; shape?: Record<string, unknown> };
  const series = (option.series as { renderItem: (params: object, api: object) => { children: Shape[] }; data: { stageIdentity: string; exactTooltip: string }[] }[])[0];
  const draw = (i: number) => series.renderItem({ coordSys: { type: "cartesian2d", x: 0, y: 0, width: 300, height: 300 } }, { value: () => i, coord: ([x, y]: number[]) => [300 * x, y * 100 + 50], size: () => [300, 100] }).children;
  expect(draw(0)[0].type).toBe("polygon");
  expect(draw(0)[1]).toMatchObject({ type: "rect", shape: { width: 300 } });
  expect(draw(1)[1].type).toBe("rect");
  expect(draw(1)[1].shape!.x).toBeCloseTo(100, 10);
  expect(draw(1)[1].shape!.width).toBeCloseTo(100, 10);
  expect(draw(2)[0].type).toBe("line");
  expect(draw(2).some(s => s.type === "polygon")).toBe(false);
  const tiny = { ...result, rows: rows.slice(0, 1), show_labels: false, funnel: { points: [{ id: "a", width: 0, zero: false }] } };
  const tinySeries = (funnelOptions(tiny, "tt", "dark").series as { renderItem: (params: object, api: object) => { children: Shape[] } }[])[0];
  const finalShapes = tinySeries.renderItem({ coordSys: { type: "cartesian2d", x: 0, y: 0, width: 300, height: 100 } }, { value: () => 0, coord: ([x]: number[]) => [300 * x, 50], size: () => [300, 100] }).children;
  expect(finalShapes).toHaveLength(1);
  expect(finalShapes[0]).toMatchObject({ type: "rect", shape: { width: 0 } });
  expect(series.data[0].exactTooltip).toContain("9007199254740993.01");
  expect(series.data.map(s => s.stageIdentity)).toEqual(["a", "b", "c"]);
  expect(funnelSelection(result, { dataIndex: 0, data: { stageIdentity: "b" } })).toBe(rows[1]);
  expect(funnelSelection(result, { dataIndex: 0 })).toBeUndefined();
});

it("provides exact ratios, losses and selection without requiring canvas interaction", () => {
  const select = vi.fn();
  render(<FunnelView result={result} onSelect={select}>Canvas</FunnelView>);
  expect(screen.getByText("Overall retention (%): 0.000000000000")).toBeVisible();
  expect(screen.getByLabelText("Funnel chart stages")).toHaveAttribute("tabindex", "0");
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
  expect(screen.getByRole("cell", { name: "9007199254740993.01" })).toBeVisible();
  expect(screen.getAllByRole("cell", { name: "1/3" })).toHaveLength(2);
  fireEvent.click(screen.getAllByRole("button", { name: "Select" })[1]);
  expect(select).toHaveBeenCalledWith(rows[1]);
});

it("renders complete exact tooltip text outside the stage scroller without trusting source HTML", () => {
  const unsafe = { ...result, rows: [{ ...rows[1], stage: '<img src=x onerror=alert(1)> & "Qualified"' }] };
  const option = funnelOptions(unsafe, "en", "dark");
  const tooltip = option.tooltip as { formatter: (event: unknown) => string };
  expect(tooltip).toMatchObject({ renderMode: "html", appendToBody: true, confine: true });
  const data = (option.series as { data: { exactTooltip: string }[] }[])[0].data[0];
  const parsed = new DOMParser().parseFromString(tooltip.formatter({ data }), "text/html");
  expect(parsed.querySelector("img")).toBeNull();
  expect(parsed.querySelector('[role="tooltip"]')?.textContent).toBe(data.exactTooltip);
  expect(data.exactTooltip).toContain("3002399751580331.003");
  expect(data.exactTooltip).toContain("Previous-stage retention (%): 33.333333333333");
  expect(data.exactTooltip).toContain("Loss from previous stage: 6004799503160662.007");
});

it("keeps undefined zero-population ratios and empty results explicit", () => {
  render(<FunnelView result={{ ...result, rows: [], funnel: { points: [] }, datasets: { summary: { ...result.datasets!.summary, rows: [{ overall: null }] } } }}>Canvas</FunnelView>);
  expect(screen.getByText("Overall retention (%): Undefined")).toBeVisible();
  expect(screen.getByText("No rows to visualize.")).toBeVisible();
});

it("offers only typed distinct stage/order/value fields and preserves unavailable references", () => {
  function Editor() { const [config, setConfig] = useState<Record<string, unknown>>({ stage_column_id: "gone" }); return <FunnelConfiguration config={config} columns={columns} onChange={setConfig} />; }
  render(<Editor />);
  expect(screen.getByLabelText("Funnel stage")).toHaveValue("gone");
  fireEvent.change(screen.getByLabelText("Funnel stage"), { target: { value: "stage" } });
  fireEvent.change(screen.getByLabelText("Stage order"), { target: { value: "order" } });
  fireEvent.change(screen.getByLabelText("Stage value"), { target: { value: "value" } });
  expect(screen.getByLabelText("Stage order")).toHaveValue("order");
  expect(screen.getByLabelText("Stage order").querySelector('option[value="value"]')).toBeNull();
  expect(screen.getByLabelText("Stage value").querySelector('option[value="order"]')).toBeDisabled();
});
