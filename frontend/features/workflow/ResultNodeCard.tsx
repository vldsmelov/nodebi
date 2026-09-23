"use client";
import { Handle, Position, type Node } from "@xyflow/react";
import { useI18n } from "@/lib/i18n";

export type ResultCanvasNode = Node<{
  name: string; kind: string; stale: boolean; consumers: string[];
  onRename: (name: string) => void; onPreview: () => void; onCreate: () => void;
  href: string;
}, "resultNode">;
export const resultCanvasId = (id: string) => `publication:${id}`;
export function ResultNodeCard({ data }: { data: ResultCanvasNode["data"] }) {
  const { t } = useI18n();
  return <div className="w-64 rounded-xl border-2 border-accent bg-panel p-3 shadow-lg">
    <Handle type="target" position={Position.Left} id="result" isConnectable={false} />
    <strong>{t("Published result")}</strong>
    <input aria-label={t("Published result name")} maxLength={200} className="nodrag nopan my-2 w-full rounded border border-outline bg-control p-2 text-sm" value={data.name} onChange={e => data.onRename(e.target.value)} />
    <p className="text-xs text-muted">{t(data.kind)} · {t(data.stale ? "Result needs validation" : "Result available")}</p>
    <details className="nodrag nopan my-2 text-xs"><summary>{t("Visualizations")}: {data.consumers.length}</summary>{data.consumers.map((name, i) => <p key={i}>{name}</p>)}</details>
    <div className="nodrag nopan flex flex-wrap gap-2 text-xs">
      <button onClick={data.onPreview}>{t("Preview")}</button>
      <button onClick={data.onCreate}>{t("Create visualization")}</button>
      <a href={data.href}>{t("Open visualizations")}</a>
    </div>
  </div>;
}
