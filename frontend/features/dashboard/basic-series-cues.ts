import type { Theme } from "@/lib/theme";

export const basicSeriesColors = (theme: Theme) => theme === "dark"
  ? ["#93b4ff", "#38bdf8", "#f59e0b", "#f472b6", "#a78bfa", "#2dd4bf", "#fb7185", "#94a3b8"]
  : ["#315cba", "#007eae", "#ad5b13", "#b33d60", "#7a439e", "#217763", "#b83c55", "#58677e"];

const symbols = ["circle", "rect", "triangle", "diamond", "roundRect", "pin", "arrow", "emptyCircle"];
// Eight measures are supported. The first stays solid; legend icons inherit decals.
const patterns = [
  undefined,
  { symbol: "rect", dashArrayX: [1, 0], dashArrayY: [2, 5], rotation: Math.PI / 4 },
  { symbol: "rect", dashArrayX: [1, 0], dashArrayY: [2, 5], rotation: -Math.PI / 4 },
  { symbol: "rect", dashArrayX: [1, 0], dashArrayY: [2, 5], rotation: 0 },
  { symbol: "rect", dashArrayX: [1, 0], dashArrayY: [2, 5], rotation: Math.PI / 2 },
  { symbol: "circle", dashArrayX: [2, 4], dashArrayY: [2, 4], symbolSize: 1 },
  { symbol: "triangle", dashArrayX: [3, 4], dashArrayY: [3, 4], symbolSize: 1 },
  { symbol: "diamond", dashArrayX: [4, 3], dashArrayY: [4, 3], symbolSize: 1 },
];
export const basicPatternCount = patterns.length;

export function basicSeriesCue(type: string, index: number, theme: Theme) {
  if (type === "line_chart") return { showSymbol: true, symbol: symbols[index], symbolSize: 7 };
  const pattern = patterns[index];
  return { itemStyle: pattern ? { decal: { ...pattern, color: theme === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)" } } : {} };
}
