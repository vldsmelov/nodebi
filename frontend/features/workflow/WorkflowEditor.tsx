"use client";

import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-provider";

import {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  MiniMap,
  ReactFlow,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DataSource } from "@/features/data-sources/api";
import { VisualizationView } from "@/features/dashboard/VisualizationView";
import { saveWorkflow } from "./api";
import { ParametersConfiguration } from "./ParametersConfiguration";
import { NodeFinder } from "./NodeFinder";
import type { ParameterValues } from "./types";
import { NodeOutputPanel } from "./NodeOutputPanel";
import { WorkflowAutosave, type SaveState } from "./autosave";
import { NodeConfiguration } from "./NodeConfiguration";
import { WorkflowNodeCard, type EditorNode } from "./WorkflowNodeCard";
import { useWorkflowUi } from "./store";
import type { NodeDefinition, Workflow, WorkflowEdge, WorkflowNode, WorkflowSchemaResult } from "./types";

const nodeTypes = { workflowNode: WorkflowNodeCard };

function toEditorNode(node: WorkflowNode, catalog: NodeDefinition[]): EditorNode {
  const registeredDefinition = catalog.find((item) => item.type === node.type && item.version === node.version);
  const definition = registeredDefinition ?? {
    type: node.type,
    version: node.version,
    category: "transform" as const,
    config_schema: {}, schema_inference_mode: "static" as const,
    display_name: node.type,
    description: "This node type is not available in the current catalog.",
    icon: null,
    input_ports: [],
    output_ports: [],
  };
  return { id: node.id, type: "workflowNode", position: node.position, data: { definition, config: node.config ?? {}, ui: node.ui, validationError: registeredDefinition ? undefined : "Unavailable node type" } };
}

function toEditorEdge(edge: WorkflowEdge): Edge {
  return { id: edge.id, source: edge.source_node_id, sourceHandle: edge.source_port, target: edge.target_node_id, targetHandle: edge.target_port, animated: true };
}

export function serializeNodes(nodes: EditorNode[]): WorkflowNode[] {
  return nodes.map((node) => ({ id: node.id, type: node.data.definition.type, version: node.data.definition.version, position: node.position, config: node.data.config, ui: node.data.ui ?? {} }));
}

export function serializeEdges(edges: Edge[]): WorkflowEdge[] {
  return edges.map((edge) => ({ id: edge.id, source_node_id: edge.source, source_port: edge.sourceHandle ?? "output", target_node_id: edge.target, target_port: edge.targetHandle ?? "input" }));
}

type Props = { workflow: Workflow; catalog: NodeDefinition[]; sources: DataSource[]; resolvedSchema?: WorkflowSchemaResult; onSaved?: () => void };

export function WorkflowEditor({ workflow, catalog, sources, resolvedSchema, onSaved }: Props) {
  const { t, errorText, nodeName } = useI18n();
  const { theme, palette } = useTheme();
  const [saveState, setSaveState] = useState<SaveState>({ status: "saved", revision: workflow.revision, error: null });
  const [writer] = useState(() => new WorkflowAutosave(
    workflow.id, workflow.revision,
    { name: workflow.name, nodes: workflow.nodes, edges: workflow.edges, parameters: workflow.parameters ?? [] },
    (payload) => saveWorkflow(workflow.id, payload),
    (state) => { setSaveState(state); if (state.status === "saved") onSaved?.(); },
    window.sessionStorage,
  ));
  const [recovered] = useState(() => writer.recover());
  const [parameters, setParameters] = useState(recovered?.draft.parameters ?? workflow.parameters ?? []);
  const [parameterValues, setParameterValues] = useState<ParameterValues>({});
  const executionParameters = Object.fromEntries(parameters.filter(item => Object.hasOwn(parameterValues, item.name)).map(item => [item.name, parameterValues[item.name]]));
  const parameterKey = JSON.stringify(executionParameters);
  const initialNodes = useMemo(() => (recovered?.draft.nodes ?? workflow.nodes).map((node) => toEditorNode(node, catalog)), [catalog, recovered, workflow.nodes]);
  const [nodes, setNodes, onNodesChange] = useNodesState<EditorNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState((recovered?.draft.edges ?? workflow.edges).map(toEditorEdge));
  const themedEdges = useMemo(() => edges.map(edge => ({ ...edge, style: { ...edge.style, stroke: palette.accent } })), [edges, palette.accent]);
  const [search, setSearch] = useState("");
  const flow = useRef<ReactFlowInstance<EditorNode, Edge> | null>(null);
  const selectedNodeId = useWorkflowUi((state) => state.selectedNodeId);
  const selectNode = useWorkflowUi((state) => state.selectNode);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const visibleDefinitions = catalog.filter((definition) => `${nodeName(definition.type)} ${t(definition.description)} ${definition.display_name}`.toLowerCase().includes(search.toLowerCase()));
  const saveStatus = saveState.status;
  const saveError = saveState.error;
  const graph = useMemo(() => ({ name: workflow.name, nodes: serializeNodes(nodes), edges: serializeEdges(edges), parameters }), [workflow.name, nodes, edges, parameters]);
  const dirty = JSON.stringify(graph) !== writer.savedGraph || saveStatus !== "saved";
  const currentSchema = !dirty && resolvedSchema?.revision === saveState.revision ? resolvedSchema : undefined;

  useEffect(() => {
    writer.resume();
    return () => writer.dispose();
  }, [writer]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (writer.dirty) { event.preventDefault(); event.returnValue = ""; }
    };
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a[href]");
      if (anchor && writer.dirty && !window.confirm(t("Changes are not saved yet. Leave and recover this draft later?"))) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", navigate, true);
    };
  }, [writer, t]);
  useEffect(() => { writer.change(graph); }, [graph, writer]);
  const addNode = (definition: NodeDefinition) => {
    const firstSource = sources[0];
    if (definition.type === "excel_source" && !firstSource?.workbook.sheets[0]) return;
    const id = crypto.randomUUID();
    const config = definition.type === "excel_source" ? { source_id: firstSource.id, sheet_name: firstSource.workbook.sheets[0].name } : {};
    setNodes((current) => [...current, { id, type: "workflowNode", position: { x: 80 + (current.length % 3) * 310, y: 80 + Math.floor(current.length / 3) * 180 }, data: { definition, config } }]);
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
    const visited = new Set<string>();
    const pending = [connection.target];
    while (pending.length) {
      const current = pending.pop()!;
      if (current === connection.source) return false;
      if (visited.has(current)) continue;
      visited.add(current);
      pending.push(...edges.filter(edge => edge.source === current).map(edge => edge.target));
    }
    return true;
  }, [edges, nodes]);

  const onConnect = useCallback((connection: Connection) => {
    if (!isValidConnection(connection)) return;
    setEdges((current) => addEdge({ ...connection, id: crypto.randomUUID(), animated: true }, current));
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
  const selectedSchema = currentSchema?.nodes.find((item) => item.node_id === selectedNodeId);
  const selectedIssues = currentSchema?.issues.filter((issue) => issue.node_id === selectedNodeId) ?? [];
  const selectedInputEdge = edges.find((edge) => edge.target === selectedNodeId && edge.targetHandle === "input");
  // Keep field controls usable while editing; these are explicitly last-known
  // choices. Output/preview still require an exact acknowledged revision.
  const selectedInputColumns = resolvedSchema?.nodes.find((item) => item.node_id === selectedInputEdge?.source)?.columns ?? null;

  return (
    <div className="grid h-[calc(100vh-7.75rem)] min-h-[38rem] grid-cols-[17rem_1fr_19rem] overflow-hidden border-t border-outline">
      <aside className="overflow-y-auto border-r border-outline bg-panel p-4">
        <NodeFinder nodes={nodes.map(node => ({ id: node.id, label: `${String(node.data.config.title || node.data.config.name || node.data.config.sheet_name || "")} · ${nodeName(node.data.definition.type)}` }))} selected={selectedNodeId} onSelect={id => {
          selectNode(id);
          setNodes(current => current.map(node => ({ ...node, selected: node.id === id })));
          void flow.current?.fitView({ nodes: [{ id }], padding: 0.5, minZoom: 0.5, maxZoom: 1, duration: 0 });
        }} />
        <ParametersConfiguration definitions={parameters} onChange={setParameters} values={parameterValues} onValuesChange={setParameterValues} />
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">{t("Node library")}</p>
        <label className="mt-4 flex items-center gap-2 rounded-xl border border-outline bg-raised px-3 py-2"><Search size={14} className="text-muted" /><input aria-label={t("Search nodes")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search nodes")} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" /></label>
        <div className="mt-5 space-y-5">
          {(["source", "transform", "visualization"] as const).map((category) => {
            const definitions = visibleDefinitions.filter((item) => item.category === category);
            return <section key={category}><h2 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted">{t(category)}</h2>{definitions.length === 0 ? <p className="rounded-lg border border-dashed border-outline px-3 py-2 text-xs text-muted">{t("No nodes yet")}</p> : definitions.map((definition) => { const disabled = definition.type === "excel_source" && sources.length === 0; return <button key={`${definition.type}:${definition.version}`} disabled={disabled} title={disabled ? t("Upload a workbook first") : t("Add {0}", {"0": nodeName(definition.type)})} onClick={() => addNode(definition)} className="mb-2 flex w-full items-center gap-3 rounded-xl border border-outline bg-raised p-3 text-left hover:border-accent/40 hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-35"><Plus size={15} className="text-accent" /><span><span className="block text-sm">{nodeName(definition.type)}</span><span className="block text-[11px] text-muted">{disabled ? t("Upload a workbook first") : t(definition.description)}</span></span></button>; })}</section>;
          })}
        </div>
      </aside>
      <section className="relative bg-page">
        <div className="absolute right-4 top-4 z-10 rounded-full border border-outline bg-surface/90 px-3 py-1.5 text-xs text-muted backdrop-blur">{saveStatus === "saving" ? t("Saving…") : saveStatus === "saved" ? t("Saved") : saveStatus === "error" ? t("Save failed") : t("Ready")}</div>
        {saveStatus === "error" ? <div className="absolute left-4 top-4 z-10 max-w-sm rounded-xl bg-danger-surface p-3 text-xs text-danger" role="alert">{errorText(saveError)}<div className="mt-2 flex gap-3"><button onClick={() => void writer.flush()}>{t("Retry save")}</button><button onClick={() => { if (window.confirm(t("Discard this local draft and load the saved workflow?"))) { sessionStorage.removeItem(writer.key); window.location.reload(); } }}>{t("Discard draft and reload")}</button></div></div> : null}
        <ReactFlow<EditorNode, Edge> onInit={instance => { flow.current = instance; }} nodes={nodes} edges={themedEdges} nodeTypes={nodeTypes} ariaLabelConfig={{
          'controls.ariaLabel': t('Canvas controls'),
          'controls.zoomIn.ariaLabel': t('Zoom in'), 'controls.zoomOut.ariaLabel': t('Zoom out'),
          'controls.fitView.ariaLabel': t('Fit view'), 'controls.interactive.ariaLabel': t('Toggle interactivity'),
          'minimap.ariaLabel': t('Mini map'), 'handle.ariaLabel': t('Connection handle'),
          'node.a11yDescription.default': t('Use arrows to move, Enter to select, and Delete to remove a node.'),
          'node.a11yDescription.keyboardDisabled': t('Press Enter to select a node.'),
          'edge.a11yDescription.default': t('Press Enter to select an edge and Delete to remove it.'),
          'node.a11yDescription.ariaLiveMessage': ({ direction, x, y }) => t('Node moved {0}. Position: {1}, {2}.', { 0: t(direction), 1: x, 2: y }),
        }} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} isValidConnection={isValidConnection} onNodeClick={(_, node) => selectNode(node.id)} onPaneClick={() => selectNode(null)} onNodesDelete={(deleted) => { const ids = new Set(deleted.map((node) => node.id)); setEdges((current) => current.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target))); if (selectedNodeId && ids.has(selectedNodeId)) selectNode(null); }} fitView deleteKeyCode={["Backspace", "Delete"]} colorMode={theme}>
          <Background color={palette.grid} gap={22} size={1} /><Controls /><MiniMap nodeColor={palette.accent} maskColor={palette.mask} />
        </ReactFlow>
      </section>
      <aside className="overflow-y-auto border-l border-outline bg-panel p-5">
        <div className="flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">{t("Configuration")}</p>{selectedNode ? <button aria-label={t("Delete selected node")} onClick={deleteSelected} className="text-muted hover:text-danger"><Trash2 size={16} /></button> : null}</div>
        {!selectedNode ? <p className="mt-8 text-sm leading-6 text-muted">{t("Select a node to edit its settings.")}</p> : null}
        {selectedNode?.data.definition.input_ports.map(port => {
          const connected = edges.find(edge => edge.target === selectedNode.id && edge.targetHandle === port.id);
          const available = nodes.flatMap(node => node.data.definition.output_ports.flatMap(output => {
            const candidate = { source: node.id, sourceHandle: output.id, target: selectedNode.id, targetHandle: port.id };
            const active = connected?.source === node.id && connected.sourceHandle === output.id;
            return active || (!connected && isValidConnection(candidate)) ? [{ value: `${node.id}:${output.id}`, label: `${nodeName(node.data.definition.type)} (${node.id.slice(0, 6)}) / ${t(output.display_name)}` }] : [];
          }));
          return <label key={port.id} className="mt-4 block text-xs">{t("Input:")}{" "}{t(port.display_name)}<select aria-label={t("Input {0}", {"0": t(port.id)})} className="mt-2 w-full rounded-lg border border-outline bg-control px-2 py-2" value={connected ? `${connected.source}:${connected.sourceHandle}` : ""} onChange={event => {
            if (!event.target.value) setEdges(current => current.filter(edge => !(edge.target === selectedNode.id && edge.targetHandle === port.id)));
            else { const [source, sourceHandle] = event.target.value.split(":"); onConnect({ source, sourceHandle, target: selectedNode.id, targetHandle: port.id }); }
          }}><option value="">{t("Disconnected")}</option>{available.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
        })}
        {selectedNode ? <NodeConfiguration parameters={parameters} type={selectedNode.data.definition.type} config={selectedNode.data.config} sources={sources} columns={selectedInputColumns} inputColumns={Object.fromEntries((selectedNode.data.definition.input_ports ?? []).map(port => {
          const edge = edges.find(e => e.target === selectedNode.id && e.targetHandle === port.id);
          return [port.id, resolvedSchema?.nodes.find(n => n.node_id === edge?.source)?.columns ?? null];
        }))} onChange={updateSelectedConfig} /> : null}
        {selectedNode && dirty && selectedInputColumns ? <p className="mt-2 text-xs text-warning">{t("Field choices are from the last saved graph. Updating after save…")}</p> : null}
        {selectedNode?.data.definition.category === "visualization" && !dirty ? <div className="mt-4 h-72"><VisualizationView parameters={executionParameters} id={selectedNode.id} revision={saveState.revision} /></div> : null}
        {selectedNode && <NodeOutputPanel parameters={executionParameters} key={`${selectedNode.id}:${parameterKey}`} workflowId={workflow.id} nodeId={selectedNode.id}
          revision={saveState.revision} dirty={dirty} schema={selectedSchema} issues={selectedIssues} />}
        {saveError ? <p className="mt-5 rounded-xl bg-danger-surface p-3 text-xs text-danger">{errorText(saveError)}</p> : null}
      </aside>
    </div>
  );
}
