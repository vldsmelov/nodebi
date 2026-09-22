import { Handle, Position, useUpdateNodeInternals, type Node } from "@xyflow/react";
import { useEffect } from "react";
import { Boxes } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { CompositeBlock } from "./composite-blocks";

export type CompositeCanvasNode = Node<{ block: CompositeBlock; portLabels: Record<string, string>; onToggle: () => void; onUnpack: () => void; onRename: (name: string) => void }, "compositeNode">;
export function CompositeBlockCard({ id, data }: { id: string; data: CompositeCanvasNode["data"] }) {
  const { t } = useI18n();
  const refresh = useUpdateNodeInternals();
  const layout = JSON.stringify([data.block.collapsed, data.block.inputs, data.block.outputs]);
  useEffect(() => { refresh(id); }, [id, layout, refresh]);
  return <div className="w-72 rounded-xl border-2 border-accent bg-panel p-3 shadow-lg">
    <div className="flex items-center gap-2"><Boxes size={18} /><strong>{data.block.label}</strong></div>
    <input className="nodrag nopan my-2 w-full rounded border border-outline bg-control p-1 text-xs" aria-label={t("Block name")} value={data.block.label} maxLength={200} onChange={event => { if (event.target.value.trim()) data.onRename(event.target.value); }} />
    <p className="text-xs text-muted">{t("Nodes in block: {0}", { 0: data.block.node_ids.length })}</p>
    <div className="my-2 flex gap-3 text-xs"><button className="nodrag nopan underline" onClick={data.onToggle}>{t(data.block.collapsed ? "Open block" : "Close block")}</button><button className="nodrag nopan underline" onClick={data.onUnpack}>{t("Unpack block")}</button></div>
    {data.block.collapsed && <>{data.block.inputs?.map(port => <div className="relative py-2 text-xs" key={port.id}><Handle type="target" position={Position.Left} id={port.id} /><span>{t("Input:")} {data.portLabels[port.id] ?? port.label}</span></div>)}{data.block.outputs?.map(port => <div className="relative py-2 text-right text-xs" key={port.id}><span>{data.portLabels[port.id] ?? port.label} →</span><Handle type="source" position={Position.Right} id={port.id} /></div>)}</>}
  </div>;
}
