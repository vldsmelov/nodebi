import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { VisualizationResultView } from "@/features/dashboard/VisualizationView";
import type { VisualizationResult } from "@/features/dashboard/api";

const engine = vi.hoisted(() => ({ setOption: vi.fn(), dispose: vi.fn(), resize: vi.fn(), on: vi.fn(), dispatchAction: vi.fn() }));
vi.mock("echarts", () => ({ init: vi.fn(() => engine) }));
const result: VisualizationResult = { visualization_revision: 1, visualization_id: "chart", revision: 1,
  type: "bar_chart", title: "Revenue", category_field: "region", value_field: "amount", orientation: "vertical",
  number_format: "number", decimals: 2, currency: "USD", show_labels: false, show_legend: true,
  columns: [
    { column_id: "region", engine_name: "region", display_name: "Region", logical_type: "string", nullable: false, metadata: {} },
    { column_id: "amount", engine_name: "amount", display_name: "Amount", logical_type: "float", nullable: false, metadata: {} },
  ], rows: [{ region: "North", amount: 10 }], total_rows: 1, offset: 0, limit: 100, truncated: false };

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
function failOnce() {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  engine.setOption.mockImplementationOnce(() => { throw new Error("Renderer failed"); });
}

it("offers keyboard-capable legend controls synchronized with native legend events", async () => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  render(<VisualizationResultView result={result} />);
  fireEvent.click(await screen.findByText("Series visibility"));
  const toggle = screen.getByRole("button", { name: "amount", pressed: true });
  fireEvent.click(toggle);
  expect(engine.dispatchAction).toHaveBeenCalledWith({ type: "legendToggleSelect", name: "amount" });
  const changed = engine.on.mock.calls.find(([name]) => name === "legendselectchanged")![1];
  act(() => changed({ selected: { amount: false } }));
  expect(toggle).toHaveAttribute("aria-pressed", "false");
  act(() => changed({ selected: { amount: true } }));
  expect(toggle).toHaveAttribute("aria-pressed", "true");
});

it("recovers from a renderer failure when updated data arrives", async () => {
  failOnce();
  const { rerender } = render(<VisualizationResultView result={result} />);
  await screen.findByRole("alert");
  rerender(<VisualizationResultView result={{ ...result, revision: 2, rows: [{ region: "North", amount: 20 }] }} />);
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  expect(screen.getByRole("img", { name: "Revenue" })).toBeVisible();
  expect(engine.setOption).toHaveBeenCalledTimes(2);
  expect(engine.dispose).toHaveBeenCalledTimes(1);
});

it("offers a local retry without discarding the exact data table", async () => {
  failOnce();
  const { rerender } = render(<VisualizationResultView result={result} />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Retry chart" }));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  expect(engine.setOption).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("img", { name: "Revenue" })).toHaveFocus();
  const tableButton = screen.getByRole("button", { name: "Data table" });
  tableButton.focus();
  rerender(<VisualizationResultView result={{ ...result, revision: 2, rows: [{ region: "North", amount: 20 }] }} />);
  await waitFor(() => expect(engine.setOption).toHaveBeenCalledTimes(3));
  expect(tableButton).toHaveFocus();
  fireEvent.click(tableButton);
  expect(screen.getByRole("cell", { name: "20" })).toBeVisible();
  expect(screen.getByText("Total rows: 1 · page 1")).toBeVisible();
});
