import { fireEvent, screen } from "@testing-library/react";
import { render } from "./render";
import { useState } from "react";
import { expect, it } from "vitest";
import { NodeConfiguration } from "@/features/workflow/NodeConfiguration";

const columns = [
  { column_id: "q", engine_name: "quantity", display_name: "Quantity", logical_type: "integer", nullable: false, metadata: {} },
  { column_id: "c", engine_name: "category", display_name: "Category", logical_type: "string", nullable: false, metadata: {} },
];
function Form({ type }: { type: string }) {
  const [config, onChange] = useState<Record<string, unknown>>({});
  return <><NodeConfiguration type={type} config={config} onChange={onChange} columns={columns} sources={[]} /><output data-testid="config">{JSON.stringify(config)}</output></>;
}

it("inserts stable column references without replacing the expression", () => {
  render(<Form type="calculated_column" />);
  fireEvent.change(screen.getByLabelText("Expression"), { target: { value: "2 * " } });
  fireEvent.change(screen.getByLabelText("Insert formula field"), { target: { value: "q" } });
  expect(screen.getByLabelText("Expression")).toHaveValue("2 * [q]");
});

it("restricts aggregation choices when the selected field becomes nonnumeric", () => {
  render(<Form type="group_by" />);
  fireEvent.click(screen.getByText("Add aggregation"));
  fireEvent.change(screen.getByLabelText("Aggregate field 1"), { target: { value: "q" } });
  fireEvent.change(screen.getByLabelText("Aggregation 1"), { target: { value: "sum" } });
  fireEvent.change(screen.getByLabelText("Aggregate field 1"), { target: { value: "c" } });
  expect(screen.getByLabelText("Aggregation 1")).toHaveValue("count");
  expect(screen.getByRole("option", { name: /^sum$/ })).toBeDisabled();
});
