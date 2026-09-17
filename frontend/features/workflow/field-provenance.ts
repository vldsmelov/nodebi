import type { WorkflowNode, WorkflowEdge, WorkflowSchemaResult } from "./types";

export type FieldOrigin = { source: string; sheet: string; column: string; headers: string[] };
export type FieldProvenance = { origins: FieldOrigin[]; complete: boolean };
export type ProvenanceMap = Record<string, FieldProvenance>;
const unknown = (): FieldProvenance => ({ origins: [], complete: false });
export const originLabel = (origin: FieldOrigin) => [origin.source, origin.sheet, origin.column, ...origin.headers].filter(Boolean).join(" / ");
function excelColumn(position: unknown): string {
  if (typeof position !== "number" || !Number.isInteger(position) || position < 0 || position >= 16384) return "";
  let value = position + 1, result = "";
  while (value) { value--; result = String.fromCharCode(65 + value % 26) + result; value = Math.floor(value / 26); }
  return result;
}
/** Trace value provenance by (node, field), never by a global field-ID lookup.
 * This is presentation of saved schemas, not expression analysis or execution.
 */
export function fieldProvenance(nodes: WorkflowNode[], edges: WorkflowEdge[], schema: WorkflowSchemaResult, sources: { id: string; original_filename: string }[], target: string): ProvenanceMap {
  const byNode = new Map(nodes.map(node => [node.id, node]));
  const columns = new Map(schema.nodes.map(node => [node.node_id, new Map(node.columns?.map(column => [column.column_id, column]))]));
  const inputs = new Map<string, Map<string, string>>();
  for (const edge of edges) {
    if (!inputs.has(edge.target_node_id)) inputs.set(edge.target_node_id, new Map());
    inputs.get(edge.target_node_id)!.set(edge.target_port, edge.source_node_id);
  }
  const memo = new Map<string, FieldProvenance>(), visiting = new Set<string>();
  const merge = (items: FieldProvenance[]): FieldProvenance => ({ origins: [...new Map(items.flatMap(item => item.origins).map(origin => [JSON.stringify(origin), origin])).values()], complete: items.every(item => item.complete) });
  function trace(nodeId: string | undefined, fieldId: string, depth = 0): FieldProvenance {
    if (!nodeId || depth > 256) return unknown();
    const key = JSON.stringify([nodeId, fieldId]);
    if (visiting.has(key)) return unknown();
    if (memo.has(key)) return memo.get(key)!;
    const node = byNode.get(nodeId), column = columns.get(nodeId)?.get(fieldId);
    if (!node || !column) return unknown();
    visiting.add(key);
    const input = (port: string) => inputs.get(nodeId)?.get(port);
    const follow = (port: string, id: string) => trace(input(port), id, depth + 1);
    const refs = Array.isArray(column.metadata.source_columns) ? column.metadata.source_columns.filter((id): id is string => typeof id === "string") : null;
    let result: FieldProvenance;
    if (node.type === "excel_source") {
      const source = sources.find(source => source.id === node.config?.source_id);
      const sourceName = source ? sources.some(other => other.id !== source.id && other.original_filename === source.original_filename)
        ? `${source.original_filename} (${source.id})` : source.original_filename : String(node.config?.source_id ?? "");
      result = { origins: [{ source: sourceName, sheet: String(node.config?.sheet_name ?? ""), column: column.metadata.source_row_number === true ? "#" : excelColumn(column.metadata.source_position), headers: Array.isArray(column.metadata.header_levels) ? column.metadata.header_levels.filter((part): part is string => typeof part === "string" && part.length > 0) : [column.display_name] }], complete: !!source };
    } else if (node.type === "union") {
      // Union aligns engine names, retaining the left ID. Inherited metadata may refer to an older join.
      result = merge(["left", "right"].map(port => {
        const other = [...(columns.get(input(port) ?? "")?.values() ?? [])].find(item => item.engine_name === column.engine_name);
        return other ? follow(port, other.column_id) : unknown();
      }));
    } else if (node.type === "join") {
      result = columns.get(input("left") ?? "")?.has(fieldId) ? follow("left", fieldId)
        : column.metadata.input_port === "right" && refs?.length === 1 ? follow("right", refs[0]) : unknown();
    } else if (columns.get(input("input") ?? "")?.has(fieldId)) {
      result = follow("input", fieldId);
    } else {
      result = refs ? merge(refs.map(id => follow("input", id))) : unknown();
    }
    visiting.delete(key); memo.set(key, result); return result;
  }
  return Object.fromEntries([...(columns.get(target)?.keys() ?? [])].map(id => [id, trace(target, id)]));
}
