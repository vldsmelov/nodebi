"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type SetStateAction } from "react";
import { Background, Controls, ReactFlow, type ReactFlowInstance, type Connection, type Edge, type NodeChange } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { DataSource } from "@/features/data-sources/api";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-provider";
import { WorkflowAutosave, type GraphDraft, type SaveState } from "./autosave";
import { getWorkflowSchema, saveWorkflow } from "./api";
import { GraphHistory } from "./graph-history";
import { FieldNodeCard, type FieldCanvasNode } from "./FieldNodeCard";
import { connectionError, fieldHandle, readHandle, renderWire, saveWire } from "./field-wires";
import { FieldOperationConfiguration, fieldDefaults } from "./FieldOperationConfiguration";
import { NodeConfiguration } from "./NodeConfiguration";
import { NodeOutputPanel } from "./NodeOutputPanel";
import { ParametersConfiguration } from "./ParametersConfiguration";
import { WorkbookBrowser } from "./WorkbookBrowser";
import { openWorkbookSheet, readSheetDrag, sheetDragType, type SheetSelection } from "./workbook-navigation";
import { WorkbookNodeCard, type WorkbookCanvasNode } from "./WorkbookNodeCard";
import { attachedBook, bookCanvasId, detachWorkbookSheet, groupWorkbook, reconcileWorkbooks, renderBookWire, resolveBookConnection } from "./workbook-containers";
import { fieldPath, inputHint, type FieldEndpoint } from "./field-interaction";
import { appendOperation, operationChoices, type OperationChoice } from "./operation-drop";
import { OperationDropMenu } from "./OperationDropMenu";
import { CompositeBlockCard, type CompositeCanvasNode } from "./CompositeBlockCard";
import { BlockSettings } from "./BlockSettings";
import { BlockComposer } from "./BlockComposer";
import { blockCanvasId, editBlock, memberBlock, packBlock, publishOutput, reconcileBlocks, renderBlockWire, resolveBlockConnection } from "./composite-blocks";
import { definitionKey, definitionLabel, findNodeDefinition } from "./node-catalog";
import { VisualizationView } from "@/features/dashboard/VisualizationView";
import { NodeFinder } from "./NodeFinder";
import type { GraphIssue, NodeDefinition, ParameterValues, Workflow } from "./types";

const nodeTypes = { fieldNode: FieldNodeCard, workbookNode: WorkbookNodeCard, compositeNode: CompositeBlockCard };
type CanvasNode = FieldCanvasNode | WorkbookCanvasNode | CompositeCanvasNode;
const control = "w-full rounded border border-outline bg-control p-2 text-xs";
const resolveCanvasConnection = (graph: GraphDraft, connection: Connection) => resolveBlockConnection(graph, resolveBookConnection(graph, connection));
type Pin = { id: string; port?: string } | null;

export function FieldWorkflowEditor({ workflow, catalog, sources, onSaved, targetNodeId }: { targetNodeId?: string | null; workflow: Workflow; catalog: NodeDefinition[]; sources: DataSource[]; onSaved: () => void }) {
  const { t, nodeName, errorText } = useI18n();
  const { theme, palette } = useTheme();
  const initial: GraphDraft = { format_version: 2, name: workflow.name, nodes: workflow.nodes, edges: workflow.edges, parameters: workflow.parameters ?? [], presentation: workflow.presentation ?? { workbooks: [], blocks: [] } };
  const [save, setSave] = useState<SaveState>({ status: "saved", revision: workflow.revision, error: null });
  const [writer] = useState(() => new WorkflowAutosave(workflow.id, workflow.revision, initial, payload => saveWorkflow(workflow.id, payload), state => { setSave(state); if (state.status === "saved") onSaved(); }, window.sessionStorage, "fields-v2"));
  const [recovered] = useState(() => writer.recover());
  const incompatible = recovered && recovered.draft.format_version !== 2;
  const [graph, updateGraph] = useState<GraphDraft>(recovered?.draft ?? initial);
  const setGraph = useCallback((next: SetStateAction<GraphDraft>) => updateGraph(current => reconcileBlocks(typeof next === "function" ? next(current) : next)), []);
  const [composeBlock, setComposeBlock] = useState(false);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [openBlock, setOpenBlock] = useState<string | null>(null);
  const [history] = useState(() => new GraphHistory(graph));
  useSyncExternalStore(history.subscribe, history.getVersion, history.getVersion);
  const [selected, setSelected] = useState<string | null>(targetNodeId ?? null), [search, setSearch] = useState("");
  const [chartRequest, setChartRequest] = useState<{ node: string; revision: number; parameters: string } | null>(null);
  const [wireSearch, setWireSearch] = useState("");
  const [connectionIssue, setConnectionIssue] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<FieldEndpoint | null>(null);
  const cancelledDrag = useRef(false);
  const [operationMenu, setOperationMenu] = useState<{ source: FieldEndpoint; position: { x: number; y: number } } | null>(null);
  const [focusedOutput, setFocusedOutput] = useState<FieldEndpoint | null>(null);
  useEffect(() => {
    if (!dragSource) return;
    const cancel = (event: KeyboardEvent) => { if (event.key === "Escape") { cancelledDrag.current = true; setDragSource(null); } };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [dragSource]);
  const focusOutput = useCallback((nodeId: string, handle: string) => { setFocusedOutput({ nodeId, handle }); setSelected(nodeId); }, []);
  const activeFocus = focusedOutput && graph.nodes.some(node => node.id === focusedOutput.nodeId) ? focusedOutput : null;
  const path = useMemo(() => activeFocus ? fieldPath(graph, catalog, activeFocus) : null, [graph, catalog, activeFocus]);
  const [pins, setPins] = useState<[Pin, Pin]>([null, null]);
  const flow = useRef<ReactFlowInstance<CanvasNode, Edge> | null>(null);
  const toggleBlock = (id: string, collapsed: boolean) => {
    setGraph(current => ({ ...current, presentation: { ...current.presentation, blocks: current.presentation?.blocks?.map(block => block.id === id ? { ...block, collapsed } : block) } }));
    setOpenBlock(collapsed ? null : id);
    setTimeout(() => { void flow.current?.fitView({ maxZoom: 1, padding: 0.15 }); }, 100);
  };
  const pinCount = pins.filter(Boolean).length;
  useEffect(() => {
    const timer = setTimeout(() => { void flow.current?.fitView({ maxZoom: 1, padding: 0.15 }); }, 100);
    return () => clearTimeout(timer);
  }, [graph.nodes.length, pinCount]);
  const [parameters, setParameters] = useState<ParameterValues>({});
  const dirty = JSON.stringify(graph) !== writer.savedGraph || save.status !== "saved";
  const schema = useQuery({ queryKey: ["field-schema", workflow.id, save.revision, parameters], queryFn: () => getWorkflowSchema(workflow.id, parameters), enabled: !dirty && !incompatible, placeholderData: keepPreviousData });
  const currentSchema = !dirty && !schema.isPlaceholderData && schema.data?.revision === save.revision ? schema.data : undefined;
  const parameterKey = JSON.stringify(parameters);
  const [runtime, setRuntime] = useState<{ graph: GraphDraft; revision: number; parameters: string; issues: GraphIssue[] } | null>(null);
  const reportRuntimeIssues = useCallback((issues: GraphIssue[]) => {
    setRuntime({ graph, revision: save.revision, parameters: parameterKey, issues });
  }, [graph, save.revision, parameterKey]);
  const inspectorIssues = [...(currentSchema?.issues ?? []), ...(!dirty && runtime?.graph === graph && runtime.revision === save.revision && runtime.parameters === parameterKey ? runtime.issues : [])];
  const offeredOperations = useMemo(() => operationMenu ? operationChoices(graph, catalog, currentSchema, operationMenu.source) : [], [operationMenu, graph, catalog, currentSchema]);
  const chooseOperation = (choice: OperationChoice) => {
    if (!operationMenu) return;
    const next = appendOperation(graph, catalog, currentSchema, operationMenu.source, choice, operationMenu.position);
    if (!next) { setConnectionIssue("Selected field is unavailable."); setOperationMenu(null); return; }
    setGraph(next);
    setSelected(next.nodes[next.nodes.length - 1].id);
    setOperationMenu(null);
  };
  const menuSource = operationMenu ? graph.nodes.find(node => node.id === operationMenu.source.nodeId) : undefined;
  const menuEndpoint = operationMenu ? readHandle(operationMenu.source.handle) : undefined;
  const menuOutput = operationMenu && menuEndpoint ? currentSchema?.nodes.find(node => node.node_id === operationMenu.source.nodeId)?.outputs?.[menuEndpoint.port] : undefined;
  const menuLabel = menuSource ? `${String(menuSource.ui?.label || nodeName(menuSource.type))} / ${menuEndpoint?.column ? menuOutput?.columns?.find(column => column.column_id === menuEndpoint.column)?.display_name ?? t("Unavailable connection") : t(findNodeDefinition(catalog, menuSource)?.output_ports.find(port => port.id === menuEndpoint?.port)?.display_name ?? "Value")}` : t("Unavailable connection");
  // Previous revision fields are labelled stale; the server always validates the saved graph.
  const choicesSchema = schema.data;
  useEffect(() => { writer.resume(); return () => writer.dispose(); }, [writer]);
  useEffect(() => { if (!incompatible) { history.record(graph); writer.change(graph); } }, [graph, writer, history, incompatible]);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (writer.dirty) { event.preventDefault(); event.returnValue = ""; } };
    const navigate = (event: MouseEvent) => { if ((event.target as Element).closest?.("a[href]") && writer.dirty && !window.confirm(t("Changes are not saved yet. Leave and recover this draft later?"))) { event.preventDefault(); event.stopPropagation(); } };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [writer, t]);
  const selectedNode = graph.nodes.find(node => node.id === selected);
  const definition = findNodeDefinition(catalog, selectedNode);
  const nodes: FieldCanvasNode[] = useMemo(() => graph.nodes.flatMap(node => {
    const definition = findNodeDefinition(catalog, node);
    return definition ? [{ id: node.id, type: "fieldNode" as const, position: node.position, selected: node.id === selected, data: { node, definition, schema: choicesSchema?.nodes.find(item => item.node_id === node.id), connected: graph.edges.filter(edge => edge.source_node_id === node.id).map(edge => fieldHandle(edge.source_port, edge.source_column_id)), stale: dirty || !currentSchema,
      largeGraph: graph.nodes.length > 40,
      focusedHandle: activeFocus?.nodeId === node.id ? activeFocus.handle : undefined,
      onFocusOutput: (handle: string) => focusOutput(node.id, handle),
      inputHints: dragSource ? Object.fromEntries(definition.input_ports.map(port => [port.id, inputHint(graph, catalog, dragSource, node.id, port.id, currentSchema)])) : undefined,
    } }] : [];
  }), [graph, catalog, choicesSchema, selected, dirty, currentSchema, activeFocus, focusOutput, dragSource]);
  const edges = graph.edges.flatMap(edge => { const rendered = renderBlockWire(graph, renderBookWire(graph, renderWire(edge))); return rendered ? [{ ...rendered, className: path ? path.has(edge.id) ? "field-path-active" : "field-path-muted" : undefined, style: { stroke: palette.accent, strokeWidth: path?.has(edge.id) ? 3 : 1, opacity: path && !path.has(edge.id) ? 0.18 : 1 } }] : []; });
  const connect = (displayConnection: Connection) => {
    if (cancelledDrag.current) return;
    const connection = resolveCanvasConnection(graph, displayConnection);
    const issue = connectionError(graph, catalog, connection, currentSchema);
    setConnectionIssue(issue);
    if (issue) return;
    setGraph(current => ({ ...current, edges: [...current.edges.filter(edge => !(edge.target_node_id === connection.target && edge.target_port === connection.targetHandle)), saveWire(connection)] }));
  };
  const remove = (ids: Set<string>) => setGraph(current => reconcileWorkbooks({ ...current, nodes: current.nodes.filter(node => !ids.has(node.id)), edges: current.edges.filter(edge => !ids.has(edge.source_node_id) && !ids.has(edge.target_node_id)), presentation: { ...current.presentation, blocks: current.presentation?.blocks?.filter(block => !ids.has(blockCanvasId(block.id))) ?? [], workbooks: current.presentation?.workbooks?.filter(book => !ids.has(bookCanvasId(book.id))) ?? [] } }));
  const changeNodes = (changes: NodeChange<CanvasNode>[]) => {
    const positions = changes.filter(change => change.type === "position");
    if (positions.some(change => change.position)) setGraph(current => ({ ...current, nodes: current.nodes.map(node => { const next = positions.find(change => change.id === node.id)?.position; return next ? { ...node, position: next } : node; }), presentation: { ...current.presentation, blocks: current.presentation?.blocks?.map(block => { const next = positions.find(change => change.id === blockCanvasId(block.id))?.position; return next ? { ...block, position: next } : block; }) ?? [], workbooks: current.presentation?.workbooks?.map(book => { const next = positions.find(change => change.id === bookCanvasId(book.id))?.position; return next ? { ...book, position: next } : book; }) ?? [] } }));
    const deleted = new Set(changes.filter(change => change.type === "remove").map(change => change.id));
    if (deleted.size) remove(deleted);
  };
  const add = (item: NodeDefinition) => {
    const source = sources[0], sheet = source?.workbook.sheets[0];
    if (item.type === "excel_source" && !sheet) return;
    const id = crypto.randomUUID();
    setGraph(current => ({ ...current, nodes: [...current.nodes, { id, type: item.type, version: item.version, position: { x: 40 + current.nodes.length % 3 * 340, y: 40 + Math.floor(current.nodes.length / 3) * 480 }, config: item.type === "excel_source" ? { source_id: source.id, sheet_name: sheet.name } : { ...(fieldDefaults[item.type] ?? {}) }, ui: {} }] }));
    setSelected(id);
  };
  const openSheet = (selection: SheetSelection, dropPosition?: { x: number; y: number }) => {
    const sourceDefinition = findNodeDefinition(catalog, { type: "excel_source", version: 1 });
    if (!sourceDefinition) return;
    const result = openWorkbookSheet(graph, sources, selection, dropPosition ?? { x: 40 + graph.nodes.length % 3 * 340, y: 40 + Math.floor(graph.nodes.length / 3) * 480 }, sourceDefinition.version);
    if (!result) return;
    const existingBook = result.graph.presentation?.workbooks?.find(book => book.source_id === selection.sourceId);
    if (existingBook && result.graph !== graph) result.graph = groupWorkbook(result.graph, selection.sourceId, existingBook.label);
    const book = attachedBook(result.graph, result.nodeId);
    if (book && dropPosition) result.graph = detachWorkbookSheet(result.graph, book.id, result.nodeId, true, dropPosition);
    setGraph(result.graph);
    setSelected(result.nodeId);
    const parent = attachedBook(result.graph, result.nodeId);
    requestAnimationFrame(() => { void flow.current?.fitView({ nodes: [{ id: parent ? bookCanvasId(parent.id) : result.nodeId }], maxZoom: 1, padding: 0.3 }); });
  };
  const canvasNodes: CanvasNode[] = [
    ...nodes.filter(node => !attachedBook(graph, node.id) && !memberBlock(graph, node.id)?.collapsed),
    ...(graph.presentation?.blocks ?? []).map(block => ({ id: blockCanvasId(block.id), type: "compositeNode" as const, position: block.position, data: {
      block,
      portLabels: Object.fromEntries([...(block.inputs ?? []), ...(block.outputs ?? [])].map(port => {
        const node = nodes.find(node => node.id === port.node_id);
        const column = node?.data.schema?.outputs?.[port.port]?.columns?.find(column => column.column_id === port.column_id);
        const definition = [...(node?.data.definition.input_ports ?? []), ...(node?.data.definition.output_ports ?? [])].find(item => item.id === port.port);
        return [port.id, `${String(node?.data.node.ui?.label || nodeName(node?.data.node.type ?? ""))} / ${column?.display_name ?? t(definition?.display_name ?? port.label)}`];
      })),
      onEdit: () => setEditingBlock(block.id),
      onToggle: () => toggleBlock(block.id, !block.collapsed),
      onUnpack: () => { remove(new Set([blockCanvasId(block.id)])); setOpenBlock(null); },
      onRename: (label: string) => setGraph(current => ({ ...current, presentation: { ...current.presentation, blocks: current.presentation?.blocks?.map(item => item.id === block.id ? { ...item, label } : item) } })),
    } })),
    ...(graph.presentation?.workbooks ?? []).map(book => ({ id: bookCanvasId(book.id), type: "workbookNode" as const, position: book.position, data: {
      book, sheets: nodes.filter(node => book.node_ids.includes(node.id)), selectedSheet: selected,
      onSelect: setSelected,
      onToggle: () => setGraph(current => ({ ...current, presentation: { ...current.presentation, workbooks: current.presentation?.workbooks?.map(item => item.id === book.id ? { ...item, collapsed: !item.collapsed } : item) } })),
      onDetach: (id: string, detach: boolean) => setGraph(current => detachWorkbookSheet(current, book.id, id, detach)),
      onUngroup: () => remove(new Set([bookCanvasId(book.id)])),
    } })),
  ];
  if (incompatible) return <p role="alert" className="p-6 text-danger">{t("A legacy draft is pending. Restore it in the classic editor first.")}</p>;
  return <div className="grid h-[calc(100vh-8rem)] grid-cols-[220px_minmax(320px,1fr)_350px] border-t border-outline" onKeyDown={event => { if (event.key === "Escape") { cancelledDrag.current = Boolean(dragSource); setFocusedOutput(null); setDragSource(null); setOperationMenu(null); } }}>
    {editingBlock && graph.presentation?.blocks?.some(block => block.id === editingBlock) && <BlockSettings key={editingBlock} graph={graph} block={graph.presentation.blocks.find(block => block.id === editingBlock)!} catalog={catalog} schema={currentSchema} onClose={() => setEditingBlock(null)} onApply={block => { setGraph(current => editBlock(current, block)); setEditingBlock(null); }} />}
    {composeBlock && <BlockComposer graph={graph} onClose={() => setComposeBlock(false)} onPack={(ids, name) => { setGraph(current => packBlock(current, ids, name)); setComposeBlock(false); setSelected(null); }} />}
    {operationMenu && <OperationDropMenu choices={offeredOperations} catalog={catalog} sourceLabel={menuLabel} pending={!currentSchema} onChoose={chooseOperation} onClose={() => setOperationMenu(null)} />}
    <aside className="overflow-auto bg-panel p-3">
      <p className="mb-3 text-xs text-warning">{t("Field editor preview. Existing projects are not converted.")}</p>
      <NodeFinder nodes={graph.nodes.map(node => ({ id: node.id, label: `${String(node.ui?.label || node.config?.sheet_name || node.config?.name || nodeName(node.type))} · ${nodeName(node.type)}` }))} selected={selected} onSelect={id => {
        setSelected(id);
        const block = memberBlock(graph, id);
        if (block?.collapsed) toggleBlock(block.id, false);
        const book = attachedBook(graph, id);
        requestAnimationFrame(() => { void flow.current?.fitView({ nodes: [{ id: book ? bookCanvasId(book.id) : id }], maxZoom: 1, padding: 0.3 }); });
      }} />
      <WorkbookBrowser sources={sources} nodes={graph.nodes} onOpen={openSheet} />
      <input aria-label={t("Search nodes")} className={control} value={search} onChange={e => setSearch(e.target.value)} />
      {catalog.filter(item => nodeName(item.type).toLowerCase().includes(search.toLowerCase())).map(item => <button key={definitionKey(item)} title={t("Add {0}", { 0: definitionLabel(catalog, item, nodeName(item.type)) })} disabled={item.type === "excel_source" && !sources.length} onClick={() => add(item)} className="mt-2 w-full rounded border border-outline p-2 text-left text-sm disabled:opacity-40">+ {definitionLabel(catalog, item, nodeName(item.type))}</button>)}
    </aside>
    <section className="flex min-w-0 flex-col bg-page" onDragOver={event => { if (event.dataTransfer.types.includes(sheetDragType)) { event.preventDefault(); event.dataTransfer.dropEffect = event.dataTransfer.effectAllowed === "move" ? "move" : "copy"; } }} onDrop={event => {
      const selection = readSheetDrag(event.dataTransfer.getData(sheetDragType));
      if (!selection || !flow.current || !(event.target as Element).closest(".react-flow") || (event.target as Element).closest(".react-flow__node")) return;
      event.preventDefault();
      openSheet(selection, flow.current.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    }}>
      <div className="flex flex-wrap items-center gap-3 border-b border-outline p-2 text-xs">
        <button onClick={() => void flow.current?.fitView({ maxZoom: 1, padding: 0.15 })}>{t("Fit graph")}</button>
        <span>{t(save.status === "saved" && !dirty ? "Saved" : save.status === "error" ? "Save failed" : "Saving…")}</span>
        <button onClick={() => setComposeBlock(true)}>{t("Create composite block")}</button>
        {openBlock && graph.presentation?.blocks?.some(block => block.id === openBlock) && <button onClick={() => toggleBlock(openBlock, true)}>{t("Back to workflow")} / {graph.presentation.blocks.find(block => block.id === openBlock)?.label}</button>}
        {activeFocus && memberBlock(graph, activeFocus.nodeId) && <button onClick={() => setGraph(current => publishOutput(current, activeFocus.nodeId, activeFocus.handle, t("Value")))}>{t("Expose block output")}</button>}
        <button disabled={!history.canUndo} onClick={() => { const previous = history.undo(); if (previous) setGraph(previous); }}>{t("Undo")}</button>
        <button disabled={!history.canRedo} onClick={() => { const next = history.redo(); if (next) setGraph(next); }}>{t("Redo")}</button>
        <button disabled={!selected} onClick={() => setPins(current => [{ id: selected!, port: definition?.output_ports[0]?.id }, current[1]])}>{t("Pin A")}</button>
        <button disabled={!selected} onClick={() => setPins(current => [current[0], { id: selected!, port: definition?.output_ports[0]?.id }])}>{t("Pin B")}</button>
        {activeFocus && <button onClick={() => setFocusedOutput(null)}>{t("Clear field path")}</button>}
        {activeFocus && <button onClick={() => {
          const origin = attachedBook(graph, activeFocus.nodeId)?.position ?? graph.nodes.find(node => node.id === activeFocus.nodeId)!.position;
          setOperationMenu({ source: activeFocus, position: { x: origin.x + 360, y: origin.y + 80 } });
        }}>{t("Add operation to output")}</button>}
      </div>
      {activeFocus && <p className="px-2 text-xs text-muted">{t("Explicit connections; tracing stops at table transformations.")}</p>}
      {save.error && <div role="alert" className="p-2 text-xs text-danger">{errorText(save.error)} <button onClick={() => void writer.flush()}>{t("Retry save")}</button> <button onClick={() => { if (window.confirm(t("Discard this local draft and load the saved workflow?"))) { sessionStorage.removeItem(writer.key); window.location.reload(); } }}>{t("Discard draft and reload")}</button></div>}
      {connectionIssue && <p role="alert" className="p-2 text-xs text-danger">{t(connectionIssue)}</p>}
      {schema.error && <p role="alert" className="text-danger">{errorText(schema.error)}</p>}
      <div className="min-h-64 flex-1"><ReactFlow<CanvasNode, Edge> onInit={instance => { flow.current = instance; }} fitViewOptions={{ maxZoom: 1, padding: 0.15 }} nodes={canvasNodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={changeNodes} onEdgesChange={changes => { const deleted = new Set(changes.filter(change => change.type === "remove").map(change => change.id)); if (deleted.size) setGraph(current => ({ ...current, edges: current.edges.filter(edge => !deleted.has(edge.id)) })); }} onConnect={connect} onConnectStart={(_, point) => {
        setConnectionIssue(null); cancelledDrag.current = false; setOperationMenu(null);
        if (point.handleType !== "source" || !point.nodeId || !point.handleId) { setDragSource(null); return; }
        const actual = resolveCanvasConnection(graph, { source: point.nodeId, sourceHandle: point.handleId, target: "", targetHandle: "" });
        setDragSource({ nodeId: actual.source, handle: actual.sourceHandle ?? "" });
      }} onConnectEnd={(event, state) => {
        setDragSource(null);
        if (cancelledDrag.current) { cancelledDrag.current = false; return; }
        if (!state.isValid && state.fromHandle?.type === "source" && state.toNode && state.toHandle) {
          const actual = resolveCanvasConnection(graph, { source: state.fromNode.id, sourceHandle: state.fromHandle.id ?? "", target: state.toNode.id, targetHandle: state.toHandle.id ?? "" });
          setConnectionIssue(connectionError(graph, catalog, actual, currentSchema));
        }
        if (!state.isValid && state.fromNode && state.fromHandle?.type === "source" && !state.toHandle) {
          const point = "changedTouches" in event ? event.changedTouches[0] : event;
          const target = point ? document.elementFromPoint(point.clientX, point.clientY) : null;
          if (point && target?.closest(".react-flow__pane") && !target.closest(".react-flow__node, .react-flow__edge, .react-flow__controls") && flow.current) {
            const source = resolveCanvasConnection(graph, { source: state.fromNode.id, sourceHandle: state.fromHandle.id ?? "", target: "", targetHandle: "" });
            setOperationMenu({ source: { nodeId: source.source, handle: source.sourceHandle ?? "" }, position: flow.current.screenToFlowPosition({ x: point.clientX, y: point.clientY }) });
          }
        }
      }} isValidConnection={connection => !connectionError(graph, catalog, resolveCanvasConnection(graph, { source: connection.source, target: connection.target, sourceHandle: connection.sourceHandle ?? null, targetHandle: connection.targetHandle ?? null }), currentSchema)} onNodeClick={(_, node) => { if (node.type === "fieldNode") setSelected(node.id); }} onPaneClick={() => setSelected(null)} colorMode={theme} minZoom={0.05} fitView><Background color={palette.grid} /><Controls /></ReactFlow></div>
      {pins.some(Boolean) && <div className="grid max-h-72 grid-cols-2 gap-3 overflow-auto border-t border-outline p-3">{pins.map((pin, index) => <section key={index} aria-label={index ? "B" : "A"}>{pin && <><div className="flex gap-2 text-xs"><b>{index ? "B" : "A"}</b><span>{String(graph.nodes.find(node => node.id === pin.id)?.ui?.label || nodeName(graph.nodes.find(node => node.id === pin.id)?.type ?? ""))}</span><button onClick={() => setPins(current => index ? [current[0], null] : [null, current[1]])}>{t("Close")}</button></div>{graph.nodes.some(node => node.id === pin.id) ? <NodeOutputPanel workflowId={workflow.id} nodeId={pin.id} outputPort={pin.port} revision={save.revision} dirty={dirty} parameters={parameters} issues={[]} /> : <p>{t("Selected node is unavailable.")}</p>}</>}</section>)}</div>}
    </section>
    <aside className="overflow-auto border-l border-outline bg-panel p-4">
      <ParametersConfiguration definitions={graph.parameters ?? []} onChange={items => setGraph(current => ({ ...current, parameters: items }))} values={parameters} onValuesChange={setParameters} />
      {!selectedNode ? <p className="text-sm">{t("Select a node to edit its settings.")}</p> : <>
        <h2>{nodeName(selectedNode.type)}</h2>
        {selectedNode.type === "excel_source" && <button className="my-2 rounded border border-outline p-2 text-xs" onClick={() => setGraph(current => groupWorkbook(current, String(selectedNode.config?.source_id), sources.find(source => source.id === selectedNode.config?.source_id)?.original_filename ?? t("Workbook browser")))}>{t("Group workbook sheets")}</button>}
        <label className="block mt-3 text-xs">{t("Node label")}<input aria-label={t("Node label")} className={control} value={String(selectedNode.ui?.label ?? "")} onChange={e => setGraph(current => ({ ...current, nodes: current.nodes.map(node => node.id === selected ? { ...node, ui: { ...node.ui, label: e.target.value } } : node) }))} /></label>
        <input aria-label={t("Search connection fields")} placeholder={t("Search connection fields")} className={`${control} mt-3`} value={wireSearch} onChange={e => setWireSearch(e.target.value)} />
        {definition?.input_ports.map(port => {
          const connected = graph.edges.find(edge => edge.target_node_id === selected && edge.target_port === port.id);
          const active = connected ? JSON.stringify([connected.source_node_id, fieldHandle(connected.source_port, connected.source_column_id)]) : "";
          const options = nodes.flatMap(node => node.data.definition.output_ports.flatMap(output => [{ handle: output.id, label: t(output.display_name) }, ...(node.data.schema?.outputs?.[output.id]?.columns ?? []).map(column => ({ handle: fieldHandle(output.id, column.column_id), label: column.display_name }))].map(value => ({ value: JSON.stringify([node.id, value.handle]), label: `${String(node.data.node.ui?.label || nodeName(node.data.node.type))} / ${value.label}`, connection: { source: node.id, sourceHandle: value.handle, target: selectedNode.id, targetHandle: port.id } }))));
          const available = options.filter(option => option.value !== active && option.label.toLowerCase().includes(wireSearch.toLowerCase()) && !connectionError(graph, catalog, option.connection, currentSchema)).slice(0, 100);
          const pinned = options.find(option => option.value === active);
          const inputIssues = inspectorIssues.filter(issue => issue.node_id === selected && issue.field === port.id && issue.severity === "error");
          return <label key={port.id} className="mt-3 block text-xs">{t("Input:")} {t(port.display_name)}<select aria-invalid={inputIssues.length > 0} title={inputIssues.map(errorText).join("\n")} style={inputIssues.length ? { borderColor: "var(--danger)" } : undefined} aria-label={t("Input {0}", { 0: port.id })} className={control} value={active} onChange={e => { if (!e.target.value) setGraph(current => ({ ...current, edges: current.edges.filter(edge => !(edge.target_node_id === selected && edge.target_port === port.id)) })); else { const [source, sourceHandle] = JSON.parse(e.target.value); connect({ source, sourceHandle, target: selectedNode.id, targetHandle: port.id }); } }}><option value="">{t("Disconnected")}</option>{active && <option value={active}>{pinned?.label ?? t("Unavailable connection")}</option>}{available.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
        })}
        {(() => { const onChange = (config: Record<string, unknown>) => setGraph(current => reconcileWorkbooks({ ...current, nodes: current.nodes.map(node => node.id === selected ? { ...node, config } : node) })); const incoming = graph.edges.filter(edge => edge.target_node_id === selected); const inputColumns = Object.fromEntries(incoming.map(edge => [edge.target_port, choicesSchema?.nodes.find(node => node.node_id === edge.source_node_id)?.columns ?? null])); return selectedNode.type in fieldDefaults ? <FieldOperationConfiguration issues={inspectorIssues.filter(issue => issue.node_id === selected)} type={selectedNode.type} config={selectedNode.config ?? {}} onChange={onChange} parameters={graph.parameters ?? []} /> : <NodeConfiguration version={selectedNode.version} type={selectedNode.type} config={selectedNode.config ?? {}} sources={sources} columns={inputColumns.table ?? inputColumns.input ?? Object.values(inputColumns)[0] ?? null} inputColumns={inputColumns} onChange={onChange} parameters={graph.parameters ?? []} issues={currentSchema?.issues.filter(issue => issue.node_id === selected)} validationPending={!currentSchema} />; })()}
        {definition?.category === "visualization" && <><button className="mt-4 w-full rounded border border-outline p-2 text-sm" disabled={dirty} onClick={() => setChartRequest({ node: selectedNode.id, revision: save.revision, parameters: parameterKey })}>{t("Preview visualization")}</button>{!dirty && chartRequest?.node === selectedNode.id && chartRequest.revision === save.revision && chartRequest.parameters === parameterKey && <div className="mt-4 h-72"><VisualizationView id={selectedNode.id} revision={save.revision} parameters={parameters} /></div>}</>}
        <NodeOutputPanel onRuntimeIssues={reportRuntimeIssues} workflowId={workflow.id} nodeId={selectedNode.id} outputPort={definition?.output_ports[0]?.id} revision={save.revision} dirty={dirty} parameters={parameters} issues={currentSchema?.issues.filter(issue => issue.node_id === selected) ?? []} />
        <button className="mt-4 text-xs text-danger" onClick={() => { remove(new Set([selectedNode.id])); setSelected(null); }}>{t("Delete selected node")}</button>
      </>}
    </aside>
  </div>;
}
