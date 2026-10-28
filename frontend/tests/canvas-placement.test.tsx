import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { CanvasPlacement } from "@/features/workflow/CanvasPlacement";

it("moves the chosen identity in each direction, using the latest position and no implicit selection", () => {
  const move = vi.fn();
  const items = [{ id: "one", label: "Revenue", position: { x: -10, y: 40 } }, { id: "two", label: "Revenue", position: { x: 900, y: 800 } }];
  const view = render(<CanvasPlacement items={items} move={move} />);
  fireEvent.click(screen.getByText("Move without dragging"));
  expect(screen.getByRole("button", { name: "Move item left" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Layout item"), { target: { value: "one" } });
  for (const [direction, position] of [["left", { x: -30, y: 40 }], ["right", { x: 10, y: 40 }], ["up", { x: -10, y: 20 }], ["down", { x: -10, y: 60 }]] as const) {
    fireEvent.click(screen.getByRole("button", { name: `Move item ${direction}` }));
    expect(move).toHaveBeenLastCalledWith("one", position);
  }
  view.rerender(<CanvasPlacement items={[{ ...items[0], position: { x: 70, y: 80 } }, items[1]]} move={move} />);
  fireEvent.click(screen.getByRole("button", { name: "Move item right" }));
  expect(move).toHaveBeenLastCalledWith("one", { x: 90, y: 80 });
  expect(screen.getByRole("status")).toHaveTextContent("Position: 70, 80");
  view.rerender(<CanvasPlacement items={[items[1]]} move={move} />);
  expect(screen.getByLabelText("Layout item")).toHaveValue("");
  expect(screen.getByRole("button", { name: "Move item right" })).toBeDisabled();
});
