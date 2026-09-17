import { expect, it } from "vitest";
import { analyticsPlan, upstreamFilters, type AnalyticsOptions } from "@/features/workflow/analytics-plan";
import type { ResolvedColumn, WorkflowNode } from "@/features/workflow/types";
const columns: ResolvedColumn[] = ["amount", "group", "id"].map((id, index) => ({ column_id: id, engine_name: id, display_name: id, logical_type: index === 1 ? "string" : "integer", nullable: false, metadata: {} }));
const base: AnalyticsOptions = { mode: "share", value: "amount", partitions: ["group"], name: "Share", denominatorName: "Total", zero: "null", tie: "id", direction: "descending", filterField: "", parameter: "" };
const parameters = [{ name: "item", logical_type: "integer" as const, label: "Item" }];
it("builds partition total before ratio and parameter selection, with a stable denominator reference", () => {
  const plan = analyticsPlan(columns, { ...base, filterField: "id", parameter: "item" }, parameters)!;
  expect(plan.map(step => step.type)).toEqual(["window", "calculated_column", "filter"]);
  expect(plan[0].config.partitions).toEqual(["group"]);
  expect(plan[1].config.expression).toBe(`safe_divide([amount], [window_${plan[0].id.replaceAll("-", "")}], nullif(0, 0))`);
  expect(plan[2].config.conditions).toEqual([{ column_id: "id", operator: "equals", parameter: "item" }]);
  const global = analyticsPlan(columns, { ...base, partitions: [], zero: "zero" }, [])!;
  expect(global).toHaveLength(2); expect(global[0].config.partitions).toEqual([]);
  expect(global[1].config.expression).toMatch(/, 0\)$/);
});
it("creates row numbering with explicit direction and ascending tie-break before selection", () => {
  const plan = analyticsPlan(columns, { ...base, mode: "rank", filterField: "id", parameter: "item" }, parameters)!;
  expect(plan[0].config.order_by).toEqual([{ column_id: "amount", direction: "descending" }, { column_id: "id", direction: "ascending" }]);
  expect(plan.map(step => step.type)).toEqual(["window", "filter"]);
  expect(analyticsPlan(columns, { ...base, mode: "rank", tie: "amount" }, [])).toBeNull();
});
it("rejects stale fields, ambiguous names and incomplete/incompatible selection", () => {
  for (const patch of [{ name: "amount" }, { name: " Total " }, { partitions: ["group", "group"] }, { value: "group" }, { filterField: "id" }, { parameter: "item" }, { filterField: "group", parameter: "item" }, { mode: "rank" as const, tie: "gone" }]) {
    expect(analyticsPlan(columns, { ...base, ...patch }, parameters)).toBeNull();
  }
});
it("includes only upstream filters, handles both input branches and terminates cycles", () => {
  const nodes: WorkflowNode[] = ["a", "b", "other", "join"].map(id => ({ id, version: 1, type: id === "join" ? "join" : "filter", position: { x: 0, y: 0 } }));
  const edges = [["a", "join"], ["b", "join"], ["join", "a"]].map(([source, target]) => ({ id: source + target, source_node_id: source, target_node_id: target, source_port: "dataset", target_port: "input" }));
  expect(upstreamFilters(nodes, edges, "join").map(node => node.id).sort()).toEqual(["a", "b"]);
});
