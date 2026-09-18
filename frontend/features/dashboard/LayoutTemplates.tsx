"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { Visualization, Widget } from "./api";
import { arrangeWidgets, layoutSignature, type LayoutTemplate } from "./layout-templates";

export function LayoutTemplates({ widgets, visualizations, busy, onChange }: {
  widgets: Widget[]; visualizations: Visualization[]; busy?: boolean; onChange: (widgets: Widget[]) => void;
}) {
  const { t } = useI18n();
  const [template, setTemplate] = useState<LayoutTemplate>("overview");
  const [open, setOpen] = useState(false);
  const [undo, setUndo] = useState<{ before: Widget[]; after: string } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const planned = arrangeWidgets(widgets, visualizations, template);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  return <div className="my-4 flex gap-3 text-sm">
    <button disabled={busy || !widgets.length} className="rounded border border-outline px-3 py-2 disabled:opacity-40" onClick={() => setOpen(true)}>{t("Layout templates")}</button>
    <button disabled={busy || !undo || undo.after !== layoutSignature(widgets)} className="rounded border border-outline px-3 py-2 disabled:opacity-40" onClick={() => {
      if (!undo || undo.after !== layoutSignature(widgets)) return;
      const previous = new Map(undo.before.map(item => [item.id, item]));
      onChange(widgets.map(item => { const old = previous.get(item.id)!; return { ...item, x: old.x, y: old.y, width: old.width, height: old.height }; })); setUndo(null);
    }}>{t("Undo layout template")}</button>
    <dialog ref={dialog} aria-label={t("Layout templates")} onCancel={event => { event.preventDefault(); setOpen(false); }} className="m-auto max-h-[90vh] w-[min(760px,94vw)] overflow-auto rounded-xl border border-outline bg-panel p-6 text-foreground backdrop:bg-black/60">
      <h2 className="text-lg">{t("Layout templates")}</h2>
      <p className="my-3 text-sm text-muted">{t("Preview placement. Applying changes only widget positions and sizes in the dashboard draft.")}</p>
      <select aria-label={t("Layout template")} className="rounded border border-outline bg-control p-2" value={template} onChange={event => setTemplate(event.target.value as LayoutTemplate)}><option value="overview">{t("KPI and charts")}</option><option value="report">{t("Report layout")}</option></select>
      <div aria-label={t("Layout preview")} className="my-4 max-h-[50vh] overflow-auto rounded border border-outline p-2"><div className="grid grid-cols-12 auto-rows-[8px] gap-1">{planned.map(widget => <div key={widget.id} className="overflow-hidden rounded border border-accent/40 bg-accent/10 p-1 text-xs" style={{ gridColumn: `${widget.x + 1} / span ${widget.width}`, gridRow: `${widget.y + 1} / span ${widget.height}` }}>{widget.title || visualizations.find(item => item.id === widget.visualization_id)?.name || t("Widget title")}</div>)}</div></div>
      <div className="flex gap-4"><button disabled={busy || layoutSignature(planned) === layoutSignature(widgets)} className="rounded bg-primary p-2 text-on-primary disabled:opacity-40" onClick={() => { setUndo({ before: widgets, after: layoutSignature(planned) }); onChange(planned); setOpen(false); }}>{t("Apply layout template")}</button><button onClick={() => setOpen(false)}>{t("Cancel")}</button></div>
    </dialog>
  </div>;
}
