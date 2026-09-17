import { expect, it } from "vitest";
import { fieldProvenance, originLabel } from "@/features/workflow/field-provenance";
import type { WorkflowNode, WorkflowEdge, ResolvedColumn, WorkflowSchemaResult } from "@/features/workflow/types";
const node = (id: string, type: string, config = {}): WorkflowNode => ({ id, type, version: 1, position: { x: 0, y: 0 }, config });
const edge = (source: string, target: string, port = "input"): WorkflowEdge => ({ id: source + target + port, source_node_id: source, target_node_id: target, source_port: "dataset", target_port: port });
const field = (id: string, name = "Value", metadata = {}): ResolvedColumn => ({ column_id: id, engine_name: name, display_name: name, logical_type: "float", nullable: false, metadata });
const schema = (entries: [string, ResolvedColumn[]][]): WorkflowSchemaResult => ({ revision: 1, valid: true, issues: [], nodes: entries.map(([node_id, columns]) => ({ node_id, columns, issues: [] })) });
const sources = [{ id: "a", original_filename: "First.xlsx" }, { id: "b", original_filename: "Second.xlsx" }];
const a = node("a", "excel_source", { source_id: "a", sheet_name: "Sales" });
const b = node("b", "excel_source", { source_id: "b", sheet_name: "Costs" });
const original = field("col_1", "Value", { source_position: 26, header_levels: ["Costs", "Amount"] });
it("scopes identical IDs to Join ports and retains original headers through rename and calculation", () => {
  const right = field("join_right_col_1", "Other", { source_columns: ["col_1"], input_port: "right" });
  const renamed = { ...right, engine_name: "Renamed", display_name: "Renamed" };
  const calculated = field("calc", "Total", { source_columns: ["col_1", right.column_id] });
  const nodes = [a, b, node("j", "join"), node("r", "rename_columns"), node("c", "calculated_column")];
  const edges = [edge("a", "j", "left"), edge("b", "j", "right"), edge("j", "r"), edge("r", "c")];
  const result = fieldProvenance(nodes, edges, schema([["a", [original]], ["b", [original]], ["j", [original, right]], ["r", [original, renamed]], ["c", [original, renamed, calculated]]]), sources, "c");
  expect(result.col_1.origins.map(originLabel)).toEqual(["First.xlsx / Sales / AA / Costs / Amount"]);
  expect(result[right.column_id].origins.map(originLabel)).toEqual(["Second.xlsx / Costs / AA / Costs / Amount"]);
  expect(result.calc.origins).toHaveLength(2);
  expect(result.calc.complete).toBe(true);
});
it("traces both Union inputs by engine name even with different IDs and inherited join metadata", () => {
  const left = { ...original, metadata: { ...original.metadata, input_port: "right", source_columns: ["old"] } };
  const right = { ...original, column_id: "other" };
  const nodes = [a, b, node("u", "union")];
  const result = fieldProvenance(nodes, [edge("a", "u", "left"), edge("b", "u", "right")], schema([["a", [left]], ["b", [right]], ["u", [left]]]), sources, "u");
  expect(result.col_1.origins.map(origin => origin.source)).toEqual(["First.xlsx", "Second.xlsx"]);
});
it("distinguishes constant/row operations from missing lineage and terminates cycles", () => {
  const constant = field("constant", "Constant", { source_columns: [] });
  const unknown = field("unknown");
  const nodes = [node("c", "calculated_column")];
  const result = fieldProvenance(nodes, [], schema([["c", [constant, unknown]]]), [], "c");
  expect(result.constant).toEqual({ origins: [], complete: true });
  expect(result.unknown.complete).toBe(false);
  expect(fieldProvenance(nodes, [edge("c", "c")], schema([["c", [unknown]]]), [], "c").unknown.complete).toBe(false);
});

it("keeps same-named workbooks distinct rather than merging their origins", () => {
  const result = fieldProvenance([a, b, node("u", "union")], [edge("a", "u", "left"), edge("b", "u", "right")], schema([["a", [original]], ["b", [original]], ["u", [original]]]), sources.map(source => ({ ...source, original_filename: "Same.xlsx" })), "u");
  expect(result.col_1.origins.map(origin => origin.source)).toEqual(["Same.xlsx (a)", "Same.xlsx (b)"]);
});
