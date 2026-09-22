import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { GraphDraft } from "./autosave";
import type { NodeDefinition, WorkflowSchemaResult } from "./types";
import { editBlock, requiredPublicPort, type CompositeBlock, type PublicPort } from "./composite-blocks";

export function BlockSettings({ graph, block, catalog, schema, onApply, onClose }: { graph: GraphDraft; block: CompositeBlock; catalog: NodeDefinition[]; schema?: WorkflowSchemaResult; onApply: (block: CompositeBlock) => void; onClose: () => void }) {
  const { t, nodeName } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(block), [query, setQuery] = useState("");
  const [direction, setDirection] = useState<"inputs" | "outputs">("inputs"), [endpoint, setEndpoint] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  const occupied = new Set([...(graph.presentation?.workbooks ?? []), ...(graph.presentation?.blocks ?? []).filter(item => item.id !== block.id)].flatMap(item => item.node_ids));
  const label = (id: string) => { const node = graph.nodes.find(node => node.id === id); return String(node?.ui?.label || node?.config?.sheet_name || nodeName(node?.type ?? "")); };
  const projected = editBlock(graph, draft).presentation?.blocks?.find(item => item.id === block.id) ?? draft;
  const options = graph.nodes.filter(node => draft.node_ids.includes(node.id)).flatMap(node => {
    const definition = catalog.find(item => item.type === node.type && item.version === node.version);
    const ports = direction === "inputs" ? definition?.input_ports : definition?.output_ports;
    return (ports ?? []).flatMap(port => [{ node_id: node.id, port: port.id, column_id: null as string | null, label: `${label(node.id)} / ${t(port.display_name)}` }, ...(direction === "outputs" ? schema?.nodes.find(item => item.node_id === node.id)?.outputs?.[port.id]?.columns ?? [] : []).map(column => ({ node_id: node.id, port: port.id, column_id: column.column_id, label: `${label(node.id)} / ${column.display_name}` }))]);
  }).filter(option => !(projected[direction] ?? []).some(port => port.node_id === option.node_id && port.port === option.port && (port.column_id ?? null) === option.column_id));
  const key = (port: typeof options[number]) => JSON.stringify([port.node_id, port.port, port.column_id]);
  const changePort = (side: "inputs" | "outputs", port: PublicPort, name: string | null) => setDraft(current => ({ ...current, [side]: (projected[side] ?? []).flatMap(item => item.id !== port.id ? [item] : name === null ? [] : [{ ...item, label: name }]) }));
  const valid = draft.node_ids.length > 0 && draft.label.trim() && [...(projected.inputs ?? []), ...(projected.outputs ?? [])].every(port => port.label.trim());
  return <dialog ref={dialog} aria-label={t("Edit composite block")} onCancel={onClose} className="max-h-[85vh] w-[680px] overflow-auto rounded-xl border border-outline bg-panel p-5 text-main backdrop:bg-black/50">
    <h2>{t("Edit composite block")}</h2>
    <label className="block my-2">{t("Block name")}<input className="w-full rounded border border-outline bg-control p-2" aria-label={t("Block name")} value={draft.label} maxLength={200} onChange={event => setDraft(current => ({ ...current, label: event.target.value }))} /></label>
    <p className="text-xs">{t("Removing a member keeps its node and connections in the workflow.")}</p>
    <input className="my-2 w-full rounded border border-outline bg-control p-2" aria-label={t("Find workflow node")} value={query} onChange={event => setQuery(event.target.value)} />
    <div className="max-h-40 overflow-auto">{graph.nodes.filter(node => !occupied.has(node.id) && label(node.id).toLowerCase().includes(query.toLowerCase())).slice(0, 100).map(node => <label key={node.id} className="flex gap-2 p-1"><input type="checkbox" checked={draft.node_ids.includes(node.id)} onChange={event => setDraft(current => ({ ...current, node_ids: event.target.checked ? [...current.node_ids, node.id] : current.node_ids.filter(id => id !== node.id) }))} />{label(node.id)}</label>)}</div>
    {(["inputs", "outputs"] as const).map(side => <section key={side} aria-label={t(side === "inputs" ? "Public inputs" : "Public outputs")} className="my-3"><h3>{t(side === "inputs" ? "Public inputs" : "Public outputs")}</h3>{(projected[side] ?? []).map(port => <div key={port.id} className="my-2 flex items-center gap-2 text-xs"><span className="w-36 truncate" title={label(port.node_id)}>{label(port.node_id)} / {port.port}</span><input aria-label={t("Public port name")} className="min-w-0 flex-1 rounded border border-outline bg-control p-2" maxLength={200} value={port.label} onChange={event => changePort(side, port, event.target.value)} /><button disabled={requiredPublicPort(graph, projected, side, port)} title={t("Connected boundary ports cannot be hidden.")} onClick={() => changePort(side, port, null)}>{t("Hide port")}</button></div>)}</section>)}
    <div className="flex gap-2"><select aria-label={t("Port direction")} value={direction} onChange={event => { setDirection(event.target.value as typeof direction); setEndpoint(""); }}><option value="inputs">{t("Public inputs")}</option><option value="outputs">{t("Public outputs")}</option></select><select className="min-w-0 flex-1 bg-control" aria-label={t("Available endpoint")} value={endpoint} onChange={event => setEndpoint(event.target.value)}><option value="">{t("Select field")}</option>{options.map(port => <option key={key(port)} value={key(port)}>{port.label}</option>)}</select><button disabled={!options.some(port => key(port) === endpoint)} onClick={() => { const port = options.find(port => key(port) === endpoint); if (port) { setDraft(current => ({ ...current, [direction]: [...(projected[direction] ?? []), { ...port, label: port.label.slice(0, 200), id: crypto.randomUUID() }] })); setEndpoint(""); } }}>{t("Expose port")}</button></div>
    <p className="my-3 text-xs">{t("Connected boundary ports cannot be hidden.")}</p>
    <div className="flex gap-4"><button className="rounded bg-primary p-2 text-on-primary disabled:opacity-40" disabled={!valid} onClick={() => onApply(projected)}>{t("Apply block changes")}</button><button onClick={onClose}>{t("Cancel")}</button></div>
  </dialog>;
}
