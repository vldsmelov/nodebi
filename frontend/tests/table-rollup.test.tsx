import { useState } from "react";
import { fireEvent, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { TableRollupConfiguration } from "@/features/workflow/TableRollupConfiguration";
import type { ResolvedColumn } from "@/features/workflow/types";

const columns: ResolvedColumn[] = ["region", "branch", "amount", "quantity"].map((name, i) => ({ column_id: name, engine_name: name, display_name: name, logical_type: i < 2 ? "string" : "decimal", nullable: true, metadata: {} }));

it("requires explicit operations and preserves measure identities through reordering and renaming", () => {
  const change = vi.fn();
  function Form() { const [config, setConfig] = useState<Record<string, unknown>>({}); return <TableRollupConfiguration config={config} columns={columns} onChange={next => { change(next); setConfig(next); }} />; }
  render(<Form />);
  fireEvent.click(screen.getByRole("button", { name: "Add grouping level" }));
  expect(screen.getByLabelText("Rollup dimension 1")).toHaveFocus();
  fireEvent.change(screen.getByLabelText("Rollup dimension 1"), { target: { value: "region" } });
  fireEvent.click(screen.getByRole("button", { name: "Add grouping level" }));
  expect(within(screen.getByLabelText("Rollup dimension 2")).queryByRole("option", { name: "region" })).toBeNull();
  fireEvent.change(screen.getByLabelText("Rollup dimension 2"), { target: { value: "branch" } });
  fireEvent.click(screen.getByRole("button", { name: "Move rollup dimension 2 up" }));
  expect(screen.getByLabelText("Rollup dimension 1")).toHaveFocus();
  expect(screen.getByLabelText("Rollup dimension 1")).toHaveValue("branch");
  fireEvent.click(screen.getByRole("button", { name: "Add rollup measure" }));
  expect(screen.getByLabelText("Rollup measure name 1")).toHaveFocus();
  expect(screen.getByLabelText("Rollup operation 1")).toHaveValue("");
  const id = change.mock.lastCall![0].measures[0].output_id;
  fireEvent.change(screen.getByLabelText("Rollup measure name 1"), { target: { value: "Amount" } });
  fireEvent.change(screen.getByLabelText("Rollup operation 1"), { target: { value: "ratio_of_sums" } });
  fireEvent.change(screen.getByLabelText("Rollup value 1"), { target: { value: "amount" } });
  fireEvent.change(screen.getByLabelText("Rollup denominator 1"), { target: { value: "quantity" } });
  screen.getByLabelText("Rollup decimal places 1").focus();
  fireEvent.change(screen.getByLabelText("Rollup decimal places 1"), { target: { value: "4" } });
  expect(screen.getByLabelText("Rollup decimal places 1")).toHaveFocus();
  expect(change.mock.lastCall![0].measures[0]).toMatchObject({ output_id: id, operation: "ratio_of_sums", scale: 4, column_id: "amount", denominator_column_id: "quantity" });
  fireEvent.click(screen.getByRole("button", { name: "Add rollup measure" }));
  fireEvent.click(screen.getByRole("button", { name: "Move rollup measure 1 down" }));
  expect(screen.getByLabelText("Rollup measure name 2")).toHaveFocus();
  expect(change.mock.lastCall![0].measures[1].output_id).toBe(id);
  fireEvent.change(screen.getByLabelText("Rollup operation 2"), { target: { value: "count_rows" } });
  expect(change.mock.lastCall![0].measures[1]).toMatchObject({ column_id: null, denominator_column_id: null });
  expect(screen.queryByLabelText("Rollup value 2")).toBeNull();
  expect(screen.queryByLabelText("Rollup denominator 2")).toBeNull();
  fireEvent.click(within(screen.getByRole("group", { name: "Rollup measure 1" })).getByRole("button", { name: "Remove" }));
  expect(screen.getByLabelText("Rollup measure name 1")).toHaveFocus();
  expect(change.mock.lastCall![0].measures[0].output_id).toBe(id);
  fireEvent.click(screen.getByRole("button", { name: "Remove rollup dimension 2" }));
  expect(screen.getByLabelText("Rollup dimension 1")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Remove rollup dimension 1" }));
  expect(screen.getByRole("button", { name: "Add grouping level" })).toHaveFocus();
});

it("retains unavailable fields, exposes exact rounding and explicit total switches", () => {
  const change = vi.fn();
  render(<TableRollupConfiguration columns={columns} onChange={change} config={{ dimensions: ["gone"], measures: [{ output_id: "fixed", name: "Average", operation: "average", column_id: "missing", scale: 2 }] }} />);
  expect(screen.getByLabelText("Rollup dimension 1")).toHaveValue("gone");
  expect(screen.getByLabelText("Rollup value 1")).toHaveValue("missing");
  expect(screen.getByLabelText("Rollup decimal places 1")).toHaveValue(2);
  expect(within(screen.getByLabelText("Rollup value 1")).queryByRole("option", { name: "region" })).toBeNull();
  fireEvent.click(screen.getByLabelText("Include grand total"));
  expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ grand_total: false }));
  fireEvent.click(screen.getByLabelText("Include intermediate totals"));
  expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ subtotals: false }));
});
