import type { Visualization, Widget } from "./api";

export type LayoutTemplate = "overview" | "report";
export const layoutSignature = (widgets: Widget[]) => JSON.stringify(widgets.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })));

export function arrangeWidgets(widgets: Widget[], visualizations: Visualization[], template: LayoutTemplate): Widget[] {
  const types = new Map(visualizations.map(item => [item.id, item.type]));
  const rank = (widget: Widget) => types.get(widget.visualization_id) === "kpi" ? 0 : types.get(widget.visualization_id) === "table" ? 2 : 1;
  const ordered = [...widgets].sort((a, b) => rank(a) - rank(b) || a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
  const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
  let x = 0, y = 0, rowHeight = 0, previousRank = -1;
  for (const widget of ordered) {
    const group = rank(widget);
    const width = group === 0 ? template === "overview" ? 3 : 4 : group === 2 || template === "report" ? 12 : 6;
    const height = group === 0 ? 4 : group === 2 ? 12 : 10;
    if (x > 0 && (x + width > 12 || group !== previousRank)) { y += rowHeight; x = 0; rowHeight = 0; }
    positions.set(widget.id, { x, y, width, height });
    x += width; rowHeight = Math.max(rowHeight, height); previousRank = group;
  }
  return widgets.map(widget => ({ ...widget, ...positions.get(widget.id)! }));
}
