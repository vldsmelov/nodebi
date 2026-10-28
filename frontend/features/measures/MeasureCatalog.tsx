"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataStatePanel } from "@/components/ui/workspace";
import { useDirtyGuard } from "@/features/report-cycle/useDirtyGuard";
import { apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";

type Entry = components["schemas"]["MeasureEntry"];
type Definition = components["schemas"]["MeasureDefinition"];
type Input = components["schemas"]["ReportInputRead"];
const empty = (): Definition => ({ id: crypto.randomUUID(), name: "", description: "", column_id: "", grain_column_ids: [] });

export function MeasureCatalog({ projectId }: { projectId: string }) {
  const { t, errorText } = useI18n();
  const client = useQueryClient();
  const root = `/api/v1/projects/${projectId}`;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [definition, setDefinition] = useState<Definition>(empty);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const catalog = useQuery({ queryKey: ["measures", projectId], queryFn: () => apiRequest<components["schemas"]["MeasureList"]>(`${root}/measures`) });
  const inputs = useQuery({ queryKey: ["report-inputs", projectId], queryFn: () => apiRequest<components["schemas"]["ReportInputList"]>(`${root}/report-builder/inputs`), enabled: open });
  const input = useQuery({ queryKey: ["measure-source", projectId, selected], queryFn: () => apiRequest<Input>(`${root}/report-builder/inputs/${selected}`), enabled: open && !!selected, refetchOnWindowFocus: false, retry: false });
  const saved = useMutation({ mutationFn: () => apiRequest<Entry>(`${root}/measures/${selected}`, { method: "PUT", body: JSON.stringify({ expected_token: input.data?.expected_token, definition }) }), onSuccess: () => { setDirty(false); setEditing(true); void client.invalidateQueries({ queryKey: ["measures", projectId] }); void input.refetch(); } });
  const removed = useMutation({ mutationFn: (entry: Entry) => apiRequest<void>(`${root}/measures/${entry.workflow_id}/${entry.publication_id}/${entry.definition.id}?expected_token=${catalog.data?.expected_token}`, { method: "DELETE" }), onSuccess: () => { void catalog.refetch(); if (selected) void input.refetch(); } });
  const busy = saved.isPending || removed.isPending || input.isFetching;
  useDirtyGuard(dirty || saved.isPending);
  const update = (value: Partial<Definition>) => { setDefinition(current => ({ ...current, ...value })); setDirty(true); };
  const edit = (entry?: Entry) => {
    if (dirty && !window.confirm(t("Discard unsaved changes?"))) return;
    setOpen(true); setEditing(!!entry); setSelected(entry ? `${entry.workflow_id}/${entry.publication_id}` : ""); setDefinition(entry?.definition ?? empty()); setDirty(false); saved.reset();
  };
  return <section className="space-y-4 rounded-xl border border-outline bg-panel p-5">
    <h2 className="text-xl font-semibold">{t("Reusable measures")}</h2>
    <Link className="inline-flex min-h-10 items-center text-accent underline" href={`/projects/${projectId}/build?alignment=1`}>{t("Create alignment report")}</Link>
    <p className="text-sm text-muted">{t("A measure references a calculated field and its grain. Reports reuse prepared values without summing ratios or averages again.")}</p>
    {(catalog.error || saved.error || removed.error) && <DataStatePanel state="error">{errorText(catalog.error || saved.error || removed.error)}</DataStatePanel>}
    {catalog.isPending ? <DataStatePanel state="loading" /> : <ul className="space-y-3">{catalog.data?.items.map(entry => <li key={`${entry.workflow_id}/${entry.definition.id}`} className="space-y-2 rounded border border-outline p-3">
      <h3 className="font-semibold">{entry.definition.name}</h3><p className="text-sm text-muted">{entry.publication_name} · {entry.workflow_name}</p>{entry.definition.description && <p className="text-sm">{entry.definition.description}</p>}
      <div className="flex flex-wrap gap-3"><Link className="text-accent underline" href={`/projects/${projectId}/build?measure=${entry.definition.id}&workflow=${entry.workflow_id}&publication=${entry.publication_id}`}>{t("Create report from measure")}</Link><Button variant="outline" disabled={busy} onClick={() => edit(entry)}>{t("Edit measure description")}</Button><Button variant="outline" disabled={busy || catalog.isFetching} onClick={() => { if (window.confirm(t("Remove this definition from the catalog? Existing reports keep their calculation and grain checks."))) removed.mutate(entry); }}>{t("Remove measure definition")}</Button></div>
    </li>)}</ul>}
    {!catalog.isPending && !catalog.data?.items.length && <p className="text-sm text-muted">{t("No reusable measures yet.")}</p>}
    <Button variant="outline" disabled={busy} onClick={() => edit()}>{t("Define reusable measure")}</Button><Button variant="outline" disabled={busy || catalog.isFetching} onClick={() => void catalog.refetch()}>{t("Reload measure catalog")}</Button>
    {open && <fieldset disabled={busy} className="space-y-3 border-t border-outline pt-4"><legend>{t("Measure definition")}</legend>
      <label className="block">{t("Prepared calculation result")}<select className="form-control" disabled={editing} value={selected} onChange={e => { setSelected(e.target.value); setDefinition({ ...empty(), name: definition.name, description: definition.description }); setDirty(true); }}><option value="">{t("Select a prepared result")}</option>{inputs.data?.items.map(item => <option key={`${item.workflow_id}/${item.publication_id}`} value={`${item.workflow_id}/${item.publication_id}`} disabled={!item.available}>{item.name} · {item.workflow_name}</option>)}</select></label>
      {(inputs.error || input.error) && <DataStatePanel state="error">{errorText(inputs.error || input.error)}</DataStatePanel>}
      <label className="block">{t("Measure name")}<input className="form-control" value={definition.name} onChange={e => update({ name: e.target.value })} /></label>
      <label className="block">{t("Measure description")}<textarea className="form-control" value={definition.description ?? ""} onChange={e => update({ description: e.target.value })} /></label>
      <label className="block">{t("Calculated value field")}<select className="form-control" disabled={editing} value={definition.column_id} onChange={e => update({ column_id: e.target.value, grain_column_ids: (definition.grain_column_ids ?? []).filter(id => id !== e.target.value) })}><option value="">{t("Select field")}</option>{input.data?.columns.filter(c => ["integer", "float", "decimal"].includes(c.logical_type)).map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}</select></label>
      <fieldset disabled={editing}><legend>{t("Grain: one row per combination")}</legend><p className="text-sm text-muted">{t("Select all fields identifying one prepared row. Leave empty only for a single total. The server checks every row.")}</p>{input.data?.columns.filter(c => c.column_id !== definition.column_id).map(c => <label className="flex min-h-10 items-center gap-2" key={c.column_id}><input type="checkbox" checked={(definition.grain_column_ids ?? []).includes(c.column_id)} onChange={e => update({ grain_column_ids: e.target.checked ? [...(definition.grain_column_ids ?? []), c.column_id] : (definition.grain_column_ids ?? []).filter(id => id !== c.column_id) })} />{c.display_name}</label>)}</fieldset>
      <Button disabled={!input.data || !!input.error || !definition.name.trim() || !definition.column_id || (definition.grain_column_ids?.length ?? 0) > 8} onClick={() => saved.mutate()}>{t("Check and save measure")}</Button><Button variant="outline" disabled={!selected} onClick={() => void input.refetch()}>{t("Reload input fields")}</Button>
      {saved.isSuccess && !dirty && <p role="status">{t("Measure definition saved. Calculations were not copied.")}</p>}
    </fieldset>}
  </section>;
}
