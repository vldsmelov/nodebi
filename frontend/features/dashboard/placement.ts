import type { Widget } from "./api";

export function overlaps(a: Pick<Widget, "x" | "y" | "width" | "height">, b: Pick<Widget, "x" | "y" | "width" | "height">) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
export function placeWidget(widgets: Widget[], type: string) {
  const width = type === "table" ? 12 : type === "kpi" ? 3 : 6;
  const height = type === "table" ? 12 : type === "kpi" ? 4 : 10;
  for (let y = 0; y <= 10000; y++) for (let x = 0; x <= 12 - width; x++) {
    const candidate = { x, y, width, height };
    if (!widgets.some(widget => overlaps(candidate, widget))) return candidate;
  }
  throw new Error("No free space in the dashboard grid.");
}
export function moveWidget(widgets: Widget[], identity: string, patch: Partial<Pick<Widget, "x" | "y" | "width" | "height">>) {
  const current = widgets.find(widget => widget.id === identity);
  if (!current) return widgets;
  const next = { ...current, ...patch };
  if (![next.x, next.y, next.width, next.height].every(Number.isInteger) || next.x < 0 || next.y < 0 || next.y > 10000 || next.width < 2 || next.x + next.width > 12 || next.height < 2 || next.height > 40 || widgets.some(widget => widget.id !== identity && overlaps(widget, next))) return widgets;
  return widgets.map(widget => widget.id === identity ? next : widget);
}
