"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { ResolvedColumn } from "./types";

export function TableColumns({ columns, selected, onChange }: { columns: ResolvedColumn[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const ordered = [...selected.map(id => columns.find(column => column.column_id === id)).filter((column): column is ResolvedColumn => !!column), ...columns.filter(column => !selected.includes(column.column_id))];
  const visible = ordered.filter(column => column.display_name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <fieldset className="mt-4"><legend className="text-sm font-medium">{t("Table columns")}</legend>
    <p className="my-2 text-xs text-muted">{t("Checked columns appear in this order. Arrow buttons move them one position.")}</p>
    <input aria-label={t("Search table columns")} placeholder={t("Search table columns")} value={search} onChange={e => setSearch(e.target.value)} className="my-2 w-full rounded border border-outline bg-control p-2 text-sm" />
    <p className="text-xs text-muted">{t("Selected columns: {0}", { 0: selected.length })}</p>
    {selected.filter(id => !columns.some(column => column.column_id === id)).map((id, index) => <button key={id} className="my-2 block text-sm text-danger underline" onClick={() => onChange(selected.filter(value => value !== id))}>{t("Remove unavailable column {0}", { 0: index + 1 })}</button>)}
    {!visible.length && <p role="status" className="my-3 text-sm">{t("No matching columns.")} <button className="underline" onClick={() => setSearch("")}>{t("Clear search")}</button></p>}
    <div className="mt-2 max-h-72 overflow-auto">{visible.map(column => {
      const index = selected.indexOf(column.column_id);
      return <div key={column.column_id} className="flex items-center gap-2 border-b border-outline py-2 text-sm">
        <label className="flex min-w-0 flex-1 items-center gap-2"><input type="checkbox" checked={index >= 0} onChange={() => onChange(index >= 0 ? selected.filter(id => id !== column.column_id) : [...selected, column.column_id])} /><span className="break-words">{column.display_name}</span></label>
        {index >= 0 && [-1, 1].map(direction => <button key={direction} aria-label={t(direction < 0 ? "Move column up" : "Move column down")} title={column.display_name} disabled={index + direction < 0 || index + direction >= selected.length} className="rounded border border-outline px-2 py-1 disabled:opacity-30" onClick={() => { const next = [...selected]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; onChange(next); }}>{direction < 0 ? "↑" : "↓"}</button>)}
      </div>;
    })}</div>
  </fieldset>;
}
