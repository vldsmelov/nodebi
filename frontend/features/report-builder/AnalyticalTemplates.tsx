"use client";

import Link from "next/link";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest, ApiError } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import type { ResolvedColumn } from "@/features/workflow/types";

type Settings = components["schemas"]["StatisticalSettings"];
type Family = "analytical" | "report";
type FamilySettings = { analytical: Settings; report: components["schemas"]["ReportSettings"] };
type Capture = components["schemas"]["TemplateCapture"];
type Source = Pick<components["schemas"]["TemplatePrepare"], "source_id" | "resource_id" | "expected_snapshot_id" | "published_input">;
const notice = "Templates copy the saved analytical calculation and filters only. Prepare the same row meaning and units; source data, manual preparation and appearance are not copied.";
const reportNotice = "Report templates copy measures, formulas, filters and chart bindings. Source data and manual preparation are not copied. Confirm the same row meaning and units.";

export function AnalyticalTemplatePicker<F extends Family = "analytical">({ projectId, requestId, source, columns, ready, onApply, onBusyChange, family }: { projectId: string; requestId: string; source: Source | null; columns: ResolvedColumn[]; ready: boolean; onApply: (settings: FamilySettings[F]) => void; onBusyChange?: (busy: boolean) => void; family?: F }) {
  const { t, errorText } = useI18n();
  const [open, setOpen] = useState(false), [selected, setSelected] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({}), [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>();
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; onBusyChange?.(false); }; }, [onBusyChange]);
  const catalog = `${family ?? "analytical"}-templates`;
  const root = `/api/v1/projects/${projectId}/${catalog}`;
  const list = useQuery({ queryKey: [catalog, projectId], queryFn: () => apiRequest<components["schemas"]["TemplateList"] | components["schemas"]["ReportTemplateList"]>(root), enabled: open, retry: false });
  const template = list.data?.items.find(item => item.id === selected);
  const compatible = (field: NonNullable<typeof template>["fields"][number], column: ResolvedColumn) => column.logical_type === field.logical_type && (!field.unit || column.metadata?.unit === field.unit) && (!field.currency || column.metadata?.currency === field.currency);
  const complete = template && template.fields.every(f => columns.some(c => c.column_id === mapping[f.key] && compatible(f, c)));
  const apply = async () => {
    if (!template || !source || !ready || busy) return;
    setBusy(true); onBusyChange?.(true); setError(undefined);
    try {
      const settings = await apiRequest<FamilySettings[F]>(`${root}/${template.id}/prepare`, { method: "POST", body: JSON.stringify({ ...source, request_id: requestId, mapping, acknowledge_grain: acknowledged, expected_template_revision: template.revision }) });
      if (active.current) { onApply(settings); setOpen(false); }
    } catch (caught) { if (active.current) setError(caught); }
    finally { if (active.current) { setBusy(false); onBusyChange?.(false); } }
  };
  return <section className="space-y-3 rounded border border-outline p-3">
    <Link href={`/projects/${projectId}/templates`} className="mr-3 inline-block text-sm text-accent underline">{t("Template catalog")}</Link>
    <Button variant="outline" onClick={() => setOpen(!open)} aria-expanded={open}>{t(family === "report" ? "Use report template" : "Use analytical template")}</Button>
    {open && <fieldset disabled={busy} className="min-w-0 space-y-3">
      <p className="text-sm text-muted">{t(family === "report" ? reportNotice : notice)}</p>
      <p className="text-sm text-muted">{t("Loading replaces the current calculation settings and filters. Preview again before saving.")}</p>
      {list.isFetching && <p role="status">{t("Loading…")}</p>}
      {list.error && <p role="alert">{errorText(list.error)} <Button variant="outline" onClick={() => void list.refetch()}>{t("Retry")}</Button></p>}
      {!list.isFetching && !list.error && list.data?.items.length === 0 && <p>{t(family === "report" ? "No report templates yet. Save one from a report calculation." : "No analytical templates yet. Save one from a report calculation.")}</p>}
      <label className="block">{t(family === "report" ? "Report template" : "Analytical template")}<select className="form-control" value={selected} onChange={e => { setSelected(e.target.value); setMapping({}); setAcknowledged(false); setError(undefined); }}><option value="">{t("Select a template")}</option>{list.data?.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {template && <><p className="text-sm">{t("Expected row meaning")}: {template.input_grain}</p>
        {template.fields.map(field => <label className="block" key={field.key}>{t("Map field {0}", { 0: field.name })} <span className="text-xs text-muted">({field.logical_type}{field.unit ? ` · ${field.unit}` : ""}{field.currency ? ` · ${field.currency}` : ""})</span><select className="form-control" aria-label={t("Map field {0}", { 0: field.name })} value={mapping[field.key] ?? ""} onChange={e => setMapping({ ...mapping, [field.key]: e.target.value })}><option value="">{t("Select field")}</option>{columns.filter(c => compatible(field, c)).map(column => <option key={column.column_id} value={column.column_id} disabled={Object.entries(mapping).some(([key, value]) => key !== field.key && value === column.column_id)}>{column.display_name}</option>)}</select></label>)}
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />{t("The selected data has the expected row meaning and units")}</label>
        <Button disabled={!ready || !complete || !acknowledged || list.isFetching || !!list.error} onClick={() => void apply()}>{t("Load template settings")}</Button>
      </>}
      {error ? <p role="alert">{errorText(error)} <Button variant="outline" onClick={() => { setSelected(""); setMapping({}); setAcknowledged(false); setError(undefined); void list.refetch(); }}>{t("Reload template list")}</Button></p> : null}
    </fieldset>}
  </section>;
}

export function TemplateCapturePanel({ projectId, visualizationId, family = "analytical" }: { projectId: string; visualizationId: string; family?: Family }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return <section className="space-y-3 rounded border border-outline bg-panel p-3"><Button variant="outline" onClick={() => setOpen(true)}>{t("Save calculation template")}</Button>{open && <TemplateCaptureForm projectId={projectId} visualizationId={visualizationId} family={family} />}</section>;
}

function TemplateCaptureForm({ projectId, visualizationId, family }: { projectId: string; visualizationId: string; family: Family }) {
  const { t, errorText } = useI18n(); const client = useQueryClient();
  const scope = `nodebi:${family === "report" ? "report-template-capture" : "template-capture"}:${projectId}:${visualizationId}`;
  const [recovery] = useState(() => {
    try {
      const raw = sessionStorage.getItem(scope); if (!raw) return {};
      if (raw.length > 12000) throw new Error("Invalid template recovery");
      const value = JSON.parse(raw) as Capture;
      if (value.visualization_id !== visualizationId || ![value.request_id, value.expected_token, value.name, value.input_grain].every(v => typeof v === "string")) throw new Error("Invalid template recovery");
      return { pending: value };
    } catch { return { error: true }; }
  });
  const [pending, setPending] = useState<Capture | undefined>(recovery.pending);
  const [name, setName] = useState(recovery.pending?.name ?? ""), [grain, setGrain] = useState(recovery.pending?.input_grain ?? "");
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false), [error, setError] = useState<unknown>();
  const [storageError, setStorageError] = useState(!!recovery.error);
  const active = useRef(false);
  const saved = useQuery({ queryKey: [family === "report" ? "report-editor" : "statistical-editor", projectId, visualizationId], queryFn: () => apiRequest<components["schemas"]["StatisticalEditRead"] | components["schemas"]["ReportEditRead"]>(`/api/v1/projects/${projectId}/${family === "report" ? "report-builder" : "statistical-reports"}/${visualizationId}`), enabled: !pending && !done, retry: false, refetchOnWindowFocus: false });
  const clear = () => { try { sessionStorage.removeItem(scope); setStorageError(false); } catch { setStorageError(true); } };
  const send = async () => {
    if (active.current || (!pending && (!saved.data?.editable || !name.trim() || !grain.trim()))) return;
    const body = pending ?? { request_id: crypto.randomUUID(), visualization_id: visualizationId, expected_token: saved.data!.expected_token, name: name.trim(), input_grain: grain.trim() };
    active.current = true; setBusy(true); setPending(body); setError(undefined);
    try { sessionStorage.setItem(scope, JSON.stringify(body)); } catch { setStorageError(true); }
    try {
      await apiRequest(`/api/v1/projects/${projectId}/${family}-templates`, { method: "POST", body: JSON.stringify(body) });
      clear(); setPending(undefined); setDone(true);
      void client.invalidateQueries({ queryKey: [`${family}-templates`, projectId] });
    } catch (caught) {
      setError(caught);
      if (caught instanceof ApiError && [400, 404, 409, 410, 422].includes(caught.status)) { clear(); setPending(undefined); void saved.refetch(); }
    } finally { active.current = false; setBusy(false); }
  };
  if (done) return <p role="status">{t(family === "report" ? "Template saved. Use it in Create report. Reload the saved report before further calculation edits." : "Template saved. Use it in Create analytical report. Reload the saved report before further calculation edits.")}</p>;
  return <div className="space-y-3">
    <p className="text-sm text-muted">{t(family === "report" ? reportNotice : notice)}</p>
    {storageError && <p role="alert">{t("Local template recovery is unavailable. Keep this page open until saving is confirmed.")}</p>}
    {!pending && saved.error && <p role="alert">{errorText(saved.error)} <Button onClick={() => void saved.refetch()}>{t("Retry")}</Button></p>}
    {!pending && saved.data && !saved.data.editable && <p>{t(saved.data.reason ?? "This calculation is an advanced step. Edit it in the graph.")}</p>}
    <fieldset disabled={!!pending || busy} className="space-y-3">
      <label className="block">{t("Template name")}<input className="form-control" maxLength={200} value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="block">{t("Expected row meaning")}<textarea className="form-control" maxLength={500} value={grain} onChange={e => setGrain(e.target.value)} /></label>
    </fieldset>
    {error ? <p role="alert">{errorText(error)}</p> : null}
    <Button disabled={busy || (!pending && (!saved.data?.editable || saved.isFetching || !!saved.error || !name.trim() || !grain.trim()))} onClick={() => void send()}>{t(pending ? "Retry template save" : "Save template")}</Button>
  </div>;
}
