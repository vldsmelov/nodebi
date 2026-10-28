import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { AlignmentReportEditor } from "@/features/report-builder/AlignmentReportEditor";
import { apiRequest } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }));

it("distinguishes pending and empty alignment previews while preserving saveability", async () => {
  let finish!: (value: unknown) => void;
  vi.mocked(apiRequest).mockImplementation(async url => {
    if (url.endsWith("/preview")) return new Promise(resolve => { finish = resolve; });
    return edit;
  });
  show(); await screen.findByLabelText("Report name");
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  expect(await screen.findByRole("status", { name: "Loading data" })).toHaveAttribute("aria-busy", "true");
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  await act(async () => finish({ columns: fields, rows: [], alignment_diagnostics: { matched_rows: 0, left_only_rows: 0, right_only_rows: 0 } }));
  expect(await screen.findByRole("status", { name: "The result is empty." })).toBeVisible();
  expect(screen.queryByRole("status", { name: "Loading data" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled();
  fireEvent.change(screen.getByLabelText("Report name"), { target: { value: "Changed" } });
  expect(screen.queryByRole("status", { name: "The result is empty." })).not.toBeInTheDocument();
  expect(screen.getByText("Preview is out of date. Run the calculation again.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
});
afterEach(() => { cleanup(); vi.resetAllMocks(); sessionStorage.clear(); });
const visual = "11111111-1111-4111-8111-111111111111";
const fields = [
  { column_id: "key", engine_name: "key", display_name: "Category", logical_type: "string", nullable: false, metadata: {} },
  { column_id: "value", engine_name: "value", display_name: "Revenue", logical_type: "decimal", nullable: true, metadata: {} },
];
const edit = { workflow_id: "workflow", visualization_id: visual, expected_token: "a".repeat(64), name: "Plan / actual", editable: true, widget_count: 1,
  settings: { name: "Plan / actual", alignment: { keys: [{ left_key: "key", right_key: "key" }], left_value: "value", right_value: "value", left_name: "Actual", right_name: "Plan", null_keys: "reject" }, formulas: [] },
  left_columns: fields, right_columns: fields, steps: [{ node_id: "prepare", type: "filter", editable: false }, { node_id: "align", type: "align_measures", editable: true }] };
function show() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><AlignmentReportEditor projectId="project" visualizationId={visual} /></QueryClientProvider>);
}
it("shows only the latest failed check, focuses it, and clears it after a successful preview", async () => {
  let fail = true;
  vi.mocked(apiRequest).mockImplementation(async url => {
    if (url.endsWith("/fields")) throw new Error("Old fields failure");
    if (url.endsWith("/preview")) {
      if (fail) throw new Error("Latest preview failure");
      return { columns: fields, rows: [], alignment_diagnostics: { matched_rows: 0, left_only_rows: 0, right_only_rows: 0 } };
    }
    return edit;
  });
  show(); await screen.findByLabelText("Report name");
  fireEvent.click(screen.getByRole("button", { name: "Check formula fields" }));
  await screen.findByText("Old fields failure");
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByText("Latest preview failure");
  expect(screen.queryByText("Old fields failure")).toBeNull();
  await waitFor(() => expect(screen.getByRole("alert", { name: "Report check failed" })).toHaveFocus());
  expect(screen.getByLabelText("Report name")).toHaveValue("Plan / actual");
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled());
  expect(screen.queryByRole("alert")).toBeNull();
});

it("requires fresh preview, preserves original revision on restore, and sends explicit field rebinding", async () => {
  vi.mocked(apiRequest).mockImplementation(async url => url.endsWith("/preview") ? { columns: fields, rows: [{ key: "A", value: "0.30" }], alignment_diagnostics: { matched_rows: 1, left_only_rows: 0, right_only_rows: 0 } } : edit);
  show();
  fireEvent.change(await screen.findByLabelText("Report name"), { target: { value: "Edited" } });
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  fireEvent.click(screen.getByLabelText("Update visualization field bindings"));
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled());
  cleanup();
  vi.mocked(apiRequest).mockResolvedValue({ ...edit, expected_token: "b".repeat(64) });
  show();
  fireEvent.click(await screen.findByRole("button", { name: "Restore local draft" }));
  expect(await screen.findByDisplayValue("Edited")).toBeVisible();
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  expect(screen.getByLabelText("Update visualization field bindings")).toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: "Check formula fields" }));
  await waitFor(() => expect(vi.mocked(apiRequest).mock.calls.some(([url]) => url.endsWith("/fields"))).toBe(true));
  const sent = JSON.parse(vi.mocked(apiRequest).mock.calls.find(([url]) => url.endsWith("/fields"))![1]!.body as string);
  expect(sent).toMatchObject({ expected_token: "a".repeat(64), rebind_fields: true, settings: { name: "Edited" } });
  expect(screen.getByText("Both prepared input branches are preserved. Change input connections in the graph.")).toBeVisible();
});

it("leaves shared or advanced suffixes in the graph", async () => {
  vi.mocked(apiRequest).mockResolvedValue({ ...edit, editable: false, settings: null, reason: "This calculation is shared by other results. Edit it in the graph." });
  show();
  expect(await screen.findByText("This calculation is shared by other results. Edit it in the graph.")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Save report" })).toBeNull();
  expect(screen.getByRole("link", { name: "Open calculation" })).toHaveAttribute("href", "/projects/project/workflow?workflow=workflow&mode=fields");
});

it("uses preview schemas for readable formulas and newer explicit field checks after edits", async () => {
  const identity = "22222222-2222-4222-8222-222222222222";
  const saved = { ...edit, settings: { ...edit.settings, formulas: [{ node_id: identity, name: "First", expression: "0.1+0.2", scale: 2 }] } };
  vi.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (!options) return saved;
    const body = JSON.parse(options.body as string);
    const fieldData = { columns: fields, formula_outputs: { [identity]: [...fields, { ...fields[1], column_id: `calc_${identity.replaceAll("-", "")}`, display_name: body.settings.formulas[0].name }] } };
    return url.endsWith("/fields") ? fieldData : { formula_fields: fieldData, columns: fields, rows: [], alignment_diagnostics: { matched_rows: 0, left_only_rows: 0, right_only_rows: 0 } };
  });
  show();
  await screen.findByLabelText("Formula name");
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled());
  expect(screen.getByLabelText("Insert formula field")).toBeEnabled();
  fireEvent.change(screen.getByLabelText("Formula name"), { target: { value: "Renamed" } });
  fireEvent.click(screen.getByRole("button", { name: "Check formula fields" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Add aligned formula" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Add aligned formula" }));
  expect(within(screen.getByRole("region", { name: "Formula 2" })).getByRole("option", { name: "Renamed · decimal" })).toBeVisible();
});
