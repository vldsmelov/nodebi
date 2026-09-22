export const FIELD_ROW_HEIGHT = 24;
export const FIELD_VIEW_HEIGHT = 240;

/** Keep a small overscan window; connected and focused outputs render outside this list. */
export function fieldWindow(count: number, scrollTop: number) {
  const start = Math.max(0, Math.min(Math.floor(scrollTop / FIELD_ROW_HEIGHT) - 3, count - 16));
  const end = Math.min(count, start + 16);
  return { start, end, before: start * FIELD_ROW_HEIGHT, after: (count - end) * FIELD_ROW_HEIGHT };
}
