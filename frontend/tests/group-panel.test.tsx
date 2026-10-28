import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { GroupPanel } from "@/features/workflow/GroupPanel";

it("bounds the list, retains selection outside the search, and explicitly clears all selections", () => {
  const select = vi.fn(), clearSelection = vi.fn(), assign = vi.fn();
  const nodes = Array.from({ length: 105 }, (_, index) => ({ id: String(index), label: `Step ${index}`, selected: index === 0 }));
  render(<GroupPanel nodes={nodes} groups={[]} selectedCount={1} collapsed={[]} select={select} clearSelection={clearSelection} assign={assign} rename={vi.fn()} dissolve={vi.fn()} toggle={vi.fn()} openNode={vi.fn()} />);
  fireEvent.click(screen.getByText("Node groups"));
  expect(screen.getAllByRole("checkbox")).toHaveLength(100);
  expect(screen.getByText("Showing the first 100 matches. Refine the search to find other nodes.")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Find nodes for grouping"), { target: { value: "Step 104" } });
  expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  expect(select).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Step 104 for grouping" }));
  expect(select).toHaveBeenCalledWith("104", true);
  fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "Preparation" } });
  fireEvent.click(screen.getByRole("button", { name: "Group selected nodes" }));
  expect(assign).toHaveBeenCalledWith("Preparation");
  fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
  expect(clearSelection).toHaveBeenCalledOnce();
});
