"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { GroupByConfiguration } from "./ArithmeticConfiguration";
import type { GraphDraft } from "./autosave";
import type { TableEndpoint } from "./TableStepDialog";
import type { ResolvedColumn } from "./types";
import { useUnappliedChanges } from "./useUnappliedChanges";

export function GroupStepDialog({ graph, source, columns, close, apply }: {
  graph: GraphDraft; source: TableEndpoint; columns: ResolvedColumn[]; close: () => void; apply: (graph: GraphDraft, id: string) => void;
}) {
  const { t } = useI18n(); const dialog = useRef<HTMLDialogElement>(null);
  const [config, setConfig] = useState<Record<string, unknown>>({ dimensions: [], aggregations: [] });
  const cancel = useUnappliedChanges(JSON.stringify(config) !== JSON.stringify({ dimensions: [], aggregations: [] }), close);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const aggregations = config.aggregations as { name: string }[];
  const names = aggregations.map(item => item.name.trim());
  const valid = names.length > 0 && names.every(Boolean) && new Set(names).size === names.length;
  return <dialog ref={dialog} onKeyDown={event => event.stopPropagation()} onCancel={event => { event.preventDefault(); cancel(); }} aria-label={t("Summarize data")} className="max-h-[85vh] w-[560px] max-w-[95vw] overflow-auto rounded-xl border border-outline bg-panel p-6 text-main">
    <GroupByConfiguration config={config} columns={columns} onChange={setConfig} />
    <div className="mt-4 flex gap-4"><button onClick={cancel}>{t("Cancel")}</button><button disabled={!valid} onClick={() => {
      const id = crypto.randomUUID(), parent = graph.nodes.find(node => node.id === source.nodeId)!;
      apply({ ...graph, nodes: [...graph.nodes, { id, type: "group_by", version: 1, config, ui: {}, position: { x: parent.position.x + 360, y: parent.position.y + 100 } }], edges: [...graph.edges, { id: crypto.randomUUID(), source_node_id: source.nodeId, source_port: source.port, target_node_id: id, target_port: "input" }] }, id);
    }}>{t("Add step")}</button></div>
  </dialog>;
}
