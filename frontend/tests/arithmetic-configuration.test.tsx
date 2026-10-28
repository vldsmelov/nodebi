import { fireEvent, screen, within } from "@testing-library/react";
import { render } from "./render";
import { useState } from "react";
import { expect, it } from "vitest";
import { NodeConfiguration } from "@/features/workflow/NodeConfiguration";

const columns = [
  { column_id: "q", engine_name: "quantity", display_name: "Quantity", logical_type: "integer", nullable: false, metadata: {} },
  { column_id: "c", engine_name: "category", display_name: "Category", logical_type: "string", nullable: false, metadata: {} },
];
function Form({ type, version }: { type: string; version?: number }) {
  const [config, onChange] = useState<Record<string, unknown>>({});
  return <><NodeConfiguration type={type} version={version} config={config} onChange={onChange} columns={columns} sources={[]} /><output data-testid="config">{JSON.stringify(config)}</output></>;
}

it("inserts stable column references without replacing the expression", () => {
  render(<Form type="calculated_column" />);
  fireEvent.change(screen.getByLabelText("Expression"), { target: { value: "2 * " } });
  fireEvent.change(screen.getByLabelText("Insert formula field"), { target: { value: "q" } });
  expect(screen.getByLabelText("Expression")).toHaveValue("2 * [q]");
});

it("configures explicit exact output without losing the formula or advertising unsupported functions", () => {
  render(<Form type="calculated_column" version={2} />);
  expect(screen.getByRole("heading", { name: "Exact Calculated Column" })).toBeVisible();
  expect(screen.getByLabelText("Total digits (precision)")).toHaveValue(38);
  expect(screen.getByLabelText("Decimal places")).toHaveValue(2);
  fireEvent.change(screen.getByLabelText("Expression"), { target: { value: "[q] / 3" } });
  fireEvent.change(screen.getByLabelText("Decimal places"), { target: { value: "6" } });
  fireEvent.change(screen.getByLabelText("Total digits (precision)"), { target: { value: "18" } });
  expect(JSON.parse(screen.getByTestId("config").textContent!)).toEqual({ expression: "[q] / 3", scale: 6, precision: 18 });
  expect(screen.getByRole("option", { name: "Category · string" })).toBeEnabled();
  expect(screen.getByRole("option", { name: "Quantity · integer" })).not.toBeDisabled();
  expect(screen.queryByText("to_number(text)")).not.toBeInTheDocument();
  expect(screen.getByText("if_else(condition, value, otherwise)")).toBeInTheDocument();
  expect(screen.getByText("is_null(value)")).toBeInTheDocument();
  expect(screen.getByText(/Text, boolean and date fields can be used in conditions only/)).toBeVisible();
  expect(screen.getByText("safe_divide(numerator, denominator, fallback)")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Decimal places"), { target: { value: "" } });
  expect(screen.getByLabelText("Decimal places")).toHaveValue(null);
  expect(JSON.parse(screen.getByTestId("config").textContent!).scale).toBeNull();
});

it("keeps legacy formula controls and rejects approximate field insertion only in exact mode", () => {
  const props = { type: "calculated_column", config: {}, onChange: () => {}, sources: [], columns: [
    ...columns, { column_id: "d", engine_name: "money", display_name: "Money", logical_type: "decimal", nullable: true, metadata: {} },
    { column_id: "f", engine_name: "float", display_name: "Approximate", logical_type: "float", nullable: true, metadata: {} },
  ] };
  const view = render(<NodeConfiguration {...props} version={2} />);
  expect(screen.getByRole("option", { name: "Approximate · float" })).toBeDisabled();
  expect(screen.getByRole("option", { name: "Money · decimal" })).not.toBeDisabled();
  view.rerender(<NodeConfiguration {...props} version={1} />);
  expect(screen.queryByLabelText("Decimal places")).not.toBeInTheDocument();
  expect(screen.getByText("if_else(condition, value, otherwise)")).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Approximate · float" })).not.toBeDisabled();
});

it("offers numeric comparisons for decimal fields without coercing the value to a JS number", () => {
  function DecimalFilter() {
    const [config, onChange] = useState<Record<string, unknown>>({});
    return <><NodeConfiguration type="filter" config={config} onChange={onChange} sources={[]} columns={[{ column_id: "d", engine_name: "money", display_name: "Money", logical_type: "decimal", nullable: false, metadata: {} }]} /><output data-testid="config">{JSON.stringify(config)}</output></>;
  }
  render(<DecimalFilter />);
  fireEvent.click(screen.getByRole("button", { name: "Add condition" }));
  fireEvent.change(screen.getByLabelText("Filter operator 1"), { target: { value: "greater_than" } });
  fireEvent.change(screen.getByLabelText("Filter value 1", { exact: true }), { target: { value: "9007199254740993.01" } });
  expect(JSON.parse(screen.getByTestId("config").textContent!).conditions).toEqual([{ column_id: "d", operator: "greater_than", value: "9007199254740993.01" }]);
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
