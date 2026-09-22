import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { FieldOperationConfiguration } from "@/features/workflow/FieldOperationConfiguration";
import { I18nProvider } from "@/lib/i18n";
afterEach(cleanup);

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
