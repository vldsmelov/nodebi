import { describe, expect, it } from "vitest";
import { connectionError, fieldHandle, readHandle, renderWire, saveWire } from "@/features/workflow/field-wires";
import type { NodeDefinition, WorkflowSchemaResult } from "@/features/workflow/types";
import type { GraphDraft } from "@/features/workflow/autosave";
import { fieldPath, inputHint } from "@/features/workflow/field-interaction";

const port = (id: string, kind: string, accepted_kinds: string[] = []) => ({ id, kind, accepted_kinds, display_name: id, required: true, max_connections: null });
const catalog: NodeDefinition[] = [
  { type: "table", version: 1, category: "source", display_name: "Table", description: "", icon: null, config_schema: {}, schema_inference_mode: "static", input_ports: [], output_ports: [port("data", "dataset")] },
  { type: "field_arithmetic", version: 1, category: "transform", display_name: "Math", description: "", icon: null, config_schema: {}, schema_inference_mode: "static", input_ports: [port("a", "field", ["scalar"]), port("b", "field", ["scalar"])], output_ports: [port("value", "field", ["scalar"])] },
];
const graph: GraphDraft = { format_version: 2, name: "Test", nodes: ["one", "two", "math"].map(id => ({ id, type: id === "math" ? "field_arithmetic" : "table", version: 1, position: { x: 0, y: 0 } })), edges: [] };
const schema: WorkflowSchemaResult = { revision: 1, valid: true, issues: [], nodes: ["one", "two"].map(id => ({ node_id: id, columns: null, issues: [], outputs: { data: { kind: "dataset", nullable: false, columns: [{ column_id: "q", engine_name: "q", display_name: "Same name", logical_type: "integer", nullable: false, metadata: {} }], row_context: { workflow_id: "workflow", node_id: id, output_port: "data" } } } })) };
describe("typed field connections", () => {
  it("roundtrips unusual identities without storing display handles as ports", () => {
    const column = 'a:b["unicode"]';
    const connection = { source: "one", target: "math", sourceHandle: fieldHandle("data", column), targetHandle: "a" };
    expect(readHandle(connection.sourceHandle)).toEqual({ port: "data", column });
    const wire = saveWire(connection, "edge");
    expect(wire.source_port).toBe("data"); expect(wire.source_column_id).toBe(column);
    expect(renderWire(wire).sourceHandle).toBe(connection.sourceHandle);
  });
  it("accepts same-context fields, rejects tables, missing fields and foreign contexts", () => {
    const first = { source: "one", target: "math", sourceHandle: fieldHandle("data", "q"), targetHandle: "a" };
    expect(connectionError(graph, catalog, first, schema)).toBeNull();
    const connected = { ...graph, edges: [saveWire(first, "edge")] };
    expect(connectionError(connected, catalog, { ...first, targetHandle: "b" }, schema)).toBeNull();
    expect(connectionError(connected, catalog, { ...first, source: "two", targetHandle: "b" }, schema)).toContain("different rows");
    expect(connectionError(graph, catalog, { ...first, sourceHandle: "data" }, schema)).toContain("compatible");
    expect(connectionError(graph, catalog, { ...first, sourceHandle: fieldHandle("data", "removed") }, schema)).toContain("unavailable");
  });
  it("rejects cycles even before schemas exist", () => {
    expect(connectionError(graph, catalog, { source: "math", target: "math", sourceHandle: "value", targetHandle: "a" })).toContain("cycle");
  });
  it("uses pending hints without current schemas and rejects explicit nonnumeric arithmetic", () => {
    const source = { nodeId: "one", handle: fieldHandle("data", "q") };
    expect(inputHint(graph, catalog, source, "math", "a").state).toBe("pending");
    expect(inputHint(graph, catalog, source, "math", "a", schema).state).toBe("compatible");
    const textSchema = structuredClone(schema);
    textSchema.nodes[0].outputs!.data.columns![0].logical_type = "string";
    expect(inputHint(graph, catalog, source, "math", "a", textSchema)).toMatchObject({ state: "blocked", message: expect.stringContaining("numeric") });
    const connected = { ...graph, edges: [saveWire({ source: "two", sourceHandle: fieldHandle("data", "q"), target: "math", targetHandle: "b" }, "edge")] };
    expect(inputHint(connected, catalog, source, "math", "a", schema)).toMatchObject({ state: "blocked", message: expect.stringContaining("different rows") });
  });
  it("traces exact projected identities through expressions and stops at table boundaries", () => {
    const nodes = [...graph.nodes, { ...graph.nodes[2], id: "next" }, { ...graph.nodes[0], id: "boundary" }, { ...graph.nodes[2], id: "after" }];
    const edges = [
      saveWire({ source: "one", sourceHandle: fieldHandle("data", "q"), target: "math", targetHandle: "a" }, "chosen"),
      saveWire({ source: "one", sourceHandle: fieldHandle("data", "different"), target: "math", targetHandle: "b" }, "other"),
      saveWire({ source: "math", sourceHandle: "value", target: "next", targetHandle: "a" }, "expression"),
      saveWire({ source: "next", sourceHandle: "value", target: "boundary", targetHandle: "input" }, "stop"),
      saveWire({ source: "boundary", sourceHandle: fieldHandle("data", "q"), target: "after", targetHandle: "a" }, "past-boundary"),
    ];
    const draft = { ...graph, nodes, edges };
    expect([...fieldPath(draft, catalog, { nodeId: "one", handle: fieldHandle("data", "q") })].sort()).toEqual(["chosen", "expression", "stop"]);
    expect([...fieldPath(draft, catalog, { nodeId: "math", handle: "value" })].sort()).toEqual(["chosen", "expression", "other", "stop"]);
    expect([...fieldPath(draft, catalog, { nodeId: "boundary", handle: fieldHandle("data", "q") })]).toEqual(["past-boundary"]);
  });
  it("requires explicit boolean and comparison types without rejecting numeric widening", () => {
    const types = ["field_logical", "field_filter", "field_sum", "field_compare"];
    const definitions = [...catalog, ...types.map(type => ({ ...catalog[1], type, input_ports: [port("a", "field", ["scalar"]), port("b", "field", ["scalar"]), port("value", "field")] }))];
    const typedGraph = { ...graph, nodes: [...graph.nodes, ...types.map(type => ({ id: type, type, version: 1, position: { x: 0, y: 0 }, config: { operation: "not" } }))] };
    const wire = { source: "one", sourceHandle: fieldHandle("data", "q"), target: "field_logical", targetHandle: "a" };
    expect(connectionError(typedGraph, definitions, wire, schema)).toContain("boolean");
    expect(connectionError(typedGraph, definitions, { ...wire, target: "field_filter", targetHandle: "value" }, schema)).toContain("boolean");
    const booleans = structuredClone(schema);
    booleans.nodes[0].outputs!.data.columns![0].logical_type = "boolean";
    expect(connectionError(typedGraph, definitions, wire, booleans)).toBeNull();
    expect(connectionError(typedGraph, definitions, { ...wire, targetHandle: "b" }, booleans)).toContain("NOT");
    expect(connectionError(typedGraph, definitions, { ...wire, target: "field_sum", targetHandle: "value" }, booleans)).toContain("numeric");
    const comparison = { ...typedGraph, edges: [saveWire({ ...wire, target: "field_compare", targetHandle: "b" }, "compare")] };
    const numeric = structuredClone(schema);
    numeric.nodes[0].outputs!.data.columns!.push({ ...numeric.nodes[0].outputs!.data.columns![0], column_id: "float", logical_type: "float" });
    expect(connectionError(comparison, definitions, { ...wire, target: "field_compare", sourceHandle: fieldHandle("data", "float") }, numeric)).toBeNull();
    numeric.nodes[0].outputs!.data.columns![1].logical_type = "string";
    expect(connectionError(comparison, definitions, { ...wire, target: "field_compare", sourceHandle: fieldHandle("data", "float") }, numeric)).toContain("compatible explicit");
  });
});
