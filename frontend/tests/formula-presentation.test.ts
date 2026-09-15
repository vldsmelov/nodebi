import { expect, it } from "vitest";
import { formulaParts, formulaFieldLabel, replaceFormulaSelection } from "@/features/workflow/formula-presentation";
const field = { column_id: "a", engine_name: "amount", display_name: "Amount", logical_type: "float", nullable: false, metadata: {} };
it("keeps quoted references literal and binds real tokens by identity after renaming", () => {
  const expression = 'coalesce([a], "[a]") + [gone]';
  const parts = formulaParts(expression, [field]);
  expect(parts.map(part => part.text).join("")).toBe(expression);
  expect(parts.filter(part => part.reference).map(part => part.reference)).toEqual(["a", "gone"]);
  expect(formulaParts(expression, [{ ...field, display_name: "Renamed" }]).find(part => part.reference === "a")?.column?.display_name).toBe("Renamed");
  expect(parts.find(part => part.reference === "gone")?.column).toBeUndefined();
  expect(formulaParts("'escaped \\' [a]' + [a]", [field]).filter(part => part.reference)).toHaveLength(1);
});
it("replaces just the selected span and disambiguates duplicate field names", () => {
  expect(replaceFormulaSelection("2 * [a] + 5", "[b]", 4, 7)).toEqual({ expression: "2 * [b] + 5", cursor: 7 });
  const duplicate = { ...field, column_id: "b" };
  expect(formulaFieldLabel(field, [field, duplicate])).not.toBe(formulaFieldLabel(duplicate, [field, duplicate]));
});
