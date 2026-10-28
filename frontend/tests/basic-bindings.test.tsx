import { expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { render } from "./render";
import { basicBindings } from "@/features/dashboard/basic-bindings";
import { chartOptions, VisualizationResultView } from "@/features/dashboard/VisualizationView";
import { VisualizationConfiguration } from "@/features/workflow/VisualizationConfiguration";
import type { VisualizationResult } from "@/features/dashboard/api";

const result: VisualizationResult = {
  visualization_revision: 1, visualization_id: "chart", revision: 1,
  type: "bar_chart", title: "Revenue", value_field: "obsolete", category_field: "obsolete",
  orientation: "vertical", number_format: "number", decimals: 2, currency: "USD",
  show_labels: false, show_legend: true, total_rows: 1, offset: 0, limit: 1, truncated: false,
  columns: [
    { column_id: "value-id", engine_name: "amount", display_name: "Renamed amount", logical_type: "decimal", nullable: false, metadata: {} },
    { column_id: "group-id", engine_name: "category", display_name: "Category", logical_type: "string", nullable: false, metadata: {} },
    { column_id: "plan-id", engine_name: "plan", display_name: "Plan", logical_type: "integer", nullable: true, metadata: {} },
  ],
  rows: [{ category: "001", amount: "9007199254740993.12", plan: null }],
};

it.each(["bar_chart", "line_chart", "area_chart"] as const)("resolves %s roles by stable ID, not schema position or legacy alias", type => {
  const spec = { version: 1 as const, type, x: "group-id", y: [{ column_id: "value-id", name: "Actual" }] };
  const bound = basicBindings({ ...result, type, spec });
  expect(bound.category_field).toBe("category");
  expect(bound.value_field).toBe("amount");
  expect(bound.rows).toBe(result.rows);
  expect(bound.rows[0].amount).toBe("9007199254740993.12");
  expect(result.value_field).toBe("obsolete");
});

it.each(["pie_chart", "donut_chart"] as const)("resolves %s without implicit aggregation", type => {
  const bound = basicBindings({ ...result, type, spec: { version: 1, type, category: "group-id", value: "value-id" } });
  expect(bound.category_field).toBe("category");
  expect(bound.value_field).toBe("amount");
  expect(bound.rows).toBe(result.rows);
});

it("resolves scatter roles and multiple named series without filling missing values", () => {
  expect(basicBindings({ ...result, type: "scatter_chart", spec: { version: 1, type: "scatter_chart", x: "plan-id", y: "value-id" } })).toMatchObject({ category_field: "plan", value_field: "amount" });
  const bound = basicBindings({ ...result, spec: { version: 1, type: "bar_chart", x: "group-id", y: [{ column_id: "value-id", name: "Actual" }, { column_id: "plan-id", name: "Target" }] } });
  expect(bound.additional_series).toEqual([{ field: "plan", name: "Target" }]);
  expect(bound.rows[0].plan).toBeNull();
  expect(chartOptions(bound).series).toMatchObject([{ name: "Actual" }, { name: "Target" }]);
});

it("edits the primary series name without changing field selections", () => {
  const change = vi.fn();
  render(<VisualizationConfiguration type="bar_chart" config={{ value_column_id: "value-id", category_column_id: "group-id" }} columns={result.columns} onChange={change} />);
  fireEvent.change(screen.getByLabelText("Series name 1"), { target: { value: "Actual revenue" } });
  expect(change).toHaveBeenCalledWith({ value_column_id: "value-id", category_column_id: "group-id", primary_series_name: "Actual revenue" });
});

it("renders exact KPI and text values using typed roles", () => {
  const { rerender } = render(<VisualizationResultView result={{ ...result, type: "kpi", spec: { version: 1, type: "kpi", value: "value-id" } }} />);
  expect(screen.getByText("9,007,199,254,740,993.12")).toBeInTheDocument();
  rerender(<VisualizationResultView result={{ ...result, type: "kpi", spec: { version: 1, type: "kpi", value: "group-id" } }} />);
  expect(screen.getByText("001")).toBeInTheDocument();
});

it("orders selected table fields, hides context and keeps it in stable selection", () => {
  const selected = vi.fn();
  render(<VisualizationResultView result={{ ...result, type: "table", spec: { version: 1, type: "table", columns: ["group-id", "value-id"] } }} onSelect={selected} />);
  expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(["Category", "Renamed amount"]);
  expect(screen.queryByText("Plan")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("001"));
  expect(selected).toHaveBeenCalledWith({ "group-id": "001", "value-id": "9007199254740993.12", "plan-id": null });
});

it("keeps old frozen releases without specs usable", () => {
  expect(basicBindings(result)).toBe(result);
  render(<VisualizationResultView result={{ ...result, type: "kpi", value_field: "amount" }} />);
  expect(screen.getByText("9,007,199,254,740,993.12")).toBeInTheDocument();
});

it("shows explicit errors rather than silently using stale aliases", () => {
  const { rerender } = render(<VisualizationResultView result={{ ...result, type: "kpi", spec: { version: 1, type: "kpi", value: "deleted" } }} />);
  expect(screen.getByRole("alert")).toHaveTextContent(/field is unavailable/i);
  rerender(<VisualizationResultView result={{ ...result, type: "table", spec: { version: 1, type: "kpi", value: "value-id" } }} />);
  expect(screen.getByRole("alert")).toHaveTextContent(/does not match/i);
});
