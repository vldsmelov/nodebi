import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { ParameterInput, ParametersConfiguration, parameterTypePatch } from "@/features/workflow/ParametersConfiguration";
import { checkedValue, dashboardUrl, parseViewValues, resolveViewValues } from "@/features/dashboard/view-state";

afterEach(cleanup);
const definition = { name: "amount", label: "", required: false, logical_type: "decimal" as const, precision: 38, scale: 8, default: "0.00000001" };

it("keeps decimal input as exact strings and null without Number conversion", () => {
  const change = vi.fn();
  render(<ParameterInput definition={definition} value="0.00000001" onChange={change} label="Amount" />);
  fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "9007199254740993.12345678" } });
  expect(change).toHaveBeenLastCalledWith("9007199254740993.12345678");
  fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "" } });
  expect(change).toHaveBeenLastCalledWith(null);
});

it("edits decimal metadata and clears it when switching back to a legacy type", () => {
  const change = vi.fn();
  render(<ParametersConfiguration definitions={[definition]} onChange={change} values={{}} onValuesChange={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Decimal scale · amount"), { target: { value: "9" } });
  expect(change).toHaveBeenCalledWith([{ ...definition, scale: 9 }]);
  expect(parameterTypePatch("float")).toEqual({ logical_type: "float", default: null, precision: undefined, scale: undefined });
  expect(parameterTypePatch("decimal")).toEqual({ logical_type: "decimal", default: null, precision: 38, scale: 2 });
});

it.each(["1e2", "1,2", "NaN", "0.000000001", "9".repeat(39), 0.1, true])("rejects inexact dashboard values %s", value => {
  expect(() => checkedValue(definition, value)).toThrow();
});

it("canonicalizes exact URL values and keeps zero, negatives and null", () => {
  expect(checkedValue(definition, "+09007199254740993.120000000")).toBe("9007199254740993.12000000");
  expect(checkedValue(definition, "-0.00")).toBe("0.00000000");
  expect(checkedValue(definition, "-.12")).toBe("-0.12000000");
  expect(checkedValue(definition, null)).toBeNull();
  const url = dashboardUrl("p", "b", { amount: "9007199254740993.12345678" });
  const supplied = parseViewValues(new URL(url, "http://localhost").searchParams.get("parameters"));
  expect(resolveViewValues({ period_enabled: false, parameters: [definition], bindings: [], links: [] }, supplied)).toEqual({ amount: "9007199254740993.12345678" });
});
