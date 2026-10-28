import type { ComponentProps } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { CanvasNavigation, panViewport } from "@/features/workflow/CanvasNavigation";

const state = vi.hoisted(() => ({ viewport: { x: 10, y: 20, zoom: 0.2 }, set: vi.fn() }));
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({ getViewport: () => state.viewport, setViewport: state.set }),
  Controls: ({ children }: ComponentProps<"div">) => <div>{children}</div>,
  ControlButton: (props: ComponentProps<"button">) => <button {...props} />,
}));
it("pans in screen pixels using the current view without changing zoom", () => {
  state.set.mockImplementation(viewport => { state.viewport = viewport; });
  render(<CanvasNavigation />);
  fireEvent.click(screen.getByRole("button", { name: "View left" }));
  expect(state.set).toHaveBeenLastCalledWith({ x: 210, y: 20, zoom: 0.2 }, { duration: 0 });
  fireEvent.click(screen.getByRole("button", { name: "View down" }));
  expect(state.set).toHaveBeenLastCalledWith({ x: 210, y: -180, zoom: 0.2 }, { duration: 0 });
  fireEvent.click(screen.getByRole("button", { name: "View right" }));
  fireEvent.click(screen.getByRole("button", { name: "View up" }));
  expect(state.viewport).toEqual({ x: 10, y: 20, zoom: 0.2 });
  const original = { x: 7, y: 8, zoom: 2 };
  expect(panViewport(original, -200, 0)).toEqual({ x: -193, y: 8, zoom: 2 });
  expect(original).toEqual({ x: 7, y: 8, zoom: 2 });
});
