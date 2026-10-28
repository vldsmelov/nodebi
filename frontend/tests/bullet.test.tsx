import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { init } from "echarts";
import { tokens, contrast } from "./mark-contrast";
import { render } from "./render";
import { BulletView } from "@/features/dashboard/BulletView";
import { BulletConfiguration } from "@/features/workflow/BulletConfiguration";
import { bulletOptions, bulletSelection, bulletWindowSize } from "@/features/dashboard/bullet";
import { chartSetupHints } from "@/features/dashboard/authoring-guidance";
import type { VisualizationResult } from "@/features/dashboard/api";

const columns = ["key", "actual", "target"].map((name, i) => ({ column_id: name, engine_name: name, display_name: name, logical_type: i ? "decimal" as const : "string" as const, nullable: true, metadata: {} }));
const rows = [{ key: "Negative", actual: "-50.00", target: "80.00" }, { key: "Zero", actual: "0.00", target: null }, { key: "Missing", actual: null, target: "0.00" }];
const result: VisualizationResult = { orientation: "vertical", visualization_revision: 1, type: "bullet_chart", spec: { type: "bullet_chart", version: 1, category_column_id: "key", actual_column_id: "actual", target_column_id: "target", minimum: "-100", maximum: "100", bands: [{ label: "Lower", upper: "0", tone: "neutral" }, { label: "Upper", upper: "100", tone: "positive" }] }, bullet: { zero: 0.5, ticks: [{ position: 0, label: "-100", display_label: "-100" }, { position: 1, label: "100", display_label: "100" }], band_ends: [0.5, 1], input_count: 3, missing_actual_count: 1, missing_target_count: 1, points: [
  { id: "negative", actual: 0.25, target: 0.9, actual_band: 0, actual_zero: false },
  { id: "zero", actual: 0.5, target: null, actual_band: 1, actual_zero: true },
  { id: "missing", actual: null, target: 0.5, actual_band: null, actual_zero: false },
] }, visualization_id: "bullet", revision: 1, title: "Bullet", category_field: "key", value_field: null, number_format: "number", decimals: 2, currency: "USD", show_legend: true, show_labels: false, columns, rows, total_rows: 3, offset: 0, limit: 100, truncated: false };

it.each(["light", "dark"] as const)("keeps bullet actual/target/zero marks contrasting on every band in %s", theme => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 700, height: 400 });
  try {
    if (result.spec?.type !== "bullet_chart") throw new Error("Expected bullet fixture");
    const tones = ["neutral", "negative", "warning", "positive"] as const;
    const fixture = { ...result, spec: { ...result.spec, bands: tones.map((tone, index) => ({ label: tone, upper: String((index + 1) * 50 - 100), tone })) },
      bullet: { ...result.bullet!, band_ends: [0.25, 0.5, 0.75, 1] } };
    chart.setOption(bulletOptions(fixture, "en", theme));
    const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
    const ink = theme === "dark" ? "#e5edfc" : "#24334f";
    const shapes = [...svg.querySelectorAll("path,rect")];
    const actual = shapes.filter(mark => mark.getAttribute("fill") === ink);
    const lines = shapes.filter(mark => mark.getAttribute("stroke") === ink && Number(mark.getAttribute("stroke-opacity") ?? 1) === 1);
    expect(actual).toHaveLength(1); // Missing actual is not a fabricated zero bar.
    expect(lines).toHaveLength(3); // Two targets and one genuine zero actual.
    expect(lines.map(mark => Number(mark.getAttribute("stroke-width"))).sort()).toEqual([2, 3, 3]);
    const bands = shapes.filter(mark => /^#[\da-f]{6}$/i.test(mark.getAttribute("fill") ?? "") && mark.getAttribute("fill") !== ink);
    expect(new Set(bands.map(mark => mark.getAttribute("fill"))).size).toBe(4);
    for (const band of bands) expect(contrast(ink, band.getAttribute("fill")!)).toBeGreaterThanOrEqual(3);
    const palette = tokens(theme === "light" ? ":root" : ':root[data-theme="dark"]');
    for (const background of [palette.panel, palette.surface]) expect(contrast(ink, background)).toBeGreaterThanOrEqual(3);
  } finally { chart.dispose(); context.mockRestore(); }
});

it("renders signed bars from server zero and does not turn missing values into zeros", () => {
  const options = bulletOptions(result, "en", "light");
  type Shape = { type: string; shape: Record<string, number> };
  const series = (options.series as { renderItem: (params: object, api: object) => { children: Shape[] }; data: { exactTooltip: string }[] }[])[0];
  const draw = (index: number) => series.renderItem({ coordSys: { type: "cartesian2d", x: 0, y: 0, width: 100, height: 300 } }, { value: () => index, coord: ([x, y]: number[]) => [x * 100, y * 100 + 50], size: () => [100, 100] }).children;
  expect(draw(0)[2]).toMatchObject({ type: "rect", shape: { x: 25, width: 25 } });
  expect(draw(0)[3]).toMatchObject({ type: "line", shape: { x1: 90, x2: 90 } });
  expect(draw(1)).toHaveLength(3);
  expect(draw(1)[2]).toMatchObject({ type: "line", shape: { x1: 50, x2: 50 } });
  expect(draw(2)).toHaveLength(3);
  expect(series.data[0].exactTooltip).toContain("-50.00");
  expect(series.data[2].exactTooltip).toContain("Missing actual");
  expect(bulletSelection(result, { dataIndex: 0, data: { bulletIdentity: "missing" } })).toBe(rows[2]);
  expect(bulletSelection(result, { dataIndex: 0 })).toBeUndefined();
});

it("keeps exact bullet values and band text in escaped tooltips outside short canvases", () => {
  const option = bulletOptions({ ...result, rows: [{ ...rows[0], key: '<img src=x onerror=alert(1)> & "Negative"' }, ...rows.slice(1)] }, "en", "dark");
  const tooltip = option.tooltip as { formatter: (event: unknown) => string };
  expect(tooltip).toMatchObject({ renderMode: "html", appendToBody: true, confine: true });
  const data = (option.series as { data: { exactTooltip: string }[] }[])[0].data[0];
  const parsed = new DOMParser().parseFromString(tooltip.formatter({ data }), "text/html");
  expect(parsed.querySelector("img")).toBeNull();
  expect(parsed.querySelector('[role="tooltip"]')?.textContent).toBe(data.exactTooltip);
  expect(data.exactTooltip).toContain("Actual: -50.00\nTarget: 80.00\nLower");
});

it("keeps the first optional bullet label inside the canvas and its clip at supported short heights", () => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const chart = init(null, undefined, { renderer: "svg", ssr: true, width: 420, height: 71 });
  try {
    for (const height of [71, 99, 127, 155, 183, 400]) {
      chart.resize({ width: 420, height });
      chart.setOption(bulletOptions({ ...result, show_labels: true }, "en", "light", [0, bulletWindowSize(height) - 1]), true);
      chart.renderToSVGString();
      const text = chart.getZr().storage.getDisplayList().find(item => item.type === "tspan" && item.style.text === "-50.00");
      expect(text).toBeDefined();
      const bounds = text!.getBoundingRect().clone();
      bounds.applyTransform(text!.transform);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
      for (const clip of text!.__clipPaths ?? []) {
        const box = clip.getBoundingRect().clone();
        box.applyTransform(clip.transform);
        expect(bounds.y).toBeGreaterThanOrEqual(box.y);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(box.y + box.height);
      }
    }
  } finally { chart.dispose(); context.mockRestore(); }
});

it("keeps windows on the same scale with stable identities and exact tooltip strings", () => {
  const exact = { ...result, rows: [{ ...rows[0], actual: "9007199254740993.01" }, ...rows.slice(1)] };
  const all = bulletOptions(exact, "tt", "dark"), window = bulletOptions(exact, "tt", "dark", [1, 2]);
  expect(window.xAxis).toMatchObject({ min: 0, max: 1 });
  expect((all.series as { data: { exactTooltip: string }[] }[])[0].data[0].exactTooltip).toContain("9007199254740993.01");
  expect((window.series as { data: { bulletIdentity: string }[] }[])[0].data.map(d => d.bulletIdentity)).toEqual(["zero", "missing"]);
});

it("provides exact table, keyboard selection, full counts and server paging", () => {
  const select = vi.fn(), next = vi.fn();
  render(<BulletView result={{ ...result, total_rows: 201, truncated: true }} onSelect={select} setOffset={next}>{() => "Canvas"}</BulletView>);
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
  expect(screen.getByRole("cell", { name: "-50.00" })).toBeVisible();
  expect(screen.getByRole("cell", { name: "Missing actual" })).toBeVisible();
  fireEvent.click(screen.getAllByRole("button", { name: "Select" })[1]);
  expect(select).toHaveBeenCalledWith(rows[1]);
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(next).toHaveBeenCalledWith(100);
});

it("uses readable five-indicator windows without altering table or API pages", () => {
  expect([0, 71, 99, 127, 155, 183, 1000].map(bulletWindowSize)).toEqual([1, 1, 2, 3, 4, 5, 5]);
  const many = { ...result, rows: Array.from({ length: 11 }, (_, i) => ({ ...rows[0], key: String(i) })), bullet: { ...result.bullet!, points: Array.from({ length: 11 }, (_, i) => ({ ...result.bullet!.points[0], id: String(i) })) }, total_rows: 11 };
  render(<BulletView result={many}>{window => `Window ${window.join("/")}`}</BulletView>);
  expect(screen.getByText("Window 0/4")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next indicators" }));
  expect(screen.getByText("Window 5/9")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next indicators" }));
  expect(screen.getByText("Window 10/14")).toBeVisible();
  expect(screen.getByRole("button", { name: "Next indicators" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
});

it("preserves decimal range input, typed bindings and the final scale bound", () => {
  function Editor() { const [config, setConfig] = useState<Record<string, unknown>>({}); return <BulletConfiguration config={config} columns={columns} onChange={setConfig} />; }
  render(<Editor />);
  for (const [label, value] of [["Bullet category", "key"], ["Actual field", "actual"], ["Target field", "actual"]]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  expect(screen.getByLabelText("Target field")).toHaveValue("actual");
  fireEvent.change(screen.getByLabelText("Scale maximum"), { target: { value: "9007199254740993.01" } });
  expect(screen.getByLabelText("Range upper bound 1")).toHaveValue("9007199254740993.01");
  fireEvent.click(screen.getByRole("button", { name: "Add range" }));
  fireEvent.change(screen.getByLabelText("Range upper bound 1"), { target: { value: "9007199254740993.00" } });
  expect(screen.getByLabelText("Range upper bound 1")).toHaveValue("9007199254740993.00");
  expect(screen.getByLabelText("Range upper bound 2")).toHaveAttribute("readonly");
  fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[1]);
  expect(screen.getByLabelText("Range upper bound 1")).toHaveValue("9007199254740993.01");
  expect(chartSetupHints("bullet_chart", "dataset", {}, columns)).toHaveLength(1);
  expect(chartSetupHints("bullet_chart", "dataset", { spec: result.spec }, columns)).toEqual([]);
});
