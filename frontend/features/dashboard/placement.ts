import type { Widget } from "./api";

export function overlaps(a: Pick<Widget, "x" | "y" | "width" | "height">, b: Pick<Widget, "x" | "y" | "width" | "height">) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
export function placeWidget(widgets: Widget[], type: string) {
  const table = type === "table" || type === "analytical_table";
  const width = table ? 12 : type === "kpi" ? 3 : 6;
  const height = table || type === "radar_chart" ? 12 : type === "kpi" ? 4 : 10;
  for (let y = 0; y <= 10000; y++) for (let x = 0; x <= 12 - width; x++) {
    const candidate = { x, y, width, height };
    if (!widgets.some(widget => overlaps(candidate, widget))) return candidate;
  }
  throw new Error("No free space in the dashboard grid.");
}

export function fitWidget(widgets: Widget[], identity: string, type: string): Widget[] {
  const selected = widgets.find(item => item.id === identity);
  if (!selected) return widgets;
  const others = widgets.filter(item => item.id !== identity);
  const recommended = placeWidget([], type);
  const candidate = { ...recommended, x: Math.min(selected.x, 12 - recommended.width), y: selected.y };
  const position = others.some(item => overlaps(candidate, item)) ? placeWidget(others, type) : candidate;
  return widgets.map(item => item.id === identity ? { ...item, ...position } : item);
}
export function moveWidget(widgets: Widget[], identity: string, patch: Partial<Pick<Widget, "x" | "y" | "width" | "height">>) {
  const current = widgets.find(widget => widget.id === identity);
  if (!current) return widgets;
  const next = { ...current, ...patch };
  if (![next.x, next.y, next.width, next.height].every(Number.isInteger) || next.x < 0 || next.y < 0 || next.y > 10000 || next.width < 2 || next.x + next.width > 12 || next.height < 2 || next.height > 40 || widgets.some(widget => widget.id !== identity && overlaps(widget, next))) return widgets;
  return widgets.map(widget => widget.id === identity ? next : widget);
}

/** Explicit, deterministic vertical packing. Never runs as a drag side effect. */
export function compactWidgets(widgets: Widget[]): Widget[] {
  const placed: Widget[] = [];
  for (const item of [...widgets].sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id))) {
    let y = 0;
    while (true) {
      const collisions = placed.filter(other => overlaps({ ...item, y }, other));
      if (!collisions.length) break;
      y = Math.max(...collisions.map(other => other.y + other.height));
    }
    if (y > 10000) throw new Error("No free space in the dashboard grid.");
    placed.push({ ...item, y });
  }
  const positions = new Map(placed.map(item => [item.id, item.y]));
  return widgets.map(item => ({ ...item, y: positions.get(item.id)! }));
}

export function insertWidgetFirst(widgets: Widget[], identity: string): Widget[] {
  const selected = widgets.find(item => item.id === identity);
  if (!selected || widgets.some(item => item.id !== identity && item.y + selected.height > 10000)) return widgets;
  return widgets.map(item => item.id === identity ? { ...item, y: 0 } : { ...item, y: item.y + selected.height });
}
