import { fireEvent, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { init } from "echarts";
import { render } from "./render";
import { HierarchyView } from "@/features/dashboard/HierarchyView";
import { hierarchyOptions, hierarchySelection } from "@/features/dashboard/hierarchy";
import type { VisualizationResult } from "@/features/dashboard/api";
import { VisualizationConfiguration } from "@/features/workflow/VisualizationConfiguration";

const roles = { row_id: "id", parent_id: "parent", depth: "depth", kind: "kind", source_count: "count" };
const columns = ["id", "parent", "depth", "kind", "count", "region", "branch", "amount", "mean"].map(name => ({ column_id: name, engine_name: name, display_name: name, logical_type: "string" as const, nullable: true, metadata: name === "amount" ? { aggregation: "sum" } : name === "mean" ? { aggregation: "average" } : {} }));
const rows = [{ id: "a", parent: "n", depth: 2, region: "North", branch: "A", amount: "9007199254740993.11" }, { id: "z", parent: "n", depth: 2, region: "North", branch: null, amount: "0" }, { id: "n", parent: "root", depth: 1, region: "North", branch: null, amount: "9007199254740993.11" }, { id: "root", parent: null, depth: 0, region: null, branch: null, amount: "9007199254740993.11" }];
const result: VisualizationResult = {
  type: "treemap_chart", orientation: "vertical", visualization_revision: 1, visualization_id: "tree", revision: 1, title: "Hierarchy", category_field: null, value_field: null, number_format: "number", decimals: 2, currency: "RUB", show_legend: false, show_labels: true,
  spec: { version: 1, type: "treemap_chart", rows: roles, dimensions: ["region", "branch"], value_column_id: "amount" },
  hierarchy: { root_id: "root", total: rows[3].amount, zero_count: 1, points: rows.map(row => ({ id: row.id, parent_id: row.parent, depth: row.depth, weight: row.id === "z" ? 0 : 1, share_exact: row.id === "z" ? "0" : "1" })) },
  columns, rows, total_rows: 4, offset: 0, limit: 4, truncated: false,
};

it.each(["treemap_chart", "sunburst_chart"] as const)("renders readable normal and emphasized hierarchy labels for %s", type => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  try {
    for (const theme of ["light", "dark"] as const) {
      const chart = init(null, theme === "dark" ? "dark" : undefined, { renderer: "svg", ssr: true, width: 640, height: 400 });
      try {
        const drawing = { ...result, type };
        const option = hierarchyOptions(drawing, "en", theme);
        const series = (option.series as { label: object; emphasis: { label: object }; blur: { label: object } }[])[0];
        // A treemap's label box fills its tile; an opaque label background hides the data.
        for (const label of [series.label, series.emphasis.label, series.blur.label]) expect(label).not.toHaveProperty("backgroundColor");
        chart.setOption(option, true);
        for (const highlighted of [false, true]) {
          if (highlighted) chart.dispatchAction({ type: "highlight", seriesIndex: 0, name: "A" });
          const svg = new DOMParser().parseFromString(chart.renderToSVGString(), "image/svg+xml");
          for (const name of ["North", "A"]) {
            const text = Array.from(svg.querySelectorAll("text")).find(node => node.textContent === name);
            expect(text).toBeDefined();
            expect(text?.getAttribute("fill")).toBe(theme === "dark" ? "#d7dfef" : "#34415b");
            expect(Number(text?.getAttribute("fill-opacity") ?? 1)).toBe(1);
          }
          expect(chart.renderToSVGString()).toContain(`stroke="${theme === "dark" ? "#1c2738" : "#ffffff"}"`);
        }
        chart.setOption(hierarchyOptions({ ...drawing, show_labels: false }, "en", theme), true);
        expect(chart.renderToSVGString()).not.toContain(">A</text>");
      } finally { chart.dispose(); }
    }
  } finally { context.mockRestore(); }
});

it("builds both renderings from server weights without parsing exact numbers", () => {
  for (const type of ["treemap_chart", "sunburst_chart"] as const) {
    const option = hierarchyOptions({ ...result, type }, "en", "light");
    expect(option.series).toMatchObject([{ type: type === "treemap_chart" ? "treemap" : "sunburst", nodeClick: false, data: [{ id: "n", value: 1, children: [{ id: "a", value: 1 }, { id: "z", value: 0, name: "Missing category" }] }] }]);
    const series = option.series as { data: { children: { exactTooltip: string }[] }[] }[];
    expect(series[0].data[0].children[0].exactTooltip).toContain("9007199254740993.11");
  }
  expect(hierarchySelection(result, { data: { hierarchyIdentity: "z" }, dataIndex: 0 })).toEqual(rows[1]);
  expect(hierarchySelection(result, { dataIndex: 1 })).toBeUndefined();
});

it.each(["treemap_chart", "sunburst_chart"] as const)("retains exact hierarchy details as escaped bounded text for %s", type => {
  const option = hierarchyOptions({ ...result, type, rows: rows.map(row => ({ ...row, region: '<img src=x onerror=alert(1)> & "North"' })) }, "en", "dark");
  const tooltip = option.tooltip as { formatter: (event: unknown) => string };
  expect(tooltip).toMatchObject({ renderMode: "html", appendToBody: true, confine: true });
  const data = (option.series as { data: { children: { exactTooltip: string }[] }[] }[])[0].data[0].children[0];
  const parsed = new DOMParser().parseFromString(tooltip.formatter({ data }), "text/html");
  expect(parsed.querySelector("img")).toBeNull();
  expect(parsed.querySelector('[role="tooltip"]')?.textContent).toBe(data.exactTooltip);
  expect(data.exactTooltip).toContain("9007199254740993.11");
  expect(data.exactTooltip).toContain("Share of complete total: 1");
});

it("offers keyboard group navigation, exact table, null groups and stable selection", () => {
  const child = vi.fn(root => `Canvas ${root}`), select = vi.fn();
  render(<HierarchyView result={result} onSelect={select}>{child}</HierarchyView>);
  expect(screen.getByText("Canvas root")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Data table" }));
  expect(screen.getByRole("table")).toHaveClass("text-sm");
  expect(screen.getByRole("table")).toHaveAccessibleName();
  expect(screen.getByRole("table").parentElement).toHaveAttribute("role", "region");
  expect(screen.getByRole("table").parentElement).toHaveAccessibleName();
  expect(screen.getByRole("table").parentElement).toHaveAttribute("tabindex", "0");
  expect(screen.getByRole("table").parentElement).toHaveClass("min-w-0", "overflow-auto");
  const renderedTable = screen.getByRole("table") as HTMLTableElement;
  const firstRow = renderedTable.tBodies[0].rows[0];
  for (const [index, cell] of Array.from(firstRow.cells).entries()) {
    if (cell.classList.contains("text-right")) expect(renderedTable.tHead!.rows[0].cells[index]).toHaveClass("text-right");
  }
  fireEvent.click(screen.getByRole("button", { name: "Open group" }));
  expect(screen.getByRole("cell", { name: rows[0].amount })).toBeVisible();
  expect(screen.getByRole("rowheader", { name: "Missing category" })).toBeVisible();
  fireEvent.click(screen.getAllByRole("button", { name: "Select" })[1]);
  expect(select.mock.lastCall![0]).toMatchObject({ id: "z", amount: "0", branch: null });
  fireEvent.click(screen.getByRole("button", { name: "Chart" }));
  expect(screen.getByText("Canvas n")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Parent group" }));
  expect(screen.getByText("Canvas root")).toBeVisible();
  expect(screen.getByRole("button", { name: "Entire hierarchy" })).toBeDisabled();
});

it("does not draw invented area for a zero population", () => {
  render(<HierarchyView result={{ ...result, hierarchy: { ...result.hierarchy!, points: result.hierarchy!.points.map(p => ({ ...p, weight: 0, share_exact: null })) } }}>{() => "Canvas"}</HierarchyView>);
  expect(screen.getByRole("status")).toHaveTextContent("zero total");
  expect(screen.queryByText("Canvas")).not.toBeInTheDocument();
});

it("only offers additive measures while preserving the typed hierarchy roles", () => {
  const change = vi.fn();
  render(<VisualizationConfiguration type="sunburst_chart" config={{ spec: result.spec }} columns={columns} onChange={change} />);
  const field = screen.getByLabelText("Hierarchy area measure");
  expect(within(field).queryByRole("option", { name: "mean" })).toBeNull();
  fireEvent.change(field, { target: { value: "amount" } });
  expect(change).toHaveBeenCalledWith({ spec: result.spec });
});

it("distinguishes a positive unresolvable drawing weight from a true zero", () => {
  render(<HierarchyView result={{ ...result, hierarchy: { ...result.hierarchy!, points: result.hierarchy!.points.map(p => ({ ...p, weight: 0, share_exact: "1/1000000000000000000000000" })) } }}>{() => "Canvas"}</HierarchyView>);
  expect(screen.getByRole("status")).toHaveTextContent("too small for the drawing scale");
  expect(screen.getByRole("status")).not.toHaveTextContent("zero total");
});

it("pages immediate children without changing the population or branch", () => {
  const children = Array.from({ length: 110 }, (_, i) => ({ ...rows[0], id: `leaf${i}`, branch: `Leaf${i}`, amount: "1" }));
  const manyRows = [...children, ...rows.slice(2)];
  const many: VisualizationResult = { ...result, rows: manyRows, total_rows: 112, limit: 112, hierarchy: { ...result.hierarchy!, points: [...children.map(row => ({ id: row.id, parent_id: row.parent, depth: 2, weight: 1 / 110, share_exact: "1/110" })), ...result.hierarchy!.points.slice(2)] } };
  const chart = vi.fn(root => `Canvas ${root}`);
  render(<HierarchyView result={many}>{chart}</HierarchyView>);
  fireEvent.click(screen.getByRole("button", { name: "Data table" }));
  fireEvent.click(screen.getByRole("button", { name: "Open group" }));
  expect(screen.getAllByRole("rowheader")).toHaveLength(100);
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getAllByRole("rowheader")).toHaveLength(10);
  expect(screen.getByRole("rowheader", { name: "Leaf109" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Chart" }));
  expect(chart).toHaveBeenLastCalledWith("n");
});
