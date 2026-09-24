import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { ConditionBuilder } from "@/features/workflow/ConditionBuilder";

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
