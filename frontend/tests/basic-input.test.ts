import { expect, it } from "vitest";
import { basicInput } from "@/features/dashboard/basic-input";

it.each(["bar_chart", "line_chart", "area_chart"])("serializes %s without competing legacy bindings", type => {
  const config = { value_column_id: "v", category_column_id: "x", title: "Title", primary_series_name: "Actual", grain_column_ids: ["x"] };
  expect(basicInput(type, config, "dataset")).toEqual({ title: "Title", grain_column_ids: ["x"], spec: { version: 1, type, x: "x", y: [{ column_id: "v", name: "Actual" }] } });
  expect(config.value_column_id).toBe("v");
});

it.each(["pie_chart", "donut_chart"])("serializes %s roles", type => {
  expect(basicInput(type, { value_column_id: "v", category_column_id: "x" }, "dataset")).toEqual({ spec: { version: 1, type, category: "x", value: "v" } });
});

it("preserves explicit and all-field tables, scalar value and ordered named series", () => {
  expect(basicInput("table", {}, "dataset")).toEqual({ spec: { version: 1, type: "table", columns: null } });
  expect(basicInput("table", { column_ids: ["b", "a"], context_column_ids: ["id"] }, "dataset")).toEqual({ spec: { version: 1, type: "table", columns: ["b", "a"] }, context_column_ids: ["id"] });
  expect(basicInput("kpi", {}, "scalar")).toEqual({ spec: { version: 1, type: "kpi", value: null } });
  expect(basicInput("kpi", { value_column_id: "v" }, "dataset")).toEqual({ spec: { version: 1, type: "kpi", value: "v" } });
  expect(basicInput("scatter_chart", { value_column_id: "v", category_column_id: "x" }, "dataset")).toEqual({ spec: { version: 1, type: "scatter_chart", x: "x", y: "v" } });
  expect(basicInput("line_chart", { value_column_id: "v", category_column_id: "x", additional_series: [{ column_id: "p", name: "Plan" }] }, "dataset").spec).toMatchObject({ y: [{ column_id: "v", name: "" }, { column_id: "p", name: "Plan" }] });
});

it("does not rewrite advanced specifications", () => {
  const config = { spec: { type: "radar_chart" } };
  expect(basicInput("radar_chart", config, "dataset")).toBe(config);
});
