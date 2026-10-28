"use client";
import type { MouseEvent, ReactNode } from "react";

export function spreadsheetUrl(project: string, identity: { source?: string; update?: string }) {
  const query = new URLSearchParams();
  if (identity.source) query.set("source", identity.source);
  if (identity.update) query.set("update", identity.update);
  return `/spreadsheet/${encodeURIComponent(project)}?${query}`;
}
export function SpreadsheetLink({ project, source, update, children, className }: {
  project: string; source?: string; update?: string; children: ReactNode; className?: string;
}) {
  const href = spreadsheetUrl(project, { source, update });
  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.open(href, "_blank", "popup=yes,width=1480,height=1000,resizable=yes,scrollbars=yes,noopener,noreferrer");
  }
  return <a href={href} target="_blank" rel="noopener noreferrer" onClick={open} className={className}>{children}</a>;
}
