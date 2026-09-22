import { expect, it } from "vitest";
import { arrangeWidgets, layoutSignature } from "@/features/dashboard/layout-templates";
import type { Visualization, Widget } from "@/features/dashboard/api";
import { dashboardUrl } from "@/features/dashboard/view-state";

it("packs mixed widgets within grid bounds without overlap or semantic changes", () => {
  const visualizations: Visualization[] = ["table", "kpi", "bar_chart"].map((type, i) => ({ id: `${i}`, revision: 1, node_id: `${i}`, workflow_id: "flow", name: type, type: type as Visualization["type"] }));
  const widgets: Widget[] = Array.from({ length: 100 }, (_, i) => ({ id: `widget${i}`, visualization_id: `${i % 3}`, title: `Title ${i}`, config: { show_title: true, action: { dashboard_id: "detail", values: {} } }, x: 0, y: i * 20, width: 6, height: 8 }));
  for (const template of ["overview", "report"] as const) {
    const result = arrangeWidgets(widgets, visualizations, template);
    expect(arrangeWidgets(result, visualizations, template)).toEqual(result);
    expect(result.map(({ x, y, width, height, ...rest }) => { expect(x + width).toBeLessThanOrEqual(12); expect(y + height).toBeLessThan(10000); return rest; })).toEqual(widgets.map(({ id, visualization_id, title, config }) => ({ id, visualization_id, title, config })));
    for (const a of result) for (const b of result) if (a !== b) expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
    expect(widgets[0].height).toBe(8);
    expect(layoutSignature(result)).not.toBe(layoutSignature(widgets));
  }
  expect(arrangeWidgets([], [], "overview")).toEqual([]);
});
it("keeps view mode and typed selections in dashboard links", () => {
  const url = new URL(dashboardUrl("project", "detail", { id: 12, enabled: false }, true), "http://localhost");
  expect(url.searchParams.get("mode")).toBe("view");
  expect(JSON.parse(url.searchParams.get("parameters")!)).toEqual({ id: 12, enabled: false });
  expect(dashboardUrl("project", "detail")).not.toContain("mode=");
});
