import { fireEvent, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { BoxPlotStatsConfiguration } from "@/features/workflow/BoxPlotStatsConfiguration";
import { outputColumns } from "@/features/workflow/output-columns";
import type { NodeSchemaResult, ResolvedColumn } from "@/features/workflow/types";

const value: ResolvedColumn = { column_id: "value", engine_name: "value", display_name: "Amount", logical_type: "decimal", nullable: true, metadata: {} };
const group: ResolvedColumn = { ...value, column_id: "group", display_name: "Department", logical_type: "string" };

it("offers numeric values, optional independent grouping and retains unavailable choices", () => {
  const onChange = vi.fn();
  render(<BoxPlotStatsConfiguration config={{ value_column_id: "removed", group_column_id: "group" }} columns={[value, group]} onChange={onChange} />);
  expect(screen.getByLabelText("Distribution value")).toHaveValue("removed");
  expect(within(screen.getByLabelText("Distribution value")).queryByRole("option", { name: "Department" })).toBeNull();
  fireEvent.change(screen.getByLabelText("Distribution grouping"), { target: { value: "" } });
  expect(onChange).toHaveBeenLastCalledWith({ value_column_id: "removed", group_column_id: null });
});

it("resolves fields from the connected named output, never the first table", () => {
  const node: NodeSchemaResult = { node_id: "statistics", columns: [group], issues: [], outputs: { dataset: { kind: "dataset", columns: [group], nullable: false }, outliers: { kind: "dataset", columns: [value], nullable: false } } };
  expect(outputColumns(node, "outliers")).toEqual([value]);
  expect(outputColumns(node, "removed")).toBeNull();
  expect(outputColumns({ ...node, outputs: undefined })).toEqual([group]);
});
