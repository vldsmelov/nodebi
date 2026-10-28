import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { AlignmentReportBuilder } from "@/features/report-builder/AlignmentReportBuilder";
import { apiRequest } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }));

it("distinguishes pending and empty alignment previews while preserving saveability", async () => {
  let finish!: (value: unknown) => void;
  vi.mocked(apiRequest).mockImplementation(async url => {
    if (url.endsWith("/preview")) return new Promise(resolve => { finish = resolve; });
    if (url.endsWith("/inputs")) return catalog; return source;
  });
  show(); await fill();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  expect(await screen.findByRole("status", { name: "Loading data" })).toHaveAttribute("aria-busy", "true");
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  await act(async () => finish({ columns: columns, rows: [], alignment_diagnostics: { matched_rows: 0, left_only_rows: 0, right_only_rows: 0 } }));
  expect(await screen.findByRole("status", { name: "The result is empty." })).toBeVisible();
  expect(screen.queryByRole("status", { name: "Loading data" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled();
  fireEvent.change(screen.getByLabelText("Report name"), { target: { value: "Changed" } });
  expect(screen.queryByRole("status", { name: "The result is empty." })).not.toBeInTheDocument();
  expect(screen.getByText("Preview is out of date. Run the calculation again.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
});
afterEach(() => { cleanup(); vi.resetAllMocks(); sessionStorage.clear(); });
const columns = [
  { column_id: "key", engine_name: "key", display_name: "Key", logical_type: "string", nullable: false, metadata: {} },
  { column_id: "value", engine_name: "value", display_name: "Value", logical_type: "decimal", nullable: true, metadata: {} },
];
const catalog = { items: ["left", "right"].map(id => ({ workflow_id: "workflow", publication_id: id, workflow_name: "Sales", name: id, available: true })) };
const source = { columns, expected_token: "a".repeat(64), uses_parameters: false };
const preview = { columns, rows: [{ key: "A", value: "9007199254740993.11" }], alignment_diagnostics: { matched_rows: 1, left_only_rows: 2, right_only_rows: 3 } };
function show() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><AlignmentReportBuilder projectId="project" /></QueryClientProvider>);
}
async function fill() {
  await screen.findByRole("option", { name: "Sales" });
  fireEvent.change(screen.getByLabelText("Report name"), { target: { value: "Actual / Plan" } });
  fireEvent.change(screen.getByLabelText("Calculation graph"), { target: { value: "workflow" } });
  fireEvent.change(screen.getByLabelText("Left prepared result"), { target: { value: "left" } });
  fireEvent.change(screen.getByLabelText("Right prepared result"), { target: { value: "right" } });
  await screen.findByLabelText("Left key");
  fireEvent.change(screen.getByLabelText("Left key"), { target: { value: "key" } });
  fireEvent.change(screen.getByLabelText("Right key"), { target: { value: "key" } });
  fireEvent.change(screen.getByLabelText("Left measure"), { target: { value: "value" } });
  fireEvent.change(screen.getByLabelText("Right measure"), { target: { value: "value" } });
}

it("replaces earlier preview errors with the newest fields error and clears feedback on success", async () => {
  let fail = true;
  vi.mocked(apiRequest).mockImplementation(async url => {
    if (url.endsWith("/inputs")) return catalog;
    if (url.endsWith("/preview")) throw new Error("Old preview failure");
    if (url.endsWith("/fields")) {
      if (fail) throw new Error("Latest fields failure");
      return { columns, formula_outputs: {} };
    }
    return source;
  });
  show(); await fill();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByText("Old preview failure");
  fireEvent.click(screen.getByRole("button", { name: "Check formula fields" }));
  await screen.findByText("Latest fields failure");
  expect(screen.queryByText("Old preview failure")).toBeNull();
  await waitFor(() => expect(screen.getByRole("alert", { name: "Report check failed" })).toHaveFocus());
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Check formula fields" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Add aligned formula" })).toBeEnabled());
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  expect(screen.getByLabelText("Left measure")).toHaveValue("value");
});

it("submits explicit alignment, shows exact preview and requires a new preview after changes", async () => {
  vi.mocked(apiRequest).mockImplementation(async url => url.endsWith("/inputs") ? catalog : url.endsWith("/preview") ? preview : source);
  show(); await fill();
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  expect(await screen.findByRole("cell", { name: "9007199254740993.11" })).toBeVisible();
  expect(screen.getByText(/1 matched, 2 only left, 3 only right/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled();
  const sent = JSON.parse(vi.mocked(apiRequest).mock.calls.find(([url]) => url.endsWith("/preview"))![1]!.body as string);
  expect(sent).toMatchObject({ workflow_id: "workflow", left_publication_id: "left", right_publication_id: "right", expected_token: source.expected_token, alignment: { keys: [{ left_key: "key", right_key: "key" }], left_value: "value", right_value: "value" } });
  fireEvent.change(screen.getByLabelText("Empty alignment keys"), { target: { value: "match" } });
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  expect(screen.queryByText(/1 matched/)).toBeNull();
});

it("keeps settings on schema reload but invalidates an unchanged-token preview", async () => {
  vi.mocked(apiRequest).mockImplementation(async url => url.endsWith("/inputs") ? catalog : url.endsWith("/preview") ? preview : source);
  show(); await fill();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Reload input fields" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview calculation" })).toBeEnabled());
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  expect(screen.getByLabelText("Left measure")).toHaveValue("value");
  expect(screen.getByLabelText("Report name")).toHaveValue("Actual / Plan");
});

it("blocks preview when the two input schemas were read at different project revisions", async () => {
  vi.mocked(apiRequest).mockImplementation(async url => url.endsWith("/inputs") ? catalog : { ...source, expected_token: (url.endsWith("/right") ? "b" : "a").repeat(64) });
  show(); await fill();
  expect(screen.getByText("Prepared data changed. Reload input fields and preview again.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Preview calculation" })).toBeDisabled();
});

it("checks server formula fields, preserves dependent drafts and invalidates edited prefixes", async () => {
  const derived = { ...columns[1], column_id: "aligned_value", display_name: "Actual", engine_name: "actual" };
  vi.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (url.endsWith("/inputs")) return catalog;
    if (url.endsWith("/preview")) return preview;
    if (url.endsWith("/fields")) {
      const body = JSON.parse(options!.body as string);
      return { columns: [derived], formula_outputs: Object.fromEntries((body.formulas ?? []).map((f: { node_id: string; name: string }) => [f.node_id, [derived, { ...derived, column_id: `calc_${f.node_id.replaceAll("-", "")}`, display_name: f.name }]])) };
    }
    return source;
  });
  show(); await fill();
  fireEvent.click(screen.getByRole("button", { name: "Check formula fields" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Add aligned formula" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Add aligned formula" }));
  const first = within(screen.getByRole("region", { name: "Formula 1" }));
  fireEvent.change(first.getByLabelText("Formula name"), { target: { value: "Double" } });
  fireEvent.change(first.getByLabelText("Expression"), { target: { value: "[aligned_value]*2" } });
  expect(first.getByRole("option", { name: "Actual · decimal" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Check formula fields" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Add aligned formula" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Add aligned formula" }));
  const second = within(screen.getByRole("region", { name: "Formula 2" }));
  expect(second.getByRole("option", { name: "Double · decimal" })).toBeVisible();
  fireEvent.change(first.getByLabelText("Expression"), { target: { value: "[aligned_value]*3" } });
  expect(second.queryByRole("option", { name: "Double · decimal" })).toBeNull();
  fireEvent.change(second.getByLabelText("Formula name"), { target: { value: "Constant" } });
  fireEvent.change(second.getByLabelText("Expression"), { target: { value: "0.1+0.2" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled());
  const sent = JSON.parse(vi.mocked(apiRequest).mock.calls.find(([url]) => url.endsWith("/preview"))![1]!.body as string);
  expect(sent.formulas).toHaveLength(2);
  expect(sent.formulas[0]).toMatchObject({ name: "Double", expression: "[aligned_value]*3", rounding: "half_even" });
  cleanup(); show();
  fireEvent.click(await screen.findByRole("button", { name: "Restore local draft" }));
  expect(await screen.findByDisplayValue("[aligned_value]*3")).toBeVisible();
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  expect(within(screen.getByRole("region", { name: "Formula 1" })).getByLabelText("Insert formula field")).toBeDisabled();
});
