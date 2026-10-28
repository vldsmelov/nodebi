import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { ProjectOverview } from "@/features/workspace/ProjectOverview";
import type { Dashboard } from "@/features/dashboard/api";

const project = { id: "p", name: "Sales", created_at: "2026-10-09T00:00:00Z", updated_at: "2026-10-09T00:00:00Z" };
const report = (i: number): Dashboard => ({ id: `r${i}`, project_id: "p", name: `Report ${i}`, revision: 1, widgets: [] });
function setup(overrides: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { p: project, dashboards: { items: [] }, datasets: [], sources: { items: [] }, imports: [], "report-state": { token: "token", pending_updates: 0, check_status: "missing" }, ...overrides };
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const key = url.split("/").at(-1)!;
    if (init?.method === "PATCH") return new Response(JSON.stringify({ ...project, ...JSON.parse(init.body as string) }));
    if (data[key] instanceof Error) throw data[key];
    if (data[key] instanceof Promise) return await data[key];
    return new Response(JSON.stringify(data[key]));
  });
  vi.stubGlobal("fetch", fetch);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><ProjectOverview projectId="p" /></QueryClientProvider>);
  return { client, fetch, data };
}
afterEach(() => vi.unstubAllGlobals());

it("guides an empty project without running checks or calculations", async () => {
  const { fetch } = setup();
  expect(await screen.findByText("Your first report starts with a table")).toBeVisible();
  for (const action of screen.getAllByRole("link", { name: "Create report" })) expect(action).toHaveAttribute("href", "/projects/p/build");
  expect(await screen.findByText("No unfinished imports.")).toBeVisible();
  expect(screen.getByText("Report has not been checked yet.")).toBeVisible();
  expect(fetch.mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
});

it("searches and pages reports, separating open/view from edit links", async () => {
  setup({ dashboards: { items: Array.from({ length: 8 }, (_, i) => report(i)) } });
  const list = await screen.findByRole("region", { name: "Saved reports" });
  await within(list).findByText("Report 0");
  expect(within(list).getAllByRole("article")).toHaveLength(6);
  expect(screen.getByRole("link", { name: "Open report Report 0" })).toHaveAttribute("href", "/projects/p/dashboard?dashboard=r0&mode=view");
  expect(screen.getByRole("link", { name: "Edit report Report 0" })).toHaveAttribute("href", "/projects/p/dashboard?dashboard=r0");
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(within(list).getAllByRole("article")).toHaveLength(2);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "REPORT 2" } });
  expect(within(list).getAllByRole("article")).toHaveLength(1);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "missing" } });
  expect(screen.getByText("No reports match this name.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(within(list).getAllByRole("article")).toHaveLength(6);
});

it("puts populated reports before empty layouts without mutating cached list order", async () => {
  const items = [report(10), { ...report(3), widgets: [{ id: "widget", visualization_id: "chart", x: 0, y: 0, width: 6, height: 4 }] }, report(2)];
  setup({ dashboards: { items } });
  const list = await screen.findByRole("region", { name: "Saved reports" });
  await within(list).findByText("Report 3");
  expect(within(list).getAllByRole("heading", { level: 3 }).map(el => el.textContent)).toEqual(["Report 3", "Report 2", "Report 10"]);
  expect(items.map(item => item.id)).toEqual(["r10", "r3", "r2"]);
});

it.each(["missing", "outdated", "error", "warning", "passed"])("shows server check status %s without certifying saved layouts", async check_status => {
  setup({ "report-state": { token: "t", pending_updates: 2, check_status }, dashboards: { items: [report(1)] } });
  const section = await screen.findByRole("region", { name: "Checks and updates" });
  await within(section).findByText("Pending data updates: 2");
  expect(section).toHaveTextContent({ missing: "Report has not been checked yet.", outdated: "Report checks are outdated. Run them again.", error: "Report checks found errors.", warning: "Report checks found warnings.", passed: "No report errors found." }[check_status]!);
  expect(screen.getByText("Saved layouts are not a guarantee of data quality. Project checks are shown separately.")).toBeVisible();
});

it("isolates a failed section, hides cached success and retries without claiming empty data", async () => {
  const { client, data } = setup({ "report-state": { token: "t", pending_updates: 0, check_status: "passed" }, dashboards: { items: [report(1)] } });
  await screen.findByText("No report errors found.");
  data["report-state"] = new Error("Unavailable");
  await client.invalidateQueries({ queryKey: ["report-state", "p"] });
  expect(await screen.findByRole("alert")).toHaveTextContent("Its current state is unknown.");
  expect(screen.queryByText("No report errors found.")).not.toBeInTheDocument();
  expect(screen.getByText("Report 1")).toBeVisible();
  data["report-state"] = { token: "new", pending_updates: 1, check_status: "outdated" };
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Report checks are outdated. Run them again.")).toBeVisible();
});

it("distinguishes loading sections from empty and unavailable states", async () => {
  setup({ dashboards: new Promise(() => {}), datasets: new Error("Offline") });
  expect(await screen.findByRole("region", { name: "Saved reports" })).toHaveTextContent("Loading overview section…");
  expect(await screen.findByRole("alert")).toBeVisible();
  expect(screen.queryByText("Your first report starts with a table")).not.toBeInTheDocument();
  expect(screen.queryByText("No prepared datasets yet. Existing Excel sources remain available below.")).not.toBeInTheDocument();
});

it("keeps unfinished import identities and restored period/parameters in navigation", async () => {
  setup({ imports: [{ id: "source", name: "Budget.csv", has_draft: true }, { id: "complete", name: "Finished.csv", has_draft: false }], "report-state": { token: "t", pending_updates: 0, check_status: "missing", restored_views: [{ dashboard_id: "restored", name: "Frozen selection", context: { values: { department: "North" }, period: { start: "2026-01-01", end: "2026-01-31" } } }] } });
  expect(await screen.findByRole("link", { name: "Resume import Budget.csv" })).toHaveAttribute("href", "/projects/p/data/import?source=source");
  expect(screen.queryByText("Finished.csv")).not.toBeInTheDocument();
  const href = (await screen.findByRole("link", { name: "Frozen selection" })).getAttribute("href")!;
  const params = new URL(href, "http://localhost").searchParams;
  expect(JSON.parse(params.get("parameters")!)).toEqual({ department: "North" });
  expect(JSON.parse(params.get("period")!)).toEqual({ start: "2026-01-01", end: "2026-01-31" });
});

it("renames inline, rejects blank input and restores keyboard focus after save/cancel", async () => {
  const { fetch } = setup();
  fireEvent.click(await screen.findByRole("button", { name: "Rename project" }));
  const input = screen.getByLabelText("Project name");
  expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: "  " } });
  expect(screen.getByRole("button", { name: "Save project name" })).toBeDisabled();
  fireEvent.change(input, { target: { value: "  Financial review  " } });
  fireEvent.click(screen.getByRole("button", { name: "Save project name" }));
  expect(await screen.findByRole("heading", { name: "Financial review" })).toBeVisible();
  await waitFor(() => expect(screen.getByRole("button", { name: "Rename project" })).toHaveFocus());
  expect(fetch.mock.calls.find(([, init]) => init?.method === "PATCH")?.[1]?.body).toBe(JSON.stringify({ name: "Financial review" }));
  fireEvent.click(screen.getByRole("button", { name: "Rename project" }));
  fireEvent.keyDown(screen.getByLabelText("Project name"), { key: "Escape" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Rename project" })).toHaveFocus());
});
