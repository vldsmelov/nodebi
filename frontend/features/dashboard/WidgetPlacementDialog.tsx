"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import type { Visualization, Widget } from "./api";
import { WidgetPlacement } from "./WidgetPlacement";

export function WidgetPlacementDialog({ widget, widgets, visualization, busy, onChange, close }: {
  widget: Widget; widgets: Widget[]; visualization?: Visualization; busy: boolean;
  onChange: (widgets: Widget[]) => void; close: () => void;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = dialog.current; el?.showModal(); return () => el?.close(); }, []);
  return <dialog ref={dialog} aria-label={t("Position and size")} onCancel={e => { e.preventDefault(); if (!busy) close(); }} className="m-auto max-h-[90vh] w-[min(560px,94vw)] overflow-auto rounded-xl border border-outline bg-panel p-6 text-foreground backdrop:bg-black/60">
    <h2 className="text-xl">{t("Position and size")}</h2>
    <fieldset disabled={busy}><WidgetPlacement widget={widget} widgets={widgets} name={visualization?.name ?? ""} type={visualization?.type} onChange={onChange} /></fieldset>
    <button disabled={busy} className="af-btn" onClick={close}>{t("Done")}</button>
  </dialog>;
}
