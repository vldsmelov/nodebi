"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export function DashboardSidePanel({ title, onClose, children, workbench = false, onFieldsHost }: { title: string; onClose: () => void; children: ReactNode; workbench?: boolean; onFieldsHost?: (element: HTMLDivElement | null) => void }) {
  const { t } = useI18n();
  const root = useRef<HTMLElement>(null);
  const fields = useRef<HTMLElement>(null);
  const close = useRef(onClose); useEffect(() => { close.current = onClose; });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (!workbench || root.current?.contains(event.target as Node) || fields.current?.contains(event.target as Node))) { event.preventDefault(); close.current(); }
      if (event.key === "Tab" && !workbench && window.innerWidth < 1280) {
        const controls = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? []).filter(item => item.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); if (previous?.isConnected) previous.focus(); };
  }, [workbench]);
  return <>
    {workbench ? <><nav aria-label={t("Report editor sections")} className="mb-4 flex flex-wrap gap-4 text-sm xl:hidden"><a className="min-h-10 py-2 underline" href="#report-fields">{t("Report fields")}</a><a className="min-h-10 py-2 underline" href="#report-preview">{t("Preview")}</a><a className="min-h-10 py-2 underline" href="#report-settings">{t("Visualization settings")}</a></nav><aside ref={fields} id="report-fields" tabIndex={-1} aria-label={t("Report fields")} className="mb-5 rounded-xl border border-outline bg-panel p-4 xl:fixed xl:inset-y-28 xl:bottom-0 xl:left-0 xl:z-30 xl:mb-0 xl:w-64 xl:overflow-y-auto xl:rounded-none"><div ref={onFieldsHost} /></aside></> : <div className="fixed inset-0 z-30 bg-black/30 xl:hidden" onClick={onClose} aria-hidden="true" />}
    <aside ref={root} id={workbench ? "report-settings" : undefined} tabIndex={-1} role="complementary" aria-label={title} className={workbench ? "mb-5 rounded-xl border border-outline bg-panel p-5 xl:fixed xl:inset-y-28 xl:bottom-0 xl:right-0 xl:z-30 xl:mb-0 xl:w-96 xl:overflow-y-auto xl:rounded-none" : "fixed right-0 top-12 bottom-0 z-40 w-[min(440px,100vw)] overflow-y-auto border-l border-outline bg-panel p-5 shadow-xl"}>
      {children}
    </aside>
  </>;
}
