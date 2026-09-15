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
