import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { ReportBuilder } from "@/features/report-builder/ReportBuilder";
import { I18nProvider } from "@/lib/i18n";
import { apiRequest } from "@/lib/api";
import { GroupByConfiguration } from "@/features/workflow/ArithmeticConfiguration";
import { translate } from "@/lib/locale";

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }));
vi.mock("@/features/ingestion/api", () => ({ listDatasets: async () => [{ id: "snapshot", source_id: "source", resource_id: "table", profile: { name: "Sales" }, columns: [{ column_id: "money", engine_name: "money", display_name: "Amount", logical_type: "decimal" }] }] }));
afterEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });

for (const locale of ["en", "ru", "tt"] as const) it(`distinguishes a successful empty preview from incomplete settings (${locale})`, async () => {
  vi.mocked(apiRequest).mockResolvedValue({ rows: [], columns: [{ column_id: "total", engine_name: "total", display_name: "Total", logical_type: "decimal" }], steps: ["group_by"], total_rows: 0 });
  render(<QueryClientProvider client={new QueryClient()}><I18nProvider initialLocale={locale}><ReportBuilder projectId="empty-project" /></I18nProvider></QueryClientProvider>);
  const label = (key: string) => translate(locale, key);
  await screen.findByRole("option", { name: "Sales" });
  fireEvent.change(screen.getByRole("combobox", { name: label("Prepared dataset") }), { target: { value: "snapshot" } });
  fireEvent.change(screen.getByLabelText(label("Report name")), { target: { value: "Empty report" } });
  fireEvent.click(screen.getByRole("button", { name: label("Next") }));
  fireEvent.click(screen.getByRole("button", { name: label("Add measure") }));
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: label("Next") }));
  expect(screen.getByRole("button", { name: label("Save report") })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: label("Preview calculation") }));
  const message = await screen.findByText(label("Calculation completed with no rows. Check source data and filters."));
  expect(message.closest('[role="status"]')).toHaveTextContent(label("The result is empty."));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Total" })).toBeVisible();
  expect(screen.getByRole("button", { name: label("Save report") })).toBeEnabled();
  fireEvent.change(screen.getByRole("combobox", { name: label("Presentation") }), { target: { value: "kpi" } });
  expect(screen.queryByText(label("Calculation completed with no rows. Check source data and filters."))).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: label("Save report") })).toBeDisabled();
});

it("focuses added rows and surviving neighbours without changing measure or filter values", async () => {
  render(<QueryClientProvider client={new QueryClient()}><I18nProvider initialLocale="en"><ReportBuilder projectId="project" /></I18nProvider></QueryClientProvider>);
  await screen.findByRole("option", { name: "Sales" });
  fireEvent.change(screen.getByRole("combobox", { name: "Prepared dataset" }), { target: { value: "snapshot" } });
  fireEvent.change(screen.getByLabelText("Report name"), { target: { value: "Revenue" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  for (const name of ["First", "Middle", "Last"]) {
    fireEvent.click(screen.getByRole("button", { name: "Add measure" }));
    const added = screen.getAllByLabelText("Measure name").at(-1)!;
    expect(added).toHaveFocus();
    fireEvent.change(added, { target: { value: name } });
    expect(added).toHaveFocus();
  }
  fireEvent.click(screen.getAllByRole("button", { name: "Remove measure" })[1]);
  expect(screen.getAllByLabelText("Measure name")[1]).toHaveFocus();
  expect(screen.getAllByLabelText("Measure name").map(el => (el as HTMLInputElement).value)).toEqual(["First", "Last"]);
  fireEvent.click(screen.getAllByRole("button", { name: "Remove measure" })[1]);
  expect(screen.getByLabelText("Measure name")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Remove measure" }));
  expect(screen.getByRole("button", { name: "Add measure" })).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Add measure" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  for (const value of ["10", "20", "30"]) {
    fireEvent.click(screen.getByRole("button", { name: "Add filter" }));
    expect(screen.getAllByRole("combobox", { name: "Field" }).at(-1)).toHaveFocus();
    fireEvent.change(screen.getAllByLabelText("Value").at(-1)!, { target: { value } });
  }
  fireEvent.click(screen.getAllByRole("button", { name: "Remove filter" })[1]);
  expect(screen.getAllByRole("combobox", { name: "Field" })[1]).toHaveFocus();
  expect(screen.getAllByLabelText("Value").map(el => (el as HTMLInputElement).value)).toEqual(["10", "30"]);
  fireEvent.click(screen.getAllByRole("button", { name: "Remove filter" })[1]);
  expect(screen.getByRole("combobox", { name: "Field" })).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Remove filter" }));
  expect(screen.getByRole("button", { name: "Add filter" })).toHaveFocus();
});

it("requires a matching preview and sends a graph-building request, not browser totals", async () => {
  vi.mocked(apiRequest).mockResolvedValue({ rows: [{ total: "0.30" }], columns: [{ column_id: "total", engine_name: "total", display_name: "Total", logical_type: "decimal" }], steps: ["dataset_source", "group_by"], total_rows: 1 });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><I18nProvider initialLocale="en"><ReportBuilder projectId="project" /></I18nProvider></QueryClientProvider>);
  await screen.findByRole("option", { name: "Sales" });
  fireEvent.change(screen.getByRole("combobox", { name: "Prepared dataset" }), { target: { value: "snapshot" } });
  fireEvent.change(screen.getByLabelText("Report name"), { target: { value: "Revenue" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Add measure" }));
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByRole("cell", { name: "0.30" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled());
  const request = JSON.parse(vi.mocked(apiRequest).mock.calls[0][1]!.body as string);
  expect(request.expected_snapshot_id).toBe("snapshot");
  expect(request.measures).toEqual([{ output_id: expect.stringMatching(/^[0-9a-f-]{36}$/), name: "Total", operation: "sum", column_id: "money" }]);
  expect(request).not.toHaveProperty("rows");
  fireEvent.change(screen.getByRole("combobox", { name: "Presentation" }), { target: { value: "kpi" } });
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
});

it("announces the latest failed check, retains settings and retries only a read-only preview", async () => {
  vi.mocked(apiRequest).mockRejectedValueOnce(new Error("field check disconnected"))
    .mockRejectedValueOnce(new Error("preview disconnected"))
    .mockResolvedValue({ rows: [{ total: "0.30" }], columns: [{ column_id: "total", engine_name: "total", display_name: "Total", logical_type: "decimal" }], steps: ["group_by"], total_rows: 1 });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><I18nProvider initialLocale="en"><ReportBuilder projectId="project" /></I18nProvider></QueryClientProvider>);
  await screen.findByRole("option", { name: "Sales" });
  fireEvent.change(screen.getByRole("combobox", { name: "Prepared dataset" }), { target: { value: "snapshot" } });
  fireEvent.change(screen.getByLabelText("Report name"), { target: { value: "Revenue" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Add measure" }));
  fireEvent.change(screen.getByLabelText("Measure name"), { target: { value: "Retained measure" } });
  fireEvent.click(screen.getByRole("button", { name: "Check formula fields" }));
  expect(await screen.findByRole("alert")).toHaveFocus();
  expect(screen.getByRole("alert")).toHaveTextContent("field check disconnected");
  // Ordinary editing does not repeatedly focus the error.
  screen.getByLabelText("Measure name").focus();
  fireEvent.change(screen.getByLabelText("Measure name"), { target: { value: "Final measure" } });
  expect(screen.getByLabelText("Measure name")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("preview disconnected"));
  expect(screen.getByRole("alert")).toHaveFocus();
  expect(screen.queryByText("field check disconnected")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  await screen.findByRole("cell", { name: "0.30" });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Measure name")).toHaveValue("Final measure");
  const attempts = vi.mocked(apiRequest).mock.calls;
  expect(attempts).toHaveLength(3);
  expect(attempts.map(([url]) => url.split("/").at(-1))).toEqual(["fields", "preview", "preview"]);
  expect(attempts[2][1]?.body).toEqual(attempts[1][1]?.body);
});

it("offers only server-checked unchanged after-total prefixes and invalidates changed dependencies", async () => {
  vi.mocked(apiRequest).mockImplementation(async (_url, options) => {
    const body = JSON.parse(options!.body as string);
    const base = { column_id: `measure_${body.measures[0].output_id.replaceAll("-", "")}`, engine_name: "Total", display_name: "Total", logical_type: "decimal", nullable: true, metadata: { scale: 2 } };
    const summary_outputs: Record<string, typeof base[]> = {};
    let columns = [base];
    for (const formula of body.summary_formulas) {
      columns = [...columns, { ...base, column_id: `calc_${formula.node_id.replaceAll("-", "")}`, engine_name: formula.name, display_name: formula.name }];
      summary_outputs[formula.node_id] = columns;
    }
    return { row_columns: [], measure_columns: [base], summary_outputs };
  });
  render(<QueryClientProvider client={new QueryClient()}><I18nProvider initialLocale="en"><ReportBuilder projectId="project" /></I18nProvider></QueryClientProvider>);
  await screen.findByRole("option", { name: "Sales" });
  fireEvent.change(screen.getByRole("combobox", { name: "Prepared dataset" }), { target: { value: "snapshot" } });
  fireEvent.change(screen.getByLabelText("Report name"), { target: { value: "Chained totals" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Add measure" }));
  fireEvent.click(screen.getByRole("button", { name: "Add after-total formula" }));
  fireEvent.change(screen.getByLabelText("Formula name"), { target: { value: "Profit" } });
  fireEvent.change(screen.getByLabelText("Expression"), { target: { value: "100 - 20" } });
  const check = screen.getByRole("button", { name: "Check after-total fields" });
  fireEvent.click(check);
  await waitFor(() => expect(screen.getByRole("option", { name: "Total · decimal" })).toBeVisible());
  expect(vi.mocked(apiRequest).mock.calls[0][0]).toMatch(/fields\?include_summary=true$/);
  fireEvent.click(screen.getByRole("button", { name: "Add after-total formula" }));
  const second = screen.getByRole("region", { name: "Formula 2" });
  expect(within(second).getByLabelText("Formula name")).toHaveFocus();
  expect(within(second).getByRole("option", { name: "Profit · decimal" })).toBeInTheDocument();
  fireEvent.change(within(second).getByLabelText("Formula name"), { target: { value: "Margin" } });
  fireEvent.change(within(second).getByLabelText("Expression"), { target: { value: "80 / 100" } });
  // Editing the consumer does not invalidate the checked producer.
  expect(within(second).getByRole("option", { name: "Profit · decimal" })).toBeInTheDocument();
  fireEvent.change(screen.getAllByLabelText("Expression")[0], { target: { value: "100 - 30" } });
  expect(within(second).queryByRole("option", { name: "Profit · decimal" })).not.toBeInTheDocument();
  fireEvent.click(check);
  await waitFor(() => expect(within(second).getByRole("option", { name: "Profit · decimal" })).toBeInTheDocument());
  fireEvent.change(screen.getByRole("combobox", { name: "Aggregation" }), { target: { value: "average" } });
  expect(within(second).queryByRole("option", { name: "Profit · decimal" })).not.toBeInTheDocument();
  fireEvent.click(check);
  await waitFor(() => expect(within(second).getByRole("option", { name: "Profit · decimal" })).toBeInTheDocument());
  fireEvent.click(screen.getAllByRole("button", { name: "Remove formula" })[0]);
  expect(screen.getByLabelText("Formula name")).toHaveFocus();
  expect(screen.getByLabelText("Formula name")).toHaveValue("Margin");
  expect(screen.queryByRole("option", { name: "Profit · decimal" })).not.toBeInTheDocument();
  expect(vi.mocked(apiRequest).mock.calls.every(([url]) => !url.endsWith("/apply"))).toBe(true);
});

it("enables decimal aggregation only on v2 and preserves the configured scale", () => {
  const onChange = vi.fn();
  const props = { config: { decimal_average_scale: 4, aggregations: [{ name: "Total", operation: "sum", column_id: "amount" }] }, columns: [{ column_id: "amount", engine_name: "amount", display_name: "Amount", logical_type: "decimal", nullable: false, metadata: {} }], onChange };
  const view = render(<I18nProvider initialLocale="en"><GroupByConfiguration {...props} version={1} /></I18nProvider>);
  expect(screen.getByRole("option", { name: "average" })).toBeDisabled();
  view.rerender(<I18nProvider initialLocale="en"><GroupByConfiguration {...props} version={2} /></I18nProvider>);
  expect(screen.getByRole("option", { name: "average" })).toBeEnabled();
  fireEvent.change(screen.getByLabelText("Aggregation 1"), { target: { value: "average" } });
  expect(onChange.mock.calls[0][0].decimal_average_scale).toBe(4);
});

it("checks server formula scopes and keeps row fields while aggregation settings change", async () => {
  const base = { column_id: "money", engine_name: "money", display_name: "Amount", logical_type: "decimal", nullable: false, metadata: {} };
  vi.mocked(apiRequest).mockImplementation(async (_url, options) => {
    const body = JSON.parse(options!.body as string);
    const row = body.row_formulas[0];
    const calculated = { ...base, column_id: `calc_${row.node_id.replaceAll("-", "")}`, engine_name: row.name, display_name: row.name };
    return { row_columns: [base, calculated], row_outputs: { [row.node_id]: [base, calculated] }, measure_columns: [{ ...base, column_id: `measure_${body.measures[0].output_id.replaceAll("-", "")}`, engine_name: "Total", display_name: "Total" }] };
  });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><I18nProvider initialLocale="en"><ReportBuilder projectId="project" /></I18nProvider></QueryClientProvider>);
  await screen.findByRole("option", { name: "Sales" });
  fireEvent.change(screen.getByRole("combobox", { name: "Prepared dataset" }), { target: { value: "snapshot" } });
  fireEvent.change(screen.getByLabelText("Report name"), { target: { value: "Computed report" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Add row formula" }));
  fireEvent.change(screen.getByLabelText("Formula name"), { target: { value: "Net" } });
  fireEvent.change(screen.getByLabelText("Expression"), { target: { value: "[money] * 0.8" } });
  fireEvent.click(screen.getByRole("button", { name: "Check formula fields" }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.getByRole("button", { name: "Add measure" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Add measure" }));
  // Adding a measure invalidates aggregate schema, but must not hide checked row outputs.
  expect(screen.getByRole("option", { name: "Net" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Field"), { target: { value: `calc_${JSON.parse(vi.mocked(apiRequest).mock.calls[0][1]!.body as string).row_formulas[0].node_id.replaceAll("-", "")}` } });
  fireEvent.click(screen.getByRole("button", { name: "Check formula fields" }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByRole("button", { name: "Add after-total formula" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Add after-total formula" }));
  const scope = screen.getByRole("group", { name: "Formulas after totals" });
  expect(within(scope).getByRole("option", { name: "Total · decimal" })).toBeInTheDocument();
  expect(within(scope).queryByRole("option", { name: "Amount · decimal" })).not.toBeInTheDocument();
  const sent = JSON.parse(vi.mocked(apiRequest).mock.calls[1][1]!.body as string);
  expect(sent.row_formulas[0]).toMatchObject({ name: "Net", expression: "[money] * 0.8", scale: 2 });
  expect(sent.summary_formulas).toEqual([]);
  fireEvent.click(screen.getByRole("button", { name: "Add row formula" }));
  const rowScope = screen.getByRole("group", { name: "Formulas for each row" });
  const second = within(rowScope).getByRole("region", { name: "Formula 2" });
  expect(within(second).getByRole("option", { name: "Net · decimal" })).toBeInTheDocument();
  fireEvent.change(within(rowScope).getAllByLabelText("Expression")[0], { target: { value: "[money] * 0.9" } });
  expect(within(second).queryByRole("option", { name: "Net · decimal" })).not.toBeInTheDocument();
});
