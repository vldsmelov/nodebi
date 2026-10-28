import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { MeasureCatalog } from "@/features/measures/MeasureCatalog";
import { MeasureReportBuilder } from "@/features/measures/MeasureReportBuilder";
import { I18nProvider } from "@/lib/i18n";
import { apiRequest } from "@/lib/api";
import { readReportDraft, reportDraftKey } from "@/features/report-builder/report-draft";

vi.mock("@/lib/api", async original => ({ ...await original<typeof import("@/lib/api")>(), apiRequest: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); sessionStorage.clear(); });
const definition = { id: "measure", name: "Attainment", column_id: "ratio", grain_column_ids: ["month"], description: "Ratio of totals" };
const entry = { workflow_id: "workflow", publication_id: "publication", publication_name: "Sales", workflow_name: "Calculation", definition };
const catalog = { expected_token: "a".repeat(64), items: [entry] };
const columns = [
  { column_id: "month", engine_name: "month", display_name: "Month", logical_type: "string", nullable: false, metadata: {} },
  { column_id: "ratio", engine_name: "ratio", display_name: "Ratio", logical_type: "decimal", nullable: false, metadata: {} },
];
const source = { ...entry, columns, expected_token: "a".repeat(64), uses_parameters: false };
function show(component: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><I18nProvider initialLocale="en">{component}</I18nProvider></QueryClientProvider>);
}

it("registers a numeric field and explicit grain without creating calculation nodes", async () => {
  vi.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (options?.method === "PUT") return entry;
    if (url.endsWith("/measures")) return { ...catalog, items: [] };
    if (url.endsWith("/inputs")) return { items: [{ ...entry, name: "Sales", available: true }] };
    return source;
  });
  show(<MeasureCatalog projectId="project" />);
  fireEvent.click(await screen.findByRole("button", { name: "Define reusable measure" }));
  await screen.findByRole("option", { name: "Sales · Calculation" });
  fireEvent.change(screen.getByLabelText("Prepared calculation result"), { target: { value: "workflow/publication" } });
  await screen.findByRole("option", { name: "Ratio" });
  fireEvent.change(screen.getByLabelText("Measure name"), { target: { value: "Attainment" } });
  fireEvent.change(screen.getByLabelText("Calculated value field"), { target: { value: "ratio" } });
  fireEvent.click(screen.getByLabelText("Month"));
  fireEvent.click(screen.getByRole("button", { name: "Check and save measure" }));
  await screen.findByRole("status");
  const sent = JSON.parse(vi.mocked(apiRequest).mock.calls.find(([, options]) => options?.method === "PUT")![1]!.body as string);
  expect(sent.definition).toMatchObject({ column_id: "ratio", grain_column_ids: ["month"], name: "Attainment" });
  expect(sent.expected_token).toBe(source.expected_token);
  expect(sent).not.toHaveProperty("nodes");
});

it("previews exact prepared values and invalidates the preview after a local change", async () => {
  vi.mocked(apiRequest).mockImplementation(async url => url.endsWith("/measures") ? catalog : url.endsWith("/preview") ? { columns, rows: [{ month: "October", ratio: "2.5000" }] } : source);
  show(<MeasureReportBuilder projectId="project" workflowId="workflow" publicationId="publication" measureId="measure" />);
  await screen.findByRole("heading", { name: "Attainment" });
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByRole("cell", { name: "2.5000" });
  expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled();
  const sent = JSON.parse(vi.mocked(apiRequest).mock.calls.find(([url]) => url.endsWith("/preview"))![1]!.body as string);
  expect(sent).toMatchObject({ measure_id: "measure", publication_id: "publication", workflow_id: "workflow", expected_token: source.expected_token });
  expect(sent).not.toHaveProperty("measures");
  fireEvent.change(screen.getByLabelText("Report name"), { target: { value: "Another report" } });
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  expect(screen.queryByRole("cell", { name: "2.5000" })).not.toBeInTheDocument();
});

it("refreshes a conflicting source token while preserving the report name", async () => {
  let reads = 0;
  vi.mocked(apiRequest).mockImplementation(async url => url.endsWith("/measures") ? catalog : url.endsWith("/preview") ? { columns, rows: [] } : { ...source, expected_token: (++reads === 1 ? "a" : "b").repeat(64) });
  show(<MeasureReportBuilder projectId="project" workflowId="workflow" publicationId="publication" measureId="measure" />);
  await screen.findByRole("heading", { name: "Attainment" });
  fireEvent.change(screen.getByLabelText("Report name"), { target: { value: "Keep me" } });
  fireEvent.click(screen.getByRole("button", { name: "Reload input fields" }));
  await waitFor(() => expect(reads).toBe(2));
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview calculation" })).toBeEnabled());
  expect(screen.getByLabelText("Report name")).toHaveValue("Keep me");
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await waitFor(() => expect(vi.mocked(apiRequest).mock.calls.some(([url]) => url.endsWith("/preview"))).toBe(true));
  const sent = JSON.parse(vi.mocked(apiRequest).mock.calls.find(([url]) => url.endsWith("/preview"))![1]!.body as string);
  expect(sent.expected_token).toBe("b".repeat(64));
});

it("combines compatible measures in a table and invalidates the preview when selection changes", async () => {
  const extra = { ...entry, definition: { ...definition, id: "actual", name: "Actual", column_id: "actual" } };
  const foreign = { ...extra, publication_id: "other", definition: { ...extra.definition, id: "foreign", name: "Foreign" } };
  const wrongGrain = { ...extra, definition: { ...extra.definition, id: "total", name: "Total", grain_column_ids: [] } };
  vi.mocked(apiRequest).mockImplementation(async url => url.endsWith("/measures") ? { ...catalog, items: [entry, extra, foreign, wrongGrain] } : url.endsWith("/preview") ? { columns, rows: [] } : source);
  show(<MeasureReportBuilder projectId="project" workflowId="workflow" publicationId="publication" measureId="measure" />);
  fireEvent.click(await screen.findByRole("checkbox", { name: "Actual" }));
  expect(screen.queryByRole("checkbox", { name: "Foreign" })).not.toBeInTheDocument();
  expect(screen.queryByRole("checkbox", { name: "Total" })).not.toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Line Chart" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled());
  const sent = JSON.parse(vi.mocked(apiRequest).mock.calls.find(([url]) => url.endsWith("/preview"))![1]!.body as string);
  expect(sent).toMatchObject({ measure_id: "measure", additional_measure_ids: ["actual"], presentation: "table" });
  fireEvent.click(screen.getByRole("checkbox", { name: "Actual" }));
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
});

it("does not silently discard an unavailable selected measure after reload", async () => {
  let removed = false;
  const extra = { ...entry, definition: { ...definition, id: "actual", name: "Actual", column_id: "actual" } };
  vi.mocked(apiRequest).mockImplementation(async url => url.endsWith("/measures") ? { ...catalog, items: removed ? [entry] : [entry, extra] } : source);
  show(<MeasureReportBuilder projectId="project" workflowId="workflow" publicationId="publication" measureId="measure" />);
  fireEvent.click(await screen.findByRole("checkbox", { name: "Actual" }));
  removed = true;
  fireEvent.click(screen.getByRole("button", { name: "Reload input fields" }));
  const unavailable = await screen.findByRole("checkbox", { name: "Selected measure is unavailable. Deselect it or reload the catalog." });
  expect(unavailable).toBeChecked();
  expect(screen.getByRole("button", { name: "Preview calculation" })).toBeDisabled();
  fireEvent.click(unavailable);
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview calculation" })).toBeEnabled());
});

it("restores a measure draft with the original token and requires a fresh preview", async () => {
  let token = source.expected_token;
  const extra = { ...entry, definition: { ...definition, id: "actual", name: "Actual", column_id: "actual" } };
  vi.mocked(apiRequest).mockImplementation(async url => url.endsWith("/measures") ? { ...catalog, items: [entry, extra] } : url.endsWith("/preview") ? { columns, rows: [] } : { ...source, expected_token: token });
  const component = <MeasureReportBuilder projectId="project" workflowId="workflow" publicationId="publication" measureId="measure" />;
  const first = show(component);
  fireEvent.click(await screen.findByRole("checkbox", { name: "Actual" }));
  fireEvent.change(screen.getByLabelText("Report name"), { target: { value: "My report" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled());
  first.unmount(); token = "b".repeat(64); show(component);
  fireEvent.click(screen.getByText("Restore local draft"));
  expect(await screen.findByRole("checkbox", { name: "Actual" })).toBeChecked();
  expect(screen.getByLabelText("Report name")).toHaveValue("My report");
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview calculation" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled());
  const calls = () => vi.mocked(apiRequest).mock.calls.filter(([url]) => url.endsWith("/preview"));
  expect(JSON.parse(String(calls()[1][1]?.body)).expected_token).toBe(source.expected_token);
  fireEvent.click(screen.getByRole("button", { name: "Reload input fields" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview calculation" })).toBeEnabled());
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await waitFor(() => expect(calls()).toHaveLength(3));
  expect(JSON.parse(String(calls()[2][1]?.body)).expected_token).toBe(token);
});

it("recovers a committed measure report without requiring current catalog metadata", async () => {
  let offline = false; const requests: string[] = [];
  const scope = reportDraftKey("project", "measure", "workflow/publication/measure");
  vi.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (url.endsWith("/apply")) {
      requests.push(String(options?.body));
      expect(readReportDraft(scope, "measure")?.pending).toBe(options?.body);
      if (requests.length === 1) throw new TypeError("Lost response");
      return { workflow_id: "workflow", visualization_id: "visual", dashboard_id: "board" };
    }
    if (offline) throw new Error("Catalog unavailable");
    return url.endsWith("/measures") ? catalog : url.endsWith("/preview") ? { columns, rows: [] } : source;
  });
  const component = <MeasureReportBuilder projectId="project" workflowId="workflow" publicationId="publication" measureId="measure" />;
  const first = show(component); await screen.findByRole("heading", { name: "Attainment" });
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Save report" }));
  await screen.findByText("Lost response"); first.unmount(); offline = true; show(component);
  fireEvent.click(screen.getByText("Restore local draft"));
  expect(screen.queryByText("Catalog unavailable")).toBeNull();
  fireEvent.click(screen.getByText("Retry report save"));
  await screen.findByRole("heading", { name: "Report is ready" });
  expect(requests).toHaveLength(2); expect(requests[1]).toBe(requests[0]);
  expect(sessionStorage.getItem(scope)).toBeNull();
});

it("blocks cached previews after a failed catalog refresh and does not forget selected measures", async () => {
  let failed = false;
  const extra = { ...entry, definition: { ...definition, id: "actual", name: "Actual", column_id: "actual" } };
  vi.mocked(apiRequest).mockImplementation(async url => {
    if (url.endsWith("/measures")) { if (failed) throw new Error("Catalog unavailable"); return { ...catalog, items: [entry, extra] }; }
    return url.endsWith("/preview") ? { columns, rows: [{ month: "October", ratio: "2.5000" }] } : source;
  });
  show(<MeasureReportBuilder projectId="project" workflowId="workflow" publicationId="publication" measureId="measure" />);
  fireEvent.click(await screen.findByRole("checkbox", { name: "Actual" }));
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByRole("cell", { name: "2.5000" }); failed = true;
  fireEvent.click(screen.getByRole("button", { name: "Reload input fields" }));
  await screen.findByText("Catalog unavailable");
  expect(screen.getByRole("checkbox", { name: "Actual" })).toBeChecked();
  expect(screen.getByRole("button", { name: "Preview calculation" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  expect(screen.queryByRole("cell", { name: "2.5000" })).toBeNull();
});

it("separates measure identities in local recovery and validates restored request targets", () => {
  const target = "workflow/publication/measure", scope = reportDraftKey("project", "measure", target);
  const state = { kind: "measure", requestId: crypto.randomUUID(), workflowId: "workflow", publicationId: "publication", measureId: "measure", name: "Report", presentation: "table", additional: [] };
  const good = { version: 1, scope, state };
  sessionStorage.setItem(scope, JSON.stringify(good)); expect(readReportDraft(scope, "measure")).toEqual(good);
  const other = reportDraftKey("project", "measure", "workflow/publication/other");
  expect(readReportDraft(other, "measure")).toBeNull();
  for (const bad of [{ ...good, state: { ...state, measureId: "other" } }, { ...good, state: { ...state, additional: [null] } }, { ...good, pending: JSON.stringify({ request_id: state.requestId, workflow_id: "workflow", publication_id: "publication", measure_id: "other" }) }]) {
    sessionStorage.setItem(scope, JSON.stringify(bad)); expect(() => readReportDraft(scope, "measure")).toThrow();
  }
});
