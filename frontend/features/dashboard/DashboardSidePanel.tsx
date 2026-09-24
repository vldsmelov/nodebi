"use client";
import { useEffect, useRef, type ReactNode } from "react";

export function DashboardSidePanel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const close = useRef(onClose); useEffect(() => { close.current = onClose; });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key === "Tab" && window.innerWidth < 1280) {
        const controls = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? []).filter(item => item.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <>
    <div className="fixed inset-0 z-30 bg-black/30 xl:hidden" onClick={onClose} aria-hidden="true" />
    <aside ref={root} tabIndex={-1} role="complementary" aria-label={title} className="fixed right-0 top-12 bottom-0 z-40 w-[min(440px,100vw)] overflow-y-auto border-l border-outline bg-panel p-5 shadow-xl">
      {children}
    </aside>
  </>;
}
