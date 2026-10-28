"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { listDashboardLayouts, saveDashboardLayout, type Dashboard, type DashboardLayoutRequest, type Visualization, type Widget } from "./api";

export function SavedDashboardLayouts({ dashboard, visualizations, busy, onApply, onSaved, onBusyChange }: {
  dashboard: Dashboard; visualizations: Visualization[]; busy: boolean;
  onApply: (widgets: Widget[]) => void; onSaved: (dashboard: Dashboard) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { t, errorText } = useI18n();
  const [open, setOpen] = useState(false), [name, setName] = useState("");
  const [selected, setSelected] = useState("");
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const pending = useRef<{ signature: string; request: DashboardLayoutRequest } | null>(null);
  const layouts = useQuery({ queryKey: ["dashboard-layouts", dashboard.id, dashboard.revision], queryFn: () => listDashboardLayouts(dashboard.id), enabled: open, retry: false });
  const save = useMutation({ mutationFn: async () => {
    const settings = { name: dashboard.name, expected_revision: dashboard.revision, widgets: dashboard.widgets, configuration: dashboard.configuration };
    const signature = JSON.stringify([name.trim(), settings]);
    if (pending.current?.signature !== signature) pending.current = { signature, request: { name: name.trim(), request_id: crypto.randomUUID(), dashboard: settings } };
    return saveDashboardLayout(dashboard.id, pending.current.request);
  }, onSuccess: result => { onSaved(result.dashboard); setNotice("The new layout template and dashboard were saved. The default layout is unchanged."); setOpen(false); pending.current = null; } });
  useEffect(() => { onBusyChange(save.isPending); }, [save.isPending, onBusyChange]);
  useEffect(() => { if (open) dialog.current?.showModal(); else if (dialog.current?.open) { dialog.current.close(); opener.current?.focus(); } }, [open]);
  const template = layouts.data?.find(item => item.id === selected);
  const unavailable = template?.widgets.some(widget => !visualizations.some(item => item.id === widget.visualization_id));
  return <>
    <button ref={opener} disabled={busy} className="af-btn af-btn--secondary" onClick={() => { setNotice(""); setOpen(true); save.reset(); }}>{t("Saved dashboard layouts")}</button>
    {notice && <p role="status" className="w-full text-sm text-success">{t(notice)}</p>}
    <dialog ref={dialog} aria-label={t("Saved dashboard layouts")} onCancel={event => { event.preventDefault(); if (!save.isPending) setOpen(false); }} className="m-auto max-h-[90vh] w-[min(760px,94vw)] overflow-auto rounded-xl border border-outline bg-panel p-6 text-foreground backdrop:bg-black/60">
      <h2 className="text-xl">{t("Saved dashboard layouts")}</h2>
      <p className="my-3 text-sm text-muted">{t("The first saved layout is protected. Changes never overwrite it. Save another layout with its own name.")}</p>
      <p className="my-3 text-sm text-muted">{t("Layouts store the widget set, titles, positions and sizes. Calculations and visualization settings remain shared.")}</p>
      {layouts.isPending ? <p role="status">{t("Loading…")}</p> : layouts.error ? <div role="alert">{errorText(layouts.error)}<button className="ml-3 underline" onClick={() => void layouts.refetch()}>{t("Retry")}</button></div> : <>
        <label className="block">{t("Saved layout")}<select className="form-control" value={selected} onChange={e => setSelected(e.target.value)}><option value="">{t("Select a layout")}</option>{layouts.data?.map(item => <option value={item.id} key={item.id}>{item.is_default ? t("Default layout") : item.name} · {item.widgets.length}</option>)}</select></label>
        {template && <div className="my-3 max-h-64 overflow-auto rounded border border-outline p-2" aria-label={t("Layout preview")}><div className="grid grid-cols-12 auto-rows-[6px] gap-1">{template.widgets.map(widget => <div key={widget.id} className="overflow-hidden rounded bg-accent/15 p-1 text-xs" style={{ gridColumn: `${widget.x + 1} / span ${widget.width}`, gridRow: `${widget.y + 1} / span ${widget.height}` }}>{widget.title || visualizations.find(item => item.id === widget.visualization_id)?.name}</div>)}</div></div>}
        {unavailable && <p role="alert" className="text-sm text-danger">{t("This layout refers to a removed visualization. It cannot be applied.")}</p>}
        <button disabled={busy || !template || unavailable} className="my-3 af-btn af-btn--secondary" onClick={() => { if (template) { onApply(structuredClone(template.widgets)); setOpen(false); } }}>{t("Apply layout to draft")}</button>
        <p className="text-sm text-muted">{t("Applying replaces the current widget set in the draft. Undo is available. Save dashboard to keep the change.")}</p>
      </>}
      <form className="mt-5 border-t border-outline pt-4" onSubmit={e => { e.preventDefault(); if (name.trim() && !busy && !save.isPending) save.mutate(); }}>
        <label className="block">{t("New layout template name")}<input autoComplete="off" className="form-control" maxLength={200} value={name} disabled={save.isPending} onChange={e => setName(e.target.value)} /></label>
        {save.error && <p role="alert" className="my-3 text-sm text-danger">{errorText(save.error)}</p>}
        <div className="mt-4 flex flex-wrap gap-3"><button className="af-btn" disabled={busy || save.isPending || !name.trim() || !dashboard.widgets.length || layouts.isPending || !!layouts.error}>{t(save.isPending ? "Saving…" : "Save dashboard and new layout")}</button><button type="button" disabled={save.isPending} className="af-btn af-btn--secondary" onClick={() => setOpen(false)}>{t("Close")}</button></div>
      </form>
    </dialog>
  </>;
}
