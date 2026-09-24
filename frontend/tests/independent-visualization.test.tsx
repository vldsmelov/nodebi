import { fireEvent, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { IndependentVisualizationDialog } from "@/features/dashboard/IndependentVisualizationDialog";
import { apiRequest } from "@/lib/api";
import { getWorkflow, listWorkflows } from "@/features/workflow/api";

vi.mock("@/lib/api", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/api")>(), apiRequest: vi.fn() }));
vi.mock("@/features/workflow/api", () => ({ getWorkflow: vi.fn(), listWorkflows: vi.fn() }));
const output = { id: "publication", node_id: "constant", port: "value", name: "Total", kind: "scalar" as const };
const workflow = { id: "flow", project_id: "project", name: "Calculation", version: 3, revision: 5, nodes: [], edges: [], created_at: "2026-01-01", updated_at: "2026-01-01", result_catalog: { outputs: [output] } };
beforeEach(() => {
  vi.resetAllMocks(); HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  vi.mocked(listWorkflows).mockResolvedValue([workflow]); vi.mocked(getWorkflow).mockResolvedValue(workflow);
});

it("retains an independent draft on conflict and sends the loaded workflow revision", async () => {
  const close = vi.fn(), created = vi.fn(); let failed = false;
  vi.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (url.endsWith("/schema")) return { workflow_revision: 5, kind: "scalar", columns: [], roles: [], period_supported: false } as never;
    if (options?.method === "POST") { if (!failed) { failed = true; throw new Error("Published data changed elsewhere. Reload before saving."); } return { id: "visualization", revision: 1 } as never; }
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
  expect(JSON.parse(String(calls[1][1]?.body))).toMatchObject({ workflow_id: "flow", publication_id: "publication", expected_workflow_revision: 5, name: "My KPI", type: "kpi" });
  expect(created).toHaveBeenCalledOnce();
});
