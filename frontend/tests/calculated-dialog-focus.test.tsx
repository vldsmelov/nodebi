import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CalculatedFieldsDialog } from "@/features/workflow/CalculatedFieldsDialog";
import { render } from "./render";

const original = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
beforeEach(() => Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
  configurable: true, value: function (this: HTMLDialogElement) { this.open = true; },
}));
afterEach(() => {
  if (original) Object.defineProperty(HTMLDialogElement.prototype, "showModal", original);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
});
function setup() {
  render(<CalculatedFieldsDialog initial={[
    { id: "a", name: "First", expression: "1" },
    { id: "b", name: "Second", expression: "2" },
  ]} columns={[]} editing={false} apply={vi.fn()} close={vi.fn()} />);
}
it("focuses the added name and does not steal focus during expression edits", () => {
  setup();
  const add = screen.getByRole("button", { name: "Add calculated field" });
  add.focus(); fireEvent.click(add);
  expect(screen.getByLabelText("Calculated field name 3")).toHaveFocus();
  const expression = screen.getAllByLabelText("Expression", { exact: true })[2];
  expression.focus(); fireEvent.change(expression, { target: { value: "3" } });
  expect(expression).toHaveFocus();
});
it("focuses the surviving name after deletion and the add button after the last row", () => {
  setup();
  const remove = screen.getAllByRole("button", { name: "Remove" })[0];
  remove.focus(); fireEvent.click(remove);
  expect(screen.getByLabelText("Calculated field name 1")).toHaveFocus();
  expect(screen.getByLabelText("Calculated field name 1")).toHaveValue("Second");
  fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  expect(screen.getByRole("button", { name: "Add calculated field" })).toHaveFocus();
});
it("keeps focus on the moved field even when its move button becomes disabled", () => {
  setup();
  const second = screen.getByLabelText("Calculated field name 2");
  const row = within(second.closest("tr")!);
  const up = row.getByRole("button", { name: "Move up" });
  up.focus(); fireEvent.click(up);
  expect(second).toHaveFocus();
  expect(screen.getByLabelText("Calculated field name 1")).toBe(second);
});
