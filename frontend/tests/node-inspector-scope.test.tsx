import { fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NodeConfiguration } from "@/features/workflow/NodeConfiguration";
import { render } from "./render";

afterEach(() => sessionStorage.clear());

it.each([1, 2])("isolates condition scratch state between same-type nodes (v%s)", version => {
  const change = vi.fn();
  const inspector = (nodeId: string) => <NodeConfiguration nodeId={nodeId} version={version} type="calculated_column" sources={[]} columns={[]} config={{ name: nodeId, expression: "1" }} onChange={change} />;
  const view = render(inspector("first"));
  fireEvent.click(screen.getByText("Build a condition"));
  fireEvent.change(screen.getByLabelText("When true"), { target: { value: "123" } });
  view.rerender(inspector("first"));
  expect(screen.getByLabelText("When true")).toHaveValue("123");
  view.rerender(inspector("second"));
  fireEvent.click(screen.getByText("Build a condition"));
  expect(screen.getByLabelText("When true")).toHaveValue("");
  expect(screen.getByLabelText("Output field name")).toHaveValue("second");
  expect(change).not.toHaveBeenCalled();
  view.rerender(inspector("first"));
  fireEvent.click(screen.getByText("Build a condition"));
  expect(screen.getByLabelText("When true")).toHaveValue("123");
  expect(change).not.toHaveBeenCalled();
});
