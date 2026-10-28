import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CombineConfiguration } from "@/features/workflow/CombineConfiguration";
import { render } from "./render";

it("configures exact averaging scale and prevents implicit Float64 arithmetic", () => {
  const onChange = vi.fn();
  const columns = [{ column_id: "a", engine_name: "a", display_name: "Approximate", logical_type: "float", nullable: false, metadata: {} }];
  const view = render(<CombineConfiguration type="pivot" version={2} config={{ operation: "average" }} columns={columns} onChange={onChange} />);
  expect(screen.getByRole("heading", { name: "Exact Pivot" })).toBeVisible();
  expect(screen.getByLabelText("Pivot value field").querySelector('option[value="a"]')).toBeDisabled();
  expect(screen.getByLabelText("Average decimal places")).toHaveValue(6);
  fireEvent.change(screen.getByLabelText("Average decimal places"), { target: { value: "8" } });
  expect(onChange).toHaveBeenCalledWith({ operation: "average", average_scale: 8 });
  fireEvent.change(screen.getByLabelText("Average decimal places"), { target: { value: "" } });
  expect(onChange).toHaveBeenCalledWith({ operation: "average", average_scale: "" });
  view.rerender(<CombineConfiguration type="pivot" version={2} config={{ operation: "count" }} columns={columns} onChange={onChange} />);
  expect(screen.getByLabelText("Pivot value field").querySelector('option[value="a"]')).toBeEnabled();
  expect(screen.queryByLabelText("Average decimal places")).toBeNull();
  view.rerender(<CombineConfiguration type="pivot" version={1} config={{ operation: "average" }} columns={columns} onChange={onChange} />);
  expect(screen.getByRole("heading", { name: "Pivot" })).toBeVisible();
  expect(screen.queryByLabelText("Average decimal places")).toBeNull();
});
