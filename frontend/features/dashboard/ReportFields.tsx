"use client";
import { useState, type ReactNode } from "react";
import type { ResolvedColumn } from "@/features/workflow/types";
import { useI18n } from "@/lib/i18n";

const numeric = new Set(["integer", "float", "decimal", "unknown"]);
const categoryTypes = new Set(["bar_chart", "line_chart", "area_chart", "pie_chart", "donut_chart", "scatter_chart"]);

export function ReportFields({ columns, type, kind, config, onChange, source, loading, error, retry, busy }: {
  columns: ResolvedColumn[]; type: string; kind?: string; config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void; source: ReactNode;
  loading?: boolean; error?: unknown; retry: () => void; busy?: boolean;
}) {
  const { t, errorText } = useI18n(), [search, setSearch] = useState("");
  const visible = columns.filter(c => c.display_name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const selected = Array.isArray(config.column_ids) ? config.column_ids as string[] : columns.map(c => c.column_id);
  const simple = type === "table" || type === "kpi" || categoryTypes.has(type);
  return <div>
    <h2 className="text-lg font-semibold">{t("Report fields")}</h2>
    <p className="my-3 text-xs text-muted">{t("Choose prepared data and assign fields with buttons. Calculations remain in the graph.")}</p>
    <fieldset disabled={busy}>{source}</fieldset>
    {loading ? <p role="status" className="py-4 text-sm">{t("Loading fields…")}</p> : error ? <div role="alert" className="my-4 text-sm text-danger"><p>{errorText(error)}</p><button className="min-h-10 underline" onClick={retry}>{t("Retry")}</button></div> : <>
      <label className="mt-4 block text-sm">{t("Find a field")}<input type="search" className="form-control mt-2" value={search} onChange={e => setSearch(e.target.value)} /></label>
      {!simple && <p className="my-3 text-xs text-muted">{t("This chart has dedicated data roles. Configure them in the settings; preparation is not changed here.")}</p>}
      {kind === "scalar" && <p className="my-3 text-xs text-muted">{t("A prepared single value is already bound to this indicator.")}</p>}
      <p className="my-3 text-xs text-muted">{t("Fields found: {0}", { 0: visible.length })}</p>
      <ul className="max-h-80 space-y-2 overflow-y-auto xl:max-h-none">{visible.slice(0, 100).map(field => <li key={field.column_id} className="rounded-lg border border-outline p-3">
        <h3 className="break-words text-sm font-medium">{field.display_name}</h3><p className="mt-1 text-xs text-muted">{t(field.logical_type)}{field.metadata?.unit || field.metadata?.currency ? ` · ${String(field.metadata.unit || field.metadata.currency)}` : ""}</p>
        <div className="mt-2 flex flex-wrap gap-2">{kind !== "scalar" && <>
          {categoryTypes.has(type) && (type !== "scatter_chart" || numeric.has(field.logical_type)) && <button disabled={busy} aria-label={t("Use {0} as category", { 0: field.display_name })} aria-pressed={config.category_column_id === field.column_id} className="min-h-9 rounded border border-outline px-2 text-xs aria-pressed:bg-primary aria-pressed:text-on-primary" onClick={() => onChange({ ...config, category_column_id: field.column_id })}>{t("Category")}</button>}
          {(categoryTypes.has(type) && numeric.has(field.logical_type) || type === "kpi" && (numeric.has(field.logical_type) || field.logical_type === "string")) && <button disabled={busy} aria-label={t("Use {0} as value", { 0: field.display_name })} aria-pressed={config.value_column_id === field.column_id} className="min-h-9 rounded border border-outline px-2 text-xs aria-pressed:bg-primary aria-pressed:text-on-primary" onClick={() => onChange({ ...config, value_column_id: field.column_id })}>{t("Value")}</button>}
          {type === "table" && <button disabled={busy} aria-label={t("Show {0} in table", { 0: field.display_name })} aria-pressed={selected.includes(field.column_id)} className="min-h-9 rounded border border-outline px-2 text-xs aria-pressed:bg-primary aria-pressed:text-on-primary" onClick={() => onChange({ ...config, column_ids: selected.includes(field.column_id) ? selected.filter(id => id !== field.column_id) : [...selected, field.column_id] })}>{t("Table column")}</button>}
        </>}</div>
      </li>)}</ul>
      {visible.length > 100 && <p className="mt-3 text-xs text-muted">{t("Showing the first 100 fields. Narrow the search to find another field.")}</p>}
      {!visible.length && <p role="status" className="py-4 text-sm">{t("No matching fields.")} {search && <button className="min-h-10 underline" onClick={() => setSearch("")}>{t("Clear search")}</button>}</p>}
    </>}
  </div>;
}
