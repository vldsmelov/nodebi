import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { BrowserFileEditor } from "@/features/report-cycle/BrowserFileEditor";
import { apiRequest, ApiError } from "@/lib/api";
import type { Update } from "@/features/report-cycle/api";

vi.mock("@/lib/api", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/api")>(), apiRequest: vi.fn() }));
const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
beforeEach(() => {
  vi.resetAllMocks();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => {
  cleanup();
  for (const [name, descriptor] of [["showModal", originalShow], ["close", originalClose]] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});
const row = { id: "update", project_id: "project", revision: 1, items: [], file_exchange: { connector: "excel" } } as unknown as Update;
const page = { revision: 1, resource_id: "Sales", resources: ["Sales", "Summary"], columns: [
  { index: 0, name: "A", description: "Worksheet column" }, { index: 1, name: "B", description: "Worksheet column" },
], rows: [{ id: "r:0", values: ["2", "4"], readonly: [1], formulas: { 1: "=A1*2" } }], total_rows: 1, offset: 0, limit: 20, pending: false, workbook: true, can_change_rows: false, external_cached_values: true };
function mount() { return render(<BrowserFileEditor row={row} close={vi.fn()} refresh={vi.fn()} prepared={vi.fn()} download={vi.fn()} />); }

it("opens the worksheet cells instead of a download fallback and shows protected formulas", async () => {
  vi.mocked(apiRequest).mockResolvedValue(page);
  mount();
  const input = await screen.findByRole("textbox", { name: "Row 1, field A" });
  const formula = screen.getByRole("textbox", { name: "Row 1, field B" });
  expect(input).not.toHaveAttribute("readonly");
  expect(formula).toHaveAttribute("readonly");
  expect(screen.queryByRole("button", { name: "Download current input file" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add data row" })).not.toBeInTheDocument();
  expect(screen.getByRole("note")).toHaveTextContent("External linked values");
  fireEvent.focus(formula);
  expect(screen.getByRole("textbox", { name: "Selected cell value or formula" })).toHaveValue("=A1*2");
  fireEvent.focus(input);
  fireEvent.change(screen.getByRole("textbox", { name: "Selected cell value or formula" }), { target: { value: "7" } });
  expect(input).toHaveValue("7");
  expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
});

it("rejects a pasted range touching formula cells without partially changing input", async () => {
  vi.mocked(apiRequest).mockResolvedValue(page); mount();
  const input = await screen.findByRole("textbox", { name: "Row 1, field A" });
  fireEvent.paste(input, { clipboardData: { getData: () => "7\t9" } });
  await waitFor(() => expect(screen.getByRole("alert")).toBeVisible());
  expect(input).toHaveValue("2");
  expect(screen.getByRole("textbox", { name: "Row 1, field B" })).toHaveValue("4");
});

it("shows a read failure without misdirecting the user to Excel downloads", async () => {
  vi.mocked(apiRequest).mockRejectedValue(new ApiError("Storage unavailable", 503, "FILE_UNAVAILABLE")); mount();
  expect(await screen.findByRole("alert")).toBeVisible();
  expect(screen.queryByText("This workbook needs Excel to preserve its calculations and structure. Download it, make your changes, then select the corrected file here.")).not.toBeInTheDocument();
});
