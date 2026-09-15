"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

type EditorView = { left: number; right: number; collapsed: string[] };
const defaults: EditorView = { left: 272, right: 304, collapsed: [] };
export function useEditorView(id: string) {
  const key = `nodebi:workflow-view:${id}`;
  const [view, setView] = useState<EditorView>(() => {
    try {
      const data = JSON.parse(sessionStorage.getItem(key) ?? "null");
      if (!data) return defaults;
      const width = (value: unknown, fallback: number, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
      return { left: width(data.left, 272, 220, 420), right: width(data.right, 304, 260, 640), collapsed: Array.isArray(data.collapsed) ? data.collapsed.filter((item: unknown) => typeof item === "string" && item.length <= 200).slice(0, 1000) : [] };
    } catch { return defaults; }
  });
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(view)); } catch { /* Optional view preference; graph recovery has separate error handling. */ } }, [key, view]);
  return [view, setView] as const;
}
export function EditorPanels({ left, right, change }: { left: number; right: number; change: (left: number, right: number) => void }) {
  const { t } = useI18n();
  return <details className="mb-4 rounded-lg border border-outline p-3"><summary className="cursor-pointer text-sm">{t("Editor panels")}</summary>
    <label className="mt-3 block text-xs">{t("Library panel width")}<input className="mt-2 w-full" aria-label={t("Library panel width")} type="range" min={220} max={420} step={1} value={left} onChange={event => change(Number(event.target.value), right)} /></label>
    <label className="mt-3 block text-xs">{t("Configuration panel width")}<input className="mt-2 w-full" aria-label={t("Configuration panel width")} type="range" min={260} max={640} step={1} value={right} onChange={event => change(left, Number(event.target.value))} /></label>
    <button className="mt-2 text-xs underline" onClick={() => change(272, 304)}>{t("Reset panel widths")}</button>
  </details>;
}
