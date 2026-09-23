import { expect, it } from "vitest";
import { reconcileResults } from "@/features/workflow/result-presentation";
import { packBlock, reconcileBlocks, renderBlockWire, blockCanvasId } from "@/features/workflow/composite-blocks";
import { GraphHistory } from "@/features/workflow/graph-history";
import type { GraphDraft } from "@/features/workflow/autosave";

const graph: GraphDraft = { format_version: 3, name: "Results", nodes: [{ id: "source", type: "calculated_column", version: 1, config: {}, position: { x: 20, y: 30 } }], edges: [], result_catalog: { outputs: [{ id: "publication", name: "Revenue", node_id: "source", port: "dataset", kind: "dataset" }] } };
it("persists result layout without changing computation and removes obsolete positions", () => {
  const next = reconcileResults(graph);
  expect(next.nodes).toBe(graph.nodes); expect(next.edges).toBe(graph.edges);
  expect(next.result_catalog).toBe(graph.result_catalog);
  expect(next.presentation?.results).toEqual([{ publication_id: "publication", position: { x: 400, y: 30 } }]);
  expect(reconcileResults(next)).toEqual(next);
  const history = new GraphHistory(graph); history.record(next);
  expect(history.undo()).toEqual(graph); expect(history.redo()).toEqual(next);
  expect(reconcileResults({ ...next, result_catalog: { outputs: [] } }).presentation?.results).toEqual([]);
});
it("exposes publications through collapsed block boundaries without computational edges", () => {
  const packed = reconcileBlocks(packBlock(graph, ["source"], "Revenue"));
  const block = packed.presentation!.blocks![0];
  expect(block.outputs).toContainEqual({ id: "publication", label: "Revenue", node_id: "source", port: "dataset", column_id: null });
  const rendered = renderBlockWire(packed, { id: "publication", source: "source", sourceHandle: "dataset", target: "publication:publication" });
  expect(rendered?.source).toBe(blockCanvasId(block.id));
  expect(packed.edges).toEqual([]);
});
