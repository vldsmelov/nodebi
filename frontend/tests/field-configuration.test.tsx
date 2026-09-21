import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { FieldOperationConfiguration } from "@/features/workflow/FieldOperationConfiguration";
import { I18nProvider } from "@/lib/i18n";
afterEach(cleanup);

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
