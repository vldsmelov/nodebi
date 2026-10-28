"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { listDatasets, listImports, readOptions, type DatasetSnapshot, type ImportedSource, type ReadOptions } from "@/features/ingestion/api";
import type { Check, UpdateItem, Version } from "./api";

const control = "form-control w-full";

export function DatasetUpdates({ projectId, sourceId, items, check, onChange, onUploading }: {
  sourceId?: string;
  projectId: string; items: UpdateItem[]; check?: Check | null;
  onChange: (sourceId: string, item?: UpdateItem) => void;
  onUploading?: (busy: boolean) => void;
}) {
  const { t, errorText } = useI18n();
  const sources = useQuery({ queryKey: ["imports", projectId], queryFn: () => listImports(projectId) });
  const datasets = useQuery({ queryKey: ["datasets", projectId], queryFn: () => listDatasets(projectId) });
  return <div className="space-y-4">
    {sources.error || datasets.error ? <div role="alert" className="text-danger">{errorText(sources.error || datasets.error)} <button className="underline" disabled={sources.isFetching || datasets.isFetching} onClick={() => { void sources.refetch(); void datasets.refetch(); }}>{t("Retry")}</button></div> : null}
    {(sources.isPending || datasets.isPending) && <p role="status">{t("Loading…")}</p>}
    {sources.data?.filter(source => (!sourceId || source.id === sourceId) && Object.keys(source.active_snapshots ?? {}).length).map(source => <DatasetVersionPicker
      key={source.id} source={source} datasets={(datasets.data ?? []).filter(d => d.source_id === source.id)}
      item={items.find(i => i.source_id === source.id)} onChange={item => onChange(source.id, item)}
      onUploading={onUploading}
    />)}
    {check?.dataset_profiles?.map(profile => {
      const item = items.find(i => i.source_id === profile.source_id);
      if (!item || item.version_id !== profile.version_id) return null;
      const binding = item.dataset_bindings?.find(b => b.resource_id === profile.resource_id);
      if (binding && binding.target_resource_id !== profile.target_resource_id) return null;
      // A previous check must not restore old reading options through a mapping edit.
      if (binding?.options && (Object.keys({ ...readOptions, cell_range: null }) as (keyof ReadOptions)[])
        .some(key => (binding.options?.[key] ?? readOptions[key] ?? null) !== (profile.options[key] ?? readOptions[key] ?? null))) return null;
      const columns = binding?.columns?.length ? binding.columns : profile.suggestions;
      return <details open key={`${profile.source_id}:${profile.resource_id}`} className="rounded-lg border border-outline p-4">
        <summary>{profile.name} · {t("Rows: {0} → {1}", { 0: profile.old_rows, 1: profile.new_rows })}</summary>
        <p className="my-3 text-sm text-muted">{t("Refresh preserves field identities, types and decimal precision. Confirm renamed columns explicitly.")}</p>
        <div className="my-3 max-h-48 overflow-auto"><table className="w-full text-sm"><caption>{t("Incoming records")}</caption>
          <thead><tr>{profile.new_columns.map(c => <th scope="col" key={c.column_id} className="p-2 text-left">{c.display_name}</th>)}</tr></thead>
          <tbody>{profile.new_examples?.map((row, i) => <tr key={i}>{profile.new_columns.map(c => <td key={c.column_id} className="p-2">{String(row[c.engine_name] ?? "—")}</td>)}</tr>)}</tbody>
        </table></div>
        {profile.old_columns.map(column => <label key={column.column_id} className="my-2 grid gap-2 sm:grid-cols-2">
          <span>{column.display_name} · {t(column.logical_type)}</span>
          <select className={control} aria-label={t("Incoming field for {0}", { 0: column.display_name })}
            value={columns.find(c => c.logical_id === column.column_id)?.physical_id ?? ""}
            onChange={event => onChange(item.source_id, { ...item, dataset_bindings: [
              ...(item.dataset_bindings ?? []).filter(b => b.resource_id !== profile.resource_id),
              { resource_id: profile.resource_id, target_resource_id: profile.target_resource_id, options: profile.options,
                columns: [...columns.filter(c => c.logical_id !== column.column_id), { logical_id: column.column_id, physical_id: event.target.value }].filter(c => c.physical_id) },
            ] })}>
            <option value="">{t("Select field")}</option>{profile.new_columns.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}
          </select>
        </label>)}
      </details>;
    })}
  </div>;
}

function DatasetVersionPicker({ source, datasets, item, onChange, onUploading }: {
  source: ImportedSource; datasets: DatasetSnapshot[]; item?: UpdateItem; onChange: (item?: UpdateItem) => void;
  onUploading?: (busy: boolean) => void;
}) {
  const { t, errorText } = useI18n();
  const versions = useQuery({ queryKey: ["source-versions", source.id], queryFn: () => apiRequest<Version[]>(`/api/v1/sources/${source.id}/versions`) });
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  const [editedOptions, setEditedOptions] = useState<ReadOptions | null>(null);
  const options = editedOptions ?? datasets[0]?.profile.options ?? readOptions;
  const selected = versions.data?.find(v => v.id === item?.version_id);
  const change = (patch: Partial<UpdateItem>) => onChange({ source_id: source.id, version_id: item?.version_id ?? "", mode: "replace", period: "", baseline_period: "", ...item, ...patch });
  return <section className="space-y-3 rounded-lg border border-outline p-4">
    <h3 className="font-semibold">{source.name} · {source.connector === "csv" ? "CSV" : "Excel"}</h3>
    {versions.isPending && <p role="status">{t("Loading…")}</p>}
    {versions.error && <button className="underline" disabled={versions.isFetching || busy} onClick={() => void versions.refetch()}>{t("Retry")}</button>}
    <label className="block">{t("File version")}<select className={control} value={item?.version_id ?? ""} disabled={busy || !versions.isSuccess}
      onChange={e => e.target.value ? change({ version_id: e.target.value, dataset_bindings: [] }) : onChange()}>
      <option value="">{t("Keep current data")}</option>{versions.data?.map(v => <option key={v.id} value={v.id}>{v.filename} · {new Date(v.created_at).toLocaleString()}</option>)}
    </select></label>
    {source.connector === "csv" && <details><summary>{t("Reading options for the new file")}</summary><div className="my-2 grid gap-3 sm:grid-cols-3">
      {source.connector === "csv" && <>
        <label>{t("Encoding")}<select className={control} value={options.encoding} disabled={busy} onChange={e => setEditedOptions({ ...options, encoding: e.target.value as ReadOptions["encoding"] })}>{["utf-8-sig", "cp1251", "utf-16"].map(v => <option key={v}>{v}</option>)}</select></label>
        <label>{t("Delimiter")}<select className={control} value={options.delimiter} disabled={busy} onChange={e => setEditedOptions({ ...options, delimiter: e.target.value as ReadOptions["delimiter"] })}>{[",", ";", "\t", "|"].map(v => <option key={v} value={v}>{v === "\t" ? t("Tab") : v}</option>)}</select></label>
      </>}
      <label>{t("Header row")}<input type="number" className={control} min={1} max={250000} disabled={busy} value={options.header_row} onChange={e => setEditedOptions({ ...options, header_row: Number(e.target.value) })} /></label>
    </div></details>}
    <label className="block">{t("Upload replacement file")}<input type="file" accept={source.connector === "csv" ? ".csv,.tsv" : ".xlsx,.xlsm"} disabled={busy}
      aria-label={t("Replacement file for {0}", { 0: source.name })} onChange={async event => {
        const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
        setBusy(true); onUploading?.(true); setError(null);
        try {
          const body = new FormData(); body.append("file", file); body.append("read_options", JSON.stringify(options));
          const version = await apiRequest<Version>(`/api/v1/sources/${source.id}/versions`, { method: "POST", body });
          await versions.refetch(); change({ version_id: version.id, dataset_bindings: [] });
        } catch (error) { setError(error); } finally { setBusy(false); onUploading?.(false); }
      }} /></label>
    {busy && <p role="status">{t("Uploading…")}</p>}{error || versions.error ? <p role="alert" className="text-danger">{errorText(error || versions.error)}</p> : null}
    {item && datasets.map(dataset => {
      const binding = item.dataset_bindings?.find(b => b.resource_id === dataset.resource_id);
      const target = binding?.target_resource_id ?? dataset.profile.resource_id;
      const incomingOptions = binding?.options ?? (source.connector === "csv" ? selected?.read_options : null) ?? dataset.profile.options ?? readOptions;
      const patchBinding = (patch: Partial<NonNullable<UpdateItem["dataset_bindings"]>[number]>) => change({ dataset_bindings: [
        ...(item.dataset_bindings ?? []).filter(b => b.resource_id !== dataset.resource_id),
        { resource_id: dataset.resource_id, target_resource_id: target, ...binding, ...patch },
      ] });
      return <fieldset key={dataset.id} disabled={busy || !versions.isSuccess} className="grid min-w-0 gap-3 rounded-lg border border-outline p-3 sm:grid-cols-2">
        <legend className="px-1 font-medium">{dataset.profile.name}</legend>
        <label>{t("Incoming table for {0}", { 0: dataset.profile.name })}<select className={control} value={selected?.resources?.some(r => r.id === target) ? target : ""}
          onChange={e => patchBinding({ target_resource_id: e.target.value, columns: [] })}>
          <option value="" disabled>{t("Select table")}</option>{selected?.resources?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select></label>
        <label>{t("Header row")}<input className={control} type="number" min={1} max={250000} disabled={busy || !!incomingOptions.cell_range}
          value={incomingOptions.header_row ?? 1}
          onChange={e => patchBinding({ options: { ...incomingOptions, header_row: Number(e.target.value) }, columns: [] })} /></label>
        {source.connector === "excel" && <label>{t("Excel cell range (optional)")}<input className={control} disabled={busy} maxLength={20} placeholder="B2:F100" value={incomingOptions.cell_range ?? ""}
          onChange={e => patchBinding({ options: { ...incomingOptions, cell_range: e.target.value || null }, columns: [] })} /></label>}
        {source.connector === "excel" && <p className="text-sm text-muted">{t("The range starts with the header. Leave empty to read the whole sheet using the header row setting.")}</p>}
        <details className="min-w-0 sm:col-span-2"><summary>{t("Additional reading settings")}</summary><div className="mt-3 grid gap-3 sm:grid-cols-3">
          {source.connector === "excel" && <label>{t("Number of header rows")}<input className={control} type="number" min={1} max={10} step={1} disabled={busy} value={incomingOptions.header_rows ?? 1}
            onChange={e => patchBinding({ options: { ...incomingOptions, header_rows: Number(e.target.value) }, columns: [] })} /></label>}
          <label>{t("Skip rows after headers")}<input className={control} type="number" min={0} max={250000} step={1} disabled={busy} value={incomingOptions.skip_data_rows ?? 0}
            onChange={e => patchBinding({ options: { ...incomingOptions, skip_data_rows: Number(e.target.value) }, columns: [] })} /></label>
          <label>{t("Exclude rows at the end")}<input className={control} type="number" min={0} max={250000} step={1} disabled={busy} value={incomingOptions.drop_tail_rows ?? 0}
            onChange={e => patchBinding({ options: { ...incomingOptions, drop_tail_rows: Number(e.target.value) }, columns: [] })} /></label>
        </div><p className="mt-2 text-sm text-muted">{t("Excluded rows do not enter the dataset. The original file stays unchanged.")}</p></details>
      </fieldset>;
    })}
    {item && <p className="text-sm text-muted">{t("This replaces all prepared tables from the file after checks. Current reports stay unchanged until apply.")}</p>}
  </section>;
}
