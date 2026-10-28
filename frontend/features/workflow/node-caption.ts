import type { GraphDraft } from "./autosave";
import type { WorkflowNode, WorkflowSchemaResult } from "./types";

/** Presentation names follow current configuration; user labels always take precedence. */
export function nodeCaption(graph: GraphDraft, node: WorkflowNode, schema: WorkflowSchemaResult | undefined, nodeName: (type: string, version?: number) => string): string {
  const own = node.ui?.label || node.config?.name || node.config?.sheet_name;
  if (typeof own === "string" && own.trim()) return own;
  const incoming = graph.edges.filter(edge => edge.target_node_id === node.id);
  if (node.type === "join") {
    const sources = ["left", "right"].map(port => graph.nodes.find(item => item.id === incoming.find(edge => edge.target_port === port)?.source_node_id));
    return `${nodeName(node.type)}${sources.every(Boolean) ? `: ${sources.map(item => String(item!.ui?.label || item!.config?.name || item!.config?.sheet_name || nodeName(item!.type))).join(" + ")}` : ""}`;
  }
  if (node.type === "group_by") {
    const input = incoming.find(edge => edge.target_port === "input");
    const columns = schema?.nodes.find(item => item.node_id === input?.source_node_id)?.outputs?.[input?.source_port ?? ""]?.columns;
    const dimensions = Array.isArray(node.config?.dimensions) ? node.config.dimensions : [];
    const labels = dimensions.map(id => columns?.find(column => column.column_id === id)?.display_name).filter(Boolean);
    return `${nodeName(node.type)}${labels.length ? `: ${labels.join(", ")}` : ""}`;
  }
  return nodeName(node.type, node.version);
}
