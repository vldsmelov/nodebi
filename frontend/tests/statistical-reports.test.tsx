import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { StatisticalReportBuilder } from "@/features/report-builder/StatisticalReportBuilder";
import { StatisticalReportEditor } from "@/features/report-builder/StatisticalReportEditor";
import { readReportDraft, reportDraftKey } from "@/features/report-builder/report-draft";
import { I18nProvider } from "@/lib/i18n";
import { apiRequest } from "@/lib/api";
import { listDatasets } from "@/features/ingestion/api";

vi.mock("@/lib/api", async original => ({ ...await original<typeof import("@/lib/api")>(), apiRequest: vi.fn() }));
vi.mock("@/features/ingestion/api", () => ({ listDatasets: vi.fn() }));
vi.mock("@/features/dashboard/VisualizationView", () => ({ VisualizationResultView: ({ result, setOffset }: { result: { title: string }; setOffset: (n: number) => void }) => <div><p>{result.title}</p><button onClick={() => setOffset(100)}>Next outliers</button></div> }));
afterEach(() => { cleanup(); vi.resetAllMocks(); sessionStorage.clear(); });
const columns = [
  { column_id: "group", engine_name: "group", display_name: "Department", logical_type: "string", nullable: false, metadata: {} },
  { column_id: "value", engine_name: "value", display_name: "Revenue", logical_type: "decimal", nullable: true, metadata: {} },
  { column_id: "order", engine_name: "order", display_name: "Order", logical_type: "integer", nullable: false, metadata: {} },
];
const dataset = { id: "snapshot", source_id: "source", resource_id: "table", columns, profile: { name: "Observations" } };
const preview = { result: { title: "Exact distribution" }, steps: ["dataset_source", "histogram"] };
const editId = "ce848e64-3ec5-47d2-9333-3271094eb518";
const edit = { workflow_id: "workflow", visualization_id: editId, name: "Saved histogram", expected_token: "a".repeat(64), editable: true, columns, steps: [], widget_count: 1, settings: { name: "Saved histogram", analysis: { type: "histogram", value_column_id: "value", bin_count: 20 }, filters: [] } };
function showEditor() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><I18nProvider initialLocale="en"><StatisticalReportEditor projectId="project" visualizationId={editId} /></I18nProvider></QueryClientProvider>);
}
function show() {
  vi.mocked(listDatasets).mockResolvedValue([dataset] as never);
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><I18nProvider initialLocale="en"><StatisticalReportBuilder projectId="project" /></I18nProvider></QueryClientProvider>);
}
async function configure() {
  await screen.findByRole("option", { name: "Observations" });
  fireEvent.change(screen.getByLabelText("Report name"), { target: { value: "Distribution" } });
  fireEvent.change(screen.getByLabelText("Prepared dataset"), { target: { value: "snapshot" } });
  fireEvent.change(screen.getByLabelText("Distribution value"), { target: { value: "value" } });
}

it("focuses added/remaining filters and preview failures while retaining the draft", async () => {
  vi.mocked(apiRequest).mockRejectedValue(new Error("Statistics unavailable"));
  show(); await configure();
  fireEvent.click(screen.getByText(/Filters before statistics/));
  fireEvent.click(screen.getByRole("button", { name: "Add filter" }));
  expect(screen.getByLabelText("Field", { exact: true })).toHaveFocus();
  fireEvent.change(screen.getByLabelText("Value", { exact: true }), { target: { value: "North" } });
  fireEvent.click(screen.getByRole("button", { name: "Add filter" }));
  expect(screen.getAllByLabelText("Field", { exact: true })[1]).toHaveFocus();
  fireEvent.click(screen.getAllByRole("button", { name: "Remove filter" })[1]);
  expect(screen.getByLabelText("Field", { exact: true })).toHaveFocus();
  expect(screen.getByLabelText("Value", { exact: true })).toHaveValue("North");
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  const error = await screen.findByRole("alert", { name: "Report check failed" });
  await waitFor(() => expect(error).toHaveFocus());
  expect(error).toHaveTextContent("Statistics unavailable");
  expect(screen.queryByText("Finish configuration")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Report name")).toHaveValue("Distribution");
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  vi.mocked(apiRequest).mockResolvedValue(preview);
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByText("Exact distribution");
  expect(screen.queryByRole("alert")).toBeNull();
  fireEvent.change(screen.getByLabelText("Interval count"), { target: { value: "21" } });
  expect(screen.getByText("Preview is out of date. Run the calculation again.")).toBeVisible();
  expect(screen.queryByText("Exact distribution")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Remove filter" }));
  expect(screen.getByRole("button", { name: "Add filter" })).toHaveFocus();
});

it.each(["pareto", "funnel_steps", "treemap_chart", "sunburst_chart", "waterfall_steps"])("restores and previews guided %s using graph settings", async kind => {
  vi.mocked(apiRequest).mockResolvedValue(preview);
  const view = show(); await configure();
  fireEvent.change(screen.getByLabelText("Analysis type"), { target: { value: kind } });
  expect(screen.getByRole("button", { name: "Preview calculation" })).toBeDisabled();
  if (kind === "pareto") {
    fireEvent.change(screen.getByLabelText("Pareto category"), { target: { value: "group" } });
  } else if (kind === "funnel_steps") {
    fireEvent.change(screen.getByLabelText("Funnel stage"), { target: { value: "group" } });
    fireEvent.change(screen.getByLabelText("Stage order"), { target: { value: "order" } });
  } else if (kind === "waterfall_steps") {
    fireEvent.change(screen.getByLabelText("Waterfall step label"), { target: { value: "group" } });
    expect(screen.getByRole("button", { name: "Preview calculation" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Waterfall step order"), { target: { value: "input" } });
    expect(screen.getByRole("button", { name: "Preview calculation" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Waterfall step order"), { target: { value: "field:order" } });
  } else {
    fireEvent.click(screen.getByRole("button", { name: "Add grouping level" }));
    fireEvent.change(screen.getByLabelText("Rollup dimension 1"), { target: { value: "group" } });
    fireEvent.click(screen.getByRole("button", { name: "Add rollup measure" }));
    fireEvent.change(screen.getByLabelText("Rollup measure name 1"), { target: { value: "Total" } });
    expect(screen.queryByRole("option", { name: "Average" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Include grand total")).toBeDisabled();
    expect(screen.getByLabelText("Include intermediate totals")).toBeChecked();
    expect(screen.getByRole("button", { name: "Add rollup measure" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Rollup operation 1"), { target: { value: "sum" } });
    fireEvent.change(screen.getByLabelText("Rollup value 1"), { target: { value: "value" } });
  }
  expect(screen.getByRole("button", { name: "Preview calculation" })).toBeEnabled();
  view.unmount(); show();
  fireEvent.click(screen.getByRole("button", { name: "Restore local draft" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview calculation" })).toBeEnabled());
  expect(screen.getByLabelText("Analysis type")).toHaveValue(kind);
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByText("Exact distribution");
  const body = JSON.parse(vi.mocked(apiRequest).mock.calls[0][1]!.body as string);
  expect(body.analysis.type).toBe(kind);
  expect(body.expected_snapshot_id).toBe("snapshot");
  if (kind === "waterfall_steps") expect(body.analysis).toMatchObject({ category_column_id: "group", order_column_id: "order", value_column_id: "value", append_total: false });
  expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled();
});

it("sends node settings and exact bounds, invalidates changed previews, and restores an unsent draft", async () => {
  vi.mocked(apiRequest).mockResolvedValue(preview);
  const view = show(); await configure();
  fireEvent.click(screen.getByLabelText("Set histogram range"));
  fireEvent.change(screen.getByLabelText("Histogram lower bound"), { target: { value: "9007199254740993.11" } });
  fireEvent.change(screen.getByLabelText("Histogram upper bound"), { target: { value: "9007199254740993.12" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByText("Exact distribution");
  expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled();
  const sent = JSON.parse(vi.mocked(apiRequest).mock.calls[0][1]!.body as string);
  expect(sent.analysis).toEqual({ type: "histogram", value_column_id: "value", bin_count: 20, range_min: "9007199254740993.11", range_max: "9007199254740993.12" });
  expect(sent).toMatchObject({ source_id: "source", expected_snapshot_id: "snapshot" });
  fireEvent.change(screen.getByLabelText("Interval count"), { target: { value: "2" } });
  expect(screen.queryByText("Exact distribution")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  view.unmount(); show();
  fireEvent.click(screen.getByRole("button", { name: "Restore local draft" }));
  await screen.findByDisplayValue("9007199254740993.11");
  expect(screen.getByLabelText("Interval count")).toHaveValue(2);
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
});

it("keeps filters upstream, switches analysis without leftover histogram config and pages the same request", async () => {
  vi.mocked(apiRequest).mockResolvedValue(preview);
  show(); await configure();
  fireEvent.change(screen.getByLabelText("Analysis type"), { target: { value: "boxplot_stats" } });
  fireEvent.change(screen.getByLabelText("Distribution grouping"), { target: { value: "group" } });
  fireEvent.click(screen.getByRole("button", { name: "Add filter" }));
  fireEvent.change(screen.getByLabelText("Value"), { target: { value: "North" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByText("Exact distribution");
  const sent = JSON.parse(vi.mocked(apiRequest).mock.calls[0][1]!.body as string);
  expect(sent.analysis).toEqual({ type: "boxplot_stats", value_column_id: "value", group_column_id: "group" });
  expect(sent.filters).toEqual([{ column_id: "group", operator: "equals", value: "North" }]);
  fireEvent.click(screen.getByRole("button", { name: "Next outliers" }));
  await waitFor(() => expect(vi.mocked(apiRequest)).toHaveBeenCalledTimes(2));
  expect(vi.mocked(apiRequest).mock.calls[1][0]).toContain("offset=100");
  expect(vi.mocked(apiRequest).mock.calls[1][1]!.body).toBe(vi.mocked(apiRequest).mock.calls[0][1]!.body);
});

it("recovers the byte-identical pending request before input metadata is available", async () => {
  const sends: string[] = [];
  vi.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (url.includes("/preview")) return preview;
    sends.push(options!.body as string);
    expect(readReportDraft(reportDraftKey("project", "statistics"), "statistics")?.pending).toBe(options!.body);
    if (sends.length === 1) throw new TypeError("connection lost");
    return { workflow_id: "workflow", visualization_id: "visual", dashboard_id: "dashboard" };
  });
  const view = show(); await configure();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByText("Exact distribution");
  fireEvent.click(screen.getByRole("button", { name: "Save report" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Retry report save" })).toBeEnabled());
  view.unmount(); show();
  vi.mocked(listDatasets).mockRejectedValue(new Error("metadata unavailable"));
  fireEvent.click(screen.getByRole("button", { name: "Restore local draft" }));
  fireEvent.click(screen.getByRole("button", { name: "Retry report save" }));
  await screen.findByRole("heading", { name: "Report is ready" });
  expect(sends).toHaveLength(2); expect(sends[0]).toBe(sends[1]);
  expect(sessionStorage.getItem(reportDraftKey("project", "statistics"))).toBeNull();
});

it("rejects corrupted statistical draft config", () => {
  const scope = reportDraftKey("project", "statistics");
  sessionStorage.setItem(scope, JSON.stringify({ version: 1, scope, state: { kind: "statistics", requestId: crypto.randomUUID(), name: "bad", input: { kind: "import", selected: "snapshot" }, analysis: { type: "histogram", bin_count: "execute", value_column_id: "value" }, filters: [] } }));
  expect(() => readReportDraft(scope, "statistics")).toThrow("Invalid report draft");
});

it("restores the original prepared-input revision until explicit refresh without losing settings", async () => {
  let token = "a".repeat(64);
  vi.mocked(apiRequest).mockImplementation(async url => url.endsWith("/inputs") ? { items: [{ workflow_id: "workflow", publication_id: "publication", workflow_name: "Calculation", name: "Monthly observations", available: true }] } : url.includes("/preview") ? preview : { workflow_id: "workflow", publication_id: "publication", expected_token: token, columns });
  const view = show();
  fireEvent.change(screen.getByLabelText("Report data source"), { target: { value: "publication" } });
  await screen.findByRole("option", { name: "Monthly observations · Calculation" });
  fireEvent.change(screen.getByLabelText("Prepared calculation result"), { target: { value: "workflow/publication" } });
  await screen.findByRole("option", { name: "Revenue" });
  fireEvent.change(screen.getByLabelText("Report name"), { target: { value: "Prepared distribution" } });
  fireEvent.change(screen.getByLabelText("Distribution value"), { target: { value: "value" } });
  view.unmount(); token = "b".repeat(64); show();
  fireEvent.click(screen.getByRole("button", { name: "Restore local draft" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview calculation" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByText("Exact distribution");
  const first = JSON.parse(vi.mocked(apiRequest).mock.calls.find(([url]) => url.includes("/preview"))![1]!.body as string);
  expect(first.published_input.expected_token).toBe("a".repeat(64));
  fireEvent.click(screen.getByRole("button", { name: "Reload input fields" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview calculation" })).toBeEnabled());
  expect(screen.queryByText("Exact distribution")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Report name")).toHaveValue("Prepared distribution");
  expect(screen.getByLabelText("Distribution value")).toHaveValue("value");
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByText("Exact distribution");
  const last = JSON.parse(vi.mocked(apiRequest).mock.calls.filter(([url]) => url.includes("/preview")).at(-1)![1]!.body as string);
  expect(last.published_input.expected_token).toBe("b".repeat(64));
});

it("requires explicit heatmap aggregation and restores even an incomplete cell mapping", async () => {
  vi.mocked(apiRequest).mockResolvedValue(preview);
  const view = show(); await configure();
  fireEvent.change(screen.getByLabelText("Analysis type"), { target: { value: "heatmap_stats" } });
  expect(screen.getByLabelText("Cell aggregation")).toHaveValue("");
  expect(screen.getByRole("button", { name: "Preview calculation" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Heatmap X dimension"), { target: { value: "group" } });
  view.unmount(); show();
  fireEvent.click(screen.getByRole("button", { name: "Restore local draft" }));
  await waitFor(() => expect(screen.getByLabelText("Heatmap X dimension")).toHaveValue("group"));
  expect(screen.getByLabelText("Heatmap value")).toHaveValue("value");
  expect(screen.getByRole("button", { name: "Preview calculation" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
});

it("preserves stable rollup measures and incomplete settings across remount before requesting a server preview", async () => {
  vi.mocked(apiRequest).mockResolvedValue(preview);
  const view = show(); await configure();
  fireEvent.change(screen.getByLabelText("Analysis type"), { target: { value: "table_rollup" } });
  fireEvent.click(screen.getByRole("button", { name: "Add grouping level" }));
  fireEvent.change(screen.getByLabelText("Rollup dimension 1"), { target: { value: "group" } });
  fireEvent.click(screen.getByRole("button", { name: "Add rollup measure" }));
  fireEvent.change(screen.getByLabelText("Rollup measure name 1"), { target: { value: "Mean" } });
  expect(screen.getByRole("button", { name: "Preview calculation" })).toBeDisabled();
  const draft = readReportDraft(reportDraftKey("project", "statistics"), "statistics");
  if (draft?.state.kind !== "statistics" || draft.state.analysis.type !== "table_rollup") throw new Error("Rollup draft missing");
  const id = draft.state.analysis.measures[0].output_id;
  view.unmount(); show();
  fireEvent.click(screen.getByRole("button", { name: "Restore local draft" }));
  await screen.findByDisplayValue("Mean");
  expect(screen.getByLabelText("Rollup operation 1")).toHaveValue("");
  fireEvent.change(screen.getByLabelText("Rollup operation 1"), { target: { value: "average" } });
  fireEvent.change(screen.getByLabelText("Rollup value 1"), { target: { value: "value" } });
  fireEvent.change(screen.getByLabelText("Rollup decimal places 1"), { target: { value: "4" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByText("Exact distribution");
  const sent = JSON.parse(vi.mocked(apiRequest).mock.calls[0][1]!.body as string);
  expect(sent.analysis).toMatchObject({ type: "table_rollup", dimensions: ["group"], subtotals: true, grand_total: true, measures: [{ output_id: id, name: "Mean", operation: "average", column_id: "value", scale: 4 }] });
  expect(sent.analysis).not.toHaveProperty("bin_count");
  expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled();
  fireEvent.click(screen.getByLabelText("Include grand total"));
  expect(screen.queryByText("Exact distribution")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
});

it("rejects malformed rollup identities and preserves the previous distribution draft contract", () => {
  const scope = reportDraftKey("project", "statistics");
  const state = { kind: "statistics", requestId: crypto.randomUUID(), name: "Distribution", input: { kind: "import", selected: "snapshot" }, analysis: { type: "histogram", value_column_id: "value", bin_count: 20 }, filters: [] };
  sessionStorage.setItem(scope, JSON.stringify({ version: 1, scope, state }));
  expect(readReportDraft(scope, "statistics")?.state).toEqual(state);
  sessionStorage.setItem(scope, JSON.stringify({ version: 1, scope, state: { ...state, analysis: { type: "table_rollup", dimensions: [], measures: [{ output_id: "broken", name: "", operation: "" }] } } }));
  expect(() => readReportDraft(scope, "statistics")).toThrow("Invalid report draft");
});

it("restores an analytical edit with its original revision and explicitly reloads saved settings", async () => {
  let token = edit.expected_token;
  vi.mocked(apiRequest).mockImplementation(async url => url.includes("/preview") ? preview : { ...edit, expected_token: token });
  const view = showEditor();
  await screen.findByDisplayValue("Saved histogram");
  expect(screen.getByLabelText("Analysis type")).toBeDisabled();
  expect(listDatasets).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Interval count"), { target: { value: "5" } });
  view.unmount(); token = "b".repeat(64); showEditor();
  fireEvent.click(screen.getByRole("button", { name: "Restore local draft" }));
  await screen.findByDisplayValue("Saved histogram");
  expect(screen.getByLabelText("Interval count")).toHaveValue(5);
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByText("Exact distribution");
  let sent = JSON.parse(vi.mocked(apiRequest).mock.calls.filter(([url]) => url.includes("/preview")).at(-1)![1]!.body as string);
  expect(sent.expected_token).toBe(edit.expected_token);
  expect(sent.settings.analysis.bin_count).toBe(5);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Reload saved report" }));
  await waitFor(() => expect(screen.getByLabelText("Interval count")).toHaveValue(20));
  expect(screen.queryByText("Exact distribution")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByText("Exact distribution");
  sent = JSON.parse(vi.mocked(apiRequest).mock.calls.filter(([url]) => url.includes("/preview")).at(-1)![1]!.body as string);
  expect(sent.expected_token).toBe(token);
});

it.each(["treemap_chart", "sunburst_chart"])("retains explicit hierarchy rebinding and stable measure identity in a %s edit draft", async type => {
  const outputId = crypto.randomUUID();
  const hierarchyEdit = { ...edit, settings: { name: "Hierarchy", filters: [], analysis: { type, dimensions: ["group", "order"], measures: [{ output_id: outputId, name: "Total", operation: "sum", column_id: "value" }], subtotals: true, grand_total: true } } };
  vi.mocked(apiRequest).mockImplementation(async url => url.includes("/preview") ? preview : hierarchyEdit);
  const view = showEditor();
  await screen.findByDisplayValue("Hierarchy");
  expect(screen.getByLabelText("Analysis type")).toHaveValue(type);
  expect(screen.getByLabelText("Analysis type")).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Move rollup dimension 2 up" }));
  fireEvent.click(screen.getByLabelText("Update hierarchy fields after changing grouping or measures"));
  view.unmount(); showEditor();
  fireEvent.click(screen.getByRole("button", { name: "Restore local draft" }));
  await screen.findByDisplayValue("Hierarchy");
  expect(screen.getByLabelText("Update hierarchy fields after changing grouping or measures")).toBeChecked();
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByText("Exact distribution");
  const body = JSON.parse(vi.mocked(apiRequest).mock.calls.find(([url]) => url.includes("/preview"))![1]!.body as string);
  expect(body.rebind_fields).toBe(true);
  expect(body.expected_token).toBe(edit.expected_token);
  expect(body.settings.analysis).toMatchObject({ type, dimensions: ["order", "group"], measures: [{ output_id: outputId }] });
  expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled();
});

it("retries an analytical edit before metadata loads after a lost response", async () => {
  const sends: string[] = [];
  let offline = false;
  vi.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (url.includes("/preview")) return preview;
    if (!url.endsWith("/apply")) { if (offline) throw new Error("metadata offline"); return edit; }
    expect(url).toContain(`/statistical-reports/${editId}/apply`);
    sends.push(options!.body as string);
    if (sends.length === 1) throw new TypeError("lost response");
    return { visualization_id: editId, workflow_id: "workflow", dashboard_id: "dashboard" };
  });
  const view = showEditor();
  await screen.findByDisplayValue("Saved histogram");
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByText("Exact distribution");
  fireEvent.click(screen.getByRole("button", { name: "Save report" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Retry report save" })).toBeEnabled());
  view.unmount(); offline = true; showEditor();
  fireEvent.click(screen.getByRole("button", { name: "Restore local draft" }));
  fireEvent.click(screen.getByRole("button", { name: "Retry report save" }));
  await screen.findByRole("heading", { name: "Report is ready" });
  expect(sends).toHaveLength(2); expect(sends[1]).toBe(sends[0]);
  expect(sessionStorage.getItem(reportDraftKey("project", "statistics-edit", editId))).toBeNull();
});

it("blocks analytical editing on metadata failure or protected graph and rejects a mismatched draft target", async () => {
  vi.mocked(apiRequest).mockRejectedValueOnce(new Error("Unavailable schema")).mockResolvedValue({ ...edit, editable: false, reason: "This calculation is shared by other results. Edit it in the graph." });
  showEditor();
  await screen.findByText("Unavailable schema");
  expect(screen.queryByRole("button", { name: "Save report" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("This calculation is shared by other results. Edit it in the graph.");
  expect(screen.getByRole("link", { name: "Open calculation" })).toBeVisible();
  const scope = reportDraftKey("project", "statistics-edit", editId);
  sessionStorage.setItem(scope, JSON.stringify({ version: 1, scope, state: { kind: "statistics", requestId: crypto.randomUUID(), name: "Wrong target", input: { kind: "import", selected: "" }, analysis: edit.settings.analysis, filters: [], edit: { visualizationId: crypto.randomUUID(), expectedToken: edit.expected_token, rebindFields: false, acknowledgeShared: false } } }));
  expect(() => readReportDraft(scope, "statistics-edit")).toThrow("Invalid report draft");
});
