import { useState } from "react";
import { fireEvent, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { AnalyticalTableView } from "@/features/dashboard/AnalyticalTableView";
import { AnalyticalTableConfiguration } from "@/features/workflow/AnalyticalTableConfiguration";
import { chartSetupHints } from "@/features/dashboard/authoring-guidance";
import type { VisualizationResult } from "@/features/dashboard/api";

const columns = ["row_id", "parent_id", "depth", "kind", "source_count", "Region", "Total", "Mean"].map((name, i) => ({ column_id: `id_${name}`, engine_name: name, display_name: name, logical_type: i > 5 ? "decimal" as const : "string" as const, nullable: true, metadata: {} }));
const spec = { type: "analytical_table" as const, version: 1 as const, rows: { row_id: "id_row_id", parent_id: "id_parent_id", depth: "id_depth", kind: "id_kind", source_count: "id_source_count" }, dimensions: ["id_Region"], measures: ["id_Total", "id_Mean"], pinned_columns: 1, density: "compact" as const, rules: [] };
const rows = [{ row_id: "a", parent_id: "root", depth: 1, kind: "detail", source_count: 2, Region: null, Total: "9007199254740993.12", Mean: null }, { row_id: "root", parent_id: null, depth: 0, kind: "grand_total", source_count: 2, Region: null, Total: "9007199254740993.12", Mean: null }];
const result: VisualizationResult = { type: "analytical_table", orientation: "vertical", visualization_revision: 1, spec, analytical_table: { cells: { a: { id_Total: { rule_id: "rule", label: "Above plan", tone: "warning" } } } }, visualization_id: "table", revision: 1, title: "Summary", category_field: null, value_field: null, number_format: "number", decimals: 2, currency: "RUB", show_legend: false, show_labels: false, columns, rows, total_rows: 2, offset: 0, limit: 100, truncated: false };

it("hides technical roles, distinguishes empty groups and totals, retains exact values and stable selection", () => {
  const select = vi.fn();
  render(<AnalyticalTableView result={result} onSelect={select} />);
  expect(screen.getByRole("table")).toHaveClass("text-sm");
  expect(screen.getByRole("table")).toHaveAccessibleName();
  expect(screen.getByRole("table").parentElement).toHaveAttribute("role", "region");
  expect(screen.getByRole("table").parentElement).toHaveAccessibleName();
  expect(screen.getByRole("table").parentElement).toHaveAttribute("tabindex", "0");
  expect(screen.getByRole("table").parentElement).toHaveClass("min-w-0", "overflow-auto");
  const renderedTable = screen.getByRole("table") as HTMLTableElement;
  const firstRow = renderedTable.tBodies[0].rows[0];
  for (const [index, cell] of Array.from(firstRow.cells).entries()) {
    if (cell.classList.contains("text-right")) expect(renderedTable.tHead!.rows[0].cells[index]).toHaveClass("text-right");
  }
  expect(screen.getAllByRole("columnheader").map(el => el.textContent)).toEqual(["Row level", "Region", "Total", "Mean", "Selection"]);
  expect(screen.getAllByText("9007199254740993.12")).toHaveLength(2);
  expect(screen.getByText("Above plan")).toBeVisible();
  expect(screen.getByRole("columnheader", { name: "Region" })).toHaveStyle({ position: "sticky", left: "160px" });
  expect(screen.getByRole("columnheader", { name: "Row level" })).toHaveStyle({ width: "160px" });
  expect(screen.getByRole("columnheader", { name: "Selection" })).toHaveStyle({ width: "100px" });
  const body = screen.getAllByRole("row").slice(1);
  expect(within(body[0]).getAllByText("Empty value")).toHaveLength(2);
  expect(within(body[1]).getAllByText("Empty value")).toHaveLength(1);
  expect(within(body[1]).getByText("Grand total")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Select row 1" }));
  expect(select).toHaveBeenCalledWith(expect.objectContaining({ id_row_id: "a", id_Total: "9007199254740993.12", id_Region: null }));
});

it("requests bounded pages without aggregating loaded rows", () => {
  const change = vi.fn();
  const { rerender } = render(<AnalyticalTableView result={{ ...result, total_rows: 1103 }} setOffset={change} />);
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(change).toHaveBeenLastCalledWith(100);
  fireEvent.click(screen.getByRole("button", { name: "Last page" }));
  expect(change).toHaveBeenLastCalledWith(1100);
  rerender(<AnalyticalTableView result={{ ...result, offset: 1100, total_rows: 1103 }} setOffset={change} />);
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
  expect(change).toHaveBeenLastCalledWith(1000);
});

it("has explicit missing-contract and empty-page states", () => {
  const { rerender } = render(<AnalyticalTableView result={{ ...result, rows: [] }} />);
  expect(screen.getByText("No rows on this page.")).toBeVisible();
  rerender(<AnalyticalTableView result={{ ...result, spec: null }} />);
  expect(screen.getByRole("alert")).toBeVisible();
});

it("authors exact rules with stable identities and keyboard ordering, density and visible measures", () => {
  const changed = vi.fn();
  function Form() { const [config, setConfig] = useState<Record<string, unknown>>({ spec }); return <AnalyticalTableConfiguration config={config} columns={columns} onChange={next => { setConfig(next); changed(next); }} />; }
  render(<Form />);
  fireEvent.change(screen.getByLabelText("Pinned data columns"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Table density"), { target: { value: "normal" } });
  fireEvent.click(screen.getByRole("button", { name: "Add formatting rule" }));
  const id = changed.mock.lastCall![0].spec.rules[0].id;
  fireEvent.change(screen.getByLabelText("Exact threshold"), { target: { value: "9007199254740993.12" } });
  expect(changed.mock.lastCall![0].spec.rules[0]).toMatchObject({ id, threshold: "9007199254740993.12" });
  expect(chartSetupHints("analytical_table", "dataset", changed.mock.lastCall![0], columns)).toEqual([]);
  fireEvent.change(screen.getByLabelText("Exact threshold"), { target: { value: "" } });
  expect(chartSetupHints("analytical_table", "dataset", changed.mock.lastCall![0], columns)).toHaveLength(1);
  fireEvent.change(screen.getByLabelText("Condition"), { target: { value: "is_empty" } });
  expect(changed.mock.lastCall![0].spec.rules[0]).toMatchObject({ threshold: null, upper: null });
  fireEvent.click(screen.getByRole("button", { name: "Add formatting rule" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Move rule up" })[1]);
  expect(changed.mock.lastCall![0].spec.rules[1].id).toBe(id);
  fireEvent.click(screen.getByLabelText("Total", { selector: "input" }));
  expect(changed.mock.lastCall![0].spec.visible_measures).toEqual(["id_Mean"]);
  expect(changed.mock.lastCall![0].spec.density).toBe("normal");
});
