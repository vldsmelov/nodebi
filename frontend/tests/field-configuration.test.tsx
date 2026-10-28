import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { FieldOperationConfiguration, fieldConfig } from "@/features/workflow/FieldOperationConfiguration";
import { I18nProvider } from "@/lib/i18n";
import { nodeCaption } from "@/features/workflow/node-caption";
afterEach(cleanup);

it("preserves exact expression precision when editing and distinguishes legacy defaults", () => {
  const config = fieldConfig("field_formula", 2);
  expect(fieldConfig("field_formula", 1)).toEqual({ expression: "coalesce(a, 0)" });
  const change = vi.fn();
  render(<FieldOperationConfiguration type="field_formula" version={2} config={config} onChange={change} />);
  fireEvent.change(screen.getByLabelText("Expression"), { target: { value: "a / 3 * 3" } });
  expect(change).toHaveBeenCalledWith({ ...config, expression: "a / 3 * 3" });
  expect(screen.getByText(/One half-even rounding/)).toBeVisible();
  fireEvent.change(screen.getByLabelText("Decimal scale"), { target: { value: "8" } });
  expect(change).toHaveBeenLastCalledWith({ ...config, scale: 8 });
});

it("keeps the exact version visible in graph and inspector captions", () => {
  const name = vi.fn((type: string, version?: number) => `${type}:${version}`);
  expect(nodeCaption({ name: "", format_version: 2, nodes: [], edges: [] }, { id: "n", type: "field_arithmetic", version: 2, position: { x: 0, y: 0 }, config: {} }, undefined, name)).toBe("field_arithmetic:2");
});

it("keeps exact constants as strings and distinguishes opt-in versions", () => {
  expect(fieldConfig("scalar_constant", 1).value).toBe(1);
  expect(fieldConfig("scalar_constant", 2).value).toBe("1.00");
  const change = vi.fn();
  render(<FieldOperationConfiguration type="scalar_constant" version={2} config={fieldConfig("scalar_constant", 2)} onChange={change} />);
  fireEvent.change(screen.getByLabelText("Exact decimal value"), { target: { value: "9007199254740993.12" } });
  expect(change).toHaveBeenCalledWith({ value: "9007199254740993.12", precision: 38, scale: 2, rounding: "half_even" });
  expect(screen.queryByLabelText("Value type")).not.toBeInTheDocument();
});

it("exposes explicit rounding boundaries for exact field arithmetic", () => {
  const change = vi.fn();
  render(<FieldOperationConfiguration type="field_arithmetic" version={2} config={fieldConfig("field_arithmetic", 2)} onChange={change} />);
  fireEvent.change(screen.getByLabelText("Decimal scale"), { target: { value: "8" } });
  expect(change).toHaveBeenCalledWith(expect.objectContaining({ scale: 8 }));
  expect(screen.getByText(/Half-even rounding at each arithmetic node/)).toBeVisible();
});

it("edits a field expression and explains the explicit one-row boundary", () => {
  const change = vi.fn();
  const view = render(<FieldOperationConfiguration type="field_formula" config={{ expression: "a + b" }} onChange={change} />);
  fireEvent.change(screen.getByLabelText("Expression"), { target: { value: "safe_divide(a, b, 0)" } });
  expect(change).toHaveBeenCalledWith({ expression: "safe_divide(a, b, 0)" });
  view.rerender(<FieldOperationConfiguration type="field_scalar" config={{}} onChange={change} />);
  expect(screen.getByText(/Requires exactly one row/)).toBeVisible();
});

it("localized scalar type controls submit canonical values", () => {
  const change = vi.fn();
  render(<I18nProvider initialLocale="ru"><FieldOperationConfiguration type="scalar_constant" config={{ value: 2 }} onChange={change} /></I18nProvider>);
  fireEvent.change(screen.getByLabelText("Тип значения"), { target: { value: "boolean" } });
  expect(change).toHaveBeenCalledWith({ logical_type: "boolean", value: true });
});

it("exposes explicit null policies for field filters", () => {
  const change = vi.fn();
  render(<FieldOperationConfiguration type="field_filter" config={{ null_policy: "drop" }} onChange={change} />);
  fireEvent.change(screen.getByLabelText("Null predicate"), { target: { value: "error" } });
  expect(change).toHaveBeenCalledWith({ null_policy: "error" });
});
