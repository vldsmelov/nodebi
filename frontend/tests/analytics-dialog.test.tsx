import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AnalyticsDialog } from "@/features/workflow/AnalyticsDialog";
import type { PlannedStep } from "@/features/workflow/unary-chain";
import { render } from "./render";

const original = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
afterEach(() => { if (original) Object.defineProperty(HTMLDialogElement.prototype, "showModal", original); else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); });

it("authors decimal shares with explicit scale and rejects incomplete scale without calculating in the browser", () => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  const apply = vi.fn((steps: PlannedStep[]) => steps.length > 0), close = vi.fn();
  const columns = [{ column_id: "a", engine_name: "amount", display_name: "Amount", logical_type: "decimal", nullable: true, metadata: { precision: 38, scale: 2 } }];
  render(<AnalyticsDialog columns={columns} parameters={[]} filters={[]} sourceLabel="Prepared table" apply={apply} close={close} />);
  const dialog = within(screen.getByRole("dialog"));
  fireEvent.change(dialog.getByLabelText("Value field"), { target: { value: "a" } });
  expect(dialog.getByLabelText("Exact calculation")).toBeChecked();
  expect(dialog.getByLabelText("Exact calculation")).toBeDisabled();
  fireEvent.change(dialog.getByLabelText("Output field name"), { target: { value: "Share" } });
  fireEvent.change(dialog.getByLabelText("Denominator field name"), { target: { value: "Total" } });
  fireEvent.change(dialog.getByLabelText("Share decimal places"), { target: { value: "" } });
  expect(dialog.getByRole("button", { name: "Apply analytical operation" })).toBeDisabled();
  fireEvent.change(dialog.getByLabelText("Share decimal places"), { target: { value: "8" } });
  fireEvent.click(dialog.getByRole("button", { name: "Apply analytical operation" }));
  expect(apply.mock.calls[0][0].map((step: { version?: number }) => step.version)).toEqual([3, 2]);
  expect(apply.mock.calls[0][0][1].config.scale).toBe(8);
  expect(close).toHaveBeenCalledOnce();
  vi.restoreAllMocks();
});
