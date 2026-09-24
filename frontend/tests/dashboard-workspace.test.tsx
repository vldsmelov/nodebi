import { createRef } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { apiRequest, ApiError } from "@/lib/api";
import { getWorkflow, listWorkflows } from "@/features/workflow/api";
import { VisualizationEditor, type EditorHandle } from "@/features/dashboard/VisualizationEditor";
import { placeWidget, moveWidget } from "@/features/dashboard/placement";
import type { Widget, Visualization } from "@/features/dashboard/api";

vi.mock("@/lib/api", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/api")>(), apiRequest: vi.fn() }));
vi.mock("@/features/workflow/api", () => ({ getWorkflow: vi.fn(), listWorkflows: vi.fn() }));
const flow = { id: "flow", project_id: "project", name: "Data", version: 3, revision: 5, nodes: [], edges: [], created_at: "2026-01-01", updated_at: "2026-01-01", result_catalog: { outputs: [{ id: "pub", node_id: "constant", port: "value", name: "Total", kind: "scalar" as const }] } };
const visual: Visualization = { id: "chart", node_id: "constant", workflow_id: "flow", publication_id: "pub", revision: 2, name: "Total", type: "kpi", config: { title: "Total", decimals: 2, number_format: "number", currency: "USD", title_template: false, orientation: "vertical", show_legend: true, show_labels: false } };
const result = { type: "kpi", title: "Total", rows: [{ value: 42 }], columns: [], decimals: 2, number_format: "number", value_field: "value" };
beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear();
  vi.mocked(listWorkflows).mockResolvedValue([flow]); vi.mocked(getWorkflow).mockResolvedValue(flow);
  vi.mocked(apiRequest).mockImplementation(async url => {
    if (url.endsWith("/schema")) return { workflow_revision: 5, kind: "scalar", columns: [], roles: [] } as never;
    if (url.endsWith("/uses")) return [] as never;
    if (url.endsWith("/preview")) return result as never;
    return { ...visual, revision: 3 } as never;
  });
});
function mount(extra: Partial<Parameters<typeof VisualizationEditor>[0]> = {}) {
  const close = vi.fn(), onPreview = vi.fn(), editorRef = createRef<EditorHandle>();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><VisualizationEditor projectId="project" visualization={visual} close={close} embedded onPreview={onPreview} editorRef={editorRef} {...extra} /></QueryClientProvider>);
  return { close, onPreview, editorRef };
}
it("previews the current context, updates appearance locally and never saves on preview", async () => {
  const context = { period: { start: "2026-01-01", end: "2026-01-31" }, values: { service: "A" } };
  const { onPreview } = mount({ context });
  await waitFor(() => expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ result: expect.objectContaining({ rows: result.rows }) })));
  const calls = () => vi.mocked(apiRequest).mock.calls.filter(([url]) => url.endsWith("/preview"));
  expect(JSON.parse(String(calls()[0][1]?.body)).context).toEqual(context);
  fireEvent.click(screen.getByRole("tab", { name: "Appearance" }));
  fireEvent.change(screen.getByLabelText("Decimal places"), { target: { value: "4" } });
  await waitFor(() => expect(onPreview).toHaveBeenLastCalledWith(expect.objectContaining({ result: expect.objectContaining({ decimals: 4 }) })));
  await new Promise(resolve => setTimeout(resolve, 450));
  expect(calls()).toHaveLength(1);
  expect(vi.mocked(apiRequest).mock.calls.some(([, options]) => options?.method === "PUT")).toBe(false);
});
it("requires a decision before leaving an edited chart", async () => {
  const { close } = mount();
  fireEvent.change(screen.getByLabelText("Visualization name"), { target: { value: "Draft" } });
  fireEvent.click(screen.getByLabelText("Close settings"));
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Continue editing"));
  expect(screen.getByLabelText("Visualization name")).toHaveValue("Draft");
  fireEvent.click(screen.getByLabelText("Close settings")); fireEvent.click(screen.getByText("Discard changes"));
  expect(close).toHaveBeenCalledOnce();
});
it("ignores a slow obsolete preview and reports a current network failure", async () => {
  const original = vi.mocked(apiRequest).getMockImplementation()!;
  let completeOld: ((value: unknown) => void) | undefined;
  let count = 0;
  vi.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (url.endsWith("/preview")) {
      count++;
      if (count === 1) return await new Promise<unknown>(resolve => { completeOld = resolve; }) as never;
      throw new Error("Network unavailable");
    }
    return original(url, options);
  });
  const { onPreview } = mount();
  await waitFor(() => expect(count).toBe(1));
  fireEvent.click(screen.getByRole("tab", { name: "Appearance" }));
  fireEvent.click(screen.getByLabelText("Use parameters in title"));
  await waitFor(() => expect(onPreview).toHaveBeenLastCalledWith(expect.objectContaining({ error: expect.any(Error) })));
  completeOld?.(result);
  await new Promise(resolve => setTimeout(resolve, 20));
  expect(onPreview).toHaveBeenLastCalledWith(expect.objectContaining({ error: expect.any(Error) }));
});
it("preserves a conflicting draft and offers reload without claiming success", async () => {
  const original = vi.mocked(apiRequest).getMockImplementation()!;
  vi.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (options?.method === "PUT") throw new ApiError("Conflict", 409, "CONFLICT");
    return original(url, options);
  });
  const { close } = mount();
  fireEvent.change(screen.getByLabelText("Visualization name"), { target: { value: "Draft" } });
  await waitFor(() => expect(screen.getByText("Apply visualization")).toBeEnabled());
  fireEvent.click(screen.getByText("Apply visualization"));
  await screen.findByText("Reload saved settings");
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Visualization name")).toHaveValue("Draft");
  expect(JSON.parse(sessionStorage.getItem("nodebi:visualization-draft:chart")!).name).toBe("Draft");
});
it("requires acknowledgement for a shared chart but permits an independent copy", async () => {
  const original = vi.mocked(apiRequest).getMockImplementation()!;
  vi.mocked(apiRequest).mockImplementation(async (url, options) => url.endsWith("/uses") ? [{ widget_id: "a", name: "Board one" }, { widget_id: "b", name: "Board two" }] as never : original(url, options));
  const onCopy = vi.fn(); mount({ onCopy });
  await screen.findByText("Board two");
  expect(screen.getByText("Apply visualization")).toBeDisabled();
  await waitFor(() => expect(screen.getByText("Independent copy")).toBeEnabled());
  fireEvent.click(screen.getByText("Independent copy"));
  await waitFor(() => expect(onCopy).toHaveBeenCalledOnce());
  expect(vi.mocked(apiRequest).mock.calls.some(([url, options]) => url.endsWith("/copy") && options?.method === "POST")).toBe(true);
});
it("packs by type, fills holes, and refuses keyboard collisions and invalid bounds", () => {
  const widget = { id: "one", visualization_id: "v", x: 0, y: 0, width: 6, height: 10 } as Widget;
  expect(placeWidget([widget], "bar_chart")).toEqual({ x: 6, y: 0, width: 6, height: 10 });
  expect(placeWidget([widget], "table")).toEqual({ x: 0, y: 10, width: 12, height: 12 });
  expect(placeWidget([], "kpi")).toEqual({ x: 0, y: 0, width: 3, height: 4 });
  const widgets = [widget, { ...widget, id: "two", x: 6 }];
  expect(moveWidget(widgets, "one", { x: 1 })).toBe(widgets);
  expect(moveWidget(widgets, "one", { x: -1 })).toBe(widgets);
  expect(moveWidget(widgets, "one", { y: 10 })[0].y).toBe(10);
});
