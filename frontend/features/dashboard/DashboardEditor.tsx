"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import GridLayout, { useContainerWidth, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { saveDashboard, type Dashboard, type Visualization } from "./api";
import { VisualizationView } from "./VisualizationView";

type Props = { initial: Dashboard; visualizations: Visualization[]; dashboards?: Dashboard[];
  onSelect?: (id: string) => void; onCreate?: () => void; onDelete?: () => void;
  onSaved?: (dashboard: Dashboard) => void; managementError?: string; managementBusy?: boolean };
export function DashboardEditor({ initial, visualizations, dashboards = [], onSelect, onCreate, onDelete, onSaved, managementError, managementBusy }: Props) {
  const key = `nodebi:dashboard-draft:${initial.id}`;
  const [dashboard, setDashboard] = useState<Dashboard>(() => {
    try { const stored = sessionStorage.getItem(key); if (stored) { const parsed = JSON.parse(stored); if (parsed.id === initial.id && Array.isArray(parsed.widgets)) return parsed; } } catch { /* Ignore an unreadable draft; the saved dashboard is still available. */ }
    return initial;
  });
  const [saved, setSaved] = useState(initial);
  const [selected, setSelected] = useState("");
  const [storageError, setStorageError] = useState("");
  const dirty = JSON.stringify(dashboard) !== JSON.stringify(saved);
  const { width, containerRef, mounted } = useContainerWidth();
  const save = useMutation({ mutationFn: () => saveDashboard(dashboard), onSuccess: result => {
    setDashboard(result); setSaved(result);
    try { sessionStorage.removeItem(key); } catch { setStorageError("Saved successfully, but local draft cleanup failed."); }
    onSaved?.(result);
  } });
  const change = (update: Dashboard | ((current: Dashboard) => Dashboard)) => {
    const next = typeof update === "function" ? update(dashboard) : update;
    try { sessionStorage.setItem(key, JSON.stringify(next)); }
    catch { setStorageError("Local draft storage is unavailable. Save before leaving this page."); }
    setDashboard(next);
  };
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  const leave = (action: () => void) => { if (!dirty || window.confirm("Dashboard changes are not saved. Keep this draft and continue?")) action(); };
  const updateLayout = (layout: Layout) => change(current => ({ ...current, widgets: current.widgets.map(widget => {
    const item = layout.find(item => item.i === widget.id);
    return item ? { ...widget, x: item.x, y: item.y, width: item.w, height: item.h } : widget;
  }) }));
  const add = () => {
    if (!selected) return;
    const y = Math.max(0, ...dashboard.widgets.map(widget => widget.y + widget.height));
    change(current => ({ ...current, widgets: [...current.widgets, { id: crypto.randomUUID(), visualization_id: selected, x: 0, y, width: 6, height: 8 }] }));
  };
  return <main className="min-h-screen bg-[#0b0f0a] p-6 text-white">
    <header className="flex flex-wrap items-center gap-4">
      <Link href={`/projects/${initial.project_id}/workflow`} onClick={event => { if (dirty && !window.confirm("Dashboard changes are not saved. Leave with a recoverable local draft?")) event.preventDefault(); }} className="text-[#b7ff5a]">Workflow</Link>
      <input aria-label="Dashboard name" value={dashboard.name} disabled={save.isPending} onChange={e => change({ ...dashboard, name: e.target.value })} className="min-w-0 flex-1 bg-transparent text-2xl" />
      <span className="text-xs text-white/50">{save.isPending ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}</span>
      <button onClick={() => save.mutate()} disabled={!dirty || save.isPending} className="rounded-full bg-[#b7ff5a] px-5 py-2 text-sm font-semibold text-black disabled:opacity-40">Save dashboard</button>
    </header>
    <nav className="mt-4 flex flex-wrap items-center gap-3 text-xs">
      {dashboards.length > 1 ? <select aria-label="Dashboard" value={initial.id} disabled={save.isPending || managementBusy} onChange={e => leave(() => onSelect?.(e.target.value))} className="rounded-lg border border-white/10 bg-[#151b12] px-3 py-2">{dashboards.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select> : null}
      {onCreate ? <button disabled={save.isPending || managementBusy} onClick={() => leave(onCreate)} className="rounded-lg border border-white/10 px-3 py-2">New dashboard</button> : null}
      {onDelete ? <button disabled={save.isPending || managementBusy} onClick={() => { if (window.confirm("Delete this dashboard and its widgets? The workflow visualizations remain.")) onDelete(); }} className="text-red-200">Delete dashboard</button> : null}
    </nav>
    {managementError ? <p role="alert" className="mt-3 text-red-200">{managementError}</p> : null}
    {storageError ? <p role="alert" className="mt-3 text-amber-200">{storageError}</p> : null}
    {save.error ? <div role="alert" className="mt-3 rounded-lg bg-red-950 p-3 text-red-200">{save.error.message}<button className="ml-4 underline" onClick={() => { if (window.confirm("Discard this dashboard draft and reload?")) { sessionStorage.removeItem(key); window.location.reload(); } }}>Discard draft and reload</button></div> : null}
    <div className="my-5 flex gap-3"><select aria-label="Add visualization" value={selected} disabled={save.isPending} onChange={e => setSelected(e.target.value)} className="rounded-lg border border-white/10 bg-[#151b12] px-3 py-2"><option value="">Select visualization</option>{visualizations.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><button onClick={add} disabled={!selected || save.isPending || dashboard.widgets.length >= 100} className="rounded-lg border border-white/10 px-4 py-2 disabled:opacity-40">Add widget</button></div>
    {!dashboard.widgets.length ? <p className="py-20 text-center text-white/40">Add a saved visualization from your workflow.</p> : null}
    <div ref={containerRef}>{mounted ? <GridLayout width={width} gridConfig={{ cols: 12, rowHeight: 30, margin: [12, 12] }} dragConfig={{ enabled: !save.isPending, handle: ".widget-handle" }} resizeConfig={{ enabled: !save.isPending }} layout={dashboard.widgets.map(w => ({ i: w.id, x: w.x, y: w.y, w: w.width, h: w.height, minW: 2, minH: 2, maxH: 40 }))} onDragStop={updateLayout} onResizeStop={updateLayout}>
      {dashboard.widgets.map(widget => <div key={widget.id} data-widget-id={widget.id} className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#141b11]">
        <div className="flex shrink-0 items-center border-b border-white/10"><div className="widget-handle flex-1 cursor-move px-4 py-2 text-xs text-white/40" aria-label="Move widget">Drag to move</div><button aria-label="Remove widget" disabled={save.isPending} className="px-3 text-white/50" onClick={() => change(current => ({ ...current, widgets: current.widgets.filter(w => w.id !== widget.id) }))}>×</button></div>
        <div className="flex items-center gap-2 px-3 py-1"><input aria-label="Widget title" placeholder={visualizations.find(v => v.id === widget.visualization_id)?.name ?? "Widget title"} value={widget.title ?? ""} disabled={save.isPending} onChange={e => change(current => ({ ...current, widgets: current.widgets.map(w => w.id === widget.id ? { ...w, title: e.target.value || null } : w) }))} className="min-w-0 flex-1 bg-transparent text-xs" /><label className="flex gap-1 text-[10px] text-white/40"><input type="checkbox" aria-label="Show widget title" checked={widget.config?.show_title !== false} disabled={save.isPending} onChange={e => change(current => ({ ...current, widgets: current.widgets.map(w => w.id === widget.id ? { ...w, config: { show_title: e.target.checked } } : w) }))} />Title</label></div>
        <div className="min-h-0 flex-1"><VisualizationView id={widget.visualization_id} titleOverride={widget.title ?? undefined} hideTitle={widget.config?.show_title === false} /></div>
      </div>)}
    </GridLayout> : null}</div>
  </main>;
}
