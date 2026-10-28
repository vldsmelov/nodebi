import { fireEvent, screen, within } from "@testing-library/react";
import { useState } from "react";
import { expect, it } from "vitest";
import { render } from "./render";
import { AlignMeasuresConfiguration } from "@/features/workflow/AlignMeasuresConfiguration";
import type { ResolvedColumn } from "@/features/workflow/types";

const column = (id: string, type: string): ResolvedColumn => ({ column_id: id, engine_name: id, display_name: id, logical_type: type, nullable: true, metadata: {} });
function Form({ initial = {} }: { initial?: Record<string, unknown> }) {
  const [config, setConfig] = useState<Record<string, unknown>>(initial);
  return <><AlignMeasuresConfiguration config={config} inputColumns={{ left: [column("department", "string"), column("actual", "decimal")], right: [column("team", "string"), column("plan", "integer")] }} onChange={setConfig} /><output data-testid="config">{JSON.stringify(config)}</output></>;
}
const config = () => JSON.parse(screen.getByTestId("config").textContent!);

it("keeps keyboard context when adding or removing keys without changing surviving values", () => {
  render(<Form initial={{ keys: [{ left_key: "department", right_key: "team" }] }} />);
  fireEvent.click(screen.getByRole("button", { name: "Add key pair" }));
  expect(screen.getByLabelText("Left key 2")).toHaveFocus();
  fireEvent.click(screen.getAllByRole("button", { name: "Remove key pair" })[1]);
  expect(screen.getByLabelText("Left key")).toHaveFocus();
  expect(config().keys).toEqual([{ left_key: "department", right_key: "team" }]);
});

it("offers typed fields from each port and keeps one-to-one and null policy explicit", () => {
  render(<Form />);
  expect(screen.getByLabelText("Expected relationship")).toBeDisabled();
  expect(screen.getByLabelText("Expected relationship")).toHaveValue("one_to_one");
  expect(screen.getByLabelText("Empty alignment keys")).toHaveValue("reject");
  expect(within(screen.getByLabelText("Left key")).queryByRole("option", { name: "actual" })).toBeNull();
  expect(within(screen.getByLabelText("Left measure")).queryByRole("option", { name: "plan" })).toBeNull();
  fireEvent.change(screen.getByLabelText("Left key"), { target: { value: "department" } });
  fireEvent.change(screen.getByLabelText("Right key"), { target: { value: "team" } });
  fireEvent.change(screen.getByLabelText("Left measure"), { target: { value: "actual" } });
  fireEvent.change(screen.getByLabelText("Right measure"), { target: { value: "plan" } });
  fireEvent.change(screen.getByLabelText("Empty alignment keys"), { target: { value: "match" } });
  fireEvent.change(screen.getByLabelText("Left measure name"), { target: { value: "Actual" } });
  expect(config()).toEqual({ keys: [{ left_key: "department", right_key: "team" }], left_value: "actual", right_value: "plan", left_name: "Actual", null_keys: "match" });
});

it("preserves unavailable selections and limits alignment to eight key pairs", () => {
  render(<Form initial={{ left_value: "removed", keys: Array.from({ length: 8 }, () => ({ left_key: "missing", right_key: "team" })) }} />);
  expect(screen.getByLabelText("Left measure")).toHaveValue("removed");
  expect(screen.getByLabelText("Left key")).toHaveValue("missing");
  expect(screen.getByRole("button", { name: "Add key pair" })).toBeDisabled();
  fireEvent.click(screen.getAllByRole("button", { name: "Remove key pair" })[0]);
  expect(screen.getByRole("button", { name: "Add key pair" })).toBeEnabled();
  expect(config().left_value).toBe("removed");
});
