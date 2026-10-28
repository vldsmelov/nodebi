import { fireEvent, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { WaterfallConfiguration } from "@/features/workflow/WaterfallConfiguration";
import type { ResolvedColumn } from "@/features/workflow/types";

const columns: ResolvedColumn[] = [
  { column_id: "label", engine_name: "label", display_name: "Step", logical_type: "string", nullable: false, metadata: {} },
  { column_id: "kind", engine_name: "kind", display_name: "Type", logical_type: "string", nullable: false, metadata: {} },
  { column_id: "value", engine_name: "value", display_name: "Amount", logical_type: "decimal", nullable: true, metadata: {} },
];

it("does not invent totals and exposes schema-aware distinct fields", () => {
  const change = vi.fn();
  render(<WaterfallConfiguration config={{ category_column_id: "label" }} columns={columns} onChange={change} />);
  expect(screen.getByLabelText("Append a final total")).not.toBeChecked();
  expect(screen.getByLabelText("Waterfall row type")).toHaveValue("");
  expect(within(screen.getByLabelText("Waterfall row type")).getByRole("option", { name: "Step" })).toBeDisabled();
  expect(within(screen.getByLabelText("Waterfall value")).queryByRole("option", { name: "Step" })).toBeNull();
  fireEvent.click(screen.getByLabelText("Append a final total"));
  expect(change).toHaveBeenLastCalledWith({ category_column_id: "label", append_total: true, total_label: "Total" });
});

it("preserves unavailable fields and allows localized marker values and final labels", () => {
  const change = vi.fn();
  render(<WaterfallConfiguration config={{ category_column_id: "gone", kind_column_id: "kind", append_total: true, total_label: "Closing" }} columns={columns} onChange={change} />);
  expect(screen.getByLabelText("Waterfall step label")).toHaveValue("gone");
  expect(screen.getByLabelText("Initial balance marker")).toHaveValue("initial");
  fireEvent.change(screen.getByLabelText("Subtotal marker"), { target: { value: "Промежуточный" } });
  expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ subtotal_marker: "Промежуточный" }));
  fireEvent.change(screen.getByLabelText("Final total label"), { target: { value: "Closing balance" } });
  expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ total_label: "Closing balance" }));
  fireEvent.change(screen.getByLabelText("Waterfall row type"), { target: { value: "" } });
  expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ kind_column_id: null }));
});
