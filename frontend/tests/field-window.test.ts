import { expect, it } from "vitest";
import { fieldWindow, FIELD_ROW_HEIGHT } from "@/features/workflow/field-window";

it("bounds mounted rows and keeps exact list height across large scroll offsets", () => {
  for (const count of [0, 1, 16, 1024, 10000]) for (const offset of [0, 125, 24000, 1e7]) {
    const window = fieldWindow(count, offset);
    expect(window.end - window.start).toBeLessThanOrEqual(16);
    expect(window.start).toBeGreaterThanOrEqual(0);
    expect(window.end).toBeLessThanOrEqual(count);
    expect(window.before + window.after + (window.end - window.start) * FIELD_ROW_HEIGHT).toBe(count * FIELD_ROW_HEIGHT);
  }
  expect(fieldWindow(1024, 1e7).end).toBe(1024);
  expect(fieldWindow(3, 24000).start).toBe(0);
});
