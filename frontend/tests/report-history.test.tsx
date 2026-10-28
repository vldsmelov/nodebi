import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/lib/i18n";
import { ReportCycle } from "@/features/report-cycle/ReportCycle";
import { apiRequest } from "@/lib/api";
import type { Update } from "@/features/report-cycle/api";
import { releaseDraftKey } from "@/features/report-cycle/useReleaseDraft";
import { resetDocumentDrafts } from "@/features/workspace/document-drafts";

const route = vi.hoisted(() => ({ query: "", replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => route, useSearchParams: () => new URLSearchParams(route.query) }));
vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }));
vi.mock("@/features/dashboard/api", () => ({ listDashboards: async () => [] }));
vi.mock("@/features/report-cycle/QualityRules", () => ({ QualityRules: () => null }));
vi.mock("@/features/report-cycle/ReleaseContext", () => ({ ReleaseContext: () => null }));
vi.mock("@/features/report-cycle/FrozenRelease", () => ({ FrozenRelease: () => null }));
vi.mock("@/features/report-cycle/UpdateEditor", () => ({ UpdateEditor: ({ row, onDirty }: { row: Update; onDirty: (value: boolean) => void }) => <section aria-label="Selected update">{row.name}<button onClick={() => onDirty(true)}>Edit locally</button></section> }));

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); route.query = ""; sessionStorage.clear(); resetDocumentDrafts(); });
const updates = ["one", "two"].map(id => ({ id, name: `Saved ${id}`, project_id: "project", revision: 1, status: "draft", created_at: "2026-10-12", items: [] }));
function show() {
  vi.mocked(apiRequest).mockImplementation(async path => (path.endsWith("/updates") ? updates : path.endsWith("/report-state") ? { token: "current" } : []) as never);
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><I18nProvider initialLocale="en"><ReportCycle projectId="project" /></I18nProvider></QueryClientProvider>);
}

describe("update history navigation", () => {
  it("distinguishes loading, failed and empty history and blocks checks without job state", async () => {
    let completeJobs!: (value: unknown) => void;
    vi.mocked(apiRequest).mockImplementation(async path => {
      if (path.endsWith("/report-jobs")) return new Promise(resolve => { completeJobs = resolve; });
      if (path.endsWith("/updates")) throw new Error("History unavailable");
      if (path.endsWith("/report-state")) return { token: "current" };
      return [];
    });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><I18nProvider initialLocale="en"><ReportCycle projectId="project" /></I18nProvider></QueryClientProvider>);
    expect(screen.getByRole("button", { name: "Check current report" })).toBeDisabled();
    await screen.findByText("History unavailable");
    expect(screen.queryByText("No data updates yet.")).not.toBeInTheDocument();
    expect(await screen.findByText("No report releases yet.")).toBeVisible();
    await act(async () => completeJobs([]));
    expect(screen.getByRole("button", { name: "Advanced data update" })).toBeDisabled();
    vi.mocked(apiRequest).mockImplementation(async path => path.endsWith("/report-state") ? { token: "current" } : []);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    fireEvent.click(screen.getByText("Update history and drafts", { selector: "summary" }));
    expect(await screen.findByText("No data updates yet.")).toBeVisible();
    await waitFor(() => expect(screen.getByRole("button", { name: "Advanced data update" })).toBeEnabled());
    expect(vi.mocked(apiRequest).mock.calls.every(([, options]) => !options?.method)).toBe(true);
  });
  it("offers release recovery, restores dates, resets warning consent and requires repairing missing dashboards", async () => {
    sessionStorage.setItem(releaseDraftKey("project"), JSON.stringify({ version: 1, projectId: "project", settings: { name: "October", period: "Q4", comment: "Note", dashboardIds: ["deleted"], datePeriod: { start: "2026-10-01", end: "2026-10-31" }, contexts: {} }, acknowledge: true }));
    show();
    expect(screen.getByLabelText("Release name")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Restore local draft" }));
    expect(screen.getByLabelText("Release name")).toHaveValue("October");
    expect(screen.getByLabelText("Release name")).toHaveFocus();
    expect(screen.getByLabelText("Period label")).toHaveValue("Q4");
    expect(screen.getByLabelText("Comment")).toHaveValue("Note");
    expect(screen.getByLabelText("Start date")).toHaveValue("2026-10-01");
    expect(screen.getByLabelText("I reviewed the warnings")).not.toBeChecked();
    expect(await screen.findByText("Some selected dashboards are unavailable. Select dashboards again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fix report release" })).toBeDisabled();
    expect(vi.mocked(apiRequest).mock.calls.every(([, options]) => !options?.method)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.queryByText("Some selected dashboards are unavailable. Select dashboards again.")).not.toBeInTheDocument();
  });
  it("guards release edits on departure and keeps them if discard is declined", () => {
    show();
    fireEvent.change(screen.getByLabelText("Release name"), { target: { value: "Keep me" } });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("link", { name: "Data" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Discard local draft" }));
    expect(screen.getByLabelText("Release name")).toHaveValue("Keep me");
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Discard local draft" }));
    expect(screen.getByLabelText("Release name")).toHaveValue("");
    expect(sessionStorage.getItem(releaseDraftKey("project"))).toBeNull();
  });
  it("opens the update addressed by the URL without creating a new draft", async () => {
    route.query = "update=two";
    show();
    expect(await screen.findByRole("region", { name: "Selected update" })).toHaveTextContent("Saved two");
    expect(vi.mocked(apiRequest).mock.calls.every(([, options]) => !options?.method)).toBe(true);
  });
  it("changes the selected link without creating history entries or losing other query settings", async () => {
    route.query = "mode=summary&update=one";
    show();
    fireEvent.click(await screen.findByRole("button", { name: /^Saved two/ }));
    expect(route.replace).toHaveBeenCalledWith("/projects/project/reports?mode=summary&update=two", { scroll: false });
    expect(route.push).not.toHaveBeenCalled();
  });
  it("keeps unsaved settings when switching updates is declined", async () => {
    route.query = "update=one";
    vi.spyOn(window, "confirm").mockReturnValue(false);
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Edit locally" }));
    fireEvent.click(screen.getByRole("button", { name: /^Saved two/ }));
    expect(window.confirm).toHaveBeenCalled();
    expect(route.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Selected update" })).toHaveTextContent("Saved one");
  });
  it("does not silently open another update for a missing or foreign ID", async () => {
    route.query = "mode=summary&update=foreign";
    show();
    await screen.findByRole("heading", { name: "Update not found" });
    expect(screen.queryByRole("region", { name: "Selected update" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show update history" }));
    expect(route.replace).toHaveBeenCalledWith("/projects/project/reports?mode=summary", { scroll: false });
  });
});
