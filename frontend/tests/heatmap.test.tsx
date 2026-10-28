import { fireEvent, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { HeatmapConfiguration } from "@/features/workflow/HeatmapConfiguration";
import type { ResolvedColumn } from "@/features/workflow/types";

const columns: ResolvedColumn[] = [
  { column_id: "x", engine_name: "x", display_name: "Month", logical_type: "date", nullable: false, metadata: {} },
  { column_id: "y", engine_name: "y", display_name: "Branch", logical_type: "string", nullable: false, metadata: {} },
  { column_id: "v", engine_name: "v", display_name: "Revenue", logical_type: "decimal", nullable: true, metadata: {} },
];

it("requires explicit aggregation and offers schema-aware separate dimensions and value", () => {
  const change = vi.fn();
  render(<HeatmapConfiguration config={{ x_column_id: "x", y_column_id: "y" }} columns={columns} onChange={change} />);
  expect(screen.getByLabelText("Cell aggregation")).toHaveValue("");
  expect(within(screen.getByLabelText("Heatmap X dimension")).getByRole("option", { name: "Branch" })).toBeDisabled();
  expect(within(screen.getByLabelText("Heatmap X dimension")).queryByRole("option", { name: "Revenue" })).toBeNull();
  expect(within(screen.getByLabelText("Heatmap value")).queryByRole("option", { name: "Month" })).toBeNull();
  fireEvent.change(screen.getByLabelText("Cell aggregation"), { target: { value: "count" } });
  expect(change).toHaveBeenLastCalledWith({ x_column_id: "x", y_column_id: "y", aggregation: "count" });
});

it("preserves unavailable fields and exposes exact average scale", () => {
  const change = vi.fn();
  render(<HeatmapConfiguration config={{ x_column_id: "removed", aggregation: "average" }} columns={columns} onChange={change} />);
  expect(screen.getByLabelText("Heatmap X dimension")).toHaveValue("removed");
  expect(screen.getByLabelText("Exact average decimal places")).toHaveValue(6);
  fireEvent.change(screen.getByLabelText("Exact average decimal places"), { target: { value: "4" } });
  expect(change).toHaveBeenLastCalledWith({ x_column_id: "removed", aggregation: "average", average_scale: 4 });
});
