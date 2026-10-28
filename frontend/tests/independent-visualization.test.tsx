import { fireEvent, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { IndependentVisualizationDialog } from "@/features/dashboard/IndependentVisualizationDialog";
import { ApiError, apiRequest } from "@/lib/api";
import { VisualizationEditor } from "@/features/dashboard/VisualizationEditor";
import { getWorkflow, listWorkflows } from "@/features/workflow/api";
import type { Visualization } from "@/features/dashboard/api";

vi.mock("@/lib/api", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/api")>(), apiRequest: vi.fn() }));
vi.mock("@/features/workflow/api", () => ({ getWorkflow: vi.fn(), listWorkflows: vi.fn() }));
const output = { id: "publication", node_id: "constant", port: "value", name: "Total", kind: "scalar" as const };
const workflow = { id: "flow", project_id: "project", name: "Calculation", version: 3, revision: 5, nodes: [], edges: [], created_at: "2026-01-01", updated_at: "2026-01-01", result_catalog: { outputs: [output] } };
beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear(); HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  vi.mocked(listWorkflows).mockResolvedValue([workflow]); vi.mocked(getWorkflow).mockResolvedValue(workflow);
});

it("retains an independent draft on conflict and sends the loaded workflow revision", async () => {
  const close = vi.fn(), created = vi.fn(); let failed = false;
  vi.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (url.endsWith("/schema")) return { workflow_revision: 5, kind: "scalar", columns: [], roles: [], period_supported: false } as never;
    if (options?.method === "POST") { if (!failed) { failed = true; throw new Error("Published data changed elsewhere. Reload before saving."); } return { id: "visualization", revision: 1, workflow_id: "flow", publication_id: "publication", node_id: "constant", name: "My KPI", type: "kpi", config: { number_format: "number", decimals: 2, currency: "USD", title: "", title_template: false, orientation: "vertical", show_legend: true, show_labels: false } } satisfies Visualization as never; }
    throw new Error("Unexpected request");
  });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><IndependentVisualizationDialog projectId="project" close={close} onCreated={created} /></QueryClientProvider>);
  fireEvent.change(screen.getByLabelText("Visualization name"), { target: { value: "My KPI" } });
  const save = screen.getByText("Save visualization"); await waitFor(() => expect(save).toBeEnabled());
  expect(screen.getByLabelText("Visualization type")).toHaveValue("kpi");
  fireEvent.click(save); await screen.findByRole("alert");
  expect(close).not.toHaveBeenCalled(); expect(screen.getByLabelText("Visualization name")).toHaveValue("My KPI");
  fireEvent.click(save); await waitFor(() => expect(close).toHaveBeenCalledOnce());
  const calls = vi.mocked(apiRequest).mock.calls.filter(([, options]) => options?.method === "POST");
  expect(JSON.parse(String(calls[1][1]?.body))).toMatchObject({ workflow_id: "flow", publication_id: "publication", expected_workflow_revision: 5, name: "My KPI", type: "kpi", config: { spec: { version: 1, type: "kpi", value: null } } });
  expect(created).toHaveBeenCalledOnce();
  expect(calls[0][1]?.body).toBe(calls[1][1]?.body);
});

it.each(["create", "copy", "update"])("recovers an ambiguous %s after remount with the exact original request", async operation => {
  const close = vi.fn(), created = vi.fn(); const bodies: string[] = [];
  const saved = { id: "visualization", revision: 2, workflow_id: "flow", publication_id: "publication", node_id: "constant", name: "Recovered KPI", type: "kpi", config: {} } as Visualization;
  let metadataUnavailable = false;
  vi.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (url.endsWith("/schema")) {
      if (metadataUnavailable) throw new Error("Schema unavailable");
      return { workflow_revision: 5, kind: "scalar", columns: [], roles: [], period_supported: false } as never;
    }
    if (url.endsWith("/uses")) return [] as never;
    if (options?.method === "POST" || options?.method === "PUT") {
      bodies.push(String(options.body));
      const stored = Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.getItem(sessionStorage.key(i)!));
      expect(stored.some(raw => JSON.parse(raw!).saveAttempt?.body.request_id === JSON.parse(String(options.body)).request_id)).toBe(true);
      if (bodies.length === 1) throw new TypeError("Response lost after commit");
      expect(url).toBe(operation === "create" ? "/api/v1/projects/project/visualizations" : `/api/v1/visualizations/visualization${operation === "copy" ? "/copy" : ""}`);
      return saved as never;
    }
    throw new Error("Unexpected request");
  });
  const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><VisualizationEditor projectId="project" visualization={operation === "create" ? undefined : { ...saved, revision: 1, name: "Original" }} copy={operation === "copy"} close={close} onCreated={created} onCopy={created} /></QueryClientProvider>);
  const first = mount();
  fireEvent.change(screen.getByLabelText("Visualization name"), { target: { value: "Recovered KPI" } });
  await waitFor(() => expect(screen.getByText("Save visualization")).toBeEnabled());
  fireEvent.click(screen.getByText("Save visualization"));
  await screen.findByText("Response lost after commit");
  expect(screen.getByLabelText("Visualization name")).toBeDisabled();
  first.unmount(); metadataUnavailable = true;
  mount();
  fireEvent.click(await screen.findByText("Restore local draft"));
  expect(screen.getByLabelText("Visualization name")).toBeDisabled();
  fireEvent.click(screen.getByText("Save visualization"));
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect(bodies).toHaveLength(2); expect(bodies[0]).toBe(bodies[1]);
  expect(created).toHaveBeenCalledExactlyOnceWith(saved);
  await waitFor(() => expect(sessionStorage.length).toBe(0));
});

it("unlocks a definitively rejected save so corrected settings use a new request identity", async () => {
  const bodies: Record<string, unknown>[] = [];
  vi.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (url.endsWith("/schema")) return { workflow_revision: 5, kind: "scalar", columns: [], roles: [] } as never;
    bodies.push(JSON.parse(String(options?.body)));
    throw new ApiError("Invalid settings", 422, "INVALID_VISUALIZATION");
  });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><VisualizationEditor projectId="project" close={vi.fn()} /></QueryClientProvider>);
  fireEvent.change(screen.getByLabelText("Visualization name"), { target: { value: "First" } });
  await waitFor(() => expect(screen.getByText("Save visualization")).toBeEnabled());
  fireEvent.click(screen.getByText("Save visualization"));
  await screen.findByText("Invalid settings");
  expect(screen.getByLabelText("Visualization name")).toBeEnabled();
  fireEvent.change(screen.getByLabelText("Visualization name"), { target: { value: "Corrected" } });
  fireEvent.click(screen.getByText("Save visualization"));
  await waitFor(() => expect(bodies).toHaveLength(2));
  expect(bodies[0].request_id).not.toBe(bodies[1].request_id);
});
