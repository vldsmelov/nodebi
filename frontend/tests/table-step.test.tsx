import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { TableStepDialog } from "@/features/workflow/TableStepDialog";
import type { GraphDraft } from "@/features/workflow/autosave";
import type { WorkflowSchemaResult } from "@/features/workflow/types";

beforeEach(() => { HTMLDialogElement.prototype.showModal = vi.fn(); });
afterEach(cleanup);
const graph: GraphDraft = { name: "Sales", format_version: 3, nodes: ["sales", "prices"].map(id => ({ id, type: "excel_source", version: 1, config: { sheet_name: id }, position: { x: 0, y: 0 } })), edges: [] };
const column = (id: string, type = "float") => ({ column_id: id, engine_name: id, display_name: id, logical_type: type, nullable: true, metadata: {} });
const schema = { revision: 1, nodes: graph.nodes.map(node => ({ node_id: node.id, outputs: { dataset: { kind: "dataset", columns: [column("quantity"), column("price")] } } })), issues: [] } as unknown as WorkflowSchemaResult;

it("creates one calculated step with explicit null division and preserves existing branches", () => {
  const apply = vi.fn();
  render(<TableStepDialog mode="calculate" source={{ nodeId: "sales", port: "dataset" }} graph={graph} schema={schema} close={vi.fn()} apply={apply} />);
  fireEvent.change(screen.getByLabelText("Output field name"), { target: { value: "Revenue" } });
  fireEvent.change(screen.getByLabelText("Left operand"), { target: { value: "quantity" } });
  fireEvent.change(screen.getByLabelText("Right operand"), { target: { value: "price" } });
  fireEvent.change(screen.getByLabelText("Operation"), { target: { value: "/" } });
  expect(screen.getByText("Add step")).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Division by zero"), { target: { value: "null" } });
  fireEvent.click(screen.getByText("Add step"));
  const next = apply.mock.calls[0][0] as GraphDraft;
  expect(next.nodes.slice(0, 2)).toEqual(graph.nodes);
  expect(next.nodes[2].type).toBe("calculated_column");
  expect(next.nodes[2].config).toEqual({ name: "Revenue", expression: "([quantity]) / nullif([price], 0)" });
  expect(next.edges).toHaveLength(1);
  expect(next.edges[0]).toMatchObject({ source_node_id: "sales", target_node_id: next.nodes[2].id, target_port: "input" });
  expect(graph.edges).toEqual([]);
});

it("adds a Join and both wires in one graph update, with explicit keys", () => {
  const apply = vi.fn();
  const spaced = { ...graph, nodes: graph.nodes.map(node => ({ ...node, position: { x: node.id === "prices" ? 400 : 0, y: 0 } })) };
  render(<TableStepDialog mode="join" source={{ nodeId: "sales", port: "dataset" }} graph={spaced} schema={schema} close={vi.fn()} apply={apply} />);
  fireEvent.change(screen.getByLabelText("Right table"), { target: { value: JSON.stringify(["prices", "dataset"]) } });
  fireEvent.change(screen.getByLabelText("Left key"), { target: { value: "quantity" } });
  fireEvent.change(screen.getByLabelText("Right key"), { target: { value: "price" } });
  fireEvent.change(screen.getByLabelText("Join type"), { target: { value: "left" } });
  fireEvent.click(screen.getByText("Add step"));
  const next = apply.mock.calls[0][0] as GraphDraft;
  expect(next.nodes[2]).toMatchObject({ type: "join", config: { left_key: "quantity", right_key: "price", how: "left" } });
  expect(next.nodes[2].position.x).toBe(760);
  expect(next.edges.map(edge => [edge.source_node_id, edge.target_port])).toEqual([["sales", "left"], ["prices", "right"]]);
});
