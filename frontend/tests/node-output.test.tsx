import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "./render";
import { afterEach, expect, it, vi } from "vitest";
import { NodeOutputPanel } from "@/features/workflow/NodeOutputPanel";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("named output changes discard a late result and send the selected port", async () => {
  let resolve!: (value: Response) => void;
  const fetcher = vi.fn(() => new Promise<Response>(done => { resolve = done; }));
  vi.stubGlobal("fetch", fetcher);
  const client = new QueryClient();
  const panel = (outputPort: string) => <QueryClientProvider client={client}>
    <NodeOutputPanel workflowId="workflow" nodeId="node" outputPort={outputPort} revision={1} dirty={false} issues={[]} />
  </QueryClientProvider>;
  const view = render(panel("first"));
  fireEvent.click(screen.getByRole("button", { name: "Preview output" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalled());
  expect(JSON.parse((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).output_port).toBe("first");
  view.rerender(panel("second"));
  resolve(new Response(JSON.stringify({ revision: 1, columns: [], rows: [], total_rows: 0, duration_ms: 1 })));
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview output" })).toBeEnabled());
  expect(screen.queryByText("The result is empty.")).toBeNull();
});

it("discards a late response after the selected parameter changes", async () => {
  let resolve!: (value: Response) => void;
  const fetcher = vi.fn(() => new Promise<Response>(done => { resolve = done; }));
  vi.stubGlobal("fetch", fetcher);
  const client = new QueryClient();
  const panel = (selected: string) => <QueryClientProvider client={client}>
    <NodeOutputPanel workflowId="workflow" nodeId="node" revision={1} dirty={false} issues={[]} parameters={{ selected }} />
  </QueryClientProvider>;
  const view = render(panel("A"));
  fireEvent.click(screen.getByRole("button", { name: "Preview output" }));
  await waitFor(() => expect(resolve).toBeDefined());
  view.rerender(panel("B"));
  resolve(new Response(JSON.stringify({ revision: 1, columns: [], rows: [], total_rows: 0, duration_ms: 1 })));
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview output" })).toBeEnabled());
  expect(screen.queryByText("The result is empty.")).toBeNull();
});

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
