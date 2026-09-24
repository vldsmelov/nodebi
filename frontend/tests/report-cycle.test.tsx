import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/lib/i18n";
import { UpdateEditor } from "@/features/report-cycle/UpdateEditor";
import type { Update } from "@/features/report-cycle/api";
import { apiRequest } from "@/lib/api";
vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }));
vi.mock("@/features/data-sources/api", () => ({ listSources: async () => [] }));
vi.mock("@/features/workflow/api", () => ({ listWorkflows: async () => [], getWorkflow: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const row: Update = { id: "update", project_id: "project", revision: 4, status: "checked", name: "Restore previous data", created_at: "2026-09-24", items: [{ source_id: "source", version_id: "version", mode: "replace", period: "", baseline_period: "" }], check: { token: "current", issues: [] } };
function show(value = row, token = "current") {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><I18nProvider initialLocale="en"><UpdateEditor row={value} currentToken={token} busy={false} refresh={async () => {}} onDirty={() => {}} /></I18nProvider></QueryClientProvider>);
}
describe("report update safety", () => {
  it("starts a new edit from the revision produced by a completed check", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = (revision: number) => <QueryClientProvider client={client}><I18nProvider initialLocale="en"><UpdateEditor row={{ ...row, revision }} currentToken="current" busy={false} refresh={async () => {}} onDirty={() => {}} /></I18nProvider></QueryClientProvider>;
    const mounted = render(view(4));
    mounted.rerender(view(5));
    vi.mocked(apiRequest).mockRejectedValue(new Error("network unavailable"));
    fireEvent.change(screen.getByLabelText("Update name"), { target: { value: "Corrected mapping" } });
    fireEvent.click(screen.getByRole("button", { name: "Save update draft" }));
    await screen.findByRole("alert");
    expect(JSON.parse(vi.mocked(apiRequest).mock.calls[0][1]!.body as string).expected_revision).toBe(5);
  });
  it("checks unchanged rollback without overwriting the server-owned snapshot", async () => {
    vi.mocked(apiRequest).mockResolvedValue({});
    show();
    fireEvent.click(screen.getByRole("button", { name: "Check new data" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/updates/update/check", { method: "POST", body: JSON.stringify({ expected_revision: 4 }) });
  });
  it("does not allow an outdated check to apply", () => {
    show(row, "changed");
    expect(screen.getByRole("button", { name: "Apply data update" })).toBeDisabled();
    expect(screen.queryByText("No report errors found.")).not.toBeInTheDocument();
  });
  it("preserves local edits and expected revision after a save conflict", async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error("Report changed in another tab"));
    show();
    fireEvent.change(screen.getByLabelText("Update name"), { target: { value: "My draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save update draft" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Update name")).toHaveValue("My draft");
    expect(JSON.parse(vi.mocked(apiRequest).mock.calls[0][1]!.body as string).expected_revision).toBe(4);
    expect(screen.getByRole("button", { name: "Apply data update" })).toBeDisabled();
  });
});
