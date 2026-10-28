import { tokens, contrast, composite } from "./mark-contrast";
import { describe, expect, it, vi } from "vitest";
import { init } from "echarts";
import { chartOptions } from "@/features/dashboard/VisualizationView";
import type { VisualizationResult } from "@/features/dashboard/api";

// Test the actual CSS source, not a second hand-maintained copy of the palette.
const backgrounds = ["page", "panel", "surface", "control", "raised"];

it("uses unrounded sRGB contrast with known black/white and same-color oracles", () => {
  expect(contrast("#000", "#fff")).toBe(21);
  expect(contrast("#315cba", "#315cba")).toBe(1);
  expect(contrast("#777", "#fff")).toBeLessThan(4.5);
  expect(contrast("#767676", "#fff")).toBeGreaterThan(4.5);
  expect(composite("#000000", 0.5, "#fff")).toBe("#808080");
  expect(composite("#123456", 1, "#fff")).toBe("#123456");
  expect(composite("#123456", 0, "#fff")).toBe("#ffffff");
  expect(composite("#00000080", 1, "#fff")).toBe("#7f7f7f");
  expect(composite("#00000080", 0.5, "#fff")).toBe("#bfbfbf");
});

for (const [theme, selector] of [["light", ":root"], ["dark", ':root[data-theme="dark"]']]) {
  describe(`${theme} opaque semantic palette`, () => {
    const palette = tokens(selector);
    it("keeps all eight rendered bubble fills at 3:1 after normal alpha composition", () => {
      const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
      const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 900, height: 500 });
      const axis = { minimum: "0", maximum: "1", ticks: [{ position: 0, label: "0" }, { position: 1, label: "1" }], zero_position: 0 };
      const result: VisualizationResult = { visualization_revision: 1, visualization_id: "test", revision: 1,
        type: "bubble_chart", title: "Groups", category_field: "key", value_field: null,
        columns: ["key", "x", "y", "size", "group"].map(name => ({ column_id: name, engine_name: name, display_name: name,
          logical_type: name === "key" || name === "group" ? "string" : "float", nullable: false, metadata: {} })),
        rows: Array.from({ length: 8 }, (_, index) => ({ key: `Point ${index}`, group: String(index), x: index / 8, y: 0.5, size: 1 })),
        spec: { version: 1, type: "bubble_chart", size_encoding: "area", key_column_id: "key", x_column_id: "x", y_column_id: "y", size_column_id: "size", group_column_id: "group" },
        bubble: { x_axis: axis, y_axis: axis, size_maximum: "1", input_count: 8, missing_count: 0, zero_size_count: 0, visible_count: 8, group_count: 8,
          points: Array.from({ length: 8 }, (_, index) => ({ id: String(index), key: `Point ${index}`, group_id: String(index), x: index / 8, y: 0.5, radius_ratio: 1, state: "visible" })) },
        orientation: "vertical", number_format: "number", decimals: 2, currency: "USD", show_labels: false,
        show_legend: true, total_rows: 8, offset: 0, limit: 100, truncated: false };
      try {
        for (const highlighted of [false, true]) {
          chart.setOption(chartOptions({ ...result, ...(highlighted ? { highlight_field: "key", highlight_value: "Point 0" } : {}) }, "en", theme as "light" | "dark"), true);
          const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
          const marks = [...svg.querySelectorAll('path[ecmeta_ssr_type="chart"]')];
          expect(marks).toHaveLength(8);
          expect(new Set(marks.map(mark => mark.getAttribute("fill"))).size).toBe(8);
          for (const [index, mark] of marks.entries()) {
            const opacity = Number(mark.getAttribute("fill-opacity") ?? 1);
            expect(opacity).toBe(highlighted && index !== 0 ? 0.2 : 0.75);
            // Muted marks are intentionally deemphasized; do not mistake them for normal fill.
            if (opacity === 0.75) for (const background of ["panel", "surface"]) {
              const fill = composite(mark.getAttribute("fill")!, opacity, palette[background]);
              expect(contrast(fill, palette[background]), `${theme}/${index}/${background}`).toBeGreaterThanOrEqual(3);
            }
          }
        }
      } finally { chart.dispose(); context.mockRestore(); }
    });
    it.each(["pie_chart", "donut_chart"] as const)("renders %s base fills and separators with 3:1 contrast", type => {
      const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
      const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 640, height: 400 });
      const result: VisualizationResult = { visualization_revision: 1, visualization_id: "test", revision: 1,
        type, title: "Categories", category_field: "category", value_field: "value", columns: [],
        rows: Array.from({ length: 8 }, (_, index) => ({ category: `Category ${index}`, value: 10 })),
        orientation: "vertical", number_format: "number", decimals: 2, currency: "USD", show_labels: false,
        show_legend: true, total_rows: 8, offset: 0, limit: 100, truncated: false };
      try {
        chart.setOption({ ...chartOptions(result, "en", theme as "light" | "dark"), animation: false });
        const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
        const sectors = [...svg.querySelectorAll('path[ecmeta_ssr_type="chart"]')]
          .filter(node => node.getAttribute("d")?.includes("A") && /^#[\da-f]{6}$/i.test(node.getAttribute("fill") ?? ""));
        expect(sectors).toHaveLength(8);
        for (const sector of sectors) {
          const fill = sector.getAttribute("fill")!;
          for (const background of ["panel", "surface"]) expect.soft(contrast(fill, palette[background]), `${fill}/${background}`).toBeGreaterThanOrEqual(3);
        }
        for (const sector of sectors) {
          const fill = sector.getAttribute("fill")!;
          const stroke = sector.getAttribute("stroke");
          expect(stroke).toBe(palette.panel);
          expect(contrast(fill, stroke!)).toBeGreaterThanOrEqual(3);
          expect(Number(sector.getAttribute("stroke-width"))).toBeGreaterThanOrEqual(2);
        }
      } finally { chart.dispose(); context.mockRestore(); }
    });
    it("keeps all eight basic series fills at 3:1 against chart surfaces", () => {
      const columns = Array.from({ length: 8 }, (_, i) => ({ column_id: `v${i}`, engine_name: `v${i}`, display_name: `v${i}`, logical_type: "float" as const, nullable: false, metadata: {} }));
      const result: VisualizationResult = { visualization_revision: 1, visualization_id: "test", revision: 1,
        type: "line_chart", title: "Measures", category_field: "category", value_field: "v0", columns, rows: [],
        additional_series: columns.slice(1).map(field => ({ field: field.engine_name, name: field.display_name })),
        orientation: "vertical", number_format: "number", decimals: 2, currency: "USD", show_labels: false, show_legend: true,
        total_rows: 0, offset: 0, limit: 100, truncated: false };
      const series = chartOptions(result, "en", theme as "light" | "dark").series as { itemStyle: { color: string } }[];
      for (const [index, item] of series.entries()) for (const background of ["panel", "surface"]) {
        expect(contrast(item.itemStyle.color, palette[background]), `series ${index + 1}/${background}`).toBeGreaterThanOrEqual(3);
      }
    });
    it("keeps normal text and semantic text at 4.5:1 on each base surface", () => {
      for (const foreground of ["foreground", "muted", "accent", "danger", "warning", "success"]) {
        for (const background of backgrounds) {
          expect(contrast(palette[foreground], palette[background]), `${foreground}/${background}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      for (const background of ["primary", "primary-hover"]) {
        expect(contrast(palette["on-primary"], palette[background]), `on-primary/${background}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(palette.danger, palette["danger-surface"])).toBeGreaterThanOrEqual(4.5);
    });
    it("keeps reusable borders and external focus indicators at 3:1 on base surfaces", () => {
      // Deliberately stricter reusable-token policy; decorative borders are not all WCAG requirements.
      for (const foreground of ["outline", "accent"]) {
        for (const background of backgrounds) {
          expect(contrast(palette[foreground], palette[background]), `${foreground}/${background}`).toBeGreaterThanOrEqual(3);
        }
      }
    });
  });
}
