"use client";
import { useRef } from "react";
import { useI18n } from "@/lib/i18n";
import type { LegendEntry } from "./chart-legend";

export function ChartLegend({ title, entries, onToggle }: { title: string; entries: LegendEntry[]; onToggle: (name: string) => void }) {
  const { t } = useI18n();
  const details = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (!details.current) return;
    details.current.open = false;
    details.current.querySelector("summary")?.focus();
  };
  return <details ref={details} className="relative z-10 shrink-0 text-sm" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
  }}>
    <summary aria-label={`${t("Series visibility")} · ${title}`} className="min-h-8 cursor-pointer px-3 py-1">{t("Series visibility")}</summary>
    <div role="group" aria-label={`${t("Series visibility")} · ${title}`} className="absolute inset-x-0 top-full max-h-48 overflow-auto rounded border border-outline bg-panel p-2 shadow-lg">
      <p className="mb-2 text-xs text-muted">{t("Visibility changes only the chart. The data table keeps all values.")}</p>
      {entries.map(entry => <button key={entry.name} type="button" aria-pressed={entry.selected}
        className="flex min-h-8 w-full items-start gap-2 rounded px-2 py-1 text-left hover:bg-raised"
        onClick={() => onToggle(entry.name)}><span aria-hidden="true">{entry.selected ? "☑" : "☐"}</span><span className="min-w-0 break-words">{entry.label || entry.name}</span></button>)}
      <button type="button" onClick={close} className="mt-2 min-h-8 rounded border border-outline px-3">{t("Close")}</button>
    </div>
  </details>;
}
