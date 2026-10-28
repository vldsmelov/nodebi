import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ReportComparisonControls } from "@/features/report-builder/ReportComparisonControls";
import { PeriodConfiguration } from "@/features/workflow/PeriodConfiguration";
import { VisualizationConfiguration } from "@/features/workflow/VisualizationConfiguration";
import { I18nProvider } from "@/lib/i18n";

afterEach(cleanup);
it("exposes exact decimal baselines in manual chart series settings", () => {
  render(<I18nProvider initialLocale="en"><VisualizationConfiguration type="line_chart" config={{ value_column_id: "current", additional_series: [{ column_id: "baseline", name: "" }] }} columns={[{ column_id: "baseline", engine_name: "Previous", display_name: "Previous", logical_type: "decimal", nullable: true, metadata: { scale: 2 } }]} onChange={vi.fn()} /></I18nProvider>);
  expect(screen.getByLabelText("Series field 2")).toHaveValue("baseline");
});
it("retains the saved measure before fields are loaded", () => {
  const change = vi.fn();
  render(<I18nProvider initialLocale="en"><ReportComparisonControls value={{ date_column_id: "date", value_column_id: "saved", unit: "month", compare_to: "previous_period", name: "Change", ratio_scale: 6 }} onChange={change} dates={[{ column_id: "date", display_name: "Date" }]} measures={[]} /></I18nProvider>);
  expect(screen.getByLabelText("Compared measure")).toHaveValue("saved");
  expect(change).not.toHaveBeenCalled();
  expect(screen.getByText(/Turning off comparison also removes calendar grouping/)).toBeVisible();
});
it("enables comparison with explicit calendar and stable measure bindings", () => {
  const change = vi.fn();
  render(<I18nProvider initialLocale="en"><ReportComparisonControls value={null} onChange={change} dates={[{ column_id: "date", display_name: "Date" }]} measures={[{ column_id: "measure_id", display_name: "Revenue" }]} /></I18nProvider>);
  fireEvent.click(screen.getByLabelText("Compare calendar periods"));
  expect(change).toHaveBeenCalledWith({ date_column_id: "date", value_column_id: "measure_id", unit: "month", compare_to: "previous_period", name: "Comparison", ratio_scale: 6 });
});
it("explains missing baseline and filters, and changes only authoring settings", () => {
  const change = vi.fn();
  const value = { date_column_id: "date", value_column_id: "amount", unit: "month" as const, name: "Sales", compare_to: "previous_period" as const, ratio_scale: 6 };
  render(<I18nProvider initialLocale="en"><ReportComparisonControls value={value} onChange={change} dates={[{ column_id: "date", display_name: "Date" }]} measures={[{ column_id: "amount", display_name: "Amount" }]} /></I18nProvider>);
  expect(screen.getByText(/Missing periods stay empty/)).toBeVisible();
  expect(screen.getByText(/Filters apply before/)).toBeVisible();
  fireEvent.change(screen.getByLabelText("Comparison baseline"), { target: { value: "previous_year" } });
  expect(change).toHaveBeenLastCalledWith({ ...value, compare_to: "previous_year" });
  fireEvent.click(screen.getByLabelText("Compare calendar periods"));
  expect(change).toHaveBeenLastCalledWith(null);
});
it("graph settings preserve unavailable field identities instead of silently rebinding", () => {
  const change = vi.fn();
  render(<I18nProvider initialLocale="en"><PeriodConfiguration type="period_comparison" config={{ date_column_id: "missing", value_column_id: "gone", name: "Sales", partitions: ["keep"] }} columns={[]} onChange={change} /></I18nProvider>);
  expect(screen.getByLabelText("Period date field")).toHaveValue("missing");
  fireEvent.change(screen.getByLabelText("Comparison name"), { target: { value: "Renamed" } });
  expect(change).toHaveBeenCalledWith({ date_column_id: "missing", value_column_id: "gone", name: "Renamed", partitions: ["keep"] });
});
