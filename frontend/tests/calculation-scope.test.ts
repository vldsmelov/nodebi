import { expect, it } from "vitest";
import { calculationScope, filterReferences } from "@/features/workflow/calculation-scope";
import type { WorkflowNode, WorkflowEdge } from "@/features/workflow/types";
const node = (id: string, type: string): WorkflowNode => ({ id, type, version: 1, position: { x: 0, y: 0 } });
const edge = (source: string, target: string): WorkflowEdge => ({ id: source + target, source_node_id: source, target_node_id: target, source_port: "dataset", target_port: "input" });
it("separates filters before a total, after it and on other join inputs", () => {
  const nodes = [node("source", "excel_source"), node("before", "filter"), node("total", "window"), node("ratio", "calculated_column"), node("after", "filter"), node("other", "filter"), node("join", "join"), node("unused", "window")];
  const edges = [edge("source", "before"), edge("before", "total"), edge("total", "ratio"), edge("ratio", "after"), edge("after", "join"), edge("other", "join")];
  const result = calculationScope(nodes, edges, "join", "total");
  expect(result.candidates.map(node => node.id)).toEqual(["total"]);
  expect(result.scope?.beforeFilters.map(node => node.id)).toEqual(["before"]);
  expect(result.scope?.afterFilters.map(node => node.id)).toEqual(["after"]);
  expect(result.scope?.otherFilters.map(node => node.id)).toEqual(["other"]);
  expect([...result.scope!.before].sort()).toEqual(["before", "source", "total"]);
  expect([...result.scope!.path].sort()).toEqual(["after", "join", "ratio", "total"]);
  expect(calculationScope(nodes, edges, "join", "unused").scope).toBeNull();
});
it("does not infer a denominator from field names and terminates cyclic drafts", () => {
  const nodes = [node("total", "group_by"), node("ratio", "calculated_column")];
  const edges = [edge("total", "ratio"), edge("ratio", "total")];
  expect(calculationScope(nodes, edges, "ratio", "").scope).toBeNull();
  expect(calculationScope(nodes, edges, "ratio", "total").scope?.before.size).toBe(2);
});
it("retains repeated parameter application points and tolerates malformed conditions", () => {
  const filter = { ...node("filter", "filter"), config: { conditions: [null, 5, {}, { column_id: "group", parameter: "class" }, { column_id: "amount", value: 0 }, { column_id: "other", parameter: "class" }] } };
  expect(filterReferences(filter)).toEqual([{ field: "group", parameter: "class" }, { field: "amount", parameter: null }, { field: "other", parameter: "class" }]);
});
