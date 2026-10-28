import type { Widget } from "./api";

/** Layout history must not rebase a recovered document onto another tab's server revision. */
export function restoreDashboardLayout<T extends { widgets: Widget[] }>(current: T, snapshot: Widget[]): T {
  return { ...current, widgets: restoreWidgetLayout(current.widgets, snapshot) };
}

/** Only placement and attachment changes belong to the layout undo stack. */
export function sameWidgetLayout(left: Widget[], right: Widget[]): boolean {
  return left.length === right.length && left.every((item, index) => {
    const other = right[index];
    return item.id === other.id && item.visualization_id === other.visualization_id
      && item.x === other.x && item.y === other.y
      && item.width === other.width && item.height === other.height;
  });
}

/** Restore geometry/references, retaining current metadata for surviving placements. */
export function restoreWidgetLayout(current: Widget[], snapshot: Widget[]): Widget[] {
  const live = new Map(current.map(item => [item.id, item]));
  return snapshot.map(previous => ({
    ...previous,
    ...live.get(previous.id),
    visualization_id: previous.visualization_id,
    x: previous.x, y: previous.y, width: previous.width, height: previous.height,
  }));
}
