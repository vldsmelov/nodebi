import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "./render";
import { afterEach, expect, it, vi } from "vitest";
import { NodeOutputPanel } from "@/features/workflow/NodeOutputPanel";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("shows full-input alignment counts and hides them after a draft changes", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ revision: 1, columns: [], rows: [], total_rows: 0, duration_ms: 1, alignment_diagnostics: { node_id: "node", matched_rows: 1000, left_only_rows: 2, right_only_rows: 3, result_rows: 1005 } }))));
  const client = new QueryClient();
  const panel = (dirty: boolean) => <QueryClientProvider client={client}><NodeOutputPanel workflowId="workflow" nodeId="node" revision={1} dirty={dirty} issues={[]} /></QueryClientProvider>;
  const view = render(panel(false));
  fireEvent.click(screen.getByRole("button", { name: "Preview output" }));
  expect(await screen.findByText(/Full alignment:.*2 only left, 3 only right/)).toHaveTextContent("Counts cover all rows.");
  view.rerender(panel(true));
  expect(screen.queryByText(/Full alignment:/)).toBeNull();
});

it("does not show a late Join failure after choosing diagnostic records", async () => {
  let resolve!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(done => { resolve = done; })));
  const report = vi.fn();
  render(<QueryClientProvider client={new QueryClient()}><NodeOutputPanel isJoin workflowId="flow" nodeId="join" revision={1} dirty={false} issues={[]} onRuntimeIssues={report} /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Preview output" }));
  await waitFor(() => expect(resolve).toBeDefined());
  fireEvent.change(screen.getByLabelText("Join records"), { target: { value: "left_unmatched" } });
  resolve(new Response(JSON.stringify({ detail: { message: "Old cardinality failure", issues: [{ code: "FAIL", message: "Old cardinality failure" }] } }), { status: 422 }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview output" })).toBeEnabled());
  expect(screen.queryByRole("alert")).toBeNull();
  expect(report).toHaveBeenLastCalledWith([]);
});

it("reports structured runtime issues and clears them on retry and draft changes", async () => {
  const issue = { code: "NODE_EXECUTION_FAILED", message: "Filter predicate contains null values.", node_id: "node", edge_id: null, field: "config.null_policy" };
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ detail: { message: issue.message, issues: [issue] } }), { status: 422 }))));
  const report = vi.fn();
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const panel = (dirty: boolean) => <QueryClientProvider client={client}><NodeOutputPanel workflowId="workflow" nodeId="node" revision={1} dirty={dirty} issues={[]} onRuntimeIssues={report} /></QueryClientProvider>;
  const view = render(panel(false));
  fireEvent.click(screen.getByRole("button", { name: "Preview output" }));
  await waitFor(() => expect(report).toHaveBeenLastCalledWith([{ ...issue, severity: "error" }]));
  view.rerender(panel(true));
  await waitFor(() => expect(report).toHaveBeenLastCalledWith([]));
  view.rerender(panel(false));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(report).toHaveBeenLastCalledWith([]);
  fireEvent.click(screen.getByRole("button", { name: "Preview output" }));
  await waitFor(() => expect(report).toHaveBeenLastCalledWith([{ ...issue, severity: "error" }]));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ revision: 1, columns: [], rows: [], total_rows: 0, duration_ms: 1 }))));
  fireEvent.click(screen.getByRole("button", { name: "Preview output" }));
  await waitFor(() => expect(report).toHaveBeenLastCalledWith([]));
  expect(await screen.findByText("The result is empty.")).toBeVisible();
});

it("does not report a late failed preview after parameters change", async () => {
  let resolve!: (value: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(done => { resolve = done; })));
  const report = vi.fn(), client = new QueryClient();
  const panel = (factor: number) => <QueryClientProvider client={client}><NodeOutputPanel workflowId="workflow" nodeId="node" revision={1} dirty={false} parameters={{ factor }} issues={[]} onRuntimeIssues={report} /></QueryClientProvider>;
  const view = render(panel(0));
  fireEvent.click(screen.getByRole("button", { name: "Preview output" }));
  await waitFor(() => expect(resolve).toBeDefined());
  view.rerender(panel(1));
  resolve(new Response(JSON.stringify({ detail: { issues: [{ code: "FAIL", message: "Old failure", field: "value" }] } }), { status: 422 }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview output" })).toBeEnabled());
  expect(report.mock.calls.every(([issues]) => issues.length === 0)).toBe(true);
  expect(screen.queryByRole("alert")).toBeNull();
});

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
