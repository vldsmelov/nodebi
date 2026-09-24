"use client";
import { useI18n } from "@/lib/i18n";
import { moveWidget } from "./placement";
import type { Widget } from "./api";

export function WidgetPlacement({ widget, widgets, name, onChange }: { widget: Widget; widgets: Widget[]; name: string; onChange: (widgets: Widget[]) => void }) {
  const { t } = useI18n();
  const update = (patch: Partial<Widget>) => onChange(widgets.map(item => item.id === widget.id ? { ...item, ...patch } : item));
  const controls = [
    ["Move left", { x: widget.x - 1 }], ["Move right", { x: widget.x + 1 }],
    ["Move up", { y: widget.y - 1 }], ["Move down", { y: widget.y + 1 }],
    ["Narrower", { width: widget.width - 1 }], ["Wider", { width: widget.width + 1 }],
    ["Shorter", { height: widget.height - 1 }], ["Taller", { height: widget.height + 1 }],
  ] as const;
  return <div className="space-y-4 py-4 text-sm">
    <p className="text-muted">{t("Only this widget on this dashboard. Save using Save dashboard.")}</p>
    <label className="block">{t("Widget title")}<input aria-label={t("Widget title")} maxLength={200} placeholder={name} value={widget.title ?? ""} onChange={e => update({ title: e.target.value || null })} className="mt-2 w-full rounded border border-outline bg-control p-2" /></label>
    <label className="flex gap-2"><input type="checkbox" aria-label={t("Show widget title")} checked={widget.config?.show_title !== false} onChange={e => update({ config: { ...widget.config, show_title: e.target.checked } })} />{t("Show widget title")}</label>
    <p>{t("Position and size")}: {widget.x + 1}, {widget.y + 1} · {widget.width} × {widget.height}</p>
    <div className="grid grid-cols-2 gap-2">{controls.map(([label, patch]) => {
      const next = moveWidget(widgets, widget.id, patch);
      return <button key={label} disabled={next === widgets} onClick={() => onChange(next)} className="rounded border border-outline p-2 disabled:opacity-30">{t(label)}</button>;
    })}</div><p className="text-xs text-muted">{t("Move into free space; occupied positions are unavailable.")}</p>
  </div>;
}
