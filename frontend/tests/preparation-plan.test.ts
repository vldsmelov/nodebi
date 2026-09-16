import { expect, it } from "vitest";
import { preparationPlan, preparationRows } from "@/features/workflow/preparation-plan";
const columns = [
  { column_id: "a", engine_name: "amount", display_name: "Amount", logical_type: "string", nullable: true, metadata: {} },
  { column_id: "b", engine_name: "label", display_name: "Label", logical_type: "string", nullable: true, metadata: {} },
];
it("plans explicit conversion, null filtering, filling and final projection/rename in source order", () => {
  const rows = preparationRows(columns); rows[0] = { ...rows[0], target: "float", nulls: "zero", name: "Cost" }; rows[1].nulls = "drop";
  const plan = preparationPlan(columns, rows)!;
  expect(plan.map(step => step.type)).toEqual(["select_columns", "convert_types", "filter", "calculated_column", "select_columns", "rename_columns"]);
  expect(plan[1].config).toEqual({ conversions: [{ column_id: "a", target: "float", on_error: "error" }] });
  expect(plan[3].config.expression).toBe("coalesce([a], 0)");
  expect(plan[4].config.column_ids).toEqual([`calc_${plan[3].id.replaceAll("-", "")}`, "b"]);
  expect(plan[5].config.renames).toEqual([{ column_id: `calc_${plan[3].id.replaceAll("-", "")}`, new_name: "Cost" }]);
});
it("fills integers via exact string coalesce before restoring integer type", () => {
  const rows = preparationRows(columns); rows[0] = { ...rows[0], target: "integer", nulls: "zero" }; rows[1].keep = false;
  const plan = preparationPlan(columns, rows)!;
  expect(plan.map(step => step.type)).toEqual(["select_columns", "convert_types", "convert_types", "calculated_column", "select_columns", "convert_types", "rename_columns"]);
  expect(plan[2].config).toEqual({ conversions: [{ column_id: "a", target: "string", on_error: "error" }] });
  expect(plan[3].config.expression).toBe('coalesce([a], "0")');
  expect(plan[5].config.conversions).toEqual([{ column_id: `calc_${plan[3].id.replaceAll("-", "")}`, target: "integer", on_error: "error" }]);
});
it("rejects empty selections, normalized name collisions and incompatible fill policies", () => {
  const rows = preparationRows(columns); rows[0].name = " label "; expect(preparationPlan(columns, rows)).toBeNull();
  expect(preparationPlan(columns, rows.map(row => ({ ...row, keep: false })))).toBeNull();
  rows[0].name = "Amount"; rows[0].nulls = "zero"; expect(preparationPlan(columns, rows)).toBeNull();
  rows[0].nulls = "empty"; expect(preparationPlan(columns, rows)).not.toBeNull();
});
