"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

type Props = { groups: { name: string; count: number; members: { id: string; label: string }[] }[]; selectedCount: number; collapsed: string[]; openNode: (id: string) => void;
  assign: (name: string) => void; rename: (from: string, to: string) => void; dissolve: (name: string) => void; toggle: (name: string) => void };
export function GroupPanel({ groups, selectedCount, collapsed, assign, rename, dissolve, toggle, openNode }: Props) {
  const { t } = useI18n();
  const [active, setActive] = useState(""), [name, setName] = useState("");
  const selected = groups.some(group => group.name === active) ? active : "";
  const proposed = name.trim(), available = !!proposed && !groups.some(group => group.name === proposed);
  const button = "rounded border border-outline px-2 py-1 text-xs disabled:opacity-40";
  return <details className="mb-4 rounded-lg border border-outline p-3">
    <summary className="cursor-pointer text-sm">{t("Node groups")}</summary>
    <p className="my-2 text-xs text-muted">{t("Selected nodes: {0}", { 0: selectedCount })} · {t("Shift-click to select several nodes.")}</p>
    <input aria-label={t("Group name")} maxLength={200} className="w-full rounded border border-outline bg-control p-2 text-xs" value={name} onChange={event => setName(event.target.value)} />
    <button className={`${button} my-2`} disabled={!selectedCount || !available} onClick={() => { assign(proposed); setActive(proposed); setName(""); }}>{t("Group selected nodes")}</button>
    <select aria-label={t("Active group")} className="mb-2 w-full rounded border border-outline bg-control p-2 text-xs" value={selected} onChange={event => setActive(event.target.value)}>
      <option value="">{t("Select group")}</option>{groups.map(group => <option key={group.name} value={group.name}>{group.name} ({group.count})</option>)}
    </select>
    {selected ? <ul className="mb-3 max-h-48 overflow-y-auto" aria-label={t("Group members")}>{groups.find(group => group.name === selected)!.members.map(node => <li key={node.id}><button className="w-full py-1 text-left text-xs hover:text-accent" onClick={() => openNode(node.id)}>{node.label} ({node.id.slice(0, 6)})</button></li>)}</ul> : null}
    <div className="flex flex-wrap gap-2">
      <button className={button} disabled={!selected || !selectedCount} onClick={() => assign(selected)}>{t("Add selection to group")}</button>
      <button className={button} disabled={!selectedCount} onClick={() => assign("")}>{t("Ungroup selected nodes")}</button>
      <button className={button} disabled={!selected || !available} onClick={() => { rename(selected, proposed); setActive(proposed); setName(""); }}>{t("Rename group")}</button>
      <button className={button} disabled={!selected} onClick={() => dissolve(selected)}>{t("Dissolve group")}</button>
    </div>
    {groups.map(group => <div key={group.name} className="mt-3 flex items-center justify-between gap-2 text-xs"><span className="min-w-0 break-words">{group.name} ({group.count})</span><button className={button} aria-label={t("Toggle group {0}", { 0: group.name })} aria-expanded={!collapsed.includes(group.name)} onClick={() => toggle(group.name)}>{t(collapsed.includes(group.name) ? "Expand group" : "Collapse group")}</button></div>)}
  </details>;
}
