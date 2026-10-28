import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { ReportBuilder } from "@/features/report-builder/ReportBuilder";
import { apiRequest } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }));
vi.mock("@/features/dashboard/VisualizationView", () => ({ VisualizationResultView: ({ result }: { result: { type: string } }) => <div>Rendered {result.type}</div> }));
vi.mock("@/features/ingestion/api", () => ({ listDatasets: async () => [{ id: "snapshot", source_id: "source", resource_id: "table", profile: { name: "Plan fact" }, columns: [
  { column_id: "month", engine_name: "month", display_name: "Month", logical_type: "string" },
  { column_id: "actual", engine_name: "actual", display_name: "Actual", logical_type: "decimal" },
  { column_id: "plan", engine_name: "plan", display_name: "Plan", logical_type: "decimal" },
] }] }));
afterEach(() => { cleanup(); vi.clearAllMocks(); sessionStorage.clear(); });

it("creates explicit combo bindings from server-checked aggregate fields and invalidates stale previews", async () => {
  vi.mocked(apiRequest).mockImplementation(async (url, init) => {
    const body = JSON.parse(init!.body as string);
    const columns = body.measures.map((m: { output_id: string; name: string }) => ({ column_id: `measure_${m.output_id.replaceAll("-", "")}`, display_name: m.name, engine_name: m.name, logical_type: "decimal", nullable: false, metadata: { precision: 38, scale: 2 } }));
    if (url.includes("/fields")) return { measure_columns: columns, row_columns: [], row_outputs: {}, summary_outputs: {} };
    return { rows: [{ Actual: "0.30", Plan: "0.50" }], columns, steps: ["dataset_source", "group_by"], total_rows: 1, visualization: { type: "combo_chart" } };
  });
  render(<QueryClientProvider client={new QueryClient()}><ReportBuilder projectId="project" /></QueryClientProvider>);
  await screen.findByRole("option", { name: "Plan fact" });
  fireEvent.change(screen.getByLabelText("Prepared dataset"), { target: { value: "snapshot" } });
  fireEvent.change(screen.getByLabelText("Report name"), { target: { value: "Plan fact" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  for (const [index, name] of ["Actual", "Plan"].entries()) {
    fireEvent.click(screen.getByRole("button", { name: "Add measure" }));
    fireEvent.change(screen.getAllByLabelText("Measure name")[index], { target: { value: name } });
    fireEvent.change(screen.getAllByLabelText("Field")[index], { target: { value: name.toLowerCase() } });
  }
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByLabelText("Month"));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.change(screen.getByLabelText("Presentation"), { target: { value: "combo_chart" } });
  expect(screen.getByRole("button", { name: "Preview calculation" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Check presentation fields" }));
  await waitFor(() => expect(screen.getByLabelText("Combination field 1")).not.toHaveValue(""));
  expect(screen.getByLabelText("Enable secondary axis")).not.toBeChecked();
  expect(screen.getByLabelText("Combination category")).toHaveValue("month");
  expect(screen.getByLabelText("Series style 1")).toHaveValue("bar");
  expect(screen.getByLabelText("Series style 2")).toHaveValue("line");
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  expect(await screen.findByText("Rendered combo_chart")).toBeVisible();
  expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled();
  const body = JSON.parse(vi.mocked(apiRequest).mock.calls.at(-1)![1]!.body as string);
  expect(body.combo.series.map((s: { kind: string }) => s.kind)).toEqual(["bar", "line"]);
  expect(body).not.toHaveProperty("rows");
  fireEvent.change(screen.getByLabelText("Series name 1"), { target: { value: "Actual bars" } });
  expect(screen.queryByText("Rendered combo_chart")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  expect(screen.getByLabelText("Combination field 1")).toHaveDisplayValue("Actual");
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  fireEvent.change(screen.getAllByLabelText("Measure name")[0], { target: { value: "Changed measure" } });
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByLabelText("Combination field 1")).toHaveDisplayValue("Unavailable field");
});
