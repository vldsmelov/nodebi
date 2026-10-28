import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { ReportBuilder } from "@/features/report-builder/ReportBuilder";
import { apiRequest } from "@/lib/api";
import { readReportDraft, reportDraftKey } from "@/features/report-builder/report-draft";

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }));
vi.mock("@/features/dashboard/VisualizationView", () => ({ VisualizationResultView: ({ result }: { result: { type: string } }) => <div>Rendered {result.type}</div> }));
const profile = { column_id: "profile", engine_name: "profile", display_name: "Profile", logical_type: "string" };
vi.mock("@/features/ingestion/api", () => ({ listDatasets: async () => [{ id: "snapshot", source_id: "source", resource_id: "table", profile: { name: "Profiles" }, columns: [
  { column_id: "profile", engine_name: "profile", display_name: "Profile", logical_type: "string" },
  { column_id: "score", engine_name: "score", display_name: "Score", logical_type: "decimal" },
] }] }));
afterEach(() => { cleanup(); vi.clearAllMocks(); sessionStorage.clear(); });

it("requires explicit radar scales, recovers incomplete drafts and retains only checked output fields", async () => {
  vi.mocked(apiRequest).mockImplementation(async (url, init) => {
    const body = JSON.parse(init!.body as string);
    const columns = body.measures.map((m: { output_id: string; name: string }) => ({ column_id: `measure_${m.output_id.replaceAll("-", "")}`, display_name: m.name, engine_name: m.name, logical_type: "decimal", nullable: false, metadata: { precision: 38, scale: 2 } }));
    if (url.includes("/fields")) {
      expect(body).not.toHaveProperty("radar");
      return { measure_columns: columns, row_columns: [profile], row_outputs: {}, summary_outputs: {} };
    }
    return { rows: [{ profile: "A", Sum: "0.30", Mean: "0.15", Max: "0.20" }], columns: [profile, ...columns], steps: ["dataset_source", "group_by"], total_rows: 1, visualization: { type: "radar_chart" } };
  });
  const mount = () => render(<QueryClientProvider client={new QueryClient()}><ReportBuilder projectId="radar-project" /></QueryClientProvider>);
  let view = mount();
  await screen.findByRole("option", { name: "Profiles" });
  fireEvent.change(screen.getByLabelText("Prepared dataset"), { target: { value: "snapshot" } });
  fireEvent.change(screen.getByLabelText("Report name"), { target: { value: "Profiles" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  for (const [index, name] of ["Sum", "Mean", "Max"].entries()) {
    fireEvent.click(screen.getByRole("button", { name: "Add measure" }));
    fireEvent.change(screen.getAllByLabelText("Measure name")[index], { target: { value: name } });
  }
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByLabelText("Profile"));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.change(screen.getByLabelText("Presentation"), { target: { value: "radar_chart" } });
  expect(screen.getByRole("button", { name: "Preview calculation" })).toBeDisabled();
  expect(readReportDraft(reportDraftKey("radar-project", "create"), "create")?.state.kind).toBe("report");
  view.unmount(); view = mount();
  fireEvent.click(screen.getByRole("button", { name: "Restore local draft" }));
  expect(screen.getByLabelText("Radar normalization")).toHaveValue("");
  await waitFor(() => expect(screen.getByRole("button", { name: "Check presentation fields" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Check presentation fields" }));
  await waitFor(() => expect(screen.getByLabelText("Radar axis 1")).not.toHaveValue(""));
  expect(screen.getByRole("button", { name: "Preview calculation" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Radar normalization"), { target: { value: "shared" } });
  fireEvent.change(screen.getByLabelText("Radar minimum"), { target: { value: "0" } });
  fireEvent.change(screen.getByLabelText("Radar maximum"), { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview calculation" }));
  expect(await screen.findByText("Rendered radar_chart")).toBeVisible();
  const body = JSON.parse(vi.mocked(apiRequest).mock.calls.at(-1)![1]!.body as string);
  expect(body.radar.axes.map((a: { maximum: string }) => a.maximum)).toEqual(["1", "1", "1"]);
  expect(body).not.toHaveProperty("rows");
  expect(screen.getByRole("button", { name: "Save report" })).toBeEnabled();
  fireEvent.change(screen.getByLabelText("Radar maximum"), { target: { value: "2" } });
  expect(screen.queryByText("Rendered radar_chart")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save report" })).toBeDisabled();
  expect(screen.getByLabelText("Radar axis 1")).toHaveDisplayValue("Sum");
});
