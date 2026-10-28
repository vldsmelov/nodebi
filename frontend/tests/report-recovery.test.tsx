import { useState } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { apiRequest, ApiError } from "@/lib/api";
import { ReportDraftBoundary, useReportDraftAutosave, useReportDraftSession } from "@/features/report-builder/ReportDraftBoundary";
import { readReportDraft, reportDraftKey, type ReportDraftMode, type ReportFormDraft } from "@/features/report-builder/report-draft";
import { ReportBuilder } from "@/features/report-builder/ReportBuilder";
import type { components } from "@/lib/api-schema";

vi.mock("@/lib/api", async original => ({ ...await original<typeof import("@/lib/api")>(), apiRequest: vi.fn() }));
vi.mock("@/features/ingestion/api", () => ({ listDatasets: async () => [] }));
const initial: ReportFormDraft = { kind: "report", requestId: "11111111-1111-4111-8111-111111111111", input: { kind: "import", selected: "" }, expectedToken: "a".repeat(64), step: 0, showSteps: false, settings: { name: "", dimensions: [], measures: [], filters: [], decimal_average_scale: 6, presentation: "table", rebind_fields: false } };
beforeEach(() => { sessionStorage.clear(); vi.resetAllMocks(); });
afterEach(() => vi.restoreAllMocks());
function Form({ mode }: { mode: ReportDraftMode }) {
  const session = useReportDraftSession();
  const [name, setName] = useState(session.initial?.kind === "report" || session.initial?.kind === "alignment-edit" ? session.initial.settings.name : session.initial?.name ?? "");
  const state = mode === "alignment" ? { kind: "alignment" as const, requestId: initial.requestId, name, workflow: "flow", leftId: "left", rightId: "right", alignment: {} } : { ...initial, settings: { ...initial.settings, name } };
  useReportDraftAutosave(state, !!name);
  return <><label>Name<input value={name} onChange={e => setName(e.target.value)} /></label><button onClick={() => session.save({ request_id: state.requestId, expected_token: initial.expectedToken, settings: { name } }, state)}>Send</button></>;
}
function mount(mode: ReportDraftMode = "create") {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ReportDraftBoundary projectId="project" mode={mode} target={mode === "edit" ? "visual" : undefined}><Form mode={mode} /></ReportDraftBoundary><a href="https://example.com/leave" onClick={e => e.preventDefault()}>Elsewhere</a></QueryClientProvider>);
}
it.each(["create", "edit", "alignment"] as const)("restores exact %s requests before loading authoring metadata", async mode => {
  const scope = reportDraftKey("project", mode, mode === "edit" ? "visual" : undefined);
  const calls: string[] = [];
  vi.mocked(apiRequest).mockImplementation(async (_url, options) => {
    calls.push(String(options?.body));
    expect(readReportDraft(scope, mode)?.pending).toBe(options?.body);
    if (calls.length === 1) throw new TypeError("Lost response");
    return { workflow_id: "flow", visualization_id: "chart", dashboard_id: "board" } as never;
  });
  const first = mount(mode);
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Unsaved report" } });
  fireEvent.click(screen.getByText("Send"));
  await screen.findByText("Lost response");
  expect(screen.queryByLabelText("Name")).toBeNull();
  first.unmount(); mount(mode);
  fireEvent.click(screen.getByText("Restore local draft"));
  expect(screen.queryByLabelText("Name")).toBeNull();
  fireEvent.click(screen.getByText("Retry report save"));
  await screen.findByText("Report is ready");
  expect(calls).toHaveLength(2); expect(calls[0]).toBe(calls[1]);
  expect(sessionStorage.getItem(scope)).toBeNull();
  expect(screen.getByText("Open report")).toHaveAttribute("href", expect.stringContaining("board"));
});

it("guards links, keeps ordinary drafts and restores settings without a saved preview", async () => {
  const view = mount();
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Draft" } });
  fireEvent.click(screen.getByText("Elsewhere"));
  fireEvent.click(screen.getByText("Continue editing"));
  expect(screen.getByLabelText("Name")).toHaveValue("Draft");
  fireEvent.click(screen.getByText("Elsewhere"));
  fireEvent.click(screen.getByText("Keep draft and continue"));
  view.unmount(); mount();
  fireEvent.click(screen.getByText("Restore local draft"));
  expect(screen.getByLabelText("Name")).toHaveValue("Draft");
  expect(apiRequest).not.toHaveBeenCalled();
});

it("warns before abandoning an uncertain save and respects cancellation", async () => {
  vi.mocked(apiRequest).mockRejectedValue(new TypeError("Lost response"));
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  mount(); fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Report" } });
  fireEvent.click(screen.getByText("Send")); await screen.findByText("Lost response");
  fireEvent.click(screen.getByText("Discard local draft"));
  expect(confirm).toHaveBeenCalledOnce();
  expect(screen.getByText("Retry report save")).toBeEnabled();
  expect(sessionStorage.getItem(reportDraftKey("project", "create"))).not.toBeNull();
});

it("does not leave or claim recovery when local writes fail", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota"); });
  mount(); fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Report" } });
  expect(await screen.findByText(/Local report recovery is unavailable/)).toBeVisible();
  fireEvent.click(screen.getByText("Elsewhere"));
  fireEvent.click(screen.getByText("Keep draft and continue"));
  expect(screen.getByText("Continue editing")).toBeVisible();
});

it("restores the newest draft on same-document remount when storage writes fail", async () => {
  const view = mount();
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Older stored draft" } });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota"); });
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Newest in memory" } });
  view.unmount(); mount();
  fireEvent.click(screen.getByText("Restore local draft"));
  expect(screen.getByLabelText("Name")).toHaveValue("Newest in memory");
  expect(screen.getByText(/Local report recovery is unavailable/)).toBeVisible();
});

it("does not revive a confirmed save after failed local cleanup on route remount", async () => {
  vi.mocked(apiRequest).mockResolvedValue({ workflow_id: "flow", visualization_id: "chart" });
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("Denied"); });
  const view = mount();
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Saved once" } });
  fireEvent.click(screen.getByText("Send"));
  await screen.findByText("Report is ready");
  expect(screen.getByText("Saved successfully, but local draft cleanup failed.")).toBeVisible();
  expect(screen.queryByText(/Keep this page open until saving is confirmed/)).toBeNull();
  view.unmount(); mount();
  expect(screen.queryByText("Restore local draft")).toBeNull();
  expect(screen.getByLabelText("Name")).toHaveValue("");
});

it("keeps pending requests after unstructured proxy failures", async () => {
  vi.mocked(apiRequest).mockRejectedValue(new ApiError("Gateway unavailable", 503, "REQUEST_FAILED"));
  mount(); fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Report" } });
  fireEvent.click(screen.getByText("Send")); await screen.findByText("Gateway unavailable");
  expect(screen.getByText("Retry report save")).toBeEnabled();
});

it("validates scope, nested form state and pending identities without evaluating expressions", () => {
  const scope = reportDraftKey("project", "create"), good = { version: 1, scope, state: initial };
  sessionStorage.setItem(scope, JSON.stringify(good)); expect(readReportDraft(scope, "create")).toEqual(good);
  for (const bad of [{ ...good, scope: "other" }, { ...good, state: { ...initial, settings: { ...initial.settings, measures: [null] } } }, { ...good, pending: JSON.stringify({ request_id: "another" }) }]) {
    sessionStorage.setItem(scope, JSON.stringify(bad)); expect(() => readReportDraft(scope, "create")).toThrow();
  }
});

it("restores edit settings with the original CAS token and requires a fresh preview", async () => {
  const edit: components["schemas"]["ReportEditRead"] = { alignment_editor: false, analytical_editor: false, workflow_id: "flow", visualization_id: "visual", name: "Saved", editable: true, expected_token: "a".repeat(64), widget_count: 1, columns: [], settings: { ...initial.settings, name: "Saved", measures: [{ name: "Rows", operation: "count" }] } };
  const show = (value = edit) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ReportBuilder projectId="project" edit={value} /></QueryClientProvider>);
  vi.mocked(apiRequest).mockResolvedValue({ columns: [], rows: [], total_rows: 0, steps: [] });
  const first = show();
  fireEvent.change(screen.getByLabelText("Visualization name"), { target: { value: "Local edit" } });
  for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText("Next"));
  fireEvent.click(screen.getByText("Preview calculation"));
  await waitFor(() => expect(screen.getByText("Save report")).toBeEnabled());
  first.unmount(); show({ ...edit, expected_token: "b".repeat(64) });
  fireEvent.click(screen.getByText("Restore local draft"));
  expect(screen.getByText("Save report")).toBeDisabled();
  fireEvent.click(screen.getByText("Preview calculation"));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(2));
  const body = JSON.parse(String(vi.mocked(apiRequest).mock.calls[1][1]?.body));
  expect(body.expected_token).toBe(edit.expected_token); expect(body.settings.name).toBe("Local edit");
});

it("keeps a restored prepared-input token until explicit refresh, including offline remounts", async () => {
  const scope = reportDraftKey("project", "create");
  const choice = { workflow_id: "flow", publication_id: "pub", name: "Prepared", workflow_name: "Calculation", available: true };
  const state: ReportFormDraft = { ...initial, input: { kind: "publication", selected: "flow/pub", source: { published_input: { workflow_id: "flow", publication_id: "pub", expected_token: "a".repeat(64) } } }, settings: { ...initial.settings, name: "Recovered", measures: [{ name: "Rows", operation: "count" }] } };
  sessionStorage.setItem(scope, JSON.stringify({ version: 1, scope, state }));
  let offline = false;
  const previews: { published_input: { expected_token: string } }[] = [];
  vi.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (url.endsWith("/preview")) { previews.push(JSON.parse(String(options?.body))); return { columns: [], rows: [], steps: [] } as never; }
    if (offline) throw new Error("Offline metadata");
    return (url.endsWith("/inputs") ? { items: [choice] } : { ...choice, expected_token: "b".repeat(64), columns: [] }) as never;
  });
  const show = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ReportBuilder projectId="project" /></QueryClientProvider>);
  const first = show(); fireEvent.click(screen.getByText("Restore local draft"));
  await waitFor(() => expect(screen.getByText("Preview calculation")).toBeEnabled());
  fireEvent.click(screen.getByText("Preview calculation"));
  await waitFor(() => expect(previews).toHaveLength(1));
  expect(previews[0].published_input.expected_token).toBe("a".repeat(64));
  fireEvent.click(screen.getByText("Reload input fields"));
  await waitFor(() => expect(screen.getByText("Preview calculation")).toBeEnabled());
  fireEvent.click(screen.getByText("Preview calculation"));
  await waitFor(() => expect(previews).toHaveLength(2));
  expect(previews[1].published_input.expected_token).toBe("b".repeat(64));
  first.unmount(); offline = true; show(); fireEvent.click(screen.getByText("Restore local draft"));
  await screen.findByText("Offline metadata");
  expect(screen.getByText("Preview calculation")).toBeDisabled();
  const stored = readReportDraft(scope, "create")!.state as ReportFormDraft;
  expect(stored.input.source?.published_input?.expected_token).toBe("b".repeat(64));
});
