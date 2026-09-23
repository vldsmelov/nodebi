import type { GraphDraft } from "./autosave";
import { attachedBook } from "./workbook-containers";
import { memberBlock } from "./composite-blocks";

/** Positions only. Publication references remain the sole source of result semantics. */
export function resultPositions(graph: GraphDraft) {
  return (graph.result_catalog?.outputs ?? []).map((output, index) => {
    const saved = graph.presentation?.results?.find(item => item.publication_id === output.id);
    const origin = memberBlock(graph, output.node_id)?.position ?? attachedBook(graph, output.node_id)?.position ?? graph.nodes.find(node => node.id === output.node_id)?.position ?? { x: 0, y: 0 };
    return saved ?? { publication_id: output.id, position: { x: origin.x + 380, y: origin.y + index * 80 } };
  });
}
export function reconcileResults(graph: GraphDraft): GraphDraft {
  if (graph.format_version !== 3) return graph;
  return { ...graph, presentation: { ...graph.presentation, results: resultPositions(graph) } };
}
