import { describe, expect, it } from "vitest";
import { connectionError, fieldHandle, readHandle, renderWire, saveWire } from "@/features/workflow/field-wires";
import type { NodeDefinition, WorkflowSchemaResult } from "@/features/workflow/types";
import type { GraphDraft } from "@/features/workflow/autosave";

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
});
