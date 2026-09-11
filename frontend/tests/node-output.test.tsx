import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NodeOutputPanel } from "@/features/workflow/NodeOutputPanel";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("hides preview errors from an older graph revision", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: { code: "INVALID_FIELD", message: "Old field is missing" } }), { status: 422 })));
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const panel = (revision: number, dirty = false) => <QueryClientProvider client={client}>
    <NodeOutputPanel workflowId="workflow" nodeId="node" revision={revision} dirty={dirty} issues={[]} />
  </QueryClientProvider>;
  const view = render(panel(1));
  fireEvent.click(screen.getByRole("button", { name: "Preview output" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Old field is missing");
  view.rerender(panel(1, true));
  expect(screen.queryByRole("alert")).toBeNull();
  view.rerender(panel(2));
  expect(screen.queryByRole("alert")).toBeNull();
});

it("never shows a delayed preview from an earlier saved graph", async () => {
  let resolve!: (value: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(done => { resolve = done; })));
  const client = new QueryClient();
  const panel = (revision: number, dirty = false) => <QueryClientProvider client={client}>
    <NodeOutputPanel workflowId="workflow" nodeId="node" revision={revision} dirty={dirty} issues={[]} />
  </QueryClientProvider>;
  const view = render(panel(1));
  fireEvent.click(screen.getByRole("button", { name: "Preview output" }));
  await waitFor(() => expect(resolve).toBeDefined());
  view.rerender(panel(1, true));
  resolve(new Response(JSON.stringify({ revision: 1, columns: [], rows: [], total_rows: 0, duration_ms: 1 })));
  await waitFor(() => expect(screen.queryByText("Running preview…")).toBeNull());
  expect(screen.queryByText("The result is empty.")).toBeNull();
  view.rerender(panel(2));
  expect(screen.queryByText("The result is empty.")).toBeNull();
});
