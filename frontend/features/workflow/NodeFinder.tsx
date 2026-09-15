"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function NodeFinder({ nodes, selected, onSelect }: {
  nodes: { id: string; label: string }[]; selected: string | null; onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const choices = nodes.filter(node => `${node.label} ${node.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  const control = "mt-2 w-full rounded-lg border border-outline bg-control px-2 py-2 text-xs";
  return <div className="mb-4 rounded-lg border border-outline p-3">
    <p className="text-sm">{t("Workflow nodes")}</p>
    <input type="search" aria-label={t("Find workflow node")} placeholder={t("Name, type or identifier")} className={control} value={query} onChange={event => setQuery(event.target.value)} />
    <select aria-label={t("Edit workflow node")} className={control} value={choices.some(node => node.id === selected) ? selected! : ""} onChange={event => { if (event.target.value) onSelect(event.target.value); }}>
      <option value="">{t("Select node")}</option>
      {choices.map(node => <option key={node.id} value={node.id}>{node.label} ({node.id.slice(0, 6)})</option>)}
    </select>
    {!choices.length ? <p className="mt-2 text-xs text-muted">{t("No matching workflow nodes.")}</p> : null}
  </div>;
}
