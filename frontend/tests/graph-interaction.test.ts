import { describe, expect, it } from "vitest";
import type { Edge } from "@xyflow/react";
import type { EditorNode } from "@/features/workflow/WorkflowNodeCard";
import { canConnect, dependencyIds, nodeLabel } from "@/features/workflow/graph-interaction";

const node = (id: string): EditorNode => ({ id, type: "workflowNode", position: { x: 0, y: 0 }, data: {
  config: {}, definition: { type: "filter", version: 1, category: "transform", display_name: "Filter", description: "", icon: null, config_schema: {}, schema_inference_mode: "static",
    input_ports: [{ id: "input", display_name: "Input", kind: "dataset", max_connections: 1, required: true }],
    output_ports: [{ id: "dataset", display_name: "Dataset", kind: "dataset", max_connections: null, required: true }],
  },
} });
const edge = (source: string, target: string): Edge => ({ id: `${source}-${target}`, source, target, sourceHandle: "dataset", targetHandle: "input" });
const connection = (source: string, target: string) => ({ source, target, sourceHandle: "dataset", targetHandle: "input" });

describe("graph authoring", () => {
  it("replaces an occupied input but rejects cycles, missing ports and saturated sources", () => {
    const nodes = ["a", "b", "c", "d"].map(node), edges = [edge("a", "b"), edge("b", "c")];
    expect(canConnect(nodes, edges, connection("d", "b"))).toBe(false);
    expect(canConnect(nodes, edges, connection("d", "b"), true)).toBe(true);
    expect(canConnect(nodes, edges, connection("c", "b"), true)).toBe(false);
    expect(canConnect(nodes, edges, connection("b", "b"), true)).toBe(false);
    expect(canConnect(nodes, edges, { ...connection("d", "b"), sourceHandle: "missing" }, true)).toBe(false);
    nodes[0].data.definition.output_ports[0].max_connections = 1;
    expect(canConnect(nodes, edges, connection("a", "d"), true)).toBe(false);
    expect(canConnect(nodes, edges, connection("a", "b"), true)).toBe(true);
  });
  it("traces joins and branches without including unrelated nodes or mutating edges", () => {
    const edges = [edge("a", "c"), edge("b", "c"), edge("c", "d"), edge("a", "e")];
    const snapshot = JSON.stringify(edges);
    expect([...dependencyIds(edges, "c", "ancestors")].sort()).toEqual(["a", "b", "c"]);
    expect([...dependencyIds(edges, "c", "descendants")].sort()).toEqual(["c", "d"]);
    expect(JSON.stringify(edges)).toBe(snapshot);
  });
  it("uses presentation labels without replacing semantic field names", () => {
    const data = { ...node("a").data, config: { name: "Revenue" }, ui: { label: "Total revenue" } };
    expect(nodeLabel(data, "Formula")).toBe("Total revenue");
    expect(nodeLabel({ ...data, ui: { label: " " } }, "Formula")).toBe("Revenue");
    expect(data.config.name).toBe("Revenue");
  });
});
