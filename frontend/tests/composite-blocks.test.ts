import { expect, it } from "vitest";
import type { GraphDraft } from "@/features/workflow/autosave";
import { blockCanvasId, packBlock, publishOutput, reconcileBlocks, renderBlockWire, resolveBlockConnection } from "@/features/workflow/composite-blocks";
import { fieldHandle, renderWire, saveWire } from "@/features/workflow/field-wires";
import { GraphHistory } from "@/features/workflow/graph-history";

const graph: GraphDraft = { name: "Blocks", format_version: 2, nodes: ["source", "a", "b", "sink"].map((id, i) => ({ id, type: "select_columns", version: 1, position: { x: i * 350, y: 0 }, config: {} })), edges: [
  { id: "in", source_node_id: "source", source_port: "dataset", source_column_id: 'same:["id"]', target_node_id: "a", target_port: "input" },
  { id: "inner", source_node_id: "a", source_port: "dataset", target_node_id: "b", target_port: "input" },
  { id: "out", source_node_id: "b", source_port: "dataset", source_column_id: "field", target_node_id: "sink", target_port: "input" },
] };

it("packs atomically without rewriting computation and maps both public wire directions", () => {
  const packed = packBlock(graph, ["a", "b"], "Calculation"), block = packed.presentation!.blocks![0];
  expect(packed.nodes).toBe(graph.nodes); expect(packed.edges).toBe(graph.edges);
  expect(block.inputs).toHaveLength(1); expect(block.outputs).toHaveLength(1);
  expect(renderBlockWire(packed, renderWire(graph.edges[1]))).toBeNull();
  for (const wire of [graph.edges[0], graph.edges[2]]) {
    const displayed = renderBlockWire(packed, renderWire(wire))!;
    expect([displayed.source, displayed.target]).toContain(blockCanvasId(block.id));
    expect(saveWire(resolveBlockConnection(packed, { source: displayed.source, sourceHandle: displayed.sourceHandle!, target: displayed.target, targetHandle: displayed.targetHandle! }), wire.id)).toEqual(wire);
  }
  const history = new GraphHistory(graph); history.record(packed);
  expect(history.undo()).toEqual(graph); expect(history.redo()).toEqual(packed);
});

it("retains public IDs, explicit extra outputs and valid references after deleting a member", () => {
  const packed = packBlock(graph, ["a", "b"], "Calculation");
  const extra = publishOutput(packed, "a", fieldHandle("dataset", "extra"), "Extra");
  expect(extra.presentation!.blocks![0].outputs).toHaveLength(2);
  expect(publishOutput(extra, "a", fieldHandle("dataset", "extra"), "Extra")).toBe(extra);
  expect(reconcileBlocks(extra).presentation).toEqual(extra.presentation);
  const removed = reconcileBlocks({ ...extra, nodes: extra.nodes.filter(node => node.id !== "a"), edges: extra.edges.filter(edge => edge.source_node_id !== "a" && edge.target_node_id !== "a") });
  const block = removed.presentation!.blocks![0];
  expect(block.node_ids).toEqual(["b"]); expect(block.inputs).toEqual([]);
  expect(block.outputs).toEqual(packed.presentation!.blocks![0].outputs);
  expect(reconcileBlocks({ ...removed, nodes: [], edges: [] }).presentation!.blocks).toEqual([]);
});

it("rejects nested or workbook membership and reveals unchanged wires when opened", () => {
  const packed = packBlock(graph, ["a", "b"], "Calculation");
  expect(packBlock(packed, ["a", "sink"], "Nested")).toBe(packed);
  expect(packBlock(graph, ["missing"], "No")).toBe(graph);
  const book = { ...graph, presentation: { workbooks: [{ id: "book", label: "Book", source_id: "source-id", collapsed: false, node_ids: ["source"], position: { x: 0, y: 0 } }] } };
  expect(packBlock(book, ["source"], "No")).toBe(book);
  const expanded = { ...packed, presentation: { ...packed.presentation, blocks: packed.presentation!.blocks!.map(block => ({ ...block, collapsed: false })) } };
  expect(graph.edges.map(wire => renderBlockWire(expanded, renderWire(wire)))).toEqual(graph.edges.map(renderWire));
});
