import type { ResolvedColumn, WorkflowParameter, WorkflowNode, WorkflowEdge } from "./types";
import type { PlannedStep } from "./unary-chain";
import { normalizedName } from "./calculated-chain";
export type AnalyticsOptions = {
  mode: "share" | "rank"; value: string; partitions: string[]; name: string;
  denominatorName: string; zero: "null" | "zero"; tie: string;
  direction: "ascending" | "descending"; filterField: string; parameter: string;
};
export function analyticsPlan(columns: ResolvedColumn[], options: AnalyticsOptions, parameters: WorkflowParameter[]): PlannedStep[] | null {
  const byId = new Map(columns.map(column => [column.column_id, column]));
  const name = normalizedName(options.name), denominator = normalizedName(options.denominatorName);
  const free = (value: string) => !!value && value.length <= 255 && !columns.some(column => column.engine_name === value);
  if (!free(name) || !["integer", "float"].includes(byId.get(options.value)?.logical_type ?? "")
    || new Set(options.partitions).size !== options.partitions.length || options.partitions.some(id => !byId.has(id))) return null;
  const steps: PlannedStep[] = [];
  if (options.mode === "share") {
    if (!free(denominator) || name === denominator) return null;
    const id = crypto.randomUUID();
    steps.push({ id, type: "window", config: { operation: "sum", partitions: options.partitions, column_id: options.value, name: denominator }, fields: [denominator] });
    steps.push({ id: crypto.randomUUID(), type: "calculated_column", config: { name, expression: `safe_divide([${options.value}], [window_${id.replaceAll("-", "")}], ${options.zero === "zero" ? "0" : "nullif(0, 0)"})` }, fields: [name] });
  } else {
    if (!byId.has(options.tie) || options.tie === options.value || byId.get(options.tie)?.logical_type === "unknown") return null;
    steps.push({ id: crypto.randomUUID(), type: "window", config: { operation: "row_number", partitions: options.partitions, name,
      order_by: [{ column_id: options.value, direction: options.direction }, { column_id: options.tie, direction: "ascending" }] }, fields: [name] });
  }
  if (options.parameter || options.filterField) {
    const parameter = parameters.find(parameter => parameter.name === options.parameter), field = byId.get(options.filterField);
    if (!parameter || !field || !(parameter.logical_type === field.logical_type || parameter.logical_type === "integer" && field.logical_type === "float")) return null;
    steps.push({ id: crypto.randomUUID(), type: "filter", config: { mode: "and", conditions: [{ column_id: options.filterField, operator: "equals", parameter: parameter.name }] } });
  }
  return steps;
}
/** Conservative row-selection dependencies. Never infer business scope from field names. */
export function upstreamFilters(nodes: WorkflowNode[], edges: WorkflowEdge[], target: string): WorkflowNode[] {
  const byId = new Map(nodes.map(node => [node.id, node])), seen = new Set<string>(), pending = [target], result: WorkflowNode[] = [];
  while (pending.length) {
    const id = pending.pop()!; if (seen.has(id)) continue; seen.add(id);
    const node = byId.get(id); if (node?.type === "filter") result.push(node);
    for (const edge of edges) if (edge.target_node_id === id) pending.push(edge.source_node_id);
  }
  return result;
}
