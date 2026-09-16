import { expect, it } from "vitest";
import { appendCalculatedChain, calculatedChain, calculatedId, validRows } from "@/features/workflow/calculated-chain";
import type { EditorNode } from "@/features/workflow/WorkflowNodeCard";
import type { NodeDefinition } from "@/features/workflow/types";
const definition: NodeDefinition = { type: "calculated_column", version: 1, category: "transform", display_name: "Calculated Column", description: "", icon: null, config_schema: {}, schema_inference_mode: "static", input_ports: [{ id: "input", display_name: "Input", kind: "dataset", required: true, max_connections: 1 }], output_ports: [{ id: "dataset", display_name: "Dataset", kind: "dataset", required: false, max_connections: null }] };
const source: EditorNode = { id: "source", type: "workflowNode", position: { x: 0, y: 0 }, data: { definition: { ...definition, type: "excel_source", input_ports: [] }, config: {} } };
const first = { id: "a-b", name: "Gross", expression: "10" };
const second = { id: "c-d", name: "Net", expression: `[${calculatedId(first.id)}] * 0.8` };
it("builds ordinary nodes without mutating the input and reconstructs only unbranched chains", () => {
  const nodes = [source], edges: [] = [];
  const result = appendCalculatedChain(nodes, edges, source.id, definition, [first, second])!;
  expect(nodes).toEqual([source]); expect(edges).toEqual([]);
  expect(result.nodes).toHaveLength(3); expect(result.edges).toHaveLength(2);
  expect(result.nodes[2].data.config).toEqual({ name: "Net", expression: "[calc_ab] * 0.8" });
  expect(calculatedChain(result.nodes, result.edges, first.id).map(node => node.id)).toEqual([first.id, second.id]);
  expect(calculatedChain(result.nodes, [...result.edges, { ...result.edges[1], id: "branch", target: "outside" }], first.id)).toHaveLength(1);
  expect(appendCalculatedChain(nodes, [], "absent", definition, [first])).toBeNull();
});
it("rejects forward/deleted references, duplicate normalized names and duplicate node IDs", () => {
  expect(validRows([first, second], [])).toBe(true);
  expect(validRows([second, first], [])).toBe(false);
  expect(validRows([second], [])).toBe(false);
  expect(validRows([first, { ...second, name: " Gross " }], [])).toBe(false);
  expect(validRows([{ ...first, expression: '"[literal]"' }], [])).toBe(true);
  expect(appendCalculatedChain([source], [], source.id, definition, [first, first])).toBeNull();
});
