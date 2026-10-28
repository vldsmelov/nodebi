import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DashboardPeriod, type Period, type PeriodScratch } from "@/features/dashboard/DashboardPeriod";
import { I18nProvider } from "@/lib/i18n";

afterEach(cleanup);
const notice = "Date edits are not applied. Apply the period or choose All time.";
function Harness({ change }: { change: (value: Period | null) => void }) {
  const [period, setPeriod] = useState<Period | null>({ start: "2026-01-01", end: "2026-01-31" });
  const [scratch, setScratch] = useState<PeriodScratch>({ start: "2026-02-01", end: "" });
  return <DashboardPeriod period={period} scratch={scratch} onScratchChange={setScratch} onChange={value => { change(value); setPeriod(value); }} />;
}
it("retains unapplied incomplete/reversed dates, validates explicitly and never silently changes the period", () => {
  const change = vi.fn();
  render(<I18nProvider initialLocale="en"><Harness change={change} /></I18nProvider>);
  expect(screen.getByText(notice)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Apply period" }));
  expect(screen.getByRole("alert")).toBeVisible();
  expect(change).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-01-31" } });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Apply period" }));
  expect(change).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-02-28" } });
  const apply = screen.getByRole("button", { name: "Apply period" });
  apply.focus(); fireEvent.click(apply);
  expect(change).toHaveBeenCalledWith({ start: "2026-02-01", end: "2026-02-28" });
  expect(screen.queryByText(notice)).not.toBeInTheDocument();
  expect(apply).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "All time" }));
  expect(change).toHaveBeenLastCalledWith(null);
  expect(screen.getByLabelText("Start date")).toHaveValue("");
  expect(screen.queryByText(notice)).not.toBeInTheDocument();
});
it("also discloses unconfirmed edits in the existing local dashboard control", () => {
  const change = vi.fn();
  render(<I18nProvider initialLocale="en"><DashboardPeriod period={null} onChange={change} /></I18nProvider>);
  fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-10-01" } });
  expect(screen.getByText(notice)).toBeVisible();
  expect(change).not.toHaveBeenCalled();
});
