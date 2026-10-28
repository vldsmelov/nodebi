import { useState } from "react";
import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { FormulaEditor } from "@/features/workflow/FormulaEditor";

afterEach(() => vi.restoreAllMocks());
function Form() {
  const [expression, setExpression] = useState("");
  return <><FormulaEditor expression={expression} onChange={setExpression} columns={[
    { column_id: "amount", display_name: "Amount", engine_name: "amount", logical_type: "decimal", nullable: false, metadata: {} },
  ]} /><label>Scale<input type="number" defaultValue="2" /></label></>;
}
it.each(["next control", "new selection", "new expression"])("delayed field insertion preserves %s", action => {
  let callback: FrameRequestCallback | undefined;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(fn => { callback = fn; return 1; });
  render(<Form />);
  fireEvent.change(screen.getByLabelText("Insert formula field"), { target: { value: "amount" } });
  const input = screen.getByLabelText("Expression") as HTMLTextAreaElement;
  expect(input).toHaveValue("[amount]");
  expect(input).toHaveFocus();
  if (action === "next control") screen.getByLabelText("Scale").focus();
  else if (action === "new selection") {
    input.setSelectionRange(0, 2); fireEvent.select(input);
  } else fireEvent.change(input, { target: { value: "[amount] / 2" } });
  act(() => callback?.(0));
  if (action === "next control") expect(screen.getByLabelText("Scale")).toHaveFocus();
  else if (action === "new selection") expect([input.selectionStart, input.selectionEnd]).toEqual([0, 2]);
  else expect(input).toHaveValue("[amount] / 2");
});
