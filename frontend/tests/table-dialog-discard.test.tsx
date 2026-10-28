import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GroupStepDialog } from "@/features/workflow/GroupStepDialog";
import { TableStepDialog } from "@/features/workflow/TableStepDialog";
import type { GraphDraft } from "@/features/workflow/autosave";
import type { WorkflowSchemaResult } from "@/features/workflow/types";
import { render } from "./render";

const original = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
beforeEach(() => Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
  configurable: true, value: function (this: HTMLDialogElement) { this.open = true; },
}));
afterEach(() => {
  vi.restoreAllMocks();
  if (original) Object.defineProperty(HTMLDialogElement.prototype, "showModal", original);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
});
const graph: GraphDraft = { name: "Test", format_version: 1, nodes: [{ id: "source", type: "excel_source", version: 1, position: { x: 0, y: 0 }, config: {} }], edges: [] };
const source = { nodeId: "source", port: "dataset" };
const schema = { nodes: [{ node_id: "source", outputs: { dataset: { kind: "dataset", columns: [] } } }], issues: [] } as unknown as WorkflowSchemaResult;

it.each([false, true])("saving with a scratch condition requires explicit omission (editing=%s)", editing => {
  const apply = vi.fn(), confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const existing = { id: "calc", type: "calculated_column", version: 1, position: { x: 300, y: 0 }, config: { name: "Result", expression: "(2) * (3)" } };
  const input = editing ? { ...graph, nodes: [...graph.nodes, existing] } : graph;
  render(<TableStepDialog mode="calculate" editNodeId={editing ? "calc" : undefined} source={source} graph={input} schema={schema} close={vi.fn()} apply={apply} />);
  if (!editing) {
    fireEvent.change(screen.getByLabelText("Output field name"), { target: { value: "Result" } });
    fireEvent.change(screen.getByLabelText("Left operand"), { target: { value: "constant" } });
    fireEvent.change(screen.getByLabelText("Left operand constant"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Right operand"), { target: { value: "constant" } });
    fireEvent.change(screen.getByLabelText("Right operand constant"), { target: { value: "3" } });
  }
  fireEvent.click(screen.getByText("Build a condition"));
  fireEvent.change(screen.getByLabelText("When true"), { target: { value: "Not inserted" } });
  const submit = screen.getByRole("button", { name: editing ? "Save calculation" : "Add step" });
  expect(submit).toBeEnabled();
  fireEvent.click(submit);
  expect(confirm).toHaveBeenCalledWith("The condition has unapplied changes. Save the current calculation without them?");
  expect(apply).not.toHaveBeenCalled();
  expect(screen.getByLabelText("When true")).toHaveValue("Not inserted");
  confirm.mockReturnValue(true);
  fireEvent.click(submit);
  expect(apply).toHaveBeenCalledOnce();
  const result = apply.mock.calls[0][0] as GraphDraft;
  expect(result.nodes.at(-1)?.config).toMatchObject({ name: "Result", expression: "(2) * (3)" });
  if (editing) expect(result.nodes.at(-1)?.id).toBe("calc");
});

it("protects a partially entered condition even before it becomes the calculation expression", () => {
  const close = vi.fn();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(<TableStepDialog mode="calculate" source={source} graph={graph} schema={schema} close={close} apply={vi.fn()} />);
  fireEvent.click(screen.getByText("Build a condition"));
  fireEvent.change(screen.getByLabelText("When true"), { target: { value: "Unapplied result" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(confirm).toHaveBeenCalledOnce();
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByLabelText("When true")).toHaveValue("Unapplied result");
  fireEvent.change(screen.getByLabelText("When true"), { target: { value: "" } });
  confirm.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(confirm).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledOnce();
});

it.each(["join", "calculate", "group"] as const)("%s protects unapplied edits on Cancel, Escape and reload", mode => {
  const close = vi.fn(), apply = vi.fn(), parentKey = vi.fn();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const view = render(<div onKeyDown={parentKey}>{mode === "group"
    ? <GroupStepDialog graph={graph} source={source} columns={[]} close={close} apply={apply} />
    : <TableStepDialog mode={mode} source={source} graph={graph} schema={schema} close={close} apply={apply} />}</div>);
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAccessibleName(mode === "group" ? "Summarize data" : mode === "join" ? "Join with…" : "Add calculated field");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(close).toHaveBeenCalledOnce();
  expect(confirm).not.toHaveBeenCalled();
  close.mockClear();
  if (mode === "group") fireEvent.click(screen.getByRole("button", { name: "Add aggregation" }));
  else fireEvent.change(screen.getByLabelText(mode === "join" ? "Join type" : "Output field name"), { target: { value: mode === "join" ? "left" : "Draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(confirm).toHaveBeenCalledOnce();
  expect(close).not.toHaveBeenCalled();
  const cancel = new Event("cancel", { cancelable: true });
  fireEvent(dialog, cancel);
  expect(cancel.defaultPrevented).toBe(true);
  expect(close).not.toHaveBeenCalled();
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  fireEvent.keyDown(dialog, { key: "Delete" });
  expect(parentKey).not.toHaveBeenCalled();
  expect(apply).not.toHaveBeenCalled();
  if (mode === "group") expect(screen.getByLabelText("Aggregate name 1")).toHaveValue("count_1");
  else expect(screen.getByLabelText(mode === "join" ? "Join type" : "Output field name")).toHaveValue(mode === "join" ? "left" : "Draft");
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(close).toHaveBeenCalledOnce();
  view.unmount();
  const after = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(after);
  expect(after.defaultPrevented).toBe(false);
});
