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
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

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

import { PreparationDialog } from "./PreparationDialog";
import { appendUnaryChain, type PlannedStep } from "./unary-chain";
import { CalculatedFieldsDialog } from "./CalculatedFieldsDialog";
import { appendCalculatedChain, calculatedChain, normalizedName, type CalculatedRow } from "./calculated-chain";
import type { ResolvedColumn } from "./types";
import { GroupPanel } from "./GroupPanel";
import { EditorPanels, useEditorView } from "./EditorPanels";
import { groupName, groupProxyId, projectGroups } from "./graph-groups";
import { GraphHistory } from "./graph-history";
import { layoutGraph } from "./graph-layout";
import type { GraphDraft } from "./autosave";

import { canConnect, dependencyIds, nodeLabel, type DependencyView } from "./graph-interaction";

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
  const [view, setView] = useEditorView(workflow.id);
  const [dependencyView, setDependencyView] = useState<DependencyView>("all");
  const [search, setSearch] = useState("");
  const flow = useRef<ReactFlowInstance<EditorNode, Edge> | null>(null);
  const selectedNodeId = useWorkflowUi((state) => state.selectedNodeId);
  const selectNode = useWorkflowUi((state) => state.selectNode);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const visibleDefinitions = catalog.filter((definition) => `${nodeName(definition.type)} ${t(definition.description)} ${definition.display_name}`.toLowerCase().includes(search.toLowerCase()));
  const highlighted = selectedNodeId && dependencyView !== "all" ? dependencyIds(edges, selectedNodeId, dependencyView) : null;
  const selectedIds = new Set(nodes.filter(node => node.selected || node.id === selectedNodeId).map(node => node.id));
  const groupNames = [...new Set(nodes.map(groupName).filter(Boolean))].sort();
  const groups = groupNames.map(name => { const members = nodes.filter(node => groupName(node) === name); return { name, count: members.length, members: members.map(node => ({ id: node.id, label: nodeLabel(node.data, nodeName(node.data.definition.type)) })) }; });
  const expandGroup = (name: string) => setView(current => ({ ...current, collapsed: current.collapsed.filter(item => item !== name) }));
  const openNode = (id: string) => {
    const node = nodes.find(item => item.id === id);
    if (!node) return;
    expandGroup(groupName(node)); selectNode(id);
    setNodes(current => current.map(item => ({ ...item, selected: item.id === id })));
    requestAnimationFrame(() => { void flow.current?.fitView({ nodes: [{ id }], padding: 0.5, minZoom: 0.5, maxZoom: 1, duration: 0 }); });
  };
  const assignGroup = (name: string) => {
    setNodes(current => current.map(node => selectedIds.has(node.id) ? { ...node, data: { ...node.data, ui: { ...node.data.ui, group: name } } } : node));
    expandGroup(name);
  };
  const changeGroup = (from: string, to: string) => {
    setNodes(current => current.map(node => groupName(node) === from ? { ...node, data: { ...node.data, ui: { ...node.data.ui, group: to } } } : node));
    setView(current => ({ ...current, collapsed: current.collapsed.filter(name => name !== from) }));
  };
  const toggleGroup = (name: string) => {
    if (view.collapsed.includes(name)) { expandGroup(name); return; }
    setView(current => ({ ...current, collapsed: [...current.collapsed, name] }));
    setNodes(current => current.map(node => groupName(node) === name ? { ...node, selected: false } : node));
    if (selectedNode && groupName(selectedNode) === name) selectNode(null);
  };
  const projection = projectGroups(nodes, themedEdges, view.collapsed, expandGroup, node => nodeLabel(node.data, nodeName(node.data.definition.type)));
  const displayNodes = projection.nodes.map(node => ({ ...node, style: { ...node.style, opacity: highlighted && !(node.data.group ? nodes.some(member => groupName(member) === node.data.group!.name && highlighted.has(member.id)) : highlighted.has(node.id)) ? 0.2 : 1 } }));
  const originalEdges = new Map(edges.map(edge => [edge.id, edge]));
  const displayEdges = projection.edges.map(edge => { const original = originalEdges.get(edge.id)!; return { ...edge, style: { ...edge.style, opacity: highlighted && !(highlighted.has(original.source) && highlighted.has(original.target)) ? 0.1 : 1 } }; });
  const focusNodes = (ids: string[]) => { void flow.current?.fitView({ nodes: [...new Set(ids.map(id => { const node = nodes.find(item => item.id === id); const name = node && groupName(node); return name && view.collapsed.includes(name) ? groupProxyId(name) : id; }))].map(id => ({ id })), padding: 0.3, maxZoom: 1, duration: 0 }); };
  const following = selectedNode ? catalog.filter(definition => definition.input_ports.length === 1 && selectedNode.data.definition.output_ports.some(output => output.kind === definition.input_ports[0].kind && (output.max_connections === null || edges.filter(edge => edge.source === selectedNode.id && edge.sourceHandle === output.id).length < output.max_connections))) : [];
  const addFollowing = (type: string) => {
    const definition = following.find(item => item.type === type);
    if (!selectedNode || !definition) return;
    const input = definition.input_ports[0];
    const output = selectedNode.data.definition.output_ports.find(port => port.kind === input.kind && (port.max_connections === null || edges.filter(edge => edge.source === selectedNode.id && edge.sourceHandle === port.id).length < port.max_connections));
    if (!output) return;
    const id = crypto.randomUUID();
    const position = { x: selectedNode.position.x + 360, y: selectedNode.position.y };
    while (nodes.some(node => Math.abs(node.position.x - position.x) < 300 && Math.abs(node.position.y - position.y) < 180)) position.y += 200;
    const next: EditorNode = { id, type: "workflowNode", position, selected: true, data: { definition, config: {} } };
    const connection = { source: selectedNode.id, sourceHandle: output.id, target: id, targetHandle: input.id };
    if (!canConnect([...nodes, next], edges, connection)) return;
    setNodes(current => [...current.map(node => ({ ...node, selected: false })), next]);
    setEdges(current => addEdge({ ...connection, id: crypto.randomUUID(), animated: true }, current));
    selectNode(id);
    requestAnimationFrame(() => focusNodes([id]));
  };
  const saveStatus = saveState.status;
  const saveError = saveState.error;
  const graph = useMemo(() => ({ name: workflow.name, nodes: serializeNodes(nodes), edges: serializeEdges(edges), parameters }), [workflow.name, nodes, edges, parameters]);
  const [history] = useState(() => new GraphHistory(graph));
  useSyncExternalStore(history.subscribe, history.getVersion, history.getVersion);
  const editGroup = useRef<string | null>(null);
  const [layoutError, setLayoutError] = useState(false);
  useEffect(() => { history.record(graph, editGroup.current); }, [graph, history]);
  const restore = (draft: GraphDraft | null) => {
    if (!draft) return;
    setNodes(draft.nodes.map(node => toEditorNode(node, catalog)));
    setEdges(draft.edges.map(toEditorEdge)); setParameters(draft.parameters ?? []);
    if (!draft.nodes.some(node => node.id === selectedNodeId)) selectNode(null);
    setLayoutError(false);
  };
  const travel = (direction: "undo" | "redo") => {
    history.record(graph, editGroup.current); editGroup.current = null;
    restore(direction === "undo" ? history.undo() : history.redo());
  };
  const arrange = () => {
    const arranged = layoutGraph(nodes, edges);
    setLayoutError(!arranged);
    if (arranged) { editGroup.current = null; setNodes(arranged); requestAnimationFrame(() => focusNodes(arranged.map(node => node.id))); }
  };
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
    setNodes((current) => [...current.map(node => ({ ...node, selected: false })), { id, selected: true, type: "workflowNode", position: { x: 80 + (current.length % 3) * 310, y: 80 + Math.floor(current.length / 3) * 180 }, data: { definition, config } }]);
    selectNode(id);
  };

  const isValidConnection = useCallback((connection: Edge | Connection) => canConnect(nodes, edges, {
    source: connection.source, target: connection.target,
    sourceHandle: connection.sourceHandle ?? null, targetHandle: connection.targetHandle ?? null,
  }), [edges, nodes]);

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

  const [preparation, setPreparation] = useState<{ columns: ResolvedColumn[]; source: string; snapshot: string } | null>(null);
  const applyPreparation = (steps: PlannedStep[]) => {
    if (!preparation || preparation.snapshot !== JSON.stringify(graph)) return false;
    const next = appendUnaryChain(nodes, edges, preparation.source, catalog, steps);
    if (!next) return false;
    editGroup.current = null; const last = steps[steps.length - 1].id;
    setNodes(next.nodes.map(node => ({ ...node, selected: node.id === last }))); setEdges(next.edges); selectNode(last);
    requestAnimationFrame(() => focusNodes([last])); return true;
  };
  const [batch, setBatch] = useState<{ initial: CalculatedRow[]; columns: ResolvedColumn[]; editing: boolean; source: string; snapshot: string } | null>(null);
  const openBatch = (editing: boolean) => {
    if (!selectedNode || dirty) return;
    const columns = editing ? currentSchema?.nodes.find(item => item.node_id === selectedInputEdge?.source)?.columns : selectedSchema?.columns;
    if (!columns) return;
    const initial = editing ? calculatedChain(nodes, edges, selectedNode.id).map(node => ({ id: node.id, name: String(node.data.config.name ?? ""), expression: String(node.data.config.expression ?? "") })) : [{ id: crypto.randomUUID(), name: "", expression: "" }];
    if (initial.length) setBatch({ initial, columns, editing, source: selectedNode.id, snapshot: JSON.stringify(graph) });
  };
  const applyBatch = (rows: CalculatedRow[]) => {
    if (!batch || batch.snapshot !== JSON.stringify(graph)) return false;
    const definition = catalog.find(item => item.type === "calculated_column" && item.version === 1);
    if (!definition) return false;
    editGroup.current = null;
    if (batch.editing) {
      const configs = new Map(rows.map(row => [row.id, row]));
      setNodes(current => current.map(node => { const row = configs.get(node.id); return row ? { ...node, data: { ...node.data, config: { ...node.data.config, name: normalizedName(row.name), expression: row.expression } } } : node; }));
    } else {
      const next = appendCalculatedChain(nodes, edges, batch.source, definition, rows);
      if (!next) return false;
      const last = rows[rows.length - 1].id;
      setNodes(next.nodes.map(node => ({ ...node, selected: node.id === last }))); setEdges(next.edges); selectNode(last);
      requestAnimationFrame(() => focusNodes([last]));
    }
    return true;
  };

  return (
    <div onFocusCapture={event => { editGroup.current = (event.target as HTMLElement).matches("input, textarea") ? crypto.randomUUID() : null; }} onPointerDownCapture={event => { if (!(event.target as HTMLElement).closest("input, textarea")) editGroup.current = null; }} onKeyDown={event => {
      if ((event.target as HTMLElement).closest("input, textarea, select, [contenteditable=true]")) return;
      if ((event.ctrlKey || event.metaKey) && !event.altKey && ["z", "y"].includes(event.key.toLowerCase())) {
        event.preventDefault(); travel(event.key.toLowerCase() === "y" || event.shiftKey ? "redo" : "undo");
      }
    }} className="grid h-[calc(100vh-7.75rem)] min-h-[38rem] overflow-hidden border-t border-outline" style={{ gridTemplateColumns: `minmax(180px, min(${view.left}px, 25vw)) minmax(320px, 1fr) minmax(220px, min(${view.right}px, 40vw))`, minWidth: 720 }}>
      <aside className="overflow-y-auto border-r border-outline bg-panel p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          <button className="rounded border border-outline px-2 py-1 text-xs disabled:opacity-40" disabled={!history.canUndo} onClick={() => travel("undo")}>{t("Undo graph change")}</button>
          <button className="rounded border border-outline px-2 py-1 text-xs disabled:opacity-40" disabled={!history.canRedo} onClick={() => travel("redo")}>{t("Redo graph change")}</button>
          <button className="rounded border border-outline px-2 py-1 text-xs disabled:opacity-40" disabled={!nodes.length} onClick={arrange}>{t("Arrange by dependencies")}</button>
        </div>
        {layoutError ? <p role="alert" className="mb-3 text-xs text-danger">{t("Fix cycles or missing connections before arranging the graph.")}</p> : null}
        <EditorPanels left={view.left} right={view.right} change={(left, right) => setView(current => ({ ...current, left, right }))} />
        <GroupPanel groups={groups} selectedCount={selectedIds.size} collapsed={view.collapsed} assign={assignGroup} rename={changeGroup} dissolve={name => changeGroup(name, "")} toggle={toggleGroup} openNode={openNode} />
        <NodeFinder nodes={nodes.map(node => ({ id: node.id, label: `${nodeLabel(node.data, nodeName(node.data.definition.type))} · ${nodeName(node.data.definition.type)}` }))} selected={selectedNodeId} onSelect={openNode} />
        <label className="mb-4 block text-xs">{t("Show dependencies")}
          <select aria-label={t("Show dependencies")} className="mt-2 w-full rounded-lg border border-outline bg-control p-2" value={dependencyView} onChange={event => {
            const value = event.target.value as DependencyView; setDependencyView(value);
            if (selectedNodeId && value !== "all") focusNodes([...dependencyIds(edges, selectedNodeId, value)]);
          }}>
            <option value="all">{t("Entire workflow")}</option><option value="ancestors">{t("Sources of selected node")}</option><option value="descendants">{t("Affected downstream nodes")}</option>
          </select>
        </label>
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
        <ReactFlow<EditorNode, Edge> multiSelectionKeyCode="Shift" onInit={instance => { flow.current = instance; }} nodes={displayNodes} edges={displayEdges} nodeTypes={nodeTypes} ariaLabelConfig={{
          'controls.ariaLabel': t('Canvas controls'),
          'controls.zoomIn.ariaLabel': t('Zoom in'), 'controls.zoomOut.ariaLabel': t('Zoom out'),
          'controls.fitView.ariaLabel': t('Fit view'), 'controls.interactive.ariaLabel': t('Toggle interactivity'),
          'minimap.ariaLabel': t('Mini map'), 'handle.ariaLabel': t('Connection handle'),
          'node.a11yDescription.default': t('Use arrows to move, Enter to select, and Delete to remove a node.'),
          'node.a11yDescription.keyboardDisabled': t('Press Enter to select a node.'),
          'edge.a11yDescription.default': t('Press Enter to select an edge and Delete to remove it.'),
          'node.a11yDescription.ariaLiveMessage': ({ direction, x, y }) => t('Node moved {0}. Position: {1}, {2}.', { 0: t(direction), 1: x, 2: y }),
        }} onNodeDragStart={() => { editGroup.current = crypto.randomUUID(); }} onNodesChange={changes => { const real = changes.filter(change => "id" in change && nodes.some(node => node.id === change.id)); if (real.length) onNodesChange(real); }} onEdgesChange={onEdgesChange} onConnect={onConnect} isValidConnection={isValidConnection} onNodeClick={(_, node) => { if (!node.data.group) selectNode(node.id); }} onPaneClick={() => selectNode(null)} onNodesDelete={(deleted) => { const ids = new Set(deleted.map((node) => node.id)); setEdges((current) => current.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target))); if (selectedNodeId && ids.has(selectedNodeId)) selectNode(null); }} fitView deleteKeyCode={["Backspace", "Delete"]} colorMode={theme}>
          <Background color={palette.grid} gap={22} size={1} /><Controls /><MiniMap nodeColor={palette.accent} maskColor={palette.mask} />
        </ReactFlow>
      </section>
      <aside className="overflow-y-auto border-l border-outline bg-panel p-5">
        <div className="flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">{t("Configuration")}</p>{selectedNode ? <button aria-label={t("Delete selected node")} onClick={deleteSelected} className="text-muted hover:text-danger"><Trash2 size={16} /></button> : null}</div>
        {!selectedNode ? <p className="mt-8 text-sm leading-6 text-muted">{t("Select a node to edit its settings.")}</p> : null}
        {selectedNode ? <div className="mt-4 space-y-3">
          <label className="block text-xs">{t("Node label")}<input aria-label={t("Node label")} maxLength={200} placeholder={nodeLabel({ ...selectedNode.data, ui: {} }, nodeName(selectedNode.data.definition.type))} value={typeof selectedNode.data.ui?.label === "string" ? selectedNode.data.ui.label : ""} className="mt-2 w-full rounded-lg border border-outline bg-control p-2" onChange={event => {
            const label = event.target.value;
            setNodes(current => current.map(node => node.id === selectedNode.id ? { ...node, data: { ...node.data, ui: { ...node.data.ui, label } } } : node));
          }} /></label>
          {following.length ? <label className="block text-xs">{t("Add next step")}<select aria-label={t("Add next step")} className="mt-2 w-full rounded-lg border border-outline bg-control p-2" value="" onChange={event => addFollowing(event.target.value)}><option value="">{t("Select node")}</option>{following.map(definition => <option key={definition.type} value={definition.type}>{nodeName(definition.type)}</option>)}</select></label> : null}
        </div> : null}
        {selectedNode?.data.definition.input_ports.map(port => {
          const connected = edges.find(edge => edge.target === selectedNode.id && edge.targetHandle === port.id);
          const available = nodes.flatMap(node => node.data.definition.output_ports.flatMap(output => {
            const candidate = { source: node.id, sourceHandle: output.id, target: selectedNode.id, targetHandle: port.id };
            const active = connected?.source === node.id && connected.sourceHandle === output.id;
            const typeName = nodeName(node.data.definition.type), label = nodeLabel(node.data, typeName);
            return active || canConnect(nodes, edges, candidate, true) ? [{ value: `${node.id}:${output.id}`, label: `${label === typeName ? "" : `${label} · `}${typeName} (${node.id.slice(0, 6)}) / ${t(output.display_name)}` }] : [];
          }));
          return <label key={port.id} className="mt-4 block text-xs">{t("Input:")}{" "}{t(port.display_name)}<select aria-label={t("Input {0}", {"0": t(port.id)})} className="mt-2 w-full rounded-lg border border-outline bg-control px-2 py-2" value={connected ? `${connected.source}:${connected.sourceHandle}` : ""} onChange={event => {
            if (!event.target.value) setEdges(current => current.filter(edge => !(edge.target === selectedNode.id && edge.targetHandle === port.id)));
            else {
              const [source, sourceHandle] = event.target.value.split(":");
              const connection = { source, sourceHandle, target: selectedNode.id, targetHandle: port.id };
              setEdges(current => canConnect(nodes, current, connection, true) ? addEdge({ ...connection, id: connected?.id ?? crypto.randomUUID(), animated: true }, current.filter(edge => !(edge.target === selectedNode.id && edge.targetHandle === port.id))) : current);
            }
          }}><option value="">{t("Disconnected")}</option>{available.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
        })}
        {selectedNode && <div className="mt-4 flex flex-wrap gap-2 text-xs"><button className="rounded border border-outline p-2 disabled:opacity-40" disabled={dirty || !selectedSchema?.columns || !following.some(item => item.type === "select_columns")} onClick={() => { if (selectedSchema?.columns) setPreparation({ columns: selectedSchema.columns, source: selectedNode.id, snapshot: JSON.stringify(graph) }); }}>{t("Prepare data table")}</button><button className="rounded border border-outline p-2 disabled:opacity-40" disabled={dirty || !selectedSchema?.columns || !following.some(item => item.type === "calculated_column")} onClick={() => openBatch(false)}>{t("Add calculated fields")}</button>{selectedNode.data.definition.type === "calculated_column" && <button className="rounded border border-outline p-2 disabled:opacity-40" disabled={dirty || !currentSchema?.nodes.find(item => item.node_id === selectedInputEdge?.source)?.columns} onClick={() => openBatch(true)}>{t("Edit calculated chain")}</button>}</div>}
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
      {preparation && <PreparationDialog columns={preparation.columns} apply={applyPreparation} close={() => setPreparation(null)} />}
      {batch && <CalculatedFieldsDialog initial={batch.initial} columns={batch.columns} editing={batch.editing} apply={applyBatch} close={() => setBatch(null)} />}
    </div>
  );
}
