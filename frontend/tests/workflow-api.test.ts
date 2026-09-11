import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createWorkflow,
  getNodeCatalog,
  getWorkflowSchema,
  listWorkflows,
  previewWorkflowNode,
  saveWorkflow,
} from "@/features/workflow/api";

afterEach(() => vi.unstubAllGlobals());

describe("workflow API", () => {
  it("loads workflow summaries and the node catalog", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: "workflow-1" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ type: "excel_source" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ valid: true, nodes: [], issues: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await listWorkflows("project-1")).toEqual([{ id: "workflow-1" }]);
    expect(await getNodeCatalog()).toEqual([{ type: "excel_source" }]);
    expect(await getWorkflowSchema("workflow-1")).toEqual({ valid: true, nodes: [], issues: [] });
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/projects/project-1/workflows");
    expect(fetchMock.mock.calls[1][0]).toContain("/api/v1/node-catalog");
    expect(fetchMock.mock.calls[2][0]).toContain("/api/v1/workflows/workflow-1/schema");
  });

  it("creates and atomically saves a graph as JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "workflow-1" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "workflow-1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const payload = {
      expected_revision: 1,
      name: "Sales workflow",
      nodes: [{ id: "node-1", type: "excel_source", version: 1, position: { x: 10, y: 20 }, config: { source_id: "source-1", sheet_name: "Sales" }, ui: {} }],
      edges: [],
    };

    await createWorkflow("project-1", "Sales workflow");
    await saveWorkflow("workflow-1", payload);

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify({ name: "Sales workflow" }) });
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "PUT", body: JSON.stringify(payload) });
  });

  it("surfaces the backend's user-facing error message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: { message: "Invalid node configuration." } }), { status: 422 })));

    await expect(listWorkflows("project-1")).rejects.toThrow("Invalid node configuration.");
  });

  it("requests a bounded node preview", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "succeeded", rows: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await previewWorkflowNode("workflow-1", "node-1", 25);

    expect(fetchMock.mock.calls[0][0]).toContain("/workflows/workflow-1/nodes/node-1/preview");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", body: "{\"limit\":25}" });
  });

  it("includes the diagnostic identifier in the message shown by the interface", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: {
      code: "INTERNAL_ERROR", message: "Try again.", correlation_id: "diagnostic-123",
    } }), { status: 500 })));
    await expect(listWorkflows("project-1")).rejects.toMatchObject({
      code: "INTERNAL_ERROR", status: 500, correlationId: "diagnostic-123",
      message: "Try again. (Diagnostic ID: diagnostic-123)",
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: {
      code: "INTERNAL_EXECUTION_ERROR", message: "Execution failed.", execution_id: "execution-123",
    } }), { status: 500 })));
    await expect(previewWorkflowNode("workflow-1", "node-1")).rejects.toThrow("Diagnostic ID: execution-123");
  });
});
