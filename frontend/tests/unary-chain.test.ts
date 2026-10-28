import { expect, it } from "vitest";
import { appendUnaryChain } from "@/features/workflow/unary-chain";
import type { EditorNode } from "@/features/workflow/WorkflowNodeCard";
import type { NodeDefinition } from "@/features/workflow/types";

const definition = (type: string, version: number): NodeDefinition => ({
  type, version, category: "transform", display_name: type, description: "", icon: null,
  config_schema: {}, schema_inference_mode: "static",
  input_ports: [{ id: "input", display_name: "Input", kind: "dataset", max_connections: 1, required: true }],
  output_ports: [{ id: "dataset", display_name: "Dataset", kind: "dataset", max_connections: null, required: true }],
});
const source: EditorNode = { id: "source", type: "workflowNode", position: { x: 0, y: 0 }, data: { definition: definition("source", 1), config: {} } };

it("honors exact versions and defaults old planned steps to v1 without mutating input", () => {
  const catalog = [definition("window", 1), definition("window", 3), definition("calculated_column", 1), definition("calculated_column", 2), definition("filter", 1)];
  const before = JSON.stringify(source);
  const steps = [{ id: "w", type: "window", version: 3, config: {} }, { id: "c", type: "calculated_column", version: 2, config: {} }, { id: "f", type: "filter", config: {} }];
  const result = appendUnaryChain([source], [], source.id, catalog, steps)!;
  expect(result.nodes.slice(1).map(node => node.data.definition.version)).toEqual([3, 2, 1]);
  expect(result.edges.map(edge => [edge.source, edge.target])).toEqual([["source", "w"], ["w", "c"], ["c", "f"]]);
  expect(JSON.stringify(source)).toBe(before);
  expect(appendUnaryChain([source], [], source.id, catalog.filter(item => item.version !== 2), steps)).toBeNull();
  expect(appendUnaryChain([source], [], source.id, catalog, [{ id: "old", type: "window", config: {} }])!.nodes[1].data.definition.version).toBe(1);
});
