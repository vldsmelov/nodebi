import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { translate } from "@/lib/locale";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/lib/i18n";
import { DatasetUpdates } from "@/features/report-cycle/DatasetUpdates";
import type { Check, UpdateItem } from "@/features/report-cycle/api";
import { listDatasets, listImports } from "@/features/ingestion/api";
import { apiRequest } from "@/lib/api";

vi.mock("@/features/ingestion/api", async importOriginal => ({ ...await importOriginal<typeof import("@/features/ingestion/api")>(), listImports: vi.fn(async () => []), listDatasets: vi.fn(async () => []) }));
vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }));
afterEach(() => { cleanup(); vi.mocked(listImports).mockResolvedValue([]); vi.mocked(listDatasets).mockResolvedValue([]); vi.clearAllMocks(); vi.mocked(apiRequest).mockReset(); });
const item: UpdateItem = { source_id: "source", version_id: "version", mode: "replace", period: "", baseline_period: "" };
const options = { encoding: "utf-8-sig", delimiter: ",", header_row: 1, header_rows: 1, skip_data_rows: 0, drop_tail_rows: 0 } as const;
const check: Check = { token: "token", dataset_profiles: [{ source_id: "source", version_id: "version", resource_id: "table", target_resource_id: "table", name: "Sales", options,
  old_rows: 1, new_rows: 2, old_columns: [{ column_id: "stable_amount", engine_name: "stable_amount", display_name: "Revenue", logical_type: "decimal", nullable: true, metadata: {} }],
  new_columns: [{ column_id: "col_2", engine_name: "col_2", display_name: "New amount", logical_type: "string", nullable: true, metadata: {} }], suggestions: [],
  new_examples: [{ col_2: "9007199254740993.11" }],
}] };
function show(selected = item, locale: "en" | "ru" | "tt" = "en") {
  const onChange = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><I18nProvider initialLocale={locale}>
    <DatasetUpdates projectId="project" items={[selected]} check={check} onChange={onChange} />
  </I18nProvider></QueryClientProvider>);
  return onChange;
}
describe("prepared dataset refresh mapping", () => {
  it.each(["en", "ru", "tt"] as const)("blocks unknown versions and retries a read without editing the selected update (%s)", async locale => {
    vi.mocked(listImports).mockResolvedValue([{ id: "source", name: "Book", connector: "excel", resources: [], active_snapshots: { table: "snapshot" }, revision: 1, has_draft: false }]);
    let fail!: (reason: Error) => void;
    vi.mocked(apiRequest).mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }))
      .mockResolvedValueOnce([{ id: "version", filename: "next.xlsx", created_at: "2026-10-12", resources: [{ id: "table", name: "Sheet" }] }]);
    const change = show(item, locale);
    const selector = await screen.findByRole("combobox", { name: translate(locale, "File version") });
    expect(selector).toBeDisabled();
    await waitFor(() => expect(fail).toBeTypeOf("function"));
    await act(async () => fail(new Error("Version list unavailable")));
    await screen.findByRole("alert");
    expect(selector).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: translate(locale, "Retry") }));
    await waitFor(() => expect(selector).toBeEnabled());
    expect(selector).toHaveValue("version");
    expect(change).not.toHaveBeenCalled();
    expect(vi.mocked(apiRequest).mock.calls).toEqual([["/api/v1/sources/source/versions"], ["/api/v1/sources/source/versions"]]);
  });
  it("hides a stale check after reading options change, so mapping cannot undo the new range", () => {
    show({ ...item, dataset_bindings: [{ resource_id: "table", target_resource_id: "table", options: { ...options, cell_range: "C3:D8" }, columns: [] }] });
    expect(screen.queryByRole("combobox", { name: "Incoming field for Revenue" })).not.toBeInTheDocument();
  });
  it("edits dataset-scoped range and row settings without replacing sibling bindings", async () => {
    vi.mocked(listImports).mockResolvedValue([{ id: "source", name: "Book", connector: "excel", resources: [], active_snapshots: { table: "snapshot" }, revision: 1, has_draft: false }]);
    vi.mocked(listDatasets).mockResolvedValue([{ id: "snapshot", source_id: "source", resource_id: "table", source_version_id: "old", row_count: 2, created_at: "2026-10-12", columns: [], profile: { version: 1, resource_id: "table", name: "Sales", grain: "", fields: [], options: { ...options, cell_range: "B2:C5" } } }]);
    vi.mocked(apiRequest).mockResolvedValue([{ id: "version", filename: "next.xlsx", created_at: "2026-10-12", resources: [{ id: "table", name: "Sheet" }] }]);
    const sibling = { resource_id: "other", target_resource_id: "other", columns: [{ logical_id: "keep", physical_id: "col_7" }] };
    const changed = vi.fn();
    function Harness() {
      const [value, setValue] = useState<UpdateItem>({ ...item, dataset_bindings: [sibling, { resource_id: "table", target_resource_id: "table", columns: [{ logical_id: "stable_amount", physical_id: "col_3" }] }] });
      return <DatasetUpdates projectId="project" items={[value]} check={check} onChange={(_source, next) => { changed(next); setValue(next!); }} />;
    }
    render(<QueryClientProvider client={new QueryClient()}><I18nProvider initialLocale="en"><Harness /></I18nProvider></QueryClientProvider>);
    const group = await screen.findByRole("group", { name: "Sales" });
    await waitFor(() => expect(within(group).getByLabelText("Excel cell range (optional)")).toBeEnabled());
    expect(within(group).getByLabelText("Header row")).toBeDisabled();
    fireEvent.change(within(group).getByLabelText("Excel cell range (optional)"), { target: { value: "C3:D9" } });
    fireEvent.click(within(group).getByText("Additional reading settings"));
    fireEvent.change(within(group).getByLabelText("Number of header rows"), { target: { value: "2" } });
    fireEvent.change(within(group).getByLabelText("Skip rows after headers"), { target: { value: "1" } });
    fireEvent.change(within(group).getByLabelText("Exclude rows at the end"), { target: { value: "3" } });
    expect(changed.mock.lastCall?.[0].dataset_bindings).toEqual([sibling, { resource_id: "table", target_resource_id: "table", columns: [], options: { ...options, cell_range: "C3:D9", header_rows: 2, skip_data_rows: 1, drop_tail_rows: 3 } }]);
    fireEvent.change(within(group).getByLabelText("Excel cell range (optional)"), { target: { value: "" } });
    expect(within(group).getByLabelText("Header row")).toBeEnabled();
    expect(changed.mock.lastCall?.[0].dataset_bindings[1].options.cell_range).toBeNull();
  });
  it("preserves logical field identity and displays exact incoming values", () => {
    const change = show();
    expect(screen.getByRole("cell", { name: "9007199254740993.11" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Incoming field for Revenue"), { target: { value: "col_2" } });
    expect(change).toHaveBeenCalledWith("source", { ...item, dataset_bindings: [{ resource_id: "table", target_resource_id: "table", options, columns: [{ logical_id: "stable_amount", physical_id: "col_2" }] }] });
  });
  it("never offers mappings from a check of another file version", () => {
    show({ ...item, version_id: "different" });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
  it.each(["ru", "tt"] as const)("localizes mapping guidance in %s", locale => {
    show(item, locale);
    expect(screen.queryByText(/Refresh preserves/)).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAccessibleName(locale === "ru" ? "Новое поле для «Revenue»" : "«Revenue» өчен яңа кыр");
  });
});
