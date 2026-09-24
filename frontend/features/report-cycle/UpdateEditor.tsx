"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { listSources } from "@/features/data-sources/api";
import { getWorkflow, listWorkflows } from "@/features/workflow/api";
import type { components } from "@/lib/api-schema";
import { CheckResults } from "./CheckResults";
import type { Update, UpdateItem, Version } from "./api";

import { useDirtyGuard } from "./useDirtyGuard";

const control = "w-full rounded border border-outline bg-control p-2";
const button = "rounded border border-outline px-3 py-2 disabled:opacity-40";
type SheetProfile = { sheet_name: string; layout: components["schemas"]["WorksheetLayout"] };
export function UpdateEditor({ row, busy: running, refresh, currentToken, onDirty }: { onDirty: (dirty: boolean) => void; row: Update; busy: boolean; currentToken?: string; refresh: () => Promise<unknown> }) {
  const { t, errorText, cell } = useI18n();
  const [name, setName] = useState(row.name), [items, setItems] = useState<UpdateItem[]>(row.items);
  const [baseRevision, setBaseRevision] = useState(row.revision);
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null), [acknowledge, setAcknowledge] = useState(false);
  const sources = useQuery({ queryKey: ["sources", row.project_id], queryFn: () => listSources(row.project_id) });
  const flows = useQuery({ queryKey: ["update-source-profiles", row.project_id], queryFn: async () => Promise.all((await listWorkflows(row.project_id)).map(flow => getWorkflow(flow.id))) });
  const matches = name === row.name && JSON.stringify(items) === JSON.stringify(row.items);
  const closed = !["draft", "checked"].includes(row.status);
  useDirtyGuard(!matches);
  useEffect(() => { onDirty(!matches); return () => onDirty(false); }, [matches, onDirty]);
  async function act(action: () => Promise<unknown>) { setBusy(true); setError(null); try { await action(); await refresh(); } catch (error) { setError(error); } finally { setBusy(false); } }
  const beginEdit = () => { if (matches) setBaseRevision(row.revision); };
  async function save() {
    const saved = await apiRequest<Update>(`/api/v1/updates/${row.id}`, { method: "PUT", body: JSON.stringify({ expected_revision: matches ? row.revision : baseRevision, name, items }) });
    setBaseRevision(saved.revision); setItems(saved.items); return saved;
  }
  return <section className="rounded-xl border border-outline bg-panel p-5">
    <h2 className="text-xl">{t("Data update")}</h2>
    <p className="my-2 text-sm text-muted">{t("Check the new books before applying. Current dashboards keep their previous data.")}</p>
    {error || sources.error ? <p role="alert" className="text-danger">{errorText(error || sources.error)}</p> : null}
    {error ? <button className={button} onClick={() => { if (window.confirm(t("Discard unsaved changes?"))) { setName(row.name); setItems(row.items); setBaseRevision(row.revision); setError(null); } }}>{t("Reload saved update")}</button> : null}
    {!matches && <p role="status" className="my-2 text-accent">{t("Unsaved update settings")}</p>}
    <fieldset disabled={busy || running || closed} className="space-y-4 disabled:opacity-70">
      <label className="block">{t("Update name")}<input className={control} value={name} onChange={e => { beginEdit(); setName(e.target.value); }} /></label>
      {sources.data?.map(source => {
        const item = items.find(item => item.source_id === source.id);
        const profiles = flows.data?.flatMap(flow => flow.nodes.filter(node => node.config?.source_id === source.id).map(node => ({ sheet_name: String(node.config?.sheet_name ?? ""), layout: { header_row: Number(node.config?.header_row ?? 1), header_rows: Number(node.config?.header_rows ?? 1), include_row_number: node.config?.include_row_number === true, skip_data_rows: Number(node.config?.skip_data_rows ?? 0), drop_tail_rows: Number(node.config?.drop_tail_rows ?? 0) } }))) ?? [];
        return <SourceVersionPicker key={source.id} sourceId={source.id} name={source.name} item={item} profiles={profiles} onChange={value => { beginEdit(); setAcknowledge(false); setItems(current => value ? [...current.filter(v => v.source_id !== source.id), value] : current.filter(v => v.source_id !== source.id)); }} />;
      })}
      {row.check?.profiles?.map((profile, index) => {
        const item = items.find(item => item.source_id === profile.source_id);
        if (!item) return null;
        const binding = item.bindings?.find(binding => binding.sheet_name === profile.sheet_name && JSON.stringify(binding.layout) === JSON.stringify(profile.layout));
        return <details key={index} open className="rounded border border-outline p-3"><summary>{profile.sheet_name} · {t("Rows: {0} → {1}", { 0: profile.old_rows, 1: profile.new_rows })}</summary>
          <p className="my-2 text-sm text-muted">{t("Confirm field correspondence. Types are never converted silently.")}</p>
          {[{ label: "Previous records", rows: profile.old_examples, columns: profile.old_columns }, { label: "Incoming records", rows: profile.new_examples, columns: profile.new_columns }].map(sample => <details key={sample.label}><summary>{t(sample.label)}</summary><div className="max-h-48 overflow-auto"><table className="text-sm"><thead><tr>{sample.columns.map(column => <th key={column.column_id} className="p-2">{column.display_name}</th>)}</tr></thead><tbody>{sample.rows?.map((row, i) => <tr key={i}>{sample.columns.map(column => <td key={column.column_id} className="p-2">{cell(row[column.engine_name])}</td>)}</tr>)}</tbody></table></div></details>)}
          {profile.old_columns.map(column => <label key={column.column_id} className="my-2 grid gap-2 sm:grid-cols-2"><span>{column.display_name} · {t(column.logical_type)}</span><select aria-label={t("Incoming field for {0}", { 0: column.display_name })} className={control} value={(binding?.columns?.length ? binding.columns : profile.suggestions).find(pair => pair.logical_id === column.column_id)?.physical_id ?? ""} onChange={event => {
            beginEdit();
            const columns = [...(binding?.columns?.length ? binding.columns : profile.suggestions).filter(pair => pair.logical_id !== column.column_id), { logical_id: column.column_id, physical_id: event.target.value }].filter(pair => pair.physical_id);
            const updated = { sheet_name: profile.sheet_name, target_sheet: profile.target_sheet, layout: profile.layout, columns };
            setItems(items.map(value => value.source_id === item.source_id ? { ...value, bindings: [...(value.bindings ?? []).filter(entry => !(entry.sheet_name === profile.sheet_name && JSON.stringify(entry.layout) === JSON.stringify(profile.layout))), updated] } : value)); setAcknowledge(false);
          }}><option value="">{t("Select field")}</option>{profile.new_columns.map(incoming => <option key={incoming.column_id} value={incoming.column_id}>{incoming.display_name} · {t(incoming.logical_type)}</option>)}</select></label>)}
        </details>;
      })}
      <div className="flex flex-wrap gap-3"><button className={button} disabled={!items.length || !name.trim()} onClick={() => void act(save)}>{t("Save update draft")}</button><button className={button} disabled={!items.length || !name.trim()} onClick={() => void act(async () => { const saved = matches ? row : await save(); await apiRequest(`/api/v1/updates/${row.id}/check`, { method: "POST", body: JSON.stringify({ expected_revision: saved.revision }) }); })}>{t("Check new data")}</button></div>
    </fieldset>
    {matches && (closed || row.check?.token === currentToken) ? <CheckResults value={row.check} projectId={row.project_id} /> : <p className="my-3 text-muted">{t("Run checks again after changing the draft.")}</p>}
    {!closed && <><label className="my-4 flex gap-2"><input type="checkbox" checked={acknowledge} onChange={e => setAcknowledge(e.target.checked)} />{t("I reviewed the warnings")}</label><div className="flex flex-wrap gap-3"><button className={`${button} bg-primary text-on-primary`} disabled={busy || running || !matches || row.status !== "checked" || row.check?.token !== currentToken || !!row.check?.issues?.some(issue => issue.severity === "error") || (!!row.check?.issues?.length && !acknowledge)} onClick={() => void act(() => apiRequest(`/api/v1/updates/${row.id}/apply`, { method: "POST", body: JSON.stringify({ expected_revision: row.revision, acknowledge_warnings: acknowledge }) }))}>{t("Apply data update")}</button><button className={button} disabled={busy || running} onClick={() => { if (window.confirm(t("Discard this data update?"))) void act(() => apiRequest(`/api/v1/updates/${row.id}/cancel`, { method: "POST", body: JSON.stringify({ expected_revision: row.revision }) })); }}>{t("Discard update")}</button></div></>}
    {row.status === "applied" && <button className={button} disabled={busy || running} onClick={() => void act(() => apiRequest(`/api/v1/updates/${row.id}/rollback`, { method: "POST", body: JSON.stringify({ expected_revision: row.revision }) }))}>{t("Prepare rollback")}</button>}
  </section>;
}

function SourceVersionPicker({ sourceId, name, item, profiles, onChange }: { sourceId: string; name: string; item?: UpdateItem; profiles: SheetProfile[]; onChange: (item?: UpdateItem) => void }) {
  const { t, errorText } = useI18n();
  const versions = useQuery({ queryKey: ["source-versions", sourceId], queryFn: () => apiRequest<Version[]>(`/api/v1/sources/${sourceId}/versions`) });
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  const change = (patch: Partial<UpdateItem>) => onChange({ source_id: sourceId, version_id: item?.version_id || "", mode: "replace", period: "", baseline_period: "", ...item, ...patch });
  return <section className="space-y-3 rounded border border-outline p-3"><h3 className="font-medium">{name}</h3>
    <label className="block">{t("Workbook version")}<select className={control} value={item?.version_id ?? ""} onChange={e => e.target.value ? change({ version_id: e.target.value, bindings: [] }) : onChange()}><option value="">{t("Keep current data")}</option>{versions.data?.map(version => <option key={version.id} value={version.id}>{version.filename} · {new Date(version.created_at).toLocaleString()}</option>)}</select></label>
    <label className="block">{t("Upload new workbook version")}<input aria-label={t("New workbook for {0}", { 0: name })} type="file" accept=".xlsx,.xlsm" disabled={busy} onChange={async event => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; setBusy(true); setError(null); try { const body = new FormData(); body.append("file", file); const version = await apiRequest<Version>(`/api/v1/sources/${sourceId}/versions`, { method: "POST", body }); await versions.refetch(); change({ version_id: version.id, bindings: [] }); } catch (error) { setError(error); } finally { setBusy(false); } }} /></label>
    {busy && <p role="status">{t("Uploading…")}</p>}{error || versions.error ? <p role="alert" className="text-danger">{errorText(error || versions.error)}</p> : null}
    {item && profiles.filter((profile, index, all) => all.findIndex(other => JSON.stringify(other) === JSON.stringify(profile)) === index).map(profile => {
      const same = (binding: NonNullable<UpdateItem["bindings"]>[number]) => binding.sheet_name === profile.sheet_name && JSON.stringify(binding.layout) === JSON.stringify(profile.layout);
      const binding = item.bindings?.find(same);
      const sheets = versions.data?.find(version => version.id === item.version_id)?.sheet_names ?? [];
      const selected = binding?.target_sheet ?? profile.sheet_name;
      return <label className="block" key={JSON.stringify(profile)}>{t("Incoming sheet for {0}", { 0: profile.sheet_name })}<select className={control} value={sheets.includes(selected) ? selected : ""} onChange={e => change({ bindings: [...(item.bindings ?? []).filter(entry => !same(entry)), { ...profile, target_sheet: e.target.value, columns: [] }] })}><option value="" disabled>{t("Worksheet")}</option>{sheets.map(sheet => <option key={sheet}>{sheet}</option>)}</select></label>;
    })}
    {item && <><label className="block">{t("Update mode")}<select className={control} value={item.mode ?? "replace"} onChange={e => change({ mode: e.target.value as UpdateItem["mode"] })}><option value="replace">{t("Replace current dataset")}</option><option value="append">{t("Add a period")}</option><option value="replace_period">{t("Replace a period")}</option></select></label>{item.mode && item.mode !== "replace" && <><label className="block">{t("Incoming period label")}<input className={control} value={item.period ?? ""} onChange={e => change({ period: e.target.value })} /></label><label className="block">{t("Existing period label (first append only)")}<input className={control} value={item.baseline_period ?? ""} onChange={e => change({ baseline_period: e.target.value })} /></label><p className="text-sm text-muted">{t("Period labels do not create dates. Rows are appended without deduplication.")}</p></>}</>}
  </section>;
}
