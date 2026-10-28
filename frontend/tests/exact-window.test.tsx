import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { WindowConfiguration } from "@/features/workflow/PreparationConfiguration";
import { render } from "./render";

const columns = [
  { column_id: "money", engine_name: "money", display_name: "Money", logical_type: "decimal", nullable: true, metadata: { scale: 2 } },
  { column_id: "float", engine_name: "float", display_name: "Approximate", logical_type: "float", nullable: true, metadata: {} },
];

it("offers exact fields and explains order/null semantics without changing legacy controls", () => {
  const onChange = vi.fn();
  const view = render(<WindowConfiguration version={3} config={{ name: "Total", operation: "sum" }} columns={columns} onChange={onChange} />);
  expect(screen.getByRole("heading", { name: "Exact Window" })).toBeVisible();
  expect(screen.getByRole("option", { name: "Money" })).toBeVisible();
  expect(screen.queryByRole("option", { name: "Approximate" })).toBeNull();
  expect(screen.getByText(/previous means the previous row/)).toBeVisible();
  fireEvent.change(screen.getByLabelText("Value field"), { target: { value: "money" } });
  expect(onChange).toHaveBeenCalledWith({ name: "Total", operation: "sum", column_id: "money" });
  view.rerender(<WindowConfiguration version={2} config={{ operation: "sum" }} columns={columns} onChange={onChange} />);
  expect(screen.getByRole("option", { name: "Approximate" })).toBeVisible();
  expect(screen.queryByRole("option", { name: "Money" })).toBeNull();
});
