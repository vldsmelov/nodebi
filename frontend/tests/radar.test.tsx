import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { init } from "echarts";
import { tokens, contrast, composite } from "./mark-contrast";
import { render } from "./render";
import { RadarView } from "@/features/dashboard/RadarView";
import { RadarConfiguration } from "@/features/workflow/RadarConfiguration";
import { radarOptions, radarSelection } from "@/features/dashboard/radar";
import { chartSetupHints } from "@/features/dashboard/authoring-guidance";
import type { VisualizationResult } from "@/features/dashboard/api";

const columns = ["profile", "sales", "quality", "margin"].map((name, index) => ({ column_id: `id_${name}`, engine_name: name, display_name: name, logical_type: index ? "decimal" as const : "string" as const, nullable: true, metadata: index ? { unit: "points" } : {} }));
const rows = [
  { profile: "North", sales: "9007199254740993.11", quality: "0.125", margin: 1e-20 },
  { profile: "South", sales: null, quality: "0.25", margin: "0.1" },
];
const spec = { type: "radar_chart" as const, version: 1 as const, profile_column_id: "id_profile", normalization: "min_max" as const, axes: columns.slice(1).map(column => ({ column_id: column.column_id, minimum: "0", maximum: "10000000000000000" })) };
const result: VisualizationResult = { type: "radar_chart", spec, visualization_id: "radar", visualization_revision: 1, revision: 1, title: "Profiles", orientation: "vertical", category_field: "profile", value_field: null, number_format: "number", decimals: 2, currency: "RUB", show_legend: true, show_labels: true, columns, rows, total_rows: 2, offset: 0, limit: 2, truncated: false,
  radar: { incomplete_count: 1, profiles: [{ id: "north", category: "North", complete: true, positions: [0.9, 0.2, 0.1] }, { id: "south", category: "South", complete: false, positions: [null, 0.25, 0.1] }] },
};

it.each(["light", "dark"] as const)("renders eight contrasting radar profile strokes in %s", theme => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 800, height: 500 });
  const profiles = Array.from({ length: 8 }, (_, index) => ({ id: `p${index}`, category: `Profile ${index}`, complete: true, positions: [0.2 + index * 0.08, 0.5, 0.8] }));
  const fixture: VisualizationResult = { ...result, show_labels: false, show_legend: false,
    rows: profiles.map(profile => ({ ...rows[0], profile: profile.category })), radar: { incomplete_count: 0, profiles } };
  try {
    for (const highlighted of [false, true]) {
      chart.setOption({ ...radarOptions({ ...fixture, ...(highlighted ? { highlight_field: "profile", highlight_value: "Profile 0" } : {}) }, "en", theme), animation: false }, true);
      const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
      const lines = [...svg.querySelectorAll("polyline")].filter(mark => mark.getAttribute("fill") === "none" && mark.getAttribute("stroke-width") === "2");
      expect(lines).toHaveLength(8);
      const colors = lines.map(line => line.getAttribute("stroke")!);
      expect(new Set(colors).size).toBe(8);
      const palette = tokens(theme === "light" ? ":root" : ':root[data-theme="dark"]');
      const markers = [...svg.querySelectorAll("path")].filter(mark => colors.includes(mark.getAttribute("fill")!) || colors.includes(mark.getAttribute("stroke")!));
      expect(markers).toHaveLength(24);
      if (!highlighted) for (const marker of markers) for (const background of [palette.panel, palette.surface]) {
        const attribute = colors.includes(marker.getAttribute("fill")!) ? "fill" : "stroke";
        const color = marker.getAttribute(attribute)!;
        expect(Number(marker.getAttribute(`${attribute}-opacity`) ?? 1)).toBe(1);
        expect(contrast(color, background)).toBeGreaterThanOrEqual(3);
      }
      for (const [index, line] of lines.entries()) {
        const opacity = Number(line.getAttribute("stroke-opacity") ?? 1);
        expect(opacity).toBe(highlighted && index !== 0 ? 0.25 : 1);
        if (opacity !== 1) continue;
        for (const background of [palette.panel, palette.surface]) {
          expect(contrast(colors[index], background)).toBeGreaterThanOrEqual(3);
          // Own translucent profile area is decoration; the contour carries position.
          expect(contrast(colors[index], composite(colors[index], 0.05, background))).toBeGreaterThanOrEqual(3);
        }
      }
    }
  } finally { chart.dispose(); context.mockRestore(); }
});

it("renders only complete profiles using server positions and exact tooltip/axis labels", () => {
  const option = radarOptions(result, "en", "light");
  expect(option.radar).toMatchObject({ indicator: columns.slice(1).map(column => ({ name: column.display_name, min: 0, max: 1 })) });
  expect(option.series).toMatchObject([{ type: "radar", data: [{ id: "north", profileIdentity: "north", value: [0.9, 0.2, 0.1], exactValues: [rows[0].sales, "0.125", "1e-20"] }] }]);
  const series = (option.series as { data: { exactTooltip: string; exactValues: string[] }[]; label: { formatter: (event: unknown) => string } }[])[0];
  expect(series.data).toHaveLength(1);
  expect(series.data[0].exactTooltip).toContain("sales: 9007199254740993.11 points");
  expect(series.label.formatter({ dimensionIndex: 2, data: series.data[0] })).toBe("1e-20");
  expect(radarSelection(result, { dataIndex: 0, data: { profileIdentity: "south" } })).toBe(rows[1]);
  expect(radarSelection(result, { dataIndex: 0 })).toBeUndefined();
  expect(radarOptions(result, "tt", "dark").series).toHaveLength(1);
});

it("keeps tooltip source text inert and wraps long profiles outside the chart canvas", () => {
  const option = radarOptions(result, "en", "light");
  expect(option.tooltip).toMatchObject({ renderMode: "html", appendToBody: true, confine: true, extraCssText: expect.stringContaining("overflow-wrap: anywhere") });
  const tooltip = option.tooltip as { formatter: (event: unknown) => string; position: (point: number[], params: unknown, element: HTMLElement, rect: unknown, size: { viewSize: number[] }) => number[] };
  const content = tooltip.formatter({ data: { exactTooltip: '<img src=x onerror="alert(1)">\nsales: 9007199254740993.11 points' } });
  const container = document.createElement("div");
  container.innerHTML = content;
  expect(container.querySelector("img")).toBeNull();
  expect(container.querySelector('[role="tooltip"]')?.textContent).toBe('<img src=x onerror="alert(1)">\nsales: 9007199254740993.11 points');
  expect(tooltip.position([10, 20], {}, container, null, { viewSize: [324, 200] })).toEqual([22, 32]);
  expect(container.style.maxWidth).toBe("324px");
});

it("distinguishes all 20 profiles without colour and keeps cues stable on reorder or missing data", () => {
  const profiles = Array.from({ length: 20 }, (_, index) => ({ id: `p${String(index).padStart(2, "0")}`, category: `Profile ${index}`, complete: true, positions: [0.2, 0.5, 0.8] }));
  const many: VisualizationResult = { ...result, rows: profiles.map(profile => ({ ...rows[0], profile: profile.category })), radar: { incomplete_count: 0, profiles } };
  const cues = (value: VisualizationResult) => {
    const option = radarOptions(value, "en", "light");
    const data = (option.series as { data: { id: string; symbol?: string; lineStyle: { type?: string } }[] }[])[0].data;
    return data.map(row => ({ id: row.id, symbol: row.symbol, line: row.lineStyle.type }));
  };
  const original = cues(many);
  expect(original.every(cue => !!cue.symbol)).toBe(true);
  expect(new Set(original.map(cue => `${cue.symbol}/${cue.line}`)).size).toBe(20);
  expect(cues({ ...many, radar: { incomplete_count: 0, profiles: [...profiles].reverse() } })).toEqual([...original].reverse());
  expect(cues({ ...many, radar: { incomplete_count: 1, profiles: profiles.map((profile, index) => index ? profile : { ...profile, complete: false, positions: [null, 0.5, 0.8] }) } })).toEqual(original.slice(1));
});

it.each(["light", "dark"] as const)("keeps optional numeric labels opaque while profile marks are muted in %s", theme => {
  const option = radarOptions({ ...result, highlight_field: "profile", highlight_value: "South" }, "en", theme);
  expect(option.series).toMatchObject([{ label: { opacity: 1, color: theme === "dark" ? "#d7dfef" : "#34415b", backgroundColor: theme === "dark" ? "#1c2738" : "#ffffff" }, data: [{ itemStyle: { opacity: 0.25 }, lineStyle: { opacity: 0.25 } }] }]);
});

it("retains incomplete profiles, tiny nonzero values, explicit scales and keyboard selection", () => {
  const select = vi.fn();
  render(<RadarView result={result} onSelect={select}>Canvas</RadarView>);
  expect(screen.getByRole("status")).toHaveTextContent("1 incomplete profiles");
  fireEvent.click(screen.getByRole("button", { name: "Profile table" }));
  expect(screen.getByRole("table")).toHaveClass("text-sm");
  expect(screen.getByRole("table")).toHaveAccessibleName();
  expect(screen.getByRole("table").parentElement).toHaveAttribute("role", "region");
  expect(screen.getByRole("table").parentElement).toHaveAccessibleName();
  expect(screen.getByRole("table").parentElement).toHaveAttribute("tabindex", "0");
  expect(screen.getByRole("table").parentElement).toHaveClass("min-w-0", "overflow-auto");
  expect(screen.getByRole("cell", { name: rows[0].sales! })).toBeVisible();
  expect(screen.getByRole("cell", { name: "1e-20" })).toBeVisible();
  expect(screen.getByRole("cell", { name: "Missing measure" })).toBeVisible();
  fireEvent.click(screen.getAllByRole("button", { name: "Select" })[1]);
  expect(select).toHaveBeenCalledWith({ id_profile: "South", id_sales: null, id_quality: "0.25", id_margin: "0.1" });
  fireEvent.click(screen.getByRole("button", { name: "Axis scales" }));
  expect(screen.getByRole("table")).toHaveClass("text-sm");
  expect(screen.getByRole("columnheader", { name: "Minimum" })).toHaveClass("text-right");
  expect(screen.getByRole("columnheader", { name: "Maximum" })).toHaveClass("text-right");
  for (const cell of screen.getAllByRole("cell", { name: "10000000000000000" })) expect(cell).toHaveClass("text-right", "tabular-nums");
  expect(screen.getAllByRole("cell", { name: "points" })).toHaveLength(3);
  expect(screen.getAllByRole("cell", { name: "10000000000000000" })).toHaveLength(3);
});

it("does not show an empty canvas when no complete profiles exist", () => {
  render(<RadarView result={{ ...result, radar: { incomplete_count: 1, profiles: [result.radar!.profiles[1]] } }}>Canvas</RadarView>);
  expect(screen.getByText("No complete profiles to plot. Inspect the profile table.")).toBeVisible();
  expect(screen.queryByText("Canvas")).not.toBeInTheDocument();
});

it("requires explicit axes and scales, preserves exact bounds and offers keyboard ordering", () => {
  const changed = vi.fn();
  function Form() {
    const [config, setConfig] = useState<Record<string, unknown>>({});
    return <RadarConfiguration config={config} columns={columns} onChange={value => { setConfig(value); changed(value); }} />;
  }
  render(<Form />);
  expect(screen.getByLabelText("Radar normalization")).toHaveValue("");
  expect(chartSetupHints("radar_chart", "dataset", {}, columns)).toHaveLength(1);
  fireEvent.change(screen.getByLabelText("Radar profile"), { target: { value: "id_profile" } });
  for (const [index, column] of columns.slice(1).entries()) fireEvent.change(screen.getByLabelText(`Radar axis ${index + 1}`, { selector: "select" }), { target: { value: column.column_id } });
  fireEvent.change(screen.getByLabelText("Radar normalization"), { target: { value: "shared" } });
  fireEvent.change(screen.getByLabelText("Radar minimum"), { target: { value: "0" } });
  fireEvent.change(screen.getByLabelText("Radar maximum"), { target: { value: "9007199254740993.12" } });
  const config = changed.mock.lastCall![0];
  expect(config.spec.axes.every((axis: { maximum: string }) => axis.maximum === "9007199254740993.12")).toBe(true);
  expect(chartSetupHints("radar_chart", "dataset", config, columns)).toEqual([]);
  fireEvent.click(screen.getByRole("button", { name: "Move radar axis 3 up" }));
  expect(screen.getByLabelText("Radar axis 2", { selector: "select" })).toHaveValue("id_margin");
  expect(screen.getAllByRole("button", { name: "Remove" })[0]).toBeDisabled();
  for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole("button", { name: "Add radar axis" }));
  expect(screen.getByRole("button", { name: "Add radar axis" })).toBeDisabled();
  expect(changed.mock.lastCall![0].spec.axes).toHaveLength(8);
  fireEvent.change(screen.getByLabelText("Radar normalization"), { target: { value: "min_max" } });
  fireEvent.change(screen.getByLabelText("Axis 2 maximum"), { target: { value: "1" } });
  expect(changed.mock.lastCall![0].spec.axes[0].maximum).toBe("9007199254740993.12");
  expect(changed.mock.lastCall![0].spec.axes[1].maximum).toBe("1");
});
