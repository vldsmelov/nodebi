import { expect, it } from "vitest";
import { restoreDashboardLayout, restoreWidgetLayout, sameWidgetLayout } from "@/features/dashboard/layout-history";
import type { Widget } from "@/features/dashboard/api";

const widget: Widget = { id: "one", visualization_id: "chart", x: 0, y: 0, width: 6, height: 8 };

it("retains the recovered dashboard revision and settings when undoing layout", () => {
  const recovered = { revision: 3, name: "Local draft", configuration: { title: "Keep" }, widgets: [{ ...widget, x: 6 }] };
  const restored = restoreDashboardLayout(recovered, [widget]);
  expect(restored).toEqual({ ...recovered, widgets: [widget] });
  expect(restored.revision).toBe(3);
  expect(recovered.widgets[0].x).toBe(6);
});

it("does not treat title, visibility or navigation edits as layout changes", () => {
  const renamed: Widget = { ...widget, title: "New title", config: { show_title: false, action: { dashboard_id: "detail", values: {} } } };
  expect(sameWidgetLayout([widget], [renamed])).toBe(true);
  expect(sameWidgetLayout([widget], [{ ...renamed, x: 1 }])).toBe(false);
  expect(sameWidgetLayout([widget], [{ ...renamed, width: 8 }])).toBe(false);
  expect(sameWidgetLayout([widget], [{ ...renamed, visualization_id: "copy" }])).toBe(false);
  expect(sameWidgetLayout([widget], [])).toBe(false);
});

it("undoes and redoes placement without overwriting later local metadata", () => {
  const arranged = [{ ...widget, x: 6, height: 10 }];
  const edited = [{ ...arranged[0], title: "Keep this", config: { show_title: false } }];
  const undone = restoreWidgetLayout(edited, [widget]);
  expect(undone).toEqual([{ ...widget, title: "Keep this", config: { show_title: false } }]);
  const retitled = [{ ...undone[0], title: "Changed after undo" }];
  expect(restoreWidgetLayout(retitled, arranged)).toEqual([{ ...edited[0], title: "Changed after undo" }]);
  expect(edited[0].x).toBe(6);
  expect(widget.title).toBeUndefined();
});

it("restores removed widgets and attachments while retaining surviving widget settings", () => {
  const removed: Widget = { ...widget, id: "two", x: 6, title: "Deleted title" };
  const live = [{ ...widget, title: "Surviving title", visualization_id: "copy" }];
  const undone = restoreWidgetLayout(live, [widget, removed]);
  expect(undone).toEqual([{ ...widget, title: "Surviving title" }, removed]);
  expect(restoreWidgetLayout(undone, live)).toEqual(live);
});
