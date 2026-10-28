import { fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ConditionBuilder } from "@/features/workflow/ConditionBuilder";
import { loadConditionDraft } from "@/features/workflow/condition-draft";
import { resetDocumentDrafts } from "@/features/workspace/document-drafts";
import { render } from "./render";

afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); });
const columns = [{ column_id: "x", engine_name: "X", display_name: "X", logical_type: "integer", nullable: false, metadata: {} }];
function form(apply = vi.fn(), fields = columns) {
  return <ConditionBuilder exact columns={fields} draftKey="condition-test" onApply={apply} />;
}
function edit() {
  fireEvent.click(screen.getByText("Build a condition"));
  fireEvent.change(screen.getByLabelText("Condition field"), { target: { value: "x" } });
  fireEvent.change(screen.getByLabelText("Condition value"), { target: { value: "9007199254740993" } });
  fireEvent.change(screen.getByLabelText("When true"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("Otherwise"), { target: { value: "0" } });
}
it("recovers through a fresh document without applying and retires inserted drafts", () => {
  const apply = vi.fn();
  const first = render(form(apply)); edit(); first.unmount(); resetDocumentDrafts();
  const second = render(form(apply));
  fireEvent.click(screen.getByText("Build a condition"));
  expect(screen.getByLabelText("Condition value")).toHaveValue("9007199254740993");
  expect(apply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Use condition" }));
  expect(apply).toHaveBeenCalledWith("if_else([x] == 9007199254740993, 1, 0)");
  second.unmount(); resetDocumentDrafts(); render(form());
  fireEvent.click(screen.getByText("Build a condition"));
  expect(screen.getByLabelText("Condition value")).toHaveValue("");
});
it("recovers the latest memory draft over stale storage after quota failure", () => {
  const first = render(form()); edit();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  fireEvent.change(screen.getByLabelText("When true"), { target: { value: "123" } });
  expect(screen.getByRole("alert")).toHaveTextContent("temporary draft");
  first.unmount(); render(form());
  fireEvent.click(screen.getByText("Build a condition"));
  expect(screen.getByLabelText("When true")).toHaveValue("123");
  expect(screen.getByRole("alert")).toHaveTextContent("temporary draft");
});
it("keeps a same-document copy when storage reads and writes are denied", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
  const first = render(form()); edit(); first.unmount(); render(form());
  fireEvent.click(screen.getByText("Build a condition"));
  expect(screen.getByLabelText("Condition value")).toHaveValue("9007199254740993");
  expect(screen.getByRole("alert")).toHaveTextContent("temporary draft");
});
it("does not revive an inserted draft on remount after storage cleanup fails", () => {
  const first = render(form()); edit();
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("denied"); });
  fireEvent.click(screen.getByRole("button", { name: "Use condition" }));
  first.unmount(); render(form());
  fireEvent.click(screen.getByText("Build a condition"));
  expect(screen.getByLabelText("When true")).toHaveValue("");
});
it("fails discard closed, then clears only scratch after successful explicit discard", () => {
  const apply = vi.fn(); render(form(apply)); edit();
  const remove = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("denied"); });
  fireEvent.click(screen.getByRole("button", { name: "Discard condition draft" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Nothing was discarded");
  expect(screen.getByLabelText("When true")).toHaveValue("1");
  remove.mockRestore(); fireEvent.click(screen.getByRole("button", { name: "Discard condition draft" }));
  expect(screen.getByLabelText("When true")).toHaveValue("");
  expect(sessionStorage.getItem("condition-test")).toBeNull();
  expect(apply).not.toHaveBeenCalled();
});
it("retains restored values but refuses insertion after their field disappears", () => {
  const first = render(form()); edit(); first.unmount(); render(form(vi.fn(), []));
  fireEvent.click(screen.getByText("Build a condition"));
  expect(screen.getByLabelText("Condition value")).toHaveValue("9007199254740993");
  expect(screen.getByRole("button", { name: "Use condition" })).toBeDisabled();
});
it.each(["null", "{}", "{", JSON.stringify({ version: 1, exact: true, values: { bad: "payload" }, baseline: {} })])("rejects invalid recovery %s", raw => {
  sessionStorage.setItem("condition-test", raw);
  expect(loadConditionDraft("condition-test", true).error).toBe("The local draft could not be restored.");
  expect(sessionStorage.getItem("condition-test")).toBe(raw);
});
