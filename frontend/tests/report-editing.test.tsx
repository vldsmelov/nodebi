import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { ReportBuilder } from "@/features/report-builder/ReportBuilder";
import { ReportBuilderWorkspace } from "@/features/report-builder/ReportBuilderWorkspace";
import { I18nProvider } from "@/lib/i18n";
import { apiRequest, ApiError } from "@/lib/api";
import type { components } from "@/lib/api-schema";

vi.mock("@/lib/api", async original => ({ ...await original<typeof import("@/lib/api")>(), apiRequest: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("visualization=visual") }));
vi.mock("@/features/ingestion/api", () => ({ listDatasets: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); sessionStorage.clear(); });
const edit: components["schemas"]["ReportEditRead"] = {
  analytical_editor: false,
  alignment_editor: false,
  workflow_id: "workflow", visualization_id: "visual", name: "Revenue", expected_token: "a".repeat(64), editable: true, widget_count: 1,
  settings: { name: "Revenue", dimensions: [], measures: [{ column_id: "money", operation: "max", name: "Revenue" }], filters: [], presentation: "table", decimal_average_scale: 4, rebind_fields: false },
  columns: [{ column_id: "money", engine_name: "money", display_name: "Amount", logical_type: "decimal", nullable: false, metadata: {} }],
  steps: [{ node_id: "sort", type: "sort", editable: false }, { node_id: "group", type: "group_by", editable: true }],
};
const preview = { rows: [{ Revenue: "0.1500" }], columns: [{ column_id: "total", engine_name: "Revenue", display_name: "Revenue", logical_type: "decimal" }], steps: ["sort", "group_by"], total_rows: 1 };
function show(value = edit) {
  const reload = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><I18nProvider initialLocale="en"><ReportBuilder projectId="project" edit={value} onReload={reload} /></I18nProvider></QueryClientProvider>);
  return reload;
}

it("retains a comparison chart when changing calendar settings and hides unrelated primary selection", async () => {
  vi.mocked(apiRequest).mockResolvedValue(preview);
  show({ ...edit, settings: { ...edit.settings!, dimensions: ["date"], presentation: "line_chart", comparison: { date_column_id: "date", value_column_id: "total", unit: "month", compare_to: "previous_period", name: "Change", ratio_scale: 6 } }, columns: [...(edit.columns ?? []), { column_id: "date", engine_name: "date", display_name: "Date", logical_type: "date", nullable: false, metadata: {} }] });
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.change(screen.getByLabelText("Calendar grouping"), { target: { value: "quarter" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByLabelText("Presentation")).toHaveValue("line_chart");
  expect(screen.queryByLabelText("Primary output measure")).not.toBeInTheDocument();
  expect(screen.getByText(/Comparison charts show the compared measure/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalled());
  const body = JSON.parse(vi.mocked(apiRequest).mock.calls[0][1]!.body as string);
  expect(body.settings).toMatchObject({ presentation: "line_chart", comparison: { unit: "quarter" }, rebind_fields: false });
});

it("restores current graph settings, preserves scale and marks advanced steps", async () => {
  vi.mocked(apiRequest).mockResolvedValue(preview);
  show();
  expect(screen.queryByLabelText("Prepared dataset")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "How it is calculated" }));
  expect(screen.getByText(/Sort · Preserved step/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByLabelText("Aggregation")).toHaveValue("max");
  expect(screen.getByLabelText("Decimal places for averages")).toHaveValue(4);
  fireEvent.change(screen.getByLabelText("Aggregation"), { target: { value: "average" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByRole("cell", { name: "0.1500" });
  const [url, options] = vi.mocked(apiRequest).mock.calls[0];
  expect(url).toBe("/api/v1/projects/project/report-builder/visual/preview");
  const request = JSON.parse(options!.body as string);
  expect(request.settings).toMatchObject({ decimal_average_scale: 4, rebind_fields: false, measures: [{ operation: "average" }] });
  expect(request.expected_token).toBe(edit.expected_token);
  expect(request).not.toHaveProperty("source_id");
  expect(screen.getByText(/Sort · Preserved step/)).toBeVisible();
});

it("requires explicit field rebinding for a new presentation and invalidates an old preview", async () => {
  vi.mocked(apiRequest).mockResolvedValue(preview);
  show();
  for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByLabelText("Presentation")).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled());
  fireEvent.click(screen.getByLabelText("Update visualization field bindings"));
  expect(screen.getByLabelText("Presentation")).toBeEnabled();
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
});

it("retries an uncertain apply with the same identity and retains settings after a confirmed conflict", async () => {
  let sent = 0;
  vi.mocked(apiRequest).mockImplementation(async url => {
    if (url.endsWith("/preview")) return preview;
    if (++sent === 2) throw new ApiError("The project changed. Reload the report before saving your changes.", 409, "REPORT_CONFLICT");
    throw new Error("The project changed. Reload the report before saving your changes.");
  });
  const reload = show();
  fireEvent.change(screen.getByLabelText("Visualization name"), { target: { value: "My local changes" } });
  for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Save report" }));
  await screen.findByText("The project changed. Reload the report before saving your changes.");
  fireEvent.click(screen.getByRole("button", { name: "Retry report save" }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(3));
  expect(vi.mocked(apiRequest).mock.calls[1][1]!.body).toEqual(vi.mocked(apiRequest).mock.calls[2][1]!.body);
  await waitFor(() => expect(screen.getByRole("button", { name: "Back" })).toBeEnabled());
  for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByLabelText("Visualization name")).toHaveValue("My local changes");
  fireEvent.click(screen.getByRole("button", { name: "Reload saved report" }));
  expect(reload).toHaveBeenCalledOnce();
});

it("requires acknowledgement when a visualization is used by multiple widgets", () => {
  show({ ...edit, widget_count: 2 });
  expect(screen.getByRole("button", { name: "Preview calculation" })).toBeDisabled();
  fireEvent.click(screen.getByLabelText("Update all 2 widgets using this visualization"));
  expect(screen.getByRole("button", { name: "Preview calculation" })).toBeEnabled();
});

it("shows an unsupported graph as preserved, with no replacement action", async () => {
  vi.mocked(apiRequest).mockResolvedValue({ ...edit, editable: false, reason: "This calculation is shared by other results. Edit it in the graph." });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><I18nProvider initialLocale="en"><ReportBuilderWorkspace projectId="project" /></I18nProvider></QueryClientProvider>);
  await screen.findByText("The existing calculation has not been changed.");
  expect(screen.getByRole("link", { name: "Open calculation" })).toHaveAttribute("href", "/projects/project/workflow?workflow=workflow&mode=fields");
  expect(screen.queryByRole("button", { name: "Save report" })).not.toBeInTheDocument();
});

it("blocks edits during explicit reload and discards local settings even with an unchanged token", async () => {
  let finish!: (value: typeof edit) => void;
  vi.mocked(apiRequest).mockResolvedValueOnce(edit).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><I18nProvider initialLocale="en"><ReportBuilderWorkspace projectId="project" /></I18nProvider></QueryClientProvider>);
  await screen.findByLabelText("Visualization name");
  fireEvent.change(screen.getByLabelText("Visualization name"), { target: { value: "Discard me" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.change(screen.getByLabelText("Aggregation"), { target: { value: "average" } });
  fireEvent.click(screen.getByRole("button", { name: "Reload saved report" }));
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  expect(screen.getByLabelText("Aggregation")).toBeDisabled();
  expect(screen.getByLabelText("Aggregation")).toHaveValue("average");
  await act(async () => { finish(edit); });
  expect(await screen.findByLabelText("Visualization name")).toHaveValue("Revenue");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByLabelText("Aggregation")).toHaveValue("max");
});
