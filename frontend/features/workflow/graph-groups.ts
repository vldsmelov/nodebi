import type { Edge } from "@xyflow/react";
import type { EditorNode } from "./WorkflowNodeCard";
import { nodeLabel } from "./graph-interaction";
import { layoutGraph } from "./graph-layout";

export function groupName(node: EditorNode): string {
  const value = node.data.ui?.group;
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
}
export const groupProxyId = (name: string) => `group:${name}`;

/** Canvas projection only: proxies must never be serialized or used for execution. */
export function projectGroups(nodes: EditorNode[], edges: Edge[], collapsed: string[], expand: (name: string) => void, label = (node: EditorNode) => nodeLabel(node.data, node.data.definition.display_name)) {
  const groups = new Map<string, EditorNode[]>();
  for (const node of nodes) {
    const name = groupName(node);
    if (name && collapsed.includes(name)) groups.set(name, [...(groups.get(name) ?? []), node]);
  }
  const owners = new Map([...groups].flatMap(([name, members]) => members.map(node => [node.id, name] as const)));
  const ports = new Map([...groups.keys()].map(name => [name, { input: new Map<string, string>(), output: new Map<string, string>() }]));
  const byId = new Map(nodes.map(node => [node.id, node]));
  const displayEdges = edges.map(edge => {
    const source = owners.get(edge.source), target = owners.get(edge.target);
    if (source && source === target) return { ...edge, hidden: true };
    if (source) ports.get(source)!.output.set(`${edge.source}:${edge.sourceHandle}`, `${label(byId.get(edge.source)!)} / ${edge.sourceHandle}`);
    if (target) ports.get(target)!.input.set(`${edge.target}:${edge.targetHandle}`, `${label(byId.get(edge.target)!)} / ${edge.targetHandle}`);
    return { ...edge, source: source ? groupProxyId(source) : edge.source, target: target ? groupProxyId(target) : edge.target,
      sourceHandle: source ? `${edge.source}:${edge.sourceHandle}` : edge.sourceHandle,
      targetHandle: target ? `${edge.target}:${edge.targetHandle}` : edge.targetHandle };
  });
  const proxies: EditorNode[] = [...groups].map(([name, members]) => {
    const boundary = ports.get(name)!;
    const toPorts = (items: Map<string, string>) => [...items].map(([id, display_name]) => ({ id, display_name, kind: "dataset", required: false, max_connections: null }));
    return { id: groupProxyId(name), type: "workflowNode", position: { x: Math.min(...members.map(node => node.position.x)), y: Math.min(...members.map(node => node.position.y)) },
      draggable: false, deletable: false, selectable: false, connectable: false, focusable: false,
      data: { config: {}, group: { name, count: members.length, expand: () => expand(name) }, definition: {
        type: "group", version: 1, category: "transform", display_name: name, description: "", icon: null, config_schema: {}, schema_inference_mode: "static",
        input_ports: toPorts(boundary.input), output_ports: toPorts(boundary.output),
      } } };
  });
  // Match WorkflowNodeCard's 320px group card and 110px header + 28px boundary rows.
  const dimensions = (node: EditorNode) => node.data.group
    ? { width: 320, height: 110 + Math.max(node.data.definition.input_ports.length, node.data.definition.output_ports.length) * 28 }
    : { width: node.measured?.width ?? 256, height: node.measured?.height ?? 220 };
  let placed = proxies;
  if (proxies.length && owners.size === nodes.length) {
    // The full summary has its own compact layout; no real node coordinates change.
    const sized = proxies.map(node => ({ ...node, measured: dimensions(node) }));
    const arranged = layoutGraph(sized, displayEdges.filter(edge => !edge.hidden));
    // Contracting non-convex groups can form a visual cycle in a valid execution DAG.
    // A simple grid remains available rather than mistaking that cycle for invalid data.
    const height = Math.max(...sized.map(node => node.measured.height)) + 60;
    placed = (arranged ?? sized.map((node, index) => ({ ...node, position: { x: 80 + index % 3 * 430, y: 80 + Math.floor(index / 3) * height } })))
      .map(node => { const original = proxies.find(item => item.id === node.id)!; return { ...original, position: node.position }; });
  } else {
    // Keep expanded nodes in place, moving only proxies below any intersecting cards.
    const occupied = nodes.filter(node => !owners.has(node.id)).map(node => ({ ...node.position, ...dimensions(node) }));
    placed = proxies.map(node => {
      const box = { ...node.position, ...dimensions(node) };
      let conflicts;
      do {
        conflicts = occupied.filter(other => box.x < other.x + other.width + 30 && box.x + box.width + 30 > other.x && box.y < other.y + other.height + 30 && box.y + box.height + 30 > other.y);
        if (conflicts.length) box.y = Math.max(...conflicts.map(other => other.y + other.height)) + 60;
      } while (conflicts.length);
      occupied.push(box); return { ...node, position: { x: box.x, y: box.y } };
    });
  }
  return { nodes: [...nodes.map(node => ({ ...node, hidden: owners.has(node.id) })), ...placed], edges: displayEdges };
}
