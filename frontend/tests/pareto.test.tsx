import { fireEvent, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { ParetoConfiguration } from "@/features/workflow/ParetoConfiguration";
import type { ResolvedColumn } from "@/features/workflow/types";
const columns: ResolvedColumn[] = [
  { column_id: "category", engine_name: "category", display_name: "Region", logical_type: "string", nullable: false, metadata: {} },
  { column_id: "amount", engine_name: "amount", display_name: "Revenue", logical_type: "decimal", nullable: true, metadata: {} },
  { column_id: "code", engine_name: "code", display_name: "Code", logical_type: "integer", nullable: false, metadata: {} },
];
it("uses typed distinct roles without adding hidden aggregation settings", () => {
  const change = vi.fn();
  render(<ParetoConfiguration config={{ category_column_id: "code" }} columns={columns} onChange={change} />);
  const measure = screen.getByLabelText("Pareto contribution");
  expect(within(measure).queryByRole("option", { name: "Region" })).toBeNull();
  expect(within(measure).getByRole("option", { name: "Code" })).toBeDisabled();
  fireEvent.change(measure, { target: { value: "amount" } });
  expect(change).toHaveBeenCalledWith({ category_column_id: "code", value_column_id: "amount" });
  expect(screen.getByText(/Shares use the entire selected input/)).toBeVisible();
});
it("retains missing bindings for explicit correction", () => {
  render(<ParetoConfiguration config={{ category_column_id: "gone" }} columns={null} onChange={vi.fn()} />);
  expect(screen.getByLabelText("Pareto category")).toHaveValue("gone");
  expect(screen.getByRole("option", { name: "Unavailable field" })).toBeVisible();
  expect(screen.getByText(/With a zero total, shares are undefined/)).toBeVisible();
});
