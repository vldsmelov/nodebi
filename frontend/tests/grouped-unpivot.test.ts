import { expect, it } from "vitest";
import { groupedUnpivotPlan } from "@/features/workflow/grouped-unpivot";
const columns = ["key", "a", "b"].map(id => ({ column_id: id, engine_name: id, display_name: id, logical_type: id === "key" ? "string" : "integer", nullable: false, metadata: {} }));
const groups = [{ id: "g1", name: 'Group "one"' }, { id: "g2", name: "Group two" }];
const fields = columns.map((column, index) => ({ id: column.column_id, label: "Repeated", identifier: index === 0, group: index === 0 ? "" : groups[index - 1].id }));
it("preserves source identity and repeated labels while using ordinary branches and string constants", () => {
  const plan = groupedUnpivotPlan(columns, groups, fields, "kind")!;
  expect(plan.branches).toHaveLength(2); expect(plan.unions).toHaveLength(1);
  expect(plan.branches[0][0].config).toEqual({ identifiers: ["key"], columns: ["a"], labels: { a: "Repeated" } });
  expect(plan.branches[1][0].config.labels).toEqual({ b: "Repeated" });
  expect(plan.branches[0][1].config.expression).toBe(JSON.stringify(groups[0].name));
});
it("rejects empty groups, mixed types and reserved output collisions", () => {
  expect(groupedUnpivotPlan(columns, [...groups, { id: "empty", name: "Empty" }], fields, "kind")).toBeNull();
  expect(groupedUnpivotPlan(columns.map(column => column.column_id === "a" ? { ...column, logical_type: "float" } : column), groups, fields, "kind")).toBeNull();
  expect(groupedUnpivotPlan(columns, groups, fields, "key")).toBeNull();
  expect(groupedUnpivotPlan(columns, groups, fields, "value")).toBeNull();
});
