import { expect, it } from "vitest";
import type { GraphDraft } from "@/features/workflow/autosave";
import type { NodeDefinition, WorkflowSchemaResult } from "@/features/workflow/types";
import { appendOperation, operationChoices } from "@/features/workflow/operation-drop";
import { fieldHandle } from "@/features/workflow/field-wires";
import { GraphHistory } from "@/features/workflow/graph-history";

const port = (id: string, kind: string) => ({ id, kind, display_name: id, required: true, max_connections: null });
const definition = (type: string, inputs: ReturnType<typeof port>[], kind: string): NodeDefinition => ({ type, version: 1, category: "transform", display_name: type, description: "", icon: null, config_schema: {}, schema_inference_mode: "static", input_ports: inputs, output_ports: [port("out", kind)] });
const catalog = [definition("source", [], "dataset"), definition("field_arithmetic", [port("a", "field"), port("b", "field")], "field"), ...["field_sum", "field_filter", "append_field"].map(type => definition(type, [port("table", "dataset"), port("value", "field")], "dataset")), definition("ordinary_transform", [port("table", "dataset")], "dataset")];
const graph: GraphDraft = { name: "Main", format_version: 2, nodes: [{ id: "table", type: "source", version: 1, position: { x: 0, y: 0 } }, { id: "expression", type: "field_arithmetic", version: 1, position: { x: 0, y: 0 } }], edges: [], parameters: [], presentation: { workbooks: [], blocks: [] } };
const context = { workflow_id: "workflow", node_id: "table", output_port: "out" };
const schema: WorkflowSchemaResult = { revision: 1, valid: true, issues: [], nodes: [
  { node_id: "table", columns: null, issues: [], outputs: { out: { kind: "dataset", nullable: false, row_context: context, columns: [{ column_id: "amount", engine_name: "amount", display_name: "Amount", logical_type: "integer", nullable: false, metadata: {} }, { column_id: "name", engine_name: "name", display_name: "Name", logical_type: "string", nullable: false, metadata: {} }] } } },
  { node_id: "expression", columns: null, issues: [], outputs: { out: { kind: "field", logical_type: "float", nullable: false, row_context: context } } },
] };

it("filters registry operations by field types and table/field contracts", () => {
  const numeric = operationChoices(graph, catalog, schema, { nodeId: "table", handle: fieldHandle("out", "amount") });
  expect(numeric).toContainEqual({ type: "field_sum", version: 1, port: "value" });
  expect(numeric.some(choice => choice.type === "field_filter" || choice.type === "ordinary_transform")).toBe(false);
  const text = operationChoices(graph, catalog, schema, { nodeId: "table", handle: fieldHandle("out", "name") });
  expect(text.map(choice => choice.type)).toEqual(["append_field"]);
  const table = operationChoices(graph, catalog, schema, { nodeId: "table", handle: "out" });
  expect(table).toContainEqual({ type: "ordinary_transform", version: 1, port: "table" });
});

it("offers and creates the compatible version even when an older contract comes first", () => {
  const old = definition("chart", [port("input", "dataset")], "dataset");
  const modern = { ...old, version: 2, input_ports: [port("value", "field")] };
  const definitions = [...catalog, old, modern];
  const source = { nodeId: "table", handle: fieldHandle("out", "amount") };
  const choices = operationChoices(graph, definitions, schema, source).filter(choice => choice.type === "chart");
  expect(choices).toEqual([{ type: "chart", version: 2, port: "value" }]);
  const next = appendOperation(graph, definitions, schema, source, choices[0], { x: 1, y: 2 }, "chart")!;
  expect(next.nodes.at(-1)?.version).toBe(2);
  expect(next.edges.at(-1)?.target_port).toBe("value");
  expect(graph.nodes).toHaveLength(2);
});

it("connects the exact expression row context and undoes node plus wires as one action", () => {
  const next = appendOperation(graph, catalog, schema, { nodeId: "expression", handle: "out" }, { type: "field_sum", version: 1, port: "value" }, { x: 250, y: 20 }, "sum")!;
  expect(next.edges.map(edge => [edge.source_node_id, edge.target_node_id, edge.target_port])).toEqual([["expression", "sum", "value"], ["table", "sum", "table"]]);
  expect(next.nodes[2].position).toEqual({ x: 250, y: 20 });
  expect(next.parameters).toBe(graph.parameters);
  expect(next.presentation).toBe(graph.presentation);
  const history = new GraphHistory(graph); history.record(next);
  expect(history.undo()).toEqual(graph);
  expect(history.redo()).toEqual(next);
});

it("rejects stale/missing endpoints and rechecks capacity including the automatic table wire", () => {
  const source = { nodeId: "table", handle: fieldHandle("out", "amount") };
  expect(operationChoices(graph, catalog, undefined, source)).toEqual([]);
  expect(operationChoices(graph, catalog, schema, { ...source, handle: fieldHandle("out", "removed") })).toEqual([]);
  expect(operationChoices({ ...graph, nodes: [] }, catalog, schema, source)).toEqual([]);
  const limited = structuredClone(catalog); limited[0].output_ports[0].max_connections = 1;
  expect(operationChoices(graph, limited, schema, source).some(choice => choice.type === "field_sum")).toBe(false);
  expect(graph.edges).toEqual([]);
  expect(graph.nodes).toHaveLength(2);
});

it("does not create undeclared composite boundary connections", () => {
  const source = { nodeId: "expression", handle: "out" };
  const withBlock: GraphDraft = { ...graph, presentation: { blocks: [{ id: "block", label: "Calculation", node_ids: ["expression"], position: { x: 0, y: 0 }, collapsed: false, inputs: [], outputs: [] }] } };
  expect(operationChoices(withBlock, catalog, schema, source)).toEqual([]);
  withBlock.presentation!.blocks![0].outputs = [{ id: "port", label: "Result", node_id: "expression", port: "out" }];
  expect(operationChoices(withBlock, catalog, schema, source).length).toBeGreaterThan(0);
});

it("connects chart fields with their exact table and rejects foreign contexts and scalar KPI fields", () => {
  const bar = { ...definition("bar_chart", [port("table", "dataset"), port("category", "field"), port("value", "field")], "dataset"), version: 2 };
  const kpi = { ...definition("kpi", [port("value", "scalar")], "dataset"), version: 2 };
  const definitions = [...catalog, bar, kpi];
  const source = { nodeId: "expression", handle: "out" };
  const choices = operationChoices(graph, definitions, schema, source);
  expect(choices).toContainEqual({ type: "bar_chart", version: 2, port: "value" });
  expect(choices.some(choice => choice.type === "kpi")).toBe(false);
  const next = appendOperation(graph, definitions, schema, source, { type: "bar_chart", version: 2, port: "value" }, { x: 0, y: 0 }, "chart")!;
  expect(next.edges.map(edge => [edge.source_node_id, edge.target_port])).toEqual([["expression", "value"], ["table", "table"]]);
  const text = operationChoices(graph, definitions, schema, { nodeId: "table", handle: fieldHandle("out", "name") }).filter(choice => choice.type === "bar_chart");
  expect(text).toEqual([{ type: "bar_chart", version: 2, port: "category" }]);
});
