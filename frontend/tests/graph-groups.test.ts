import { expect, it } from "vitest";
import type { EditorNode } from "@/features/workflow/WorkflowNodeCard";
import { groupName, groupProxyId, projectGroups } from "@/features/workflow/graph-groups";

const node = (id: string, group = ""): EditorNode => ({ id, type: "workflowNode", position: { x: 50, y: 70 }, data: {
  config: { name: "Repeated name" }, ui: { group }, definition: { type: "filter", version: 1, category: "transform", display_name: "Filter", description: "", icon: null, config_schema: {}, schema_inference_mode: "static", input_ports: [], output_ports: [] },
} });
const edge = (source: string, target: string, targetHandle = "input") => ({ id: `${source}-${target}`, source, target, sourceHandle: "dataset", targetHandle });
it("projects collapsed groups without losing internal edges or merging distinct boundary ports", () => {
  const nodes = [node("a", "Prepare"), node("b", "Prepare"), node("c"), node("d", "Compare")];
  const edges = [edge("a", "b"), edge("b", "c"), edge("a", "d", "left"), edge("c", "d", "right")];
  const before = JSON.stringify({ nodes, edges });
  const view = projectGroups(nodes, edges, ["Prepare", "Compare"], () => {});
  expect(view.nodes.filter(node => node.hidden).map(node => node.id)).toEqual(["a", "b", "d"]);
  expect(view.edges.find(edge => edge.id === "a-b")?.hidden).toBe(true);
  expect(view.edges.find(edge => edge.id === "a-d")).toMatchObject({ source: groupProxyId("Prepare"), target: groupProxyId("Compare"), sourceHandle: "a:dataset", targetHandle: "d:left" });
  const proxy = view.nodes.find(node => node.id === groupProxyId("Prepare"))!;
  expect(proxy.data.definition.output_ports.map(port => port.id).sort()).toEqual(["a:dataset", "b:dataset"]);
  expect(proxy).toMatchObject({ deletable: false, draggable: false, connectable: false });
  expect(JSON.stringify({ nodes, edges })).toBe(before);
  const expanded = projectGroups(nodes, edges, [], () => {});
  expect(expanded.edges).toEqual(edges);
  expect(expanded.nodes.map(node => node.id)).toEqual(nodes.map(node => node.id));
});
it("ignores stale collapsed names and malformed legacy group values", () => {
  const n = node("a"); n.data.ui = { group: { unexpected: true } };
  expect(groupName(n)).toBe("");
  expect(projectGroups([n], [], ["deleted group"], () => {}).nodes).toHaveLength(1);
});

it("packs complete summaries including visual group cycles without changing real positions", () => {
  const nodes = [node("a", "A"), node("b", "B"), node("c", "A"), node("d", "C")];
  // A -> B -> A is only a cycle of groups; a -> b -> c remains a valid DAG.
  const edges = [edge("a", "b"), edge("b", "c"), edge("c", "d")];
  const before = JSON.stringify({ nodes, edges });
  const view = projectGroups(nodes, edges, ["A", "B", "C"], () => {});
  const proxies = view.nodes.filter(item => item.data.group);
  for (const a of proxies) for (const b of proxies) if (a !== b) {
    const height = (item: EditorNode) => 110 + Math.max(item.data.definition.input_ports.length, item.data.definition.output_ports.length) * 28;
    expect(a.position.x + 320 <= b.position.x || b.position.x + 320 <= a.position.x || a.position.y + height(a) <= b.position.y || b.position.y + height(b) <= a.position.y).toBe(true);
  }
  expect(view.edges.filter(item => !item.hidden)).toHaveLength(3);
  expect(JSON.stringify({ nodes, edges })).toBe(before);
});

it("places a tall partial-group proxy clear of expanded cards and other proxies", () => {
  const nodes = [node("visible"), ...Array.from({ length: 30 }, (_, index) => node(`a${index}`, "A")), node("b", "B")];
  const edges = nodes.filter(item => item.id !== "visible").map(item => edge(item.id, "visible"));
  const view = projectGroups(nodes, edges, ["A", "B"], () => {});
  const a = view.nodes.find(item => item.id === groupProxyId("A"))!, b = view.nodes.find(item => item.id === groupProxyId("B"))!;
  expect(a.position.y).toBeGreaterThanOrEqual(70 + 220 + 30);
  expect(b.position.y).toBeGreaterThanOrEqual(a.position.y + 110 + 30 * 28 + 30);
  expect(view.nodes.find(item => item.id === "visible")!.position).toEqual(nodes[0].position);
  expect(a.data.definition.output_ports).toHaveLength(30);
});
