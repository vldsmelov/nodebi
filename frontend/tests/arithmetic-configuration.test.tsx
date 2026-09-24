import { fireEvent, screen, within } from "@testing-library/react";
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

it("replaces a selected named token without changing surrounding arithmetic", () => {
  render(<Form type="calculated_column" />);
  fireEvent.change(screen.getByLabelText("Expression"), { target: { value: "2 * [q] + 5" } });
  fireEvent.click(screen.getByRole("button", { name: "Quantity · integer" }));
  fireEvent.change(screen.getByLabelText("Insert formula field"), { target: { value: "c" } });
  expect(screen.getByLabelText("Expression")).toHaveValue("2 * [c] + 5");
  expect(screen.getByRole("button", { name: "Category · string" })).toBeVisible();
  fireEvent.change(screen.getByLabelText("Find formula field"), { target: { value: "Category" } });
  expect(screen.queryByRole("option", { name: "Quantity · integer" })).not.toBeInTheDocument();
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


it("shows server diagnostics beside the expression and hides them while validation is pending", () => {
  const props = { type: "calculated_column", config: { name: "Total", expression: "[q] +" }, columns, sources: [], onChange: () => {}, issues: [{ code: "SCHEMA_INFERENCE_FAILED", message: "Invalid arithmetic expression.", node_id: "calculation", severity: "error" as const, edge_id: null, field: "config.expression" }] };
  const view = render(<NodeConfiguration {...props} />);
  const expression = screen.getByLabelText("Expression");
  const description = document.getElementById(expression.getAttribute("aria-describedby")!);
  expect(description).toHaveTextContent("Invalid arithmetic expression.");
  expect(description).toHaveTextContent("calculation");
  view.rerender(<NodeConfiguration {...props} validationPending />);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(description).toHaveTextContent("Formula checks update after saving.");
  view.rerender(<NodeConfiguration {...props} issues={[]} />);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(description).toBeEmptyDOMElement();
});


it("searches original source labels after renaming and clears provenance when its snapshot is unavailable", () => {
  const props = { type: "calculated_column", config: { name: "Total", expression: "[q] * 2" }, columns, sources: [], onChange: () => {} };
  const provenance = { q: { complete: true, origins: [{ source: "Inventory.xlsx", sheet: "Orders", column: "F", headers: ["Original quantity"] }] } };
  const view = render(<NodeConfiguration {...props} provenance={provenance} />);
  expect(screen.getByText("Inventory.xlsx / Orders / F / Original quantity")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Find formula field"), { target: { value: "Original quantity" } });
  expect(screen.getByRole("option", { name: /Quantity.*Inventory/ })).toBeInTheDocument();
  expect(within(screen.getByLabelText("Insert formula field")).queryByRole("option", { name: /Category/ })).not.toBeInTheDocument();
  view.rerender(<NodeConfiguration {...props} validationPending />);
  expect(screen.queryByText("Field sources")).not.toBeInTheDocument();
});
