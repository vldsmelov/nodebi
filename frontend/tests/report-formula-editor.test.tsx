import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ReportFormulaEditor, type ReportFormula } from "@/features/report-builder/ReportFormulaEditor";
import { I18nProvider } from "@/lib/i18n";

it.each(["row", "summary", "alignment"] as const)("preserves formula identities and focus through %s additions/removals", scope => {
  let latest: ReportFormula[] = [];
  function Form() {
    const [formulas, setFormulas] = useState<ReportFormula[]>([]);
    latest = formulas;
    return <ReportFormulaEditor scope={scope} formulas={formulas} columns={[]} onChange={setFormulas} />;
  }
  render(<I18nProvider initialLocale="en"><Form /></I18nProvider>);
  const add = screen.getByRole("button", { name: /^Add .*formula$/ });
  for (const name of ["First", "Middle", "Last"]) {
    fireEvent.click(add);
    const field = screen.getAllByLabelText("Formula name").at(-1)!;
    expect(field).toHaveFocus();
    fireEvent.change(field, { target: { value: name } });
    fireEvent.change(screen.getAllByLabelText("Expression").at(-1)!, { target: { value: `${latest.length} * 2` } });
  }
  const before = structuredClone(latest);
  fireEvent.click(screen.getAllByRole("button", { name: "Remove formula" })[1]);
  expect(screen.getAllByLabelText("Formula name")[1]).toHaveFocus();
  expect(latest).toEqual([before[0], before[2]]);
  fireEvent.click(screen.getAllByRole("button", { name: "Remove formula" })[1]);
  expect(screen.getByLabelText("Formula name")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Remove formula" }));
  expect(add).toHaveFocus();
});
