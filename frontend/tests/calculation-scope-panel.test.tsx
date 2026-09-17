import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { CalculationScopePanel } from "@/features/workflow/CalculationScopePanel";
it("requires explicit calculation selection, exposes field/parameter names and navigates without modifying graph", () => {
  const nodes = [{ id: "total", type: "window", version: 1, position: { x: 0, y: 0 }, config: { name: "Group total", partitions: [] } }, { id: "filter", type: "filter", version: 1, position: { x: 0, y: 0 }, config: { conditions: [{ column_id: "id", parameter: "item" }] } }];
  const edges = [{ id: "edge", source_node_id: "total", target_node_id: "filter", source_port: "dataset", target_port: "input" }];
  const snapshot = JSON.stringify({ nodes, edges }); const highlight = vi.fn(), openNode = vi.fn();
  render(<CalculationScopePanel nodes={nodes} edges={edges} selected="filter" schema={{ revision: 1, valid: true, issues: [], nodes: [{ node_id: "total", issues: [], columns: [{ column_id: "id", display_name: "Item ID", engine_name: "id", logical_type: "integer", nullable: false, metadata: {} }] }] }} parameters={[{ name: "item", label: "Selected item", logical_type: "integer" }]} highlight={highlight} openNode={openNode} />);
  fireEvent.click(screen.getByText("Calculation scope"));
  expect(screen.queryByText("After calculation: filters computed rows")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Calculation to inspect"), { target: { value: "total" } });
  expect(screen.getByText("Item ID: Selected item [item]")).toBeVisible();
  fireEvent.click(screen.getByText("Highlight calculation inputs")); expect(highlight).toHaveBeenLastCalledWith(["total"]);
  fireEvent.click(screen.getByText("Highlight path to selected node")); expect(new Set(highlight.mock.lastCall![0])).toEqual(new Set(["total", "filter"]));
  fireEvent.click(screen.getByText("Open calculation node")); expect(openNode).toHaveBeenCalledWith("total");
  expect(JSON.stringify({ nodes, edges })).toBe(snapshot);
});
