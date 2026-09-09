"use client";

import {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  Handle,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Database, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import type { DataSource } from "@/features/data-sources/api";
import { previewWorkflowNode, saveWorkflow } from "./api";
import { useWorkflowUi } from "./store";
import type { NodeDefinition, ResolvedColumn, Workflow, WorkflowEdge, WorkflowNode, WorkflowSchemaResult } from "./types";

type EditorNodeData = {
  definition: NodeDefinition;
  config: Record<string, unknown>;
  validationError?: string;
};
type EditorNode = Node<EditorNodeData, "workflowNode">;

function WorkflowNodeCard({ data, selected }: NodeProps<EditorNode>) {
  return (
    <div className={`min-w-56 rounded-2xl border bg-[#151b12] shadow-xl transition ${selected ? "border-[#b7ff5a] shadow-[#b7ff5a]/10" : "border-white/15"}`}>
      {data.definition.input_ports.map((port, index) => (
        <Handle key={port.id} id={port.id} type="target" position={Position.Left} style={{ top: 52 + index * 24, background: "#b7ff5a" }} title={port.display_name} />
      ))}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <span className="grid size-8 place-items-center rounded-lg bg-[#b7ff5a]/10 text-[#b7ff5a]"><Database size={16} /></span>
        <div><p className="text-sm font-semibold text-white">{data.definition.display_name}</p><p className="text-[10px] uppercase tracking-[0.18em] text-white/35">{data.definition.category}</p></div>
      </div>
      <div className="px-4 py-3 text-xs text-white/45">{data.validationError ?? (typeof data.config.sheet_name === "string" ? data.config.sheet_name : "Select this node to configure it")}</div>
      {data.definition.output_ports.map((port, index) => (
        <Handle key={port.id} id={port.id} type="source" position={Position.Right} style={{ top: 52 + index * 24, background: "#b7ff5a" }} title={port.display_name} />
      ))}
    </div>
  );
}

const nodeTypes = { workflowNode: WorkflowNodeCard };

function toEditorNode(node: WorkflowNode, catalog: NodeDefinition[]): EditorNode {
  const registeredDefinition = catalog.find((item) => item.type === node.type && item.version === node.version);
  const definition = registeredDefinition ?? {
    type: node.type,
    version: node.version,
    category: "transform" as const,
    display_name: node.type,
    description: "This node type is not available in the current catalog.",
    icon: null,
    input_ports: [],
    output_ports: [],
  };
  return { id: node.id, type: "workflowNode", position: node.position, data: { definition, config: node.config, validationError: registeredDefinition ? undefined : "Unavailable node type" } };
}

function toEditorEdge(edge: WorkflowEdge): Edge {
  return { id: edge.id, source: edge.source_node_id, sourceHandle: edge.source_port, target: edge.target_node_id, targetHandle: edge.target_port, animated: true, style: { stroke: "#b7ff5a" } };
}

export function serializeNodes(nodes: EditorNode[]): WorkflowNode[] {
  return nodes.map((node) => ({ id: node.id, type: node.data.definition.type, version: node.data.definition.version, position: node.position, config: node.data.config, ui: {} }));
}

export function serializeEdges(edges: Edge[]): WorkflowEdge[] {
  return edges.map((edge) => ({ id: edge.id, source_node_id: edge.source, source_port: edge.sourceHandle ?? "output", target_node_id: edge.target, target_port: edge.targetHandle ?? "input" }));
}

type Props = { workflow: Workflow; catalog: NodeDefinition[]; sources: DataSource[]; resolvedSchema?: WorkflowSchemaResult; onSaved?: () => void };

export function WorkflowEditor({ workflow, catalog, sources, resolvedSchema, onSaved }: Props) {
  const initialNodes = useMemo(() => workflow.nodes.map((node) => toEditorNode(node, catalog)), [catalog, workflow.nodes]);
  const [nodes, setNodes, onNodesChange] = useNodesState<EditorNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow.edges.map(toEditorEdge));
  const [search, setSearch] = useState("");
  const selectedNodeId = useWorkflowUi((state) => state.selectedNodeId);
  const selectNode = useWorkflowUi((state) => state.selectNode);
  const saveStatus = useWorkflowUi((state) => state.saveStatus);
  const saveError = useWorkflowUi((state) => state.saveError);
  const setSaveState = useWorkflowUi((state) => state.setSaveState);
  const firstRender = useRef(true);
  const saveSequence = useRef(0);
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const preview = useMutation({ mutationFn: (nodeId: string) => previewWorkflowNode(workflow.id, nodeId) });
  const visibleDefinitions = catalog.filter((definition) => `${definition.display_name} ${definition.description}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const sequence = ++saveSequence.current;
    const payload = { name: workflow.name, nodes: serializeNodes(nodes), edges: serializeEdges(edges) };
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      saveChain.current = saveChain.current.catch(() => undefined).then(() => saveWorkflow(workflow.id, payload)).then(() => {
        if (sequence === saveSequence.current) {
          setSaveState("saved");
          onSaved?.();
        }
      }).catch((error: unknown) => {
        if (sequence === saveSequence.current) setSaveState("error", error instanceof Error ? error.message : "Autosave failed.");
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [edges, nodes, onSaved, setSaveState, workflow.id, workflow.name]);

  const addNode = (definition: NodeDefinition) => {
    const firstSource = sources[0];
    if (definition.type === "excel_source" && !firstSource?.workbook.sheets[0]) return;
    const id = crypto.randomUUID();
    const config = definition.type === "excel_source" ? { source_id: firstSource.id, sheet_name: firstSource.workbook.sheets[0].name } : {};
    setNodes((current) => [...current, { id, type: "workflowNode", position: { x: 120 + current.length * 40, y: 120 + current.length * 36 }, data: { definition, config } }]);
    selectNode(id);
  };

  const isValidConnection = useCallback((connection: Edge | Connection) => {
    const source = nodes.find((node) => node.id === connection.source);
    const target = nodes.find((node) => node.id === connection.target);
    const sourcePort = source?.data.definition.output_ports.find((port) => port.id === connection.sourceHandle);
    const targetPort = target?.data.definition.input_ports.find((port) => port.id === connection.targetHandle);
    if (!sourcePort || !targetPort || sourcePort.kind !== targetPort.kind) return false;
    if (edges.some((edge) => edge.source === connection.source && edge.sourceHandle === connection.sourceHandle && edge.target === connection.target && edge.targetHandle === connection.targetHandle)) return false;
    if (sourcePort.max_connections !== null) {
      const count = edges.filter((edge) => edge.source === connection.source && edge.sourceHandle === connection.sourceHandle).length;
      if (count >= sourcePort.max_connections) return false;
    }
    if (targetPort.max_connections !== null) {
      const count = edges.filter((edge) => edge.target === connection.target && edge.targetHandle === connection.targetHandle).length;
      if (count >= targetPort.max_connections) return false;
    }
    return connection.source !== connection.target;
  }, [edges, nodes]);

  const onConnect = useCallback((connection: Connection) => {
    if (!isValidConnection(connection)) return;
    setEdges((current) => addEdge({ ...connection, id: crypto.randomUUID(), animated: true, style: { stroke: "#b7ff5a" } }, current));
  }, [isValidConnection, setEdges]);

  const updateSelectedConfig = (config: Record<string, unknown>) => {
    if (!selectedNodeId) return;
    setNodes((current) => current.map((node) => node.id === selectedNodeId ? { ...node, data: { ...node.data, config } } : node));
  };

  const deleteSelected = () => {
    if (!selectedNodeId) return;
    setNodes((current) => current.filter((node) => node.id !== selectedNodeId));
    setEdges((current) => current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
    selectNode(null);
  };
  const selectedSchema = resolvedSchema?.nodes.find((item) => item.node_id === selectedNodeId);
  const selectedIssues = resolvedSchema?.issues.filter((issue) => issue.node_id === selectedNodeId) ?? [];
  const selectedInputEdge = edges.find((edge) => edge.target === selectedNodeId && edge.targetHandle === "input");
  const selectedInputColumns = resolvedSchema?.nodes.find((item) => item.node_id === selectedInputEdge?.source)?.columns ?? null;

  return (
    <div className="grid h-[calc(100vh-5rem)] min-h-[38rem] grid-cols-[17rem_1fr_19rem] overflow-hidden border-t border-white/10">
      <aside className="overflow-y-auto border-r border-white/10 bg-[#10150e] p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#b7ff5a]">Node library</p>
        <label className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"><Search size={14} className="text-white/35" /><input aria-label="Search nodes" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search nodes" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/25" /></label>
        <div className="mt-5 space-y-5">
          {(["source", "transform", "visualization"] as const).map((category) => {
            const definitions = visibleDefinitions.filter((item) => item.category === category);
            return <section key={category}><h2 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/30">{category}</h2>{definitions.length === 0 ? <p className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-xs text-white/20">No nodes yet</p> : definitions.map((definition) => { const disabled = definition.type === "excel_source" && sources.length === 0; return <button key={`${definition.type}:${definition.version}`} disabled={disabled} title={disabled ? "Upload a workbook first" : `Add ${definition.display_name}`} onClick={() => addNode(definition)} className="mb-2 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:border-[#b7ff5a]/40 hover:bg-[#b7ff5a]/5 disabled:cursor-not-allowed disabled:opacity-35"><Plus size={15} className="text-[#b7ff5a]" /><span><span className="block text-sm">{definition.display_name}</span><span className="block text-[11px] text-white/35">{disabled ? "Upload a workbook first" : definition.description}</span></span></button>; })}</section>;
          })}
        </div>
      </aside>
      <section className="relative bg-[#0b0f0a]">
        <div className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-[#11170f]/90 px-3 py-1.5 text-xs text-white/45 backdrop-blur">{saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Save failed" : "Ready"}</div>
        <ReactFlow<EditorNode, Edge> nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} isValidConnection={isValidConnection} onNodeClick={(_, node) => selectNode(node.id)} onPaneClick={() => selectNode(null)} onNodesDelete={(deleted) => { const ids = new Set(deleted.map((node) => node.id)); setEdges((current) => current.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target))); if (selectedNodeId && ids.has(selectedNodeId)) selectNode(null); }} fitView deleteKeyCode={["Backspace", "Delete"]} colorMode="dark">
          <Background color="#33402d" gap={22} size={1} /><Controls /><MiniMap nodeColor="#b7ff5a" maskColor="rgba(4, 7, 3, 0.75)" />
        </ReactFlow>
      </section>
      <aside className="overflow-y-auto border-l border-white/10 bg-[#10150e] p-5">
        <div className="flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#b7ff5a]">Configuration</p>{selectedNode ? <button aria-label="Delete selected node" onClick={deleteSelected} className="text-white/30 hover:text-red-300"><Trash2 size={16} /></button> : null}</div>
        {!selectedNode ? <p className="mt-8 text-sm leading-6 text-white/35">Select a node to edit its settings.</p> : null}
        {selectedNode?.data.definition.type === "excel_source" ? <ExcelSourceConfiguration config={selectedNode.data.config} sources={sources} onChange={updateSelectedConfig} /> : null}
        {selectedNode?.data.definition.type === "select_columns" ? <SelectColumnsConfiguration config={selectedNode.data.config} columns={selectedInputColumns} onChange={updateSelectedConfig} /> : null}
        {selectedNode?.data.definition.type === "rename_columns" ? <RenameColumnsConfiguration config={selectedNode.data.config} columns={selectedInputColumns} onChange={updateSelectedConfig} /> : null}
        {selectedNode?.data.definition.type === "filter" ? <FilterConfiguration config={selectedNode.data.config} columns={selectedInputColumns} onChange={updateSelectedConfig} /> : null}
        {selectedNode ? <button onClick={() => preview.mutate(selectedNode.id)} disabled={preview.isPending || saveStatus === "saving" || saveStatus === "error"} className="mt-5 w-full rounded-xl bg-[#b7ff5a] px-4 py-2.5 text-sm font-semibold text-[#11170d] disabled:opacity-40">{preview.isPending ? "Running preview…" : "Preview output"}</button> : null}
        {selectedIssues.map((issue) => <p key={`${issue.code}:${issue.field}`} className={`mt-4 rounded-xl p-3 text-xs ${issue.severity === "error" ? "bg-red-400/10 text-red-200" : "bg-amber-400/10 text-amber-200"}`}>{issue.message}</p>)}
        {selectedSchema?.columns ? <section className="mt-6"><h3 className="text-xs uppercase tracking-[0.18em] text-white/35">Output fields</h3><div className="mt-3 space-y-2">{selectedSchema.columns.map((column) => <div key={column.column_id} className="flex items-center justify-between rounded-lg border border-white/8 px-3 py-2 text-xs"><span className="truncate">{column.display_name}</span><span className="ml-2 text-white/35">{column.logical_type}{column.nullable ? "?" : ""}</span></div>)}</div></section> : null}
        {preview.error ? <p className="mt-4 rounded-xl bg-red-400/10 p-3 text-xs text-red-200">{preview.error.message}</p> : null}
        {preview.data && preview.variables === selectedNodeId ? <section className="mt-6"><div className="flex items-center justify-between"><h3 className="text-xs uppercase tracking-[0.18em] text-white/35">Preview</h3><span className="text-[11px] text-white/30">{preview.data.total_rows} rows · {preview.data.duration_ms} ms</span></div>{preview.data.rows.length === 0 ? <p className="mt-3 text-xs text-white/35">The result is empty.</p> : <div className="mt-3 overflow-auto rounded-xl border border-white/10"><table className="min-w-full text-[11px]"><thead><tr>{preview.data.columns.map((column) => <th key={column.column_id} className="border-b border-white/10 px-2 py-2 text-left text-white/40">{column.display_name}</th>)}</tr></thead><tbody>{preview.data.rows.map((row, index) => <tr key={index}>{preview.data.columns.map((column) => <td key={column.column_id} className="border-b border-white/5 px-2 py-2 whitespace-nowrap">{String(row[column.engine_name] ?? "—")}</td>)}</tr>)}</tbody></table></div>}</section> : null}
        {saveError ? <p className="mt-5 rounded-xl bg-red-400/10 p-3 text-xs text-red-200">{saveError}</p> : null}
      </aside>
    </div>
  );
}

type FilterCondition = { column_id: string; operator: string; value?: unknown };
const comparisonOperators = ["equals", "not_equals", "greater_than", "greater_or_equal", "less_than", "less_or_equal"];
const stringOperators = ["equals", "not_equals", "contains", "does_not_contain", "starts_with", "ends_with"];
const nullOperators = ["is_null", "is_not_null"];
const operatorLabel = (operator: string) => operator.replaceAll("_", " ");
function operatorsFor(type: string) {
  if (["integer", "float", "date", "datetime"].includes(type)) return [...comparisonOperators, ...nullOperators];
  if (type === "string") return [...stringOperators, ...nullOperators];
  if (type === "boolean") return ["equals", "not_equals", ...nullOperators];
  return nullOperators;
}

function FilterConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const conditions: FilterCondition[] = Array.isArray(config.conditions) ? config.conditions.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    return typeof value.column_id === "string" && typeof value.operator === "string" ? [{ column_id: value.column_id, operator: value.operator, value: value.value }] : [];
  }) : [];
  const commit = (next: FilterCondition[]) => onChange({ mode: "and", conditions: next });
  const update = (index: number, condition: FilterCondition) => commit(conditions.map((item, itemIndex) => itemIndex === index ? condition : item));
  const add = () => {
    const column = columns?.[0];
    if (column) commit([...conditions, { column_id: column.column_id, operator: operatorsFor(column.logical_type)[0], value: "" }]);
  };
  return <div className="mt-6"><h2 className="text-lg font-medium">Filter</h2><p className="mt-1 text-xs leading-5 text-white/35">Rows must match every configured condition.</p>{columns ? <><div className="mt-4 space-y-3">{conditions.map((condition, index) => { const column = columns.find((item) => item.column_id === condition.column_id) ?? columns[0]; const operators = operatorsFor(column.logical_type); const nullOperator = nullOperators.includes(condition.operator); return <div key={index} className="rounded-xl border border-white/10 p-3">{index > 0 ? <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b7ff5a]">And</p> : null}<select aria-label={`Filter column ${index + 1}`} value={condition.column_id} onChange={(event) => { const nextColumn = columns.find((item) => item.column_id === event.target.value) ?? columns[0]; const nextOperators = operatorsFor(nextColumn.logical_type); update(index, { column_id: nextColumn.column_id, operator: nextOperators.includes(condition.operator) ? condition.operator : nextOperators[0], value: condition.value }); }} className="w-full rounded-lg border border-white/10 bg-[#151b12] px-2 py-2 text-xs">{columns.map((item) => <option key={item.column_id} value={item.column_id}>{item.display_name} · {item.logical_type}</option>)}</select><select aria-label={`Filter operator ${index + 1}`} value={condition.operator} onChange={(event) => update(index, { ...condition, operator: event.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-[#151b12] px-2 py-2 text-xs">{operators.map((operator) => <option key={operator} value={operator}>{operatorLabel(operator)}</option>)}</select>{!nullOperator ? column.logical_type === "boolean" ? <select aria-label={`Filter value ${index + 1}`} value={String(condition.value ?? "true")} onChange={(event) => update(index, { ...condition, value: event.target.value === "true" })} className="mt-2 w-full rounded-lg border border-white/10 bg-[#151b12] px-2 py-2 text-xs"><option value="true">true</option><option value="false">false</option></select> : <input aria-label={`Filter value ${index + 1}`} type={["integer", "float"].includes(column.logical_type) ? "number" : column.logical_type === "date" ? "date" : column.logical_type === "datetime" ? "datetime-local" : "text"} value={String(condition.value ?? "")} onChange={(event) => update(index, { ...condition, value: event.target.value })} placeholder="Value" className="mt-2 w-full rounded-lg border border-white/10 bg-[#151b12] px-2 py-2 text-xs outline-none focus:border-[#b7ff5a]/50" /> : null}<button aria-label={`Remove condition ${index + 1}`} onClick={() => commit(conditions.filter((_, itemIndex) => itemIndex !== index))} className="mt-2 text-[11px] text-white/30 hover:text-red-300">Remove condition</button></div>; })}</div><button onClick={add} className="mt-3 w-full rounded-xl border border-white/10 px-3 py-2 text-xs hover:border-[#b7ff5a]/40">Add condition</button></> : <p className="mt-4 rounded-xl border border-dashed border-white/10 p-3 text-xs text-white/35">Connect an upstream dataset to configure conditions.</p>}</div>;
}

type RenameRule = { column_id: string; new_name: string };

function RenameColumnsConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const rules: RenameRule[] = Array.isArray(config.renames) ? config.renames.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    return typeof value.column_id === "string" && typeof value.new_name === "string" ? [{ column_id: value.column_id, new_name: value.new_name }] : [];
  }) : [];
  const update = (index: number, rule: RenameRule) => onChange({ renames: rules.map((item, itemIndex) => itemIndex === index ? rule : item) });
  const add = () => {
    const available = columns?.find((column) => !rules.some((rule) => rule.column_id === column.column_id));
    if (available) onChange({ renames: [...rules, { column_id: available.column_id, new_name: "" }] });
  };
  return <div className="mt-6"><h2 className="text-lg font-medium">Rename Columns</h2><p className="mt-1 text-xs leading-5 text-white/35">Rename fields without changing their stable identity.</p>{columns ? <><div className="mt-4 space-y-3">{rules.map((rule, index) => <div key={`${rule.column_id}:${index}`} className="rounded-xl border border-white/10 p-3"><select aria-label={`Column ${index + 1}`} value={rule.column_id} onChange={(event) => update(index, { ...rule, column_id: event.target.value })} className="w-full rounded-lg border border-white/10 bg-[#151b12] px-2 py-2 text-xs">{columns.map((column) => <option key={column.column_id} value={column.column_id}>{column.display_name}</option>)}</select><div className="mt-2 flex gap-2"><input aria-label={`New name ${index + 1}`} value={rule.new_name} onChange={(event) => update(index, { ...rule, new_name: event.target.value })} placeholder="New field name" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#151b12] px-2 py-2 text-xs outline-none focus:border-[#b7ff5a]/50" /><button aria-label={`Remove rename ${index + 1}`} onClick={() => onChange({ renames: rules.filter((_, itemIndex) => itemIndex !== index) })} className="px-2 text-white/30 hover:text-red-300"><Trash2 size={14} /></button></div></div>)}</div><button onClick={add} disabled={rules.length >= columns.length} className="mt-3 w-full rounded-xl border border-white/10 px-3 py-2 text-xs hover:border-[#b7ff5a]/40 disabled:opacity-30">Add rename</button></> : <p className="mt-4 rounded-xl border border-dashed border-white/10 p-3 text-xs text-white/35">Connect an upstream dataset to rename fields.</p>}</div>;
}

function SelectColumnsConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const selected = Array.isArray(config.column_ids) ? config.column_ids.filter((item): item is string => typeof item === "string") : [];
  const toggle = (columnId: string) => {
    const next = selected.includes(columnId) ? selected.filter((item) => item !== columnId) : [...selected, columnId];
    onChange({ column_ids: next });
  };
  return <div className="mt-6"><h2 className="text-lg font-medium">Select Columns</h2><p className="mt-1 text-xs leading-5 text-white/35">Choose fields in the order they should continue downstream.</p>{columns ? <div className="mt-4 space-y-2">{columns.map((column) => <label key={column.column_id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-sm"><input type="checkbox" checked={selected.includes(column.column_id)} onChange={() => toggle(column.column_id)} className="accent-[#b7ff5a]" /><span className="min-w-0 flex-1 truncate">{column.display_name}</span><span className="text-[11px] text-white/30">{column.logical_type}</span></label>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-white/10 p-3 text-xs text-white/35">Connect an upstream dataset to choose fields.</p>}</div>;
}

function ExcelSourceConfiguration({ config, sources, onChange }: { config: Record<string, unknown>; sources: DataSource[]; onChange: (config: Record<string, unknown>) => void }) {
  const sourceId = typeof config.source_id === "string" ? config.source_id : "";
  const selectedSource = sources.find((source) => source.id === sourceId);
  const sheetName = typeof config.sheet_name === "string" ? config.sheet_name : "";
  return (
    <div className="mt-6 space-y-5">
      <div><h2 className="text-lg font-medium">Excel Source</h2><p className="mt-1 text-xs leading-5 text-white/35">Choose the persisted workbook and worksheet read by this node.</p></div>
      <label className="block text-xs text-white/50">Workbook<select aria-label="Workbook" value={sourceId} onChange={(event) => { const source = sources.find((item) => item.id === event.target.value); onChange({ source_id: event.target.value, sheet_name: source?.workbook.sheets[0]?.name ?? "" }); }} className="mt-2 w-full rounded-xl border border-white/10 bg-[#151b12] px-3 py-2.5 text-sm text-white"><option value="">Select workbook</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select></label>
      <label className="block text-xs text-white/50">Worksheet<select aria-label="Worksheet" value={sheetName} disabled={!selectedSource} onChange={(event) => onChange({ ...config, sheet_name: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#151b12] px-3 py-2.5 text-sm text-white disabled:opacity-40"><option value="">Select worksheet</option>{selectedSource?.workbook.sheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{sheet.name}</option>)}</select></label>
    </div>
  );
}
