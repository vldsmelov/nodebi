import { fireEvent, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { VisualizationSettingsDialog } from "@/features/dashboard/VisualizationSettingsDialog";
import { getWorkflow, getWorkflowSchema, saveWorkflow } from "@/features/workflow/api";
import { listDashboards } from "@/features/dashboard/api";
vi.mock("@/features/workflow/api", () => ({ getWorkflow: vi.fn(), getWorkflowSchema: vi.fn(), saveWorkflow: vi.fn() }));
vi.mock("@/features/dashboard/api", () => ({ listDashboards: vi.fn() }));
const visualization = { id: "chart", revision: 1, node_id: "chart", workflow_id: "flow", name: "Original", type: "bar_chart" as const };
const workflow = { id: "flow", project_id: "project", created_at: "2026-09-17T00:00:00Z", updated_at: "2026-09-17T00:00:00Z", name: "Flow", version: 1, revision: 3, parameters: [], nodes: [{ id: "chart", type: "bar_chart", version: 1, position: { x: 0, y: 0 }, config: { title: "Original", category_column_id: "category", value_column_id: "value" } }], edges: [] };
const mount = () => { const close = vi.fn(); render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><VisualizationSettingsDialog visualization={visualization} projectId="project" close={close} /></QueryClientProvider>); return close; };
beforeEach(() => {
  vi.resetAllMocks(); HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  vi.mocked(getWorkflow).mockResolvedValue(workflow);
  vi.mocked(getWorkflowSchema).mockResolvedValue({ revision: 3, valid: true, nodes: [], issues: [] });
  vi.mocked(listDashboards).mockResolvedValue([]);
});
it("retains entered settings after a conflict and submits only the chosen node at its expected revision", async () => {
  const close = mount();
  const title = await screen.findByLabelText("Chart title");
  fireEvent.change(title, { target: { value: "My draft" } });
  vi.mocked(saveWorkflow).mockRejectedValueOnce(new Error("Workflow conflict"));
  fireEvent.click(screen.getByText("Save visualization"));
  await screen.findByRole("alert"); expect(close).not.toHaveBeenCalled(); expect(title).toHaveValue("My draft");
  expect(saveWorkflow).toHaveBeenCalledWith("flow", expect.objectContaining({ expected_revision: 3, edges: [], nodes: [expect.objectContaining({ id: "chart", config: expect.objectContaining({ title: "My draft" }) })] }));
  vi.mocked(saveWorkflow).mockResolvedValueOnce({ ...workflow, revision: 4 });
  fireEvent.click(screen.getByText("Save visualization"));
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
});
it("refuses mismatched schema and workflow revisions before exposing editable settings", async () => {
  vi.mocked(getWorkflowSchema).mockResolvedValue({ revision: 4, valid: true, nodes: [], issues: [] });
  mount(); await screen.findByRole("alert"); expect(screen.queryByLabelText("Chart title")).not.toBeInTheDocument(); expect(screen.getByText("Save visualization")).toBeDisabled(); expect(saveWorkflow).not.toHaveBeenCalled();
});

it("saves typed visualization appearance without downgrading or losing bindings and containers", async () => {
  const typed = { ...workflow, version: 2, nodes: [{ ...workflow.nodes[0], version: 2, config: { title: "Original" } }], edges: [{ id: "edge", source_node_id: "source", source_port: "dataset", source_column_id: "amount", target_node_id: "chart", target_port: "value" }], presentation: { workbooks: [], blocks: [] } };
  vi.mocked(getWorkflow).mockResolvedValue(typed);
  vi.mocked(saveWorkflow).mockResolvedValue({ ...typed, revision: 4 });
  const close = mount();
  fireEvent.change(await screen.findByLabelText("Chart title"), { target: { value: "Connected revenue" } });
  expect(screen.queryByLabelText("Chart category")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Chart value")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Orientation")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Save visualization"));
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect(saveWorkflow).toHaveBeenCalledWith("flow", expect.objectContaining({ format_version: 2, expected_revision: 3, presentation: typed.presentation, edges: typed.edges, nodes: [{ ...typed.nodes[0], config: { title: "Connected revenue" } }] }));
});
