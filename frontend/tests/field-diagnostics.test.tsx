import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { FieldOperationConfiguration } from "@/features/workflow/FieldOperationConfiguration";

it("marks only the invalid setting and clears outdated diagnostics", () => {
  const view = (invalid: boolean) => <I18nProvider initialLocale="en"><FieldOperationConfiguration type="field_arithmetic" config={{ operation: "divide", zero_policy: "error" }} onChange={() => {}} issues={invalid ? [{ code: "INVALID_NODE_CONFIG", node_id: null, edge_id: null, severity: "error", field: "config.zero_policy", message: "Choose a policy." }] : []} /></I18nProvider>;
  const { rerender } = render(view(true));
  expect(screen.getByLabelText("Division by zero")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Operation")).toHaveAttribute("aria-invalid", "false");
  expect(screen.getByLabelText("Division by zero")).toHaveAttribute("title", expect.stringContaining("Choose a policy."));
  rerender(view(false));
  expect(screen.getByLabelText("Division by zero")).toHaveAttribute("aria-invalid", "false");
});
