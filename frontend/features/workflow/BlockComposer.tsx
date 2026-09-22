import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { GraphDraft } from "./autosave";

export function BlockComposer({ graph, onPack, onClose }: { graph: GraphDraft; onPack: (ids: string[], name: string) => void; onClose: () => void }) {
  const { t, nodeName } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(""), [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const occupied = new Set([...(graph.presentation?.blocks ?? []), ...(graph.presentation?.workbooks ?? [])].flatMap(item => item.node_ids));
  const available = graph.nodes.filter(node => !occupied.has(node.id));
  const label = (node: typeof available[number]) => String(node.ui?.label || node.config?.sheet_name || nodeName(node.type));
  return <dialog ref={dialog} onCancel={onClose} aria-label={t("Create composite block")} className="w-[520px] rounded-xl border border-outline bg-panel p-5 text-main backdrop:bg-black/50">
    <h2>{t("Create composite block")}</h2><p className="my-2 text-xs">{t("Choose nodes. Boundary connections become public ports.")}</p>
    <label className="block text-sm">{t("Block name")}<input aria-label={t("Block name")} className="my-2 w-full rounded border border-outline bg-control p-2" value={name} maxLength={200} onChange={event => setName(event.target.value)} /></label>
    <input aria-label={t("Find workflow node")} placeholder={t("Find workflow node")} className="my-2 w-full rounded border border-outline bg-control p-2" value={query} onChange={event => setQuery(event.target.value)} />
    <div className="max-h-72 overflow-auto">{available.filter(node => label(node).toLowerCase().includes(query.toLowerCase())).slice(0, 100).map(node => <label className="flex gap-2 p-2 text-sm" key={node.id}><input type="checkbox" checked={selected.includes(node.id)} onChange={event => setSelected(current => event.target.checked ? [...current, node.id] : current.filter(id => id !== node.id))} />{label(node)}</label>)}</div>
    <p className="my-2 text-xs">{t("Nodes in block: {0}", { 0: selected.length })}</p>
    <div className="flex gap-4"><button disabled={!name.trim() || !selected.length} onClick={() => onPack(selected, name)} className="rounded bg-primary p-2 text-on-primary disabled:opacity-40">{t("Pack block")}</button><button onClick={onClose}>{t("Cancel")}</button></div>
  </dialog>;
}
