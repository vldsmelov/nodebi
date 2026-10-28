import { createRef, useState } from "react";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
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
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><VisualizationEditor projectId="project" visualization={visual} close={close} embedded onPreview={onPreview} editorRef={editorRef} {...extra} /></QueryClientProvider>);
  return { close, onPreview, editorRef, client, ...view };
}
it("recovers a new unsaved visualization only after an explicit choice and clears it after apply", async () => {
  const first = mount({ visualization: undefined, draftScope: "board" });
  fireEvent.change(screen.getByLabelText("Visualization name"), { target: { value: "New draft" } });
  await waitFor(() => expect(JSON.parse(sessionStorage.getItem("nodebi:visualization-draft:new:project:board")!).selection).toBe("flow/pub"));
  first.unmount();
  mount({ visualization: undefined, draftScope: "board" });
  expect(screen.getByLabelText("Visualization name")).toBeDisabled();
  expect(screen.getByText("Apply visualization")).toBeDisabled();
  fireEvent.click(screen.getByText("Restore local draft"));
  expect(screen.getByLabelText("Visualization name")).toHaveValue("New draft");
  await waitFor(() => expect(screen.getByText("Apply visualization")).toBeEnabled());
  fireEvent.click(screen.getByText("Apply visualization"));
  await waitFor(() => expect(sessionStorage.getItem("nodebi:visualization-draft:new:project:board")).toBeNull());
});
it("restores the original revision rather than rebasing a draft onto another tab's saved visualization", async () => {
  const first = mount();
  fireEvent.change(screen.getByLabelText("Visualization name"), { target: { value: "My work" } });
  first.unmount();
  const original = vi.mocked(apiRequest).getMockImplementation()!;
  vi.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (options?.method === "PUT") throw new ApiError("Conflict", 409, "CONFLICT");
    return original(url, options);
  });
  mount({ visualization: { ...visual, revision: 3, name: "Other tab" } });
  fireEvent.click(screen.getByText("Restore local draft"));
  await waitFor(() => expect(screen.getByText("Apply visualization")).toBeEnabled());
  fireEvent.click(screen.getByText("Apply visualization"));
  await screen.findByText("Reload saved settings");
  const body = JSON.parse(String(vi.mocked(apiRequest).mock.calls.find(([, options]) => options?.method === "PUT")![1]!.body));
  expect(body.expected_revision).toBe(2);
  expect(body.name).toBe("My work");
  expect(screen.getByLabelText("Visualization name")).toHaveValue("My work");
});
it("does not overwrite a waiting recovery draft and can explicitly discard it", async () => {
  sessionStorage.setItem("nodebi:visualization-draft:chart", JSON.stringify({ selection: "flow/pub", name: "Legacy failed draft", type: "kpi", config: {}, revision: 1 }));
  mount();
  expect(screen.getByLabelText("Visualization name")).toBeDisabled();
  expect(JSON.parse(sessionStorage.getItem("nodebi:visualization-draft:chart")!).name).toBe("Legacy failed draft");
  fireEvent.click(screen.getByText("Discard local draft"));
  expect(screen.getByLabelText("Visualization name")).toHaveValue("Total");
  expect(sessionStorage.getItem("nodebi:visualization-draft:chart")).toBeNull();
});
it("removes this editor's recovery draft when the author reverts to the saved settings", () => {
  mount();
  fireEvent.change(screen.getByLabelText("Visualization name"), { target: { value: "Temporary" } });
  expect(sessionStorage.getItem("nodebi:visualization-draft:chart")).not.toBeNull();
  fireEvent.change(screen.getByLabelText("Visualization name"), { target: { value: "Total" } });
  expect(sessionStorage.getItem("nodebi:visualization-draft:chart")).toBeNull();
});
it("reports failed local persistence and refuses keep-and-leave when the draft cannot be written", async () => {
  const { close } = mount();
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota"); });
  try {
    fireEvent.change(screen.getByLabelText("Visualization name"), { target: { value: "Keep me" } });
    expect(await screen.findByText("Local draft storage is unavailable. Save before leaving this page.")).toBeVisible();
    fireEvent.click(screen.getByLabelText("Close settings"));
    fireEvent.click(screen.getByText("Keep draft and continue"));
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Visualization name")).toHaveValue("Keep me");
  } finally { write.mockRestore(); }
});
it("allows explicit editing without local recovery when browser storage cannot be accessed", async () => {
  const read = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Private storage"); });
  try {
    mount();
    expect(screen.getByLabelText("Visualization name")).toBeDisabled();
    fireEvent.click(screen.getByText("Continue without local recovery"));
    fireEvent.change(screen.getByLabelText("Visualization name"), { target: { value: "Can still save" } });
    await waitFor(() => expect(screen.getByText("Apply visualization")).toBeEnabled());
    expect(screen.getByText("Local draft storage is unavailable. Save before leaving this page.")).toBeVisible();
  } finally { read.mockRestore(); }
});
it("hides a cached preview and blocks apply after a failed schema refresh", async () => {
  const { onPreview, client } = mount();
  await waitFor(() => expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ result: expect.any(Object) })));
  const original = vi.mocked(apiRequest).getMockImplementation()!;
  vi.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (url.endsWith("/schema")) throw new Error("Schema unavailable");
    return original(url, options);
  });
  await act(async () => { await client.invalidateQueries({ queryKey: ["publication-schema"] }); });
  await waitFor(() => expect(onPreview).toHaveBeenLastCalledWith({ error: expect.any(Error) }));
  expect(screen.getByText("Apply visualization")).toBeDisabled();
});
it("explains an unavailable source instead of leaving an endless preview spinner", async () => {
  vi.mocked(listWorkflows).mockResolvedValue([]);
  const { onPreview } = mount();
  await waitFor(() => expect(onPreview).toHaveBeenLastCalledWith({ message: "The selected result is unavailable. Choose another published result." }));
  expect(screen.getByText("Apply visualization")).toBeDisabled();
  expect(vi.mocked(apiRequest).mock.calls.some(([url]) => url.endsWith("/preview"))).toBe(false);
});
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
it("shares field bindings and appearance across the two panels without saving the draft", async () => {
  const datasetFlow = { ...flow, result_catalog: { outputs: [{ ...flow.result_catalog.outputs[0], kind: "dataset" as const }] } };
  vi.mocked(listWorkflows).mockResolvedValue([datasetFlow]); vi.mocked(getWorkflow).mockResolvedValue(datasetFlow);
  const original = vi.mocked(apiRequest).getMockImplementation()!;
  vi.mocked(apiRequest).mockImplementation(async (url, options) => url.endsWith("/schema") ? { workflow_revision: 5, kind: "dataset", roles: [], columns: [
    { column_id: "region", display_name: "Region", logical_type: "string" },
    { column_id: "amount", display_name: "Amount", logical_type: "float" },
  ] } as never : original(url, options));
  function Workbench() {
    const [host, setHost] = useState<HTMLDivElement | null>(null);
    return <><div ref={setHost} data-testid="fields" /><VisualizationEditor projectId="project" embedded close={vi.fn()} fieldsHost={host} /></>;
  }
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Workbench /></QueryClientProvider>);
  const fields = within(screen.getByTestId("fields"));
  fireEvent.click(await fields.findByRole("button", { name: "Use Region as category" }));
  fireEvent.click(fields.getByRole("button", { name: "Use Amount as value" }));
  expect(screen.getByLabelText("Chart category")).toHaveValue("region");
  expect(screen.getByLabelText("Chart value")).toHaveValue("amount");
  fireEvent.click(screen.getByRole("tab", { name: "Appearance" }));
  fireEvent.change(screen.getByLabelText("Decimal places"), { target: { value: "4" } });
  fireEvent.click(fields.getByRole("button", { name: "Use Amount as category" }));
  expect(screen.getByLabelText("Decimal places")).toHaveValue(4);
  fireEvent.click(screen.getByRole("tab", { name: "Data" }));
  expect(screen.getByLabelText("Chart category")).toHaveValue("amount");
  expect(fields.getByRole("button", { name: "Use Amount as category" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getAllByLabelText("Prepared dataset")).toHaveLength(1);
  expect(vi.mocked(apiRequest).mock.calls.some(([, options]) => options?.method === "PUT")).toBe(false);
  fireEvent.click(screen.getByLabelText("Close settings"));
  expect(screen.getByText("Continue editing")).toBeVisible();
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
