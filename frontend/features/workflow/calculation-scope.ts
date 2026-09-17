import type { WorkflowNode, WorkflowEdge } from "./types";
export function connectedIds(edges: WorkflowEdge[], start: string, reverse: boolean): Set<string> {
  const links = new Map<string, string[]>();
  for (const edge of edges) {
    const from = reverse ? edge.target_node_id : edge.source_node_id, to = reverse ? edge.source_node_id : edge.target_node_id;
    links.set(from, [...(links.get(from) ?? []), to]);
  }
  const seen = new Set<string>(), pending = [start];
  while (pending.length) { const id = pending.pop()!; if (seen.has(id)) continue; seen.add(id); pending.push(...(links.get(id) ?? [])); }
  return seen;
}
export function calculationScope(nodes: WorkflowNode[], edges: WorkflowEdge[], selected: string, calculation: string) {
  const upstream = connectedIds(edges, selected, true);
  const candidates = nodes.filter(node => upstream.has(node.id) && ["window", "group_by"].includes(node.type));
  if (!candidates.some(node => node.id === calculation)) return { candidates, scope: null };
  const before = connectedIds(edges, calculation, true), descendants = connectedIds(edges, calculation, false);
  const path = new Set([...upstream].filter(id => descendants.has(id)));
  const filters = nodes.filter(node => upstream.has(node.id) && node.type === "filter");
  return { candidates, scope: { before, path,
    beforeFilters: filters.filter(node => before.has(node.id)),
    afterFilters: filters.filter(node => path.has(node.id) && !before.has(node.id)),
    otherFilters: filters.filter(node => !before.has(node.id) && !path.has(node.id)),
  } };
}
export function filterReferences(node: WorkflowNode): { field: string; parameter: string | null }[] {
  if (!Array.isArray(node.config?.conditions)) return [];
  return node.config.conditions.flatMap(value => {
    if (!value || typeof value !== "object") return [];
    const condition = value as Record<string, unknown>;
    return typeof condition.column_id === "string" ? [{ field: condition.column_id, parameter: typeof condition.parameter === "string" ? condition.parameter : null }] : [];
  });
}
