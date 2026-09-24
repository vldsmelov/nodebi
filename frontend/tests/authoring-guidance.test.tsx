import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { chartSetupHints } from "@/features/dashboard/authoring-guidance";
import { TableColumns } from "@/features/workflow/TableColumns";
import type { ResolvedColumn } from "@/features/workflow/types";

const columns = ["A", "B", "C"].map(name => ({ column_id: name, display_name: name, logical_type: "float", nullable: true })) as ResolvedColumn[];
it("allows repairing a selection after an upstream column is deleted", () => {
  const change = vi.fn();
  render(<TableColumns columns={columns} selected={["removed", "A"]} onChange={change} />);
  fireEvent.click(screen.getByRole("button", { name: "Remove unavailable column 1" }));
  expect(change).toHaveBeenCalledWith(["A"]);
});
it("guides incomplete and removed fields without inventing defaults or aggregations", () => {
  expect(chartSetupHints("bar_chart", "dataset", {}, columns)).toHaveLength(2);
  expect(chartSetupHints("bar_chart", "dataset", { category_column_id: "A", value_column_id: "B" }, columns)).toEqual([]);
  expect(chartSetupHints("kpi", "scalar", {}, [])).toEqual([]);
  expect(chartSetupHints("kpi", "dataset", { value_column_id: "removed" }, columns)).toHaveLength(1);
  expect(chartSetupHints("table", "dataset", {}, columns)).toEqual([]);
  expect(chartSetupHints("table", "dataset", { column_ids: [] }, columns)).toHaveLength(1);
  expect(chartSetupHints("bar_chart", "dataset", { category_column_id: "A", value_column_id: "B", additional_series: [{ column_id: "B", name: "Again" }] }, columns)).toHaveLength(1);
});
it("searches one checklist and reorders against the full selection rather than filtered rows", () => {
  function Subject() {
    const [selected, setSelected] = useState(["A", "B", "C"]);
    return <><TableColumns columns={columns} selected={selected} onChange={setSelected} /><output data-testid="selection">{selected.join(",")}</output></>;
  }
  render(<Subject />);
  expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  fireEvent.change(screen.getByLabelText("Search table columns"), { target: { value: "B" } });
  fireEvent.click(screen.getByRole("button", { name: "Move column up" }));
  expect(screen.getByTestId("selection")).toHaveTextContent("B,A,C");
  expect(screen.getByRole("button", { name: "Move column up" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: "B" }));
  expect(screen.getByTestId("selection")).toHaveTextContent("A,C");
  fireEvent.change(screen.getByLabelText("Search table columns"), { target: { value: "missing" } });
  expect(screen.getByText("No matching columns.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getAllByRole("checkbox")).toHaveLength(3);
});
