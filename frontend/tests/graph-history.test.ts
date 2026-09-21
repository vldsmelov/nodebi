import { expect, it, vi } from "vitest";
import { GraphHistory } from "@/features/workflow/graph-history";
import { layoutGraph } from "@/features/workflow/graph-layout";
import { WorkflowAutosave, type GraphDraft } from "@/features/workflow/autosave";
import type { Workflow } from "@/features/workflow/types";

const draft = (name: string): GraphDraft => ({ format_version: 1, name, nodes: [], edges: [] });
it("coalesces one field-edit session, ignores identical graphs and drops redo after new edits", () => {
  const h = new GraphHistory(draft("initial"));
  h.record(draft("a"), "input"); h.record(draft("ab"), "input"); h.record(draft("ab"));
  expect(h.undo()).toEqual(draft("initial")); expect(h.canUndo).toBe(false);
  expect(h.redo()).toEqual(draft("ab"));
  h.undo(); h.record(draft("replacement"), "input"); expect(h.canRedo).toBe(false);
});
it("bounds snapshots and treats returned drafts as independent values", () => {
  const h = new GraphHistory(draft("0"), 2);
  ["1", "2", "3"].forEach(name => h.record(draft(name)));
  const restored = h.undo()!; restored.name = "mutated";
  expect(h.undo()?.name).toBe("1"); expect(h.undo()).toBeNull();
  expect(h.redo()?.name).toBe("2");
  const small = new GraphHistory(draft("0"), 50, 1);
  small.record(draft("1")); expect(small.canUndo).toBe(false);
});
it("saves undo after an in-flight save using its acknowledged revision", async () => {
  let finish!: (value: Workflow) => void;
  const persist = vi.fn().mockImplementationOnce(() => new Promise<Workflow>(resolve => { finish = resolve; })).mockResolvedValue({ revision: 3 });
  const writer = new WorkflowAutosave("history", 1, draft("initial"), persist, vi.fn(), sessionStorage);
  const h = new GraphHistory(draft("initial"));
  h.record(draft("changed")); writer.change(draft("changed")); const pending = writer.flush();
  writer.change(h.undo()!); finish({ revision: 2 } as Workflow); await pending;
  expect(persist.mock.calls.map(call => [call[0].name, call[0].expected_revision])).toEqual([["changed", 1], ["initial", 2]]);
  expect(writer.dirty).toBe(false); writer.dispose();
});
it("lays out shared dependencies in forward layers without changing data, and rejects cycles", () => {
  const nodes = ["a", "b", "c", "d"].map(id => ({ id, position: { x: 7, y: 9 }, data: { config: { label: id } }, measured: { width: 270, height: 250 } }));
  const edges = [{ id: "ac", source: "a", target: "c" }, { id: "bc", source: "b", target: "c" }, { id: "cd", source: "c", target: "d" }];
  const result = layoutGraph(nodes, edges)!;
  expect(result[0].position.x).toBe(result[1].position.x);
  expect(result[1].position.y - result[0].position.y).toBeGreaterThan(250);
  expect(result[2].position.x).toBeGreaterThan(result[0].position.x);
  expect(result[3].position.x).toBeGreaterThan(result[2].position.x);
  expect(result.map(node => node.data)).toEqual(nodes.map(node => node.data));
  expect(nodes[0].position).toEqual({ x: 7, y: 9 });
  expect(layoutGraph(nodes, [...edges, { id: "da", source: "d", target: "a" }])).toBeNull();
  expect(layoutGraph(nodes, [{ id: "bad", source: "missing", target: "a" }])).toBeNull();
});
