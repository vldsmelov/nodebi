import { Handle, Position, useUpdateNodeInternals, type Node } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import { Database, Calculator, ChartColumn } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { NodeDefinition, NodeSchemaResult, WorkflowNode } from "./types";
import { fieldHandle } from "./field-wires";
import type { InputHint } from "./field-interaction";
import { fieldWindow, FIELD_ROW_HEIGHT, FIELD_VIEW_HEIGHT } from "./field-window";

export type FieldCanvasNode = Node<{ node: WorkflowNode; definition: NodeDefinition; schema?: NodeSchemaResult; connected: string[]; stale: boolean; largeGraph?: boolean; inputHints?: Record<string, InputHint>; focusedHandle?: string; onFocusOutput?: (handle: string) => void }, "fieldNode">;
export function FieldNodeCard({ id, data, selected, compact = false, handleFor = (handle: string) => handle }: { id: string; data: FieldCanvasNode["data"]; selected?: boolean; compact?: boolean; handleFor?: (handle: string) => string }) {
  const { t, nodeName } = useI18n();
  const [manualExpanded, setExpanded] = useState<boolean | null>(null), [search, setSearch] = useState("");
  const expanded = manualExpanded ?? (!data.largeGraph || Boolean(selected));
  const [scrollTop, setScrollTop] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const refresh = useUpdateNodeInternals();
  const outputs = data.definition.output_ports.flatMap(port => {
    const value = data.schema?.outputs?.[port.id];
    return [{ handle: port.id, label: t(port.display_name), kind: value?.kind ?? port.kind }, ...(value?.columns ?? []).map(column => ({ handle: fieldHandle(port.id, column.column_id), label: column.display_name, kind: t(column.logical_type) }))];
  });
  for (const handle of data.connected) {
    if (!outputs.some(item => item.handle === handle)) outputs.push({ handle, label: t("Unavailable connection"), kind: "unknown" });
  }
  const pinned = outputs.filter(item => data.connected.includes(item.handle) || data.focusedHandle === item.handle || data.definition.output_ports.some(port => port.id === item.handle));
  const remaining = expanded && !compact ? outputs.filter(item => !pinned.includes(item) && item.label.toLowerCase().includes(search.toLowerCase())) : [];
  const window = fieldWindow(remaining.length, scrollTop);
  const visible = remaining.slice(window.start, window.end);
  const layout = JSON.stringify([[...pinned, ...visible].map(item => item.handle), scrollTop]);
  useEffect(() => { refresh(id); }, [id, layout, refresh]);
  const Icon = data.definition.category === "source" ? Database : data.definition.category === "visualization" ? ChartColumn : Calculator;
  const summary = data.node.config?.expression ?? data.node.config?.operation ?? data.node.config?.sheet_name ?? data.node.config?.name;
  const row = (item: typeof outputs[number]) => <div key={item.handle} className="relative h-6 px-4 py-1 text-right text-xs"><button className={`nodrag nopan block w-full truncate text-right ${data.focusedHandle === item.handle ? "font-bold text-accent underline" : ""}`} aria-label={t("Show connections for {0}", { 0: item.label })} aria-pressed={data.focusedHandle === item.handle} title={item.label} onClick={event => { event.stopPropagation(); data.onFocusOutput?.(item.handle); }}>{item.label} · {t(item.kind)} →</button><Handle type="source" position={Position.Right} id={handleFor(item.handle)} title={item.label} /></div>;
  return <div className={`w-72 rounded-xl border bg-control shadow-lg ${selected ? "border-accent" : "border-outline"}`}>
    <div className="flex items-center gap-2 border-b border-outline p-3"><Icon size={18} /><div className="min-w-0"><strong className="block truncate text-sm">{String(data.node.ui?.label || nodeName(data.node.type))}</strong><span className="text-xs text-muted">{typeof summary === "string" ? t(summary) : nodeName(data.node.type)}</span></div></div>
    <div className="p-3 text-xs">{!compact && <button className="nodrag nopan underline" onClick={() => setExpanded(!expanded)}>{t(expanded ? "Hide fields" : "Show fields")}</button>}{data.stale && <span className="ml-2 text-warning">{t("Updating fields")}</span>}
      {expanded && !compact && <input aria-label={t("Search fields")} className="nodrag nopan mt-2 w-full rounded border border-outline bg-control p-1" value={search} onChange={e => { setSearch(e.target.value); setScrollTop(0); if (scroller.current) scroller.current.scrollTop = 0; }} />}
    </div>
    {data.definition.input_ports.map(port => {
      const hint = data.inputHints?.[port.id];
      return <div key={port.id} className="relative h-12 px-4 py-1 text-xs" data-compatibility={hint?.state} title={hint ? t(hint.message) : t(port.display_name)}>
        <Handle type="target" position={Position.Left} id={port.id} title={hint ? t(hint.message) : t(port.display_name)} style={hint ? { width: 11, height: 11, borderWidth: 2, borderStyle: hint.state === "pending" ? "dashed" : "solid", background: hint.state === "blocked" ? "var(--danger)" : "var(--accent)" } : undefined} />
        <span>← {t(port.display_name)} · {t(port.kind)}</span>
        {hint && <span className={`block truncate ${hint.state === "blocked" ? "text-danger" : hint.state === "pending" ? "text-warning" : "text-accent"}`}>{hint.state === "blocked" ? "×" : hint.state === "pending" ? "?" : "✓"} {t(hint.message)}</span>}
      </div>;
    })}
    {pinned.map(row)}
    {remaining.length > 0 && <div ref={scroller} role="region" aria-label={t("Scrollable fields")} className="nodrag nopan nowheel overflow-y-auto" style={{ height: Math.min(FIELD_VIEW_HEIGHT, remaining.length * FIELD_ROW_HEIGHT) }} onScroll={event => setScrollTop(event.currentTarget.scrollTop)}>
      <div style={{ height: window.before }} />{visible.map(row)}<div style={{ height: window.after }} />
    </div>}
    {remaining.length * FIELD_ROW_HEIGHT > FIELD_VIEW_HEIGHT && <p className="p-2 text-xs text-muted">{t("Scroll or search for more fields.")}</p>}
  </div>;
}
