import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/lib/i18n";
import { ImportWizard } from "@/features/ingestion/ImportWizard";
import { applyImportDraft, inspectImport, previewImport, readOptions, saveImportDraft, uploadImport, type ImportSession } from "@/features/ingestion/api";

vi.mock("@/features/ingestion/api", async importOriginal => ({ ...await importOriginal<typeof import("@/features/ingestion/api")>(), inspectImport: vi.fn(), saveImportDraft: vi.fn(), previewImport: vi.fn(), applyImportDraft: vi.fn(), uploadImport: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const initial: ImportSession = {
  source: { id: "source", name: "Sales", connector: "csv", resources: [{ id: "table", name: "Sales", kind: "table" }], active_snapshots: {}, revision: 1, has_draft: true, read_options: readOptions },
  draft: { revision: 2, source_revision: 1, resource_id: "table", options: readOptions, status: "draft", request_id: "stable-request",
    profile: { version: 1, grain: "", resource_id: "table", name: "Exact revenue", options: readOptions, fields: [{ field_id: "amount", source_field: "col_1", name: "Amount", logical_type: "decimal", precision: 38, scale: 2, currency: "RUB", nullable: true, error_policy: "reject", decimal_separator: ".", date_format: "iso" }] },
  },
};
function show(session = initial, locale: "en" | "ru" | "tt" = "en") {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><I18nProvider initialLocale={locale}><ImportWizard projectId="project" initialSession={session} /></I18nProvider></QueryClientProvider>);
}
describe("resumable initial import", () => {
  it.each(["conversion", "key"])("reviews %s errors at the right control without changing the profile", async kind => {
    const session = structuredClone(initial);
    session.draft.profile!.key_fields = ["amount"];
    vi.mocked(saveImportDraft).mockResolvedValue(session.draft);
    vi.mocked(previewImport).mockResolvedValue({ profile: session.draft.profile!, columns: [], rows: [], total_rows: 200, returned_rows: 0, checked_rows: 200, issue_count: kind === "key" ? 1 : 105,
      issues: kind === "key" ? [{ code: "INVALID_KEY", message: "Key fields must be non-null and unique.", severity: "error" }] : [1, 2].map(row => ({ code: "CONVERSION_ERROR", field_id: "amount", row, message: "Invalid value.", severity: "error" as const })), can_apply: false });
    show(session);
    fireEvent.click(screen.getByRole("button", { name: "Check all rows" }));
    const label = kind === "key" ? "Review row key" : "Review field: Amount";
    const action = await screen.findByRole("button", { name: label });
    expect(screen.getAllByRole("button", { name: label })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Apply import" })).toBeDisabled();
    if (kind === "conversion") expect(screen.getByRole("alert")).toHaveTextContent("Showing 2 of 105 issues.");
    expect(screen.getByRole("table", { name: "Data preview" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Data preview" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("columnheader", { name: "Amount" })).toHaveAttribute("scope", "col");
    fireEvent.click(action);
    const control = screen.getByLabelText(kind === "key" ? "Part of row key" : "Data type");
    expect(control).toHaveFocus();
    if (kind === "key") expect(control.closest("details")).toHaveAttribute("open");
    expect(saveImportDraft).toHaveBeenCalledTimes(1);
    expect(applyImportDraft).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Data type")).toHaveValue("decimal");
    fireEvent.click(screen.getByRole("button", { name: "Check all rows" }));
    await screen.findByRole("button", { name: label });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Fields" })).toHaveFocus();
  });
  it("persists composite keys by field identity across renaming and explicit removal", async () => {
    const session = structuredClone(initial);
    session.draft.profile!.fields.push({ ...session.draft.profile!.fields[0], field_id: "code", source_field: "col_2", name: "Code", logical_type: "string" });
    session.draft.profile!.key_fields = ["amount"];
    vi.mocked(saveImportDraft).mockResolvedValue(session.draft);
    show(session);
    const amount = within(screen.getByRole("group", { name: "Field: Amount" }));
    const code = within(screen.getByRole("group", { name: "Field: Code" }));
    fireEvent.click(amount.getByText("Field details"));
    fireEvent.click(code.getByText("Field details"));
    expect(amount.getByLabelText("Part of row key")).toBeChecked();
    fireEvent.click(code.getByLabelText("Part of row key"));
    fireEvent.change(code.getByLabelText("Field name"), { target: { value: "Identifier" } });
    fireEvent.click(screen.getByRole("button", { name: "Save import draft" }));
    await waitFor(() => expect(saveImportDraft).toHaveBeenCalled());
    expect(vi.mocked(saveImportDraft).mock.calls[0][2].profile?.key_fields).toEqual(["amount", "code"]);
    fireEvent.click(amount.getByLabelText("Part of row key"));
    fireEvent.click(screen.getByRole("button", { name: "Save import draft" }));
    await waitFor(() => expect(saveImportDraft).toHaveBeenCalledTimes(2));
    expect(vi.mocked(saveImportDraft).mock.calls[1][2].profile?.key_fields).toEqual(["code"]);
  });
  it.each(["ru", "tt"] as const)("localizes the row-key control in %s", locale => {
    show(initial, locale);
    expect(screen.getByLabelText(locale === "ru" ? "Входит в ключ строки" : "Юл ачкычына керә")).not.toBeChecked();
  });
  it.each(["excel", "csv"])("sends and persists %s row-reading settings through inspection", async connector => {
    const session = structuredClone(initial);
    session.source.connector = connector;
    session.draft.profile = null;
    const options = { ...readOptions, ...(connector === "excel" ? { cell_range: "B2:F100" } : {}), header_rows: connector === "excel" ? 2 : 1, skip_data_rows: 3, drop_tail_rows: 4 };
    const profile = { ...initial.draft.profile!, options };
    vi.mocked(inspectImport).mockResolvedValue({ profile, columns: [], rows: [], total_rows: 0, returned_rows: 0, checked_rows: 0, issue_count: 0, issues: [], can_apply: true });
    vi.mocked(saveImportDraft).mockResolvedValue({ ...session.draft, options, profile });
    show(session);
    if (connector === "excel") {
      fireEvent.change(screen.getByLabelText("Excel cell range (optional)"), { target: { value: "B2:F100" } });
      expect(screen.getByLabelText("Header row")).toBeDisabled();
    } else expect(screen.queryByLabelText("Excel cell range (optional)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Additional reading settings"));
    if (connector === "excel") fireEvent.change(screen.getByLabelText("Number of header rows"), { target: { value: "2" } });
    else expect(screen.queryByLabelText("Number of header rows")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Skip rows after headers"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Exclude rows at the end"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Inspect fields" }));
    await screen.findByLabelText("Dataset name");
    expect(inspectImport).toHaveBeenCalledWith("source", "table", options);
    expect(saveImportDraft).toHaveBeenCalledWith("project", "source", expect.objectContaining({ options, profile }));
  });
  it("restores advanced reading settings from a saved draft", () => {
    const session = structuredClone(initial);
    session.source.connector = "excel";
    session.draft.profile = null;
    session.draft.options = { ...readOptions, cell_range: "B2:F100", header_rows: 2, skip_data_rows: 3, drop_tail_rows: 4 };
    show(session);
    fireEvent.click(screen.getByText("Additional reading settings"));
    expect(screen.getByLabelText("Number of header rows")).toHaveValue(2);
    expect(screen.getByLabelText("Skip rows after headers")).toHaveValue(3);
    expect(screen.getByLabelText("Exclude rows at the end")).toHaveValue(4);
    expect(screen.getByLabelText("Excel cell range (optional)")).toHaveValue("B2:F100");
    fireEvent.change(screen.getByLabelText("Excel cell range (optional)"), { target: { value: "" } });
    expect(screen.getByLabelText("Header row")).toBeEnabled();
  });
  it.each([["en", "Field: 1"], ["ru", "Поле: 1"], ["tt", "Кыр: 1"]] as const)("names blank field groups without exposing technical IDs in %s", (locale, name) => {
    const session = structuredClone(initial);
    session.draft.profile!.fields[0].name = "";
    show(session, locale);
    expect(screen.getByRole("group", { name })).toBeInTheDocument();
  });
  it("gives each repeated field editor its own named group and retains it when renamed", () => {
    const session = structuredClone(initial);
    session.draft.profile!.fields.push({ ...session.draft.profile!.fields[0], field_id: "cost", source_field: "col_2", name: "Cost" });
    show(session);
    const amount = screen.getByRole("group", { name: "Field: Amount" });
    const cost = screen.getByRole("group", { name: "Field: Cost" });
    expect(within(amount).getByLabelText("Data type")).toHaveValue("decimal");
    expect(within(cost).getByLabelText("Currency code")).toHaveValue("RUB");
    fireEvent.change(within(amount).getByLabelText("Field name"), { target: { value: "Revenue" } });
    expect(screen.getByRole("group", { name: "Field: Revenue" })).toBe(amount);
    expect(within(cost).getByLabelText("Field name")).toHaveValue("Cost");
  });
  it("lets the saved-import route own continuation without briefly mounting the next step twice", async () => {
    const uploaded = vi.fn();
    vi.mocked(uploadImport).mockResolvedValue(initial.source);
    render(<QueryClientProvider client={new QueryClient()}><I18nProvider initialLocale="en"><ImportWizard projectId="project" onUploaded={uploaded} /></I18nProvider></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(screen.getByLabelText("File"), { target: { files: [new File(["sample"], "sales.xlsx")] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload and continue" }));
    await waitFor(() => expect(uploaded).toHaveBeenCalledWith(initial.source));
    expect(screen.queryByRole("heading", { name: "Tables" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Inspect fields" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload and continue" })).toBeDisabled();
  });
  it("restores saved types and precision without a stale preview or another upload", () => {
    show();
    expect(screen.getByLabelText("Dataset name")).toHaveValue("Exact revenue");
    expect(screen.getByLabelText("Data type")).toHaveValue("decimal");
    expect(screen.getByLabelText("Currency code")).toHaveValue("RUB");
    expect(screen.queryByRole("button", { name: "Apply import" })).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(uploadImport).not.toHaveBeenCalled();
  });
  it("focuses failure feedback, keeps edits, and clears a failed save when checking succeeds", async () => {
    vi.mocked(saveImportDraft).mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValue({ ...initial.draft, profile: { ...initial.draft.profile!, name: "Retained name" } });
    vi.mocked(previewImport).mockResolvedValue({ profile: initial.draft.profile!, columns: [], rows: [], total_rows: 0, returned_rows: 0, checked_rows: 0, issue_count: 0, issues: [], can_apply: true });
    show();
    fireEvent.change(screen.getByLabelText("Dataset name"), { target: { value: "Retained name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save import draft" }));
    expect(await screen.findByRole("alert")).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Import action failed" })).toBeVisible();
    expect(screen.getByLabelText("Dataset name")).toHaveValue("Retained name");
    fireEvent.click(screen.getByRole("button", { name: "Check all rows" }));
    await screen.findByRole("button", { name: "Apply import" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Check and apply" })).toHaveFocus();
    expect(vi.mocked(saveImportDraft).mock.calls[1][2].profile?.name).toBe("Retained name");
  });
  it("saves field edits with revision checking and retains them on conflict", async () => {
    vi.mocked(saveImportDraft).mockRejectedValue(new Error("The import draft changed in another tab. Reload the saved draft before replacing it."));
    show();
    fireEvent.change(screen.getByLabelText("Dataset name"), { target: { value: "My local draft" } });
    expect(screen.getByRole("status")).toHaveTextContent("Unsaved import settings");
    fireEvent.click(screen.getByRole("button", { name: "Save import draft" }));
    await waitFor(() => expect(saveImportDraft).toHaveBeenCalled());
    expect(vi.mocked(saveImportDraft).mock.calls[0][2]).toMatchObject({ expected_revision: 2, source_revision: 1, profile: { name: "My local draft" } });
    await screen.findByText("The import draft changed in another tab. Reload the saved draft before replacing it.");
    expect(screen.getByLabelText("Dataset name")).toHaveValue("My local draft");
  });
  it("checks saved settings again before applying the stable request identity", async () => {
    vi.mocked(saveImportDraft).mockResolvedValue(initial.draft);
    vi.mocked(previewImport).mockResolvedValue({ profile: initial.draft.profile!, columns: [], rows: [{ amount: "0.10" }], total_rows: 1, returned_rows: 1, checked_rows: 1, issue_count: 0, issues: [], can_apply: true });
    vi.mocked(applyImportDraft).mockRejectedValue(new Error("network unavailable"));
    show();
    fireEvent.click(screen.getByRole("button", { name: "Check all rows" }));
    fireEvent.click(await screen.findByRole("button", { name: "Apply import" }));
    await waitFor(() => expect(applyImportDraft).toHaveBeenCalledWith(initial.source, initial.draft));
    expect(previewImport).toHaveBeenCalledWith("source", initial.draft.profile);
    expect(await screen.findByRole("alert")).toHaveFocus();
    vi.mocked(applyImportDraft).mockResolvedValue({ id: "snapshot", profile: initial.draft.profile!, row_count: 1 } as Awaited<ReturnType<typeof applyImportDraft>>);
    fireEvent.click(screen.getByRole("button", { name: "Apply import" }));
    await screen.findByRole("heading", { name: "Dataset is ready" });
    expect(applyImportDraft).toHaveBeenCalledTimes(2);
    expect(vi.mocked(applyImportDraft).mock.calls[1]).toEqual(vi.mocked(applyImportDraft).mock.calls[0]);
    expect(uploadImport).not.toHaveBeenCalled();
  });
  it("recognizes a completed apply after reloading a lost response", () => {
    show({ ...initial, draft: { ...initial.draft, revision: 3, status: "applied", snapshot_id: "snapshot" } });
    expect(screen.getByRole("heading", { name: "Dataset is ready" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Apply import" })).not.toBeInTheDocument();
  });
});
