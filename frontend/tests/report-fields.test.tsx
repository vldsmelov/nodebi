import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "./render";
import { ReportFields } from "@/features/dashboard/ReportFields";
import { VisualizationConfiguration } from "@/features/workflow/VisualizationConfiguration";
import type { ResolvedColumn } from "@/features/workflow/types";

const columns: ResolvedColumn[] = [
  { column_id: "region-id", engine_name: "region", display_name: "Region", logical_type: "string", nullable: true, metadata: {} },
  { column_id: "amount-id", engine_name: "amount", display_name: "Amount", logical_type: "decimal", nullable: true, metadata: { currency: "RUB" } },
];
function mount(type = "bar_chart") {
  const changed = vi.fn();
  function Form() { const [config, setConfig] = useState<Record<string, unknown>>({ decimals: 4, title: "Saved title" }); return <ReportFields columns={columns} type={type} kind="dataset" config={config} onChange={next => { setConfig(next); changed(next); }} retry={() => {}} source={<div>Source</div>} />; }
  render(<Form />);
  return changed;
}
it("assigns typed stable fields through buttons and preserves all other settings", () => {
  const changed = mount();
  expect(screen.queryByRole("button", { name: "Use Region as value" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Use Region as category" }));
  fireEvent.click(screen.getByRole("button", { name: "Use Amount as value" }));
  expect(changed.mock.lastCall![0]).toEqual({ decimals: 4, title: "Saved title", category_column_id: "region-id", value_column_id: "amount-id" });
  expect(screen.getByRole("button", { name: "Use Amount as value" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "missing" } });
  expect(screen.getByText("No matching fields.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getByRole("button", { name: "Use Amount as value" })).toHaveAttribute("aria-pressed", "true");
});
it("toggles table visibility without deleting source fields", () => {
  const changed = mount("table");
  fireEvent.click(screen.getByRole("button", { name: "Show Region in table" }));
  expect(changed.mock.lastCall![0].column_ids).toEqual(["amount-id"]);
  fireEvent.click(screen.getByRole("button", { name: "Show Region in table" }));
  expect(changed.mock.lastCall![0].column_ids).toEqual(["amount-id", "region-id"]);
  expect(screen.getByRole("heading", { name: "Region" })).toBeVisible();
});
it("offers decimal scatter coordinates consistently in fields and detailed settings", () => {
  mount("scatter_chart");
  expect(screen.queryByRole("button", { name: "Use Region as category" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Use Amount as category" }));
  render(<VisualizationConfiguration type="scatter_chart" columns={columns} config={{ category_column_id: "amount-id" }} onChange={vi.fn()} />);
  expect(screen.getByLabelText("Chart category")).toHaveValue("amount-id");
});
it("does not invent roles for advanced charts and binds scalar indicators without choosing a column", () => {
  const props = { columns, config: {}, onChange: vi.fn(), retry: vi.fn(), source: null };
  const { rerender } = render(<ReportFields {...props} type="heatmap_chart" kind="dataset" />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.getByText("This chart has dedicated data roles. Configure them in the settings; preparation is not changed here.")).toBeVisible();
  rerender(<ReportFields {...props} type="kpi" kind="scalar" />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.getByText("A prepared single value is already bound to this indicator.")).toBeVisible();
});
it("keeps field loading and failure distinct and supports bounded wide-schema search", () => {
  const props = { columns, config: {}, onChange: vi.fn(), retry: vi.fn(), source: null, type: "table" };
  const { rerender } = render(<ReportFields {...props} loading />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading fields…");
  rerender(<ReportFields {...props} error={new Error("Unavailable")} />);
  expect(screen.getByRole("alert")).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Region" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(props.retry).toHaveBeenCalledOnce();
  rerender(<ReportFields {...props} columns={Array.from({ length: 101 }, (_, i) => ({ ...columns[0], column_id: `c${i}`, display_name: `Field ${i}` }))} />);
  expect(screen.getAllByRole("listitem")).toHaveLength(100);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Field 100" } });
  expect(screen.getByRole("button", { name: "Show Field 100 in table" })).toBeVisible();
});
