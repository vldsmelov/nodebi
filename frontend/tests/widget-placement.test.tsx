import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { WidgetPlacement } from "@/features/dashboard/WidgetPlacement";
import type { Widget } from "@/features/dashboard/api";

it("disables collision and minimum-size actions without hiding available movement", () => {
  const widget = { id: "one", visualization_id: "v", x: 0, y: 0, width: 2, height: 2 } as Widget;
  const blocker = { ...widget, id: "two", x: 2 };
  const onChange = vi.fn();
  render(<WidgetPlacement widget={widget} widgets={[widget, blocker]} name="Table" onChange={onChange} />);
  for (const name of ["Move left", "Move up", "Move right", "Wider", "Narrower", "Shorter"]) expect(screen.getByRole("button", { name })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Wider" }));
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Move down" }));
  expect(onChange).toHaveBeenLastCalledWith([{ ...widget, y: 1 }, blocker]);
  fireEvent.click(screen.getByRole("button", { name: "Taller" }));
  expect(onChange).toHaveBeenLastCalledWith([{ ...widget, height: 3 }, blocker]);
});
