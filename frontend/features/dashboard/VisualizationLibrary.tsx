"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { VisualizationView } from "./VisualizationView";
import type { Dashboard, Visualization } from "./api";

export function VisualizationLibrary({ items, dashboards, busy, onAdd, onEdit }: { items: Visualization[]; dashboards: Dashboard[]; busy?: boolean; onAdd: (id: string) => void; onEdit: (item: Visualization) => void }) {
  const { t, nodeName, errorText } = useI18n();
  const client = useQueryClient();
  const [search, setSearch] = useState(""), [preview, setPreview] = useState<string | null>(null), [error, setError] = useState<unknown>(null), [deleting, setDeleting] = useState(false);
  const remove = async (item: Visualization) => {
    if (!window.confirm(t("Delete this unused visualization?"))) return;
    setDeleting(true); setError(null);
    try { await apiRequest(`/api/v1/visualizations/${item.id}?expected_revision=${item.revision}`, { method: "DELETE" }); await client.invalidateQueries({ queryKey: ["visualizations"] }); }
    catch (error) { setError(error); } finally { setDeleting(false); }
  };
  return <details className="my-4 rounded border border-outline p-3" open>
    <summary>{t("Available visualizations")}</summary>
    <input aria-label={t("Search visualizations")} placeholder={t("Search visualizations")} value={search} onChange={e => setSearch(e.target.value)} className="my-3 w-full rounded border border-outline bg-control p-2" />
    {error ? <p role="alert" className="text-danger">{errorText(error)}</p> : null}
    <div className="max-h-80 overflow-auto">{items.filter(item => item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(item => {
      const used = dashboards.some(board => board.widgets.some(widget => widget.visualization_id === item.id));
      return <div key={item.id} className="border-t border-outline py-2"><div className="flex flex-wrap items-center gap-3 text-sm"><span className="flex-1">{item.name} · {nodeName(item.type)}</span><button disabled={busy || deleting} onClick={() => onAdd(item.id)}>{t("Add widget")}</button><button onClick={() => setPreview(preview === item.id ? null : item.id)}>{t("Preview visualization")}</button><button disabled={busy || deleting} onClick={() => onEdit(item)}>{t("Settings")}</button>{item.publication_id && <button disabled={busy || deleting || used} title={used ? t("Remove placements before deleting this visualization.") : undefined} onClick={() => void remove(item)} className="text-danger">{t("Delete visualization")}</button>}</div>{preview === item.id && <div className="h-64"><VisualizationView id={item.id} revision={item.revision} /></div>}</div>;
    })}</div>
  </details>;
}
