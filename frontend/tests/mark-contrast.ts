import { readFileSync } from "node:fs";
import { expect } from "vitest";

const css = readFileSync("app/globals.css", "utf8");
export function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Missing theme ${selector}`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]+);/gi)].map(match => [match[1], match[2]]));
}
function channels(hex: string): number[] {
  if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) throw new Error(`Unsupported color ${hex}`);
  const normalized = hex.length === 4 ? [...hex.slice(1)].map(digit => digit.repeat(2)).join("") : hex.slice(1);
  return [0, 2, 4].map(offset => parseInt(normalized.slice(offset, offset + 2), 16));
}
function luminance(hex: string): number {
  const linear = channels(hex).map(channel => channel / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
export function contrast(first: string, second: string): number {
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export function composite(fill: string, opacity: number, background: string): string {
  if (/^#[\da-f]{8}$/i.test(fill)) {
    opacity *= parseInt(fill.slice(7), 16) / 255;
    fill = fill.slice(0, 7);
  }
  const back = channels(background);
  return "#" + channels(fill).map((value, index) => Math.round(value * opacity + back[index] * (1 - opacity)).toString(16).padStart(2, "0")).join("");
}

/** Normal boundaries must contrast with both the outside surface and composited interior. */
export function expectMarkBoundary(mark: Element, theme: "light" | "dark", minimumWidth: number, opacity: number) {
  const palette = tokens(theme === "light" ? ":root" : ':root[data-theme="dark"]');
  const stroke = mark.getAttribute("stroke")!;
  expect(stroke).toMatch(/^#[\da-f]{6}$/i);
  expect(Number(mark.getAttribute("stroke-width") ?? 1)).toBeGreaterThanOrEqual(minimumWidth);
  expect(Number(mark.getAttribute("stroke-opacity") ?? 1)).toBeCloseTo(opacity, 6);
  if (opacity !== 1) return; // Explicitly intentional context deemphasis, not a normal contrast claim.
  for (const background of [palette.panel, palette.surface]) {
    expect(contrast(stroke, background)).toBeGreaterThanOrEqual(3);
    const fill = mark.getAttribute("fill");
    if (fill && fill !== "none") {
      const inside = composite(fill, Number(mark.getAttribute("fill-opacity") ?? 1), background);
      expect(contrast(stroke, inside)).toBeGreaterThanOrEqual(3);
    }
  }
}

export function expectPaletteMarks(svg: Document, colors: string[], theme: "light" | "dark") {
  const palette = tokens(theme === "light" ? ":root" : ':root[data-theme="dark"]');
  const marks = [...svg.querySelectorAll("path,polyline,rect,circle")];
  for (const color of colors) {
    const matching = marks.filter(mark => mark.getAttribute("fill") === color || mark.getAttribute("stroke") === color);
    expect(matching.length, color).toBeGreaterThan(0);
    for (const mark of matching) {
      const attribute = mark.getAttribute("stroke") === color ? "stroke" : "fill";
      const opacity = Number(mark.getAttribute(`${attribute}-opacity`) ?? 1);
      expect(opacity).toBe(1);
      for (const background of [palette.panel, palette.surface]) expect(contrast(composite(color, opacity, background), background), color).toBeGreaterThanOrEqual(3);
    }
  }
}
