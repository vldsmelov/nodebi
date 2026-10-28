"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataStatePanel } from "@/components/ui/workspace";
import { AlignMeasuresConfiguration } from "@/features/workflow/AlignMeasuresConfiguration";
import { apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import { ReportDraftBoundary, useReportDraftAutosave, useReportDraftSession } from "./ReportDraftBoundary";
import type { AlignmentEditDraft } from "./report-draft";
import { ReportFormulaEditor } from "./ReportFormulaEditor";

type Edit = components["schemas"]["AlignmentEditRead"];
type Request = components["schemas"]["AlignmentEditRequest"];
export function AlignmentReportEditor({ projectId, visualizationId }: { projectId: string; visualizationId: string }) {
  return <ReportDraftBoundary key={`${projectId}:${visualizationId}`} projectId={projectId} target={visualizationId} mode="alignment-edit"><Editor projectId={projectId} visualizationId={visualizationId} /></ReportDraftBoundary>;
}
function Editor({ projectId, visualizationId }: { projectId: string; visualizationId: string }) {
  const { t, errorText, nodeName } = useI18n();
  const draft = useReportDraftSession();
  const [generation, setGeneration] = useState(0);
  const saved = useQuery({ queryKey: ["alignment-editor", projectId, visualizationId], queryFn: () => apiRequest<Edit>(`/api/v1/projects/${projectId}/alignment-reports/${visualizationId}`), retry: false, refetchOnMount: "always", refetchOnWindowFocus: false, refetchOnReconnect: false });
  const reload = async () => {
    if (saved.isFetching || !window.confirm(t("Discard unsaved changes?"))) return;
    const response = await saved.refetch();
    if (!response.error && draft.reset()) setGeneration(n => n + 1);
  };
  if (saved.isPending) return <DataStatePanel state="loading" />;
  if (saved.error) return <DataStatePanel state="error">{errorText(saved.error)}<Button onClick={() => void saved.refetch()}>{t("Retry")}</Button></DataStatePanel>;
  if (!saved.data) return null;
  const edit = saved.data;
  return <section className="space-y-4">
    <h1 className="text-3xl font-semibold">{t("Edit aligned calculation")}</h1>
    <div className="flex flex-wrap gap-4"><Button variant="outline" disabled={saved.isFetching} onClick={() => void reload()}>{t("Reload saved report")}</Button><Link className="inline-flex items-center text-accent underline" href={`/projects/${projectId}/workflow?workflow=${edit.workflow_id}&mode=fields`}>{t("Open calculation")}</Link></div>
    <p>{t("Both prepared input branches are preserved. Change input connections in the graph.")}</p>
    {edit.editable && edit.settings ? <fieldset disabled={saved.isFetching} className="min-w-0 border-0 p-0"><AlignmentEditForm key={generation} projectId={projectId} edit={edit} /></fieldset> : <DataStatePanel state="incomplete">{t(edit.reason ?? "This calculation is an advanced step. Edit it in the graph.")}</DataStatePanel>}
    <details><summary>{t("Calculation steps")}</summary><ol className="list-inside list-decimal">{edit.steps?.map(step => <li key={step.node_id}>{nodeName(step.type)} · {t(step.editable ? "Editable step" : "Preserved step")}</li>)}</ol></details>
  </section>;
}
function AlignmentEditForm({ projectId, edit }: { projectId: string; edit: Edit }) {
  const { t, cell, errorText } = useI18n();
  const draft = useReportDraftSession();
  const initial = draft.initial?.kind === "alignment-edit" ? draft.initial : undefined;
  const [requestId] = useState(() => initial?.requestId ?? crypto.randomUUID());
  const [settings, setSettings] = useState(initial?.settings ?? edit.settings!);
  const [rebind, setRebind] = useState(initial?.rebindFields ?? false);
  const [acknowledge, setAcknowledge] = useState(initial?.acknowledgeShared ?? false);
  const expectedToken = initial?.expectedToken ?? edit.expected_token;
  const root = `/api/v1/projects/${projectId}/alignment-reports/${edit.visualization_id}`;
  const body: Request = { request_id: requestId, expected_token: expectedToken, settings, rebind_fields: rebind, acknowledge_shared: acknowledge };
  const [error, setError] = useState<Error | null>(null);
  const feedback = { onMutate: () => setError(null), onError: (failure: Error) => setError(failure) };
  const fields = useMutation({ ...feedback, mutationFn: (request: Request) => apiRequest<components["schemas"]["AlignmentReportFields"]>(`${root}/fields`, { method: "POST", body: JSON.stringify(request) }) });
  const preview = useMutation({ ...feedback, mutationFn: (request: Request) => apiRequest<components["schemas"]["AlignmentReportPreview"]>(`${root}/preview`, { method: "POST", body: JSON.stringify(request) }) });
  const current = !preview.isPending && !preview.error && preview.data && JSON.stringify(preview.variables) === JSON.stringify(body) ? preview.data : null;
  const sameInputs = fields.data && !fields.error && fields.variables?.expected_token === expectedToken && JSON.stringify(fields.variables.settings.alignment) === JSON.stringify(settings.alignment);
  const previewFields = !preview.error && preview.variables?.expected_token === expectedToken && JSON.stringify(preview.variables.settings.alignment) === JSON.stringify(settings.alignment) ? preview.data?.formula_fields : undefined;
  const usePreviewFields = previewFields && (!sameInputs || preview.submittedAt > fields.submittedAt);
  const checked = usePreviewFields ? previewFields : sameInputs ? fields.data : undefined;
  const checkedFormulas = usePreviewFields ? preview.variables?.settings.formulas : fields.variables?.settings.formulas;
  const formulas = settings.formulas ?? [];
  const outputs = checked ? Object.fromEntries(formulas.flatMap((f, index) => {
    const output = checked.formula_outputs?.[f.node_id];
    return output && JSON.stringify(checkedFormulas?.slice(0, index + 1)) === JSON.stringify(formulas.slice(0, index + 1)) ? [[f.node_id, output]] : [];
  })) : {};
  const busy = fields.isPending || preview.isPending;
  const state: AlignmentEditDraft = { kind: "alignment-edit", requestId, visualizationId: edit.visualization_id, expectedToken, settings, rebindFields: rebind, acknowledgeShared: acknowledge };
  useReportDraftAutosave(state, !!initial || rebind || acknowledge || JSON.stringify(settings) !== JSON.stringify(edit.settings));
  return <fieldset disabled={busy} className="space-y-4 rounded-xl border border-outline bg-panel p-5">
    <label className="block">{t("Report name")}<input className="form-control" value={settings.name} onChange={e => setSettings({ ...settings, name: e.target.value })} /></label>
    <AlignMeasuresConfiguration config={settings.alignment} inputColumns={{ left: edit.left_columns ?? [], right: edit.right_columns ?? [] }} onChange={value => setSettings({ ...settings, alignment: value as Request["settings"]["alignment"] })} />
    {edit.widget_count > 1 && <label className="flex gap-2"><input type="checkbox" checked={acknowledge} onChange={e => setAcknowledge(e.target.checked)} />{t("Confirm updating all widgets that use this visualization.")}</label>}
    <Button variant="outline" onClick={() => fields.mutate(body)}>{t("Check formula fields")}</Button>
    <ReportFormulaEditor scope="alignment" formulas={formulas} columns={checked?.columns ?? null} rowOutputs={outputs} onChange={value => setSettings({ ...settings, formulas: value })} />
    <label className="flex gap-2"><input type="checkbox" checked={rebind} onChange={e => setRebind(e.target.checked)} />{t("Update visualization field bindings")}</label>
    <p className="text-sm text-muted">{t("Confirm updating table fields after changing grouping or measures.")}</p>
    {error && <DataStatePanel state="error" title="Report check failed" focusOnMount>{errorText(error)}</DataStatePanel>}
    <div className="flex gap-3"><Button disabled={!settings.name.trim()} onClick={() => preview.mutate(body)}>{t("Preview calculation")}</Button><Button disabled={!current} onClick={() => draft.save(body, state)}>{t("Save report")}</Button></div>
    {preview.isPending && <DataStatePanel state="loading" />}
    {!preview.isPending && !preview.error && preview.data && !current && <DataStatePanel state="previous" title="Preview is out of date. Run the calculation again." />}
    {current && current.rows.length === 0 && <DataStatePanel state="empty" title="The result is empty.">{t("Calculation completed with no rows. Check source data and filters.")}</DataStatePanel>}
    {current && <div className="overflow-auto"><p role="status">{t("Full alignment: {0} matched, {1} only left, {2} only right. Counts cover all rows.", { 0: cell(current.alignment_diagnostics.matched_rows), 1: cell(current.alignment_diagnostics.left_only_rows), 2: cell(current.alignment_diagnostics.right_only_rows) })}</p><p>{t("All rows are calculated on the server. Preview shows up to 50 results.")}</p><table className="data-table"><thead><tr>{current.columns.map(c => <th key={c.column_id}>{c.display_name}</th>)}</tr></thead><tbody>{current.rows.map((row, i) => <tr key={i}>{current.columns.map(c => <td key={c.column_id}>{cell(row[c.engine_name], c.logical_type)}</td>)}</tr>)}</tbody></table></div>}
  </fieldset>;
}
