"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { choiceLabels } from "./choice-labels";

type Props = { groups: { name: string; count: number; members: { id: string; label: string }[] }[]; selectedCount: number; collapsed: string[]; openNode: (id: string) => void;
  nodes: { id: string; label: string; selected: boolean }[]; select: (id: string, checked: boolean) => void; clearSelection: () => void;
  assign: (name: string) => void; rename: (from: string, to: string) => void; dissolve: (name: string) => void; toggle: (name: string) => void };
export function GroupPanel({ groups, selectedCount, collapsed, assign, rename, dissolve, toggle, openNode, nodes, select, clearSelection }: Props) {
  const { t } = useI18n();
  const [active, setActive] = useState(""), [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const labelled = choiceLabels(nodes);
  const matches = labelled.filter(node => node.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const selected = groups.some(group => group.name === active) ? active : "";
  const proposed = name.trim(), available = !!proposed && !groups.some(group => group.name === proposed);
  const button = "rounded border border-outline px-2 py-1 text-xs disabled:opacity-40";
  return <details className="mb-4 rounded-lg border border-outline p-3">
    <summary className="cursor-pointer text-sm">{t("Node groups")}</summary>
    <p className="my-2 text-xs text-muted">{t("Selected nodes: {0}", { 0: selectedCount })} · {t("Shift-click to select several nodes.")}</p>
    <fieldset className="mb-3 min-w-0">
      <legend className="text-xs">{t("Choose nodes for grouping")}</legend>
      <input type="search" aria-label={t("Find nodes for grouping")} className="my-2 w-full rounded border border-outline bg-control p-2 text-xs" value={query} onChange={event => setQuery(event.target.value)} />
      <div role="region" aria-label={t("Nodes for grouping")} tabIndex={0} className="max-h-48 overflow-y-auto">
        {matches.slice(0, 100).map(node => <label key={node.id} className="flex min-h-10 items-center gap-2 py-1 text-xs">
          <input type="checkbox" aria-label={t("Select {0} for grouping", { 0: node.label })} checked={node.selected} onChange={event => select(node.id, event.target.checked)} />
          <span className="min-w-0 break-words">{node.label}</span>
        </label>)}
        {!matches.length && <p className="text-xs text-muted">{t("No matching workflow nodes.")}</p>}
      </div>
      {matches.length > 100 && <p className="mt-2 text-xs text-muted">{t("Showing the first 100 matches. Refine the search to find other nodes.")}</p>}
      <p className="my-2 text-xs text-muted">{t("Searching does not clear selected nodes. Grouping includes all selected nodes.")}</p>
      <button type="button" className={button} disabled={!selectedCount} onClick={clearSelection}>{t("Clear selection")}</button>
    </fieldset>
    <input aria-label={t("Group name")} maxLength={200} className="w-full rounded border border-outline bg-control p-2 text-xs" value={name} onChange={event => setName(event.target.value)} />
    <button className={`${button} my-2`} disabled={!selectedCount || !available} onClick={() => { assign(proposed); setActive(proposed); setName(""); }}>{t("Group selected nodes")}</button>
    <select aria-label={t("Active group")} className="mb-2 w-full rounded border border-outline bg-control p-2 text-xs" value={selected} onChange={event => setActive(event.target.value)}>
      <option value="">{t("Select group")}</option>{groups.map(group => <option key={group.name} value={group.name}>{group.name} ({group.count})</option>)}
    </select>
    {selected ? <ul className="mb-3 max-h-48 overflow-y-auto" aria-label={t("Group members")}>{groups.find(group => group.name === selected)!.members.map(node => <li key={node.id}><button className="w-full py-1 text-left text-xs hover:text-accent" onClick={() => openNode(node.id)}>{labelled.find(item => item.id === node.id)?.label ?? node.label}</button></li>)}</ul> : null}
    <div className="flex flex-wrap gap-2">
      <button className={button} disabled={!selected || !selectedCount} onClick={() => assign(selected)}>{t("Add selection to group")}</button>
      <button className={button} disabled={!selectedCount} onClick={() => assign("")}>{t("Ungroup selected nodes")}</button>
      <button className={button} disabled={!selected || !available} onClick={() => { rename(selected, proposed); setActive(proposed); setName(""); }}>{t("Rename group")}</button>
      <button className={button} disabled={!selected} onClick={() => dissolve(selected)}>{t("Dissolve group")}</button>
    </div>
    {groups.map(group => <div key={group.name} className="mt-3 flex items-center justify-between gap-2 text-xs"><span className="min-w-0 break-words">{group.name} ({group.count})</span><button className={button} aria-label={t("Toggle group {0}", { 0: group.name })} aria-expanded={!collapsed.includes(group.name)} onClick={() => toggle(group.name)}>{t(collapsed.includes(group.name) ? "Expand group" : "Collapse group")}</button></div>)}
  </details>;
}
