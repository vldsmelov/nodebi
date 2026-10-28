import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { ReportBuilder } from "@/features/report-builder/ReportBuilder";
import { reportInputKey } from "@/features/report-builder/ReportInputPicker";
import { I18nProvider } from "@/lib/i18n";
import { apiRequest } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }));
vi.mock("@/features/ingestion/api", () => ({ listDatasets: async () => [] }));
afterEach(() => { cleanup(); vi.resetAllMocks(); sessionStorage.clear(); });
const column = { column_id: "revenue", engine_name: "revenue", display_name: "Revenue", logical_type: "decimal", nullable: false, metadata: {} };
const choice = { workflow_id: "workflow", publication_id: "publication", name: "Prepared sales", workflow_name: "Sales preparation", available: true };
const detail = { ...choice, expected_token: "a".repeat(64), columns: [column], uses_parameters: true };
const preview = { columns: [column], rows: [{ revenue: "0.80" }], total_rows: 1, steps: ["dataset_source", "group_by", "group_by"] };
function show() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><I18nProvider initialLocale="en"><ReportBuilder projectId="project" /></I18nProvider></QueryClientProvider>);
  fireEvent.change(screen.getByRole("combobox", { name: "Report data source" }), { target: { value: "publication" } });
}
async function select() {
  await screen.findByRole("option", { name: "Prepared sales · Sales preparation" });
  fireEvent.change(screen.getByRole("combobox", { name: "Prepared calculation result" }), { target: { value: "workflow/publication" } });
  await screen.findByText("This report uses the current default parameters of the shared calculation.");
  fireEvent.change(screen.getByLabelText("Report name"), { target: { value: "New total" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Add measure" }));
}

it("selects prepared input without raw-source fields and sends only graph settings", async () => {
  vi.mocked(apiRequest).mockImplementation(async url => url.endsWith("/inputs") ? { items: [choice, { ...choice, publication_id: "restricted", name: "Restricted", available: false, reason: "This result has view-context filters. Configure its reuse in the graph." }] } : url.endsWith("/publication") ? detail : preview);
  show();
  await select();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByRole("cell", { name: "0.80" });
  const sent = JSON.parse(vi.mocked(apiRequest).mock.calls.find(([url]) => url.endsWith("/preview"))![1]!.body as string);
  expect(sent.published_input).toEqual({ workflow_id: "workflow", publication_id: "publication", expected_token: "a".repeat(64) });
  expect(sent).not.toHaveProperty("source_id");
  expect(sent).not.toHaveProperty("rows");
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByRole("option", { name: /Restricted · Sales/ })).toBeDisabled();
  expect(screen.getByRole("link", { name: "Open source calculation" })).toHaveAttribute("href", "/projects/project/workflow?workflow=workflow&mode=fields");
  fireEvent.change(screen.getByRole("combobox", { name: "Report data source" }), { target: { value: "import" } });
  expect(screen.getByRole("button", { name: "Preview calculation" })).toBeDisabled();
  expect(screen.queryByRole("cell", { name: "0.80" })).not.toBeInTheDocument();
});

it("reloads the source token, preserves local measures and invalidates old preview", async () => {
  let reads = 0;
  let resolve!: (value: typeof detail) => void;
  vi.mocked(apiRequest).mockImplementation(async url => {
    if (url.endsWith("/inputs")) return { items: [choice] };
    if (url.endsWith("/publication")) return ++reads === 1 ? detail : new Promise<typeof detail>(done => { resolve = done; });
    return preview;
  });
  show();
  await select();
  fireEvent.change(screen.getByLabelText("Measure name"), { target: { value: "Keep my measure" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByRole("cell", { name: "0.80" });
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  fireEvent.click(screen.getByRole("button", { name: "Reload input fields" }));
  await waitFor(() => expect(reads).toBe(2));
  expect(screen.getByRole("button", { name: "Preview calculation" })).toBeDisabled();
  expect(screen.getByLabelText("Report name")).toBeDisabled();
  await act(async () => resolve({ ...detail, expected_token: "b".repeat(64) }));
  await waitFor(() => expect(screen.queryByRole("cell", { name: "0.80" })).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByLabelText("Measure name")).toHaveValue("Keep my measure");
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await waitFor(() => expect(vi.mocked(apiRequest).mock.calls.filter(([url]) => url.endsWith("/preview"))).toHaveLength(2));
  const calls = vi.mocked(apiRequest).mock.calls.filter(([url]) => url.endsWith("/preview"));
  expect(JSON.parse(calls[1][1]!.body as string).published_input.expected_token).toBe("b".repeat(64));
});

it("keys formula schemas by publication as well as project revision", () => {
  const base = { request_id: "request", name: "Report", presentation: "table" as const, decimal_average_scale: 6, measures: [{ operation: "count" as const, name: "Count" }], published_input: { workflow_id: "workflow", publication_id: "one", expected_token: "token" } };
  expect(reportInputKey(base)).not.toBe(reportInputKey({ ...base, published_input: { ...base.published_input, publication_id: "two" } }));
});
