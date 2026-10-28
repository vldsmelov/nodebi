import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { ConditionBuilder, conditionNumber } from "@/features/workflow/ConditionBuilder";

it.each(["", " ", "0x10", "NaN", "Infinity", "1e309", "1,2", "1 + 2", "1); evil()", "1".repeat(129)])("rejects non-token numeric input %s", value => {
  expect(conditionNumber(value)).toBeNull();
});
it.each([[" +00012 ", "+12"], ["-.25", "-.25"], ["000.10", "0.10"], ["1.234567890123456789e-7", "1.234567890123456789e-7"], ["9007199254740993", "9007199254740993"]])("keeps numeric token %s", (value, expected) => {
  expect(conditionNumber(value)).toBe(expected);
});
it("builds exact decimal conditions with numeric results and excludes Float64 fields", () => {
  const apply = vi.fn();
  render(<ConditionBuilder exact columns={[
    { column_id: "amount", engine_name: "Amount", display_name: "Amount", logical_type: "decimal", nullable: true, metadata: { precision: 38, scale: 2 } },
    { column_id: "approx", engine_name: "Approximate", display_name: "Approximate", logical_type: "float", nullable: true, metadata: {} },
  ]} onApply={apply} />);
  fireEvent.click(screen.getByText("Build a condition"));
  expect(screen.queryByRole("option", { name: "Approximate" })).not.toBeInTheDocument();
  expect(screen.getByLabelText("Result type")).toBeDisabled();
  expect(screen.getByLabelText("Result type")).toHaveValue("number");
  fireEvent.change(screen.getByLabelText("Condition field"), { target: { value: "amount" } });
  fireEvent.change(screen.getByLabelText("Condition value"), { target: { value: "9007199254740993.11" } });
  fireEvent.change(screen.getByLabelText("When true"), { target: { value: "9007199254740993.12" } });
  fireEvent.change(screen.getByLabelText("Otherwise"), { target: { value: "-0.01" } });
  fireEvent.click(screen.getByRole("button", { name: "Use condition" }));
  expect(apply).toHaveBeenCalledWith("if_else([amount] == 9007199254740993.11, 9007199254740993.12, -0.01)");
});

it("preserves large integer and decimal literal text instead of rounding through Number", () => {
  const apply = vi.fn();
  render(<ConditionBuilder columns={[{ column_id: "amount", engine_name: "Amount", display_name: "Amount", logical_type: "integer", nullable: false, metadata: {} }]} onApply={apply} />);
  fireEvent.click(screen.getByText("Build a condition"));
  fireEvent.change(screen.getByLabelText("Condition field"), { target: { value: "amount" } });
  fireEvent.change(screen.getByLabelText("Condition value"), { target: { value: "9007199254740993" } });
  fireEvent.change(screen.getByLabelText("Result type"), { target: { value: "number" } });
  fireEvent.change(screen.getByLabelText("When true"), { target: { value: "9007199254740993.11" } });
  fireEvent.change(screen.getByLabelText("Otherwise"), { target: { value: "-9007199254740993.12" } });
  fireEvent.click(screen.getByRole("button", { name: "Use condition" }));
  expect(apply).toHaveBeenCalledWith("if_else([amount] == 9007199254740993, 9007199254740993.11, -9007199254740993.12)");
});

it("builds a typed condition from named fields and quotes text safely", () => {
  const apply = vi.fn();
  render(<ConditionBuilder columns={[{ column_id: "stable", engine_name: "Account", display_name: "Account", logical_type: "string", nullable: true, metadata: {} }]} onApply={apply} />);
  fireEvent.click(screen.getByText("Build a condition"));
  fireEvent.change(screen.getByLabelText("Condition field"), { target: { value: "stable" } });
  fireEvent.change(screen.getByLabelText("Condition value"), { target: { value: '90"01' } });
  fireEvent.change(screen.getByLabelText("When true"), { target: { value: "Revenue" } });
  fireEvent.change(screen.getByLabelText("Otherwise"), { target: { value: "Other" } });
  fireEvent.click(screen.getByText("Use condition"));
  expect(apply).toHaveBeenCalledWith('if_else([stable] == "90\\"01", "Revenue", "Other")');
  fireEvent.change(screen.getByLabelText("Result type"), { target: { value: "number" } });
  expect(screen.getByText("Use condition")).toBeDisabled();
});

it("reports unapplied changes, marks successful insertion clean and clears status on unmount", () => {
  const dirty = vi.fn(), apply = vi.fn();
  const view = render(<ConditionBuilder columns={[{ column_id: "field", engine_name: "Field", display_name: "Field", logical_type: "string", nullable: true, metadata: {} }]} onApply={apply} onDirtyChange={dirty} />);
  expect(dirty).toHaveBeenLastCalledWith(false);
  fireEvent.click(screen.getByText("Build a condition"));
  fireEvent.change(screen.getByLabelText("Condition field"), { target: { value: "field" } });
  expect(dirty).toHaveBeenLastCalledWith(true);
  fireEvent.click(screen.getByRole("button", { name: "Use condition" }));
  expect(apply).toHaveBeenCalledOnce();
  expect(dirty).toHaveBeenLastCalledWith(false);
  fireEvent.change(screen.getByLabelText("When true"), { target: { value: "New result" } });
  expect(dirty).toHaveBeenLastCalledWith(true);
  fireEvent.change(screen.getByLabelText("When true"), { target: { value: "" } });
  expect(dirty).toHaveBeenLastCalledWith(false);
  fireEvent.change(screen.getByLabelText("Otherwise"), { target: { value: "Pending" } });
  view.unmount();
  expect(dirty).toHaveBeenLastCalledWith(false);
});
