import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { parseDashboardDraft } from "@/features/dashboard/dashboard-draft";
import { DashboardRecoveryBoundary } from "@/features/dashboard/DashboardRecoveryBoundary";
import { I18nProvider } from "@/lib/i18n";
import type { Dashboard } from "@/features/dashboard/api";

afterEach(() => { cleanup(); vi.restoreAllMocks(); sessionStorage.clear(); });
const saved: Dashboard = { id: "board", project_id: "project", revision: 8, name: "Saved", widgets: [], configuration: { period_enabled: false, parameters: [], bindings: [], links: [] } };
const widget = { id: "widget", visualization_id: "visual", x: 0, y: 0, width: 6, height: 4 };
const key = "nodebi:dashboard-draft:board";
const read = (v: unknown) => parseDashboardDraft(JSON.stringify(v), saved.id, saved.project_id);
it("preserves complete editable settings and their original CAS revision without normalizing incomplete authoring", () => {
  const value = { ...saved, revision: 3, name: "", widgets: [{ ...widget, config: { action: { dashboard_id: "target", values: { code: { source: "constant", value: "0001" } } } } }], configuration: {
    period_enabled: true,
    parameters: [{ name: "", label: "Incomplete", logical_type: "decimal", precision: 20, scale: 2, default: "9007199254740993.01", required: false, options: { workflow_id: "flow", node_id: "", column_id: "" } }],
    bindings: [{ workflow_id: "flow", workflow_parameter: "", dashboard_parameter: "" }], links: [{ label: "", action: { dashboard_id: "target", values: {} } }],
  } };
  expect(read(value)).toEqual(value);
});
it.each([
  null, [], { ...saved, project_id: "foreign" }, { ...saved, id: "foreign" }, { ...saved, revision: "8" },
  { ...saved, name: {} }, { ...saved, widgets: [null] }, { ...saved, widgets: [widget, widget] },
  { ...saved, unknown: { nested: [] } }, { ...saved, configuration: { unknown: { nested: [] } } },
  { ...saved, widgets: [{ ...widget, width: -1 }] }, { ...saved, widgets: [{ ...widget, x: 11 }] },
  { ...saved, widgets: [{ ...widget, config: { highlight_only: {} } }] },
  { ...saved, configuration: { parameters: {} } }, { ...saved, configuration: { parameters: [null] } },
  { ...saved, configuration: { parameters: [{ name: "x", logical_type: "string", default: {} }] } },
  { ...saved, configuration: { links: [{ label: "x", action: { dashboard_id: "target", values: { x: null } } }] } },
  { ...saved, configuration: { bindings: [{ workflow_id: "flow" }] } },
])("rejects unsafe or cross-project recovery %# before rendering", value => { expect(() => read(value)).toThrow(); });
it("rejects oversized recovery before JSON parsing", () => {
  expect(() => parseDashboardDraft(" ".repeat(10_000_001), "board", "project")).toThrow();
});
function show(child = vi.fn((draft: Dashboard | undefined, bypassed: boolean) => <p>{draft?.name ?? saved.name}{bypassed ? " (explicit fallback)" : ""}</p>)) {
  render(<I18nProvider initialLocale="en"><DashboardRecoveryBoundary initial={saved}>{child}</DashboardRecoveryBoundary></I18nProvider>);
  return child;
}
it("does not mount the editor or overwrite unreadable recovery before the user's choice", () => {
  sessionStorage.setItem(key, "broken");
  const child = show();
  expect(child).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveFocus();
  expect(sessionStorage.getItem(key)).toBe("broken");
  fireEvent.click(screen.getByRole("button", { name: "Continue with saved dashboard" }));
  expect(screen.getByText("Saved (explicit fallback)")).toBeVisible();
  expect(sessionStorage.getItem(key)).toBe("broken");
});
it("retries a repaired draft with its old revision instead of substituting the server revision", () => {
  sessionStorage.setItem(key, "broken");
  const child = show();
  sessionStorage.setItem(key, JSON.stringify({ ...saved, revision: 2, name: "Recovered" }));
  fireEvent.click(screen.getByRole("button", { name: "Retry recovery" }));
  expect(child).toHaveBeenLastCalledWith(expect.objectContaining({ name: "Recovered", revision: 2 }), false, true);
});
it("keeps recovery blocked on failed removal and supports safe retry after denied reads", () => {
  const denied = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Denied"); });
  const child = show();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("Denied"); });
  fireEvent.click(screen.getByRole("button", { name: "Discard local draft" }));
  expect(screen.getByText("The local draft could not be removed. Nothing was discarded.")).toBeVisible();
  expect(child).not.toHaveBeenCalled();
  denied.mockRestore(); fireEvent.click(screen.getByRole("button", { name: "Retry recovery" }));
  expect(screen.getByText("Saved")).toBeVisible();
});
