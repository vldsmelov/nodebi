"use client";
import { useEffect, useId, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { ReportFields } from "./ReportFields";
import { ApiError, apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { components } from "@/lib/api-schema";
import { getWorkflow, listWorkflows } from "@/features/workflow/api";
import { VisualizationConfiguration } from "@/features/workflow/VisualizationConfiguration";
import { VisualizationResultView } from "./VisualizationView";
import { chartSetupHints, chartPurpose } from "./authoring-guidance";
import { appearancePreview, executionConfig } from "./editor-preview";
import { basicInput } from "./basic-input";
import type { Visualization, VisualizationResult } from "./api";
import { isVolatileDraft, writeDocumentDraft, removeDocumentDraft, volatileDraftNotice } from "@/features/workspace/document-drafts";
import { useOutsideLinkGuard } from "@/features/workspace/useOutsideLinkGuard";
import { draftStorageError, readVisualizationDraft, visualizationDraftKey, type VisualizationDraft, type VisualizationSaveAttempt } from "./visualization-draft";

export type EditorHandle = { leave: (action: () => void) => void };
export type DraftPreview = { result?: VisualizationResult; loading?: boolean; error?: unknown; message?: string };
export type VisualizationEditorProps = {
  fieldsHost?: HTMLElement | null;
  draftScope?: string;
  projectId: string; visualization?: Visualization; initialSelection?: string; copy?: boolean;
  close: () => void; onCreated?: (value: Visualization) => void;
  embedded?: boolean; placement?: ReactNode; context?: components["schemas"]["ViewContext"];
  onPreview?: (preview: DraftPreview) => void; onCopy?: (value: Visualization) => void;
  onBusyChange?: (busy: boolean) => void; blocked?: boolean;
  editorRef?: Ref<EditorHandle>;
};

export function VisualizationEditor({ projectId, visualization, initialSelection, copy = false, close, onCreated, embedded = false, placement, context, onPreview, onCopy, onBusyChange, blocked = false, editorRef, fieldsHost, draftScope }: VisualizationEditorProps) {
  const { t, nodeName, errorText } = useI18n(); const client = useQueryClient();
  const tabId = useId();
  const [base, setBase] = useState(visualization);
  const root = useRef<HTMLDivElement>(null), settled = useRef<string | null>(null);
  const ownsDraft = useRef(false);
  const [editRevision, setEditRevision] = useState(visualization?.revision ?? 1);
  const [restored, setRestored] = useState(false);
  const draftKey = visualizationDraftKey(projectId, visualization?.id, copy, draftScope);
  const [recovery, setRecovery] = useState<{ draft: VisualizationDraft | null; error?: string }>(() => {
    try { return { draft: readVisualizationDraft(draftKey, projectId, !!visualization && !copy) }; }
    catch { return { draft: null, error: "The local visualization draft cannot be read. Save your work before leaving." }; }
  });
  const [storageError, setStorageError] = useState(() => isVolatileDraft(draftKey) ? draftStorageError : "");
  const [saveAttempt, setSaveAttempt] = useState<VisualizationSaveAttempt | undefined>();
  const submitting = useRef(false);
  const [selection, setSelection] = useState(visualization ? `${visualization.workflow_id}/${visualization.publication_id}` : initialSelection ?? "");
  const [name, setName] = useState(visualization?.name ?? ""), [type, setType] = useState<Visualization["type"]>(visualization?.type ?? "bar_chart"), [config, setConfig] = useState<Record<string, unknown>>(visualization?.config ?? {});
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null), [acknowledged, setAcknowledged] = useState(false);
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false); }, [busy, onBusyChange]);
  const [tab, setTab] = useState<"data" | "appearance" | "placement">("data");
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [preview, setPreview] = useState<{ key: string; result?: VisualizationResult; error?: unknown } | null>(null);
  const [retry, setRetry] = useState(0);
  const flows = useQuery({ queryKey: ["published-workflows", projectId], queryFn: async () => Promise.all((await listWorkflows(projectId)).map(item => getWorkflow(item.id))) });
  const choices = flows.data?.flatMap(flow => (flow.result_catalog?.outputs ?? []).map(output => ({ flow, output, key: `${flow.id}/${output.id}` }))) ?? [];
  const current = choices.find(item => item.key === (selection || choices[0]?.key));
  const hasCurrent = !!current;
  const effectiveType = current?.output.kind === "scalar" ? "kpi" : type;
  const schema = useQuery({ queryKey: ["publication-schema", current?.key, current?.flow.revision], queryFn: () => apiRequest<components["schemas"]["PublicationSchema"]>(`/api/v1/workflows/${current!.flow.id}/publications/${current!.output.id}/schema`), enabled: !!current });
  const effectiveConfig = ["box_plot", "histogram_chart", "heatmap_chart", "waterfall_chart", "analytical_table", "pareto_chart", "funnel_chart", "treemap_chart", "sunburst_chart"].includes(effectiveType) ? { ...config, spec: config.spec ?? schema.data?.suggested_specs?.find(spec => spec.type === effectiveType) } : config;
  const uses = useQuery({ queryKey: ["visualization-uses", visualization?.id], queryFn: () => apiRequest<components["schemas"]["VisualizationUse"][]>(`/api/v1/visualizations/${visualization!.id}/uses`), enabled: !!visualization && !copy });
  const shared = (uses.data?.length ?? 0) > 1;
  const dirty = !!saveAttempt || restored || type !== (base?.type ?? "bar_chart") || selection !== (base ? `${base.workflow_id}/${base.publication_id}` : initialSelection ?? "") || name !== (base?.name ?? "") || JSON.stringify(config) !== JSON.stringify(base?.config ?? {});
  const awaitingRecovery = !!recovery.draft || !!recovery.error;
  const serializedDraft = JSON.stringify({ version: 1, projectId, selection: selection || current?.key || "", name, type, config: effectiveConfig, revision: editRevision, saveAttempt });
  useEffect(() => {
    if (awaitingRecovery || settled.current === serializedDraft) return;
    try {
      if (dirty) { ownsDraft.current = true; writeDocumentDraft(draftKey, serializedDraft); }
      else if (ownsDraft.current) { removeDocumentDraft(draftKey, true); ownsDraft.current = false; }
    }
    // Storage is an external system; surface quota/privacy failures instead of claiming durability.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    catch { setStorageError(draftStorageError); }
  }, [draftKey, dirty, awaitingRecovery, serializedDraft]);
  const discardDraft = () => {
    if ((saveAttempt || recovery.draft?.saveAttempt) && !window.confirm(t("The save may already have succeeded. Discard recovery only after checking the visualization library."))) return false;
    try { removeDocumentDraft(draftKey); ownsDraft.current = false; setSaveAttempt(undefined); setRecovery({ draft: null }); setStorageError(""); return true; }
    catch { setStorageError(draftStorageError); return false; }
  };
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, busy]);
  const leave = (action: () => void) => { if (busy) return; if (dirty) setPending(() => action); else action(); };
  useOutsideLinkGuard(root, !embedded, leave);
  useImperativeHandle(editorRef, () => ({ leave }));
  const body = current && schema.data ? { workflow_id: current.flow.id, publication_id: current.output.id, expected_workflow_revision: schema.data.workflow_revision, expected_revision: editRevision, name: name.trim() || t("Preview"), type: effectiveType, config: basicInput(effectiveType, effectiveConfig, schema.data.kind), context } : null;
  const requestKey = JSON.stringify([current?.key, schema.data?.workflow_revision, effectiveType, executionConfig(effectiveConfig), context, retry]);
  const latestBody = useRef(body); useEffect(() => { latestBody.current = body; });
  const notify = useRef(onPreview); useEffect(() => { notify.current = onPreview; });
  const setupHints = schema.data ? chartSetupHints(effectiveType, schema.data.kind, effectiveConfig, schema.data.columns) : [];
  const setupMessage = setupHints.join(" ");
  const ready = !!body && !setupHints.length && !flows.isError && !schema.isError && !awaitingRecovery && !saveAttempt;
  useEffect(() => {
    if (!embedded || !ready) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void apiRequest<VisualizationResult>(`/api/v1/projects/${projectId}/visualizations/preview`, { method: "POST", signal: controller.signal, body: JSON.stringify(latestBody.current) })
        .then(result => { if (!controller.signal.aborted) setPreview({ key: requestKey, result }); })
        .catch(error => { if (!controller.signal.aborted) setPreview({ key: requestKey, error }); });
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [embedded, ready, requestKey, projectId]);
  const configKey = JSON.stringify({ ...config, title: config.title || name });
  useEffect(() => {
    if (!embedded) return;
    if (awaitingRecovery) { notify.current?.({ message: "Restore or discard the local draft to preview these settings." }); return; }
    if (flows.error || schema.error) { notify.current?.({ error: flows.error || schema.error }); return; }
    if (flows.isPending || hasCurrent && schema.isPending) { notify.current?.({ loading: true }); return; }
    if (!hasCurrent) { notify.current?.({ message: selection ? "The selected result is unavailable. Choose another published result." : "Publish a table or scalar result in the workflow first." }); return; }
    if (setupMessage) { notify.current?.({ message: "Complete the field selection to see a preview." }); return; }
    try {
      notify.current?.(preview?.key === requestKey ? { result: preview.result ? appearancePreview(preview.result, JSON.parse(configKey)) : undefined, error: preview.error } : { loading: true });
    } catch (error) { notify.current?.({ error }); }
  }, [embedded, requestKey, preview, configKey, setupMessage, flows.error, schema.error, flows.isPending, schema.isPending, hasCurrent, selection, awaitingRecovery]);

  const save = async (asCopy = copy): Promise<boolean> => {
    if (submitting.current || busy || blocked || awaitingRecovery) return false;
    if (!saveAttempt && (!ready || !body || !name.trim() || visualization && !asCopy && (uses.isPending || uses.isError || shared && !acknowledged))) return false;
    const attempt = saveAttempt ?? { asCopy, body: { ...body, request_id: crypto.randomUUID() } };
    const pendingDraft = JSON.stringify({ ...JSON.parse(serializedDraft), saveAttempt: attempt });
    submitting.current = true;
    setSaveAttempt(attempt);
    try { writeDocumentDraft(draftKey, pendingDraft); ownsDraft.current = true; } catch { setStorageError(draftStorageError); }
    setBusy(true); setError(null);
    try {
      const path = visualization && !attempt.asCopy ? `/api/v1/visualizations/${visualization.id}` : attempt.asCopy && visualization ? `/api/v1/visualizations/${visualization.id}/copy` : `/api/v1/projects/${projectId}/visualizations`;
      const result = await apiRequest<Visualization>(path, { method: visualization && !attempt.asCopy ? "PUT" : "POST", body: JSON.stringify(attempt.body) });
      await Promise.allSettled([client.invalidateQueries({ queryKey: ["visualizations", projectId] }), client.invalidateQueries({ queryKey: ["visualization-result", result.id] }), client.invalidateQueries({ queryKey: ["visualization-uses"] })]);
      settled.current = JSON.stringify({ version: 1, projectId, selection: `${result.workflow_id}/${result.publication_id}`, name: result.name, type: result.type, config: result.config ?? {}, revision: result.revision });
      try { removeDocumentDraft(draftKey, true); ownsDraft.current = false; } catch { setStorageError("Saved successfully, but local draft cleanup failed."); }
      setSaveAttempt(undefined); setRecovery({ draft: null });
      setBase(result); setEditRevision(result.revision); setRestored(false); setName(result.name); setType(result.type); setConfig(result.config ?? {}); setSelection(`${result.workflow_id}/${result.publication_id}`);
      if (attempt.asCopy && onCopy) onCopy(result); else onCreated?.(result);
      return true;
    } catch (error) {
      setError(error);
      const rejected = error instanceof ApiError && error.code !== "REQUEST_FAILED" && [400, 404, 409, 410, 422].includes(error.status);
      setSaveAttempt(rejected ? undefined : attempt);
      try { writeDocumentDraft(draftKey, rejected ? JSON.stringify({ ...JSON.parse(serializedDraft), saveAttempt: undefined }) : pendingDraft); } catch { setStorageError(draftStorageError); }
      return false;
    } finally { submitting.current = false; setBusy(false); }
  };
  const apply = async () => { if (await save()) { if (pending) pending(); else close(); } };
  const reload = async () => {
    if (!visualization || !window.confirm(t("Reload saved settings? The current draft will remain recoverable."))) return;
    try { const value = await apiRequest<Visualization>(`/api/v1/visualizations/${visualization.id}`); setRecovery({ draft: readVisualizationDraft(draftKey, projectId, true) }); setRestored(false); setEditRevision(value.revision); setBase(value); setName(value.name); setType(value.type); setSelection(`${value.workflow_id}/${value.publication_id}`); setConfig(value.config ?? {}); setError(null); setAcknowledged(false); await flows.refetch(); }
    catch (error) { setError(error); }
  };
  const restore = () => { const value = recovery.draft; if (!value) return; setSaveAttempt(value.saveAttempt); setEditRevision(value.revision); setSelection(value.selection); setName(value.name); setType(value.type); setConfig(value.config); setRestored(true); setRecovery({ draft: null }); setAcknowledged(false); };
  const control = "my-1 w-full rounded border border-outline bg-control p-2 text-sm";
  const sourceSelection = <label>{t("Prepared dataset")}<select aria-label={t("Prepared dataset")} className={control} value={current?.key ?? ""} onChange={e => { setSelection(e.target.value); setConfig({}); }}><option value="" disabled>{t("Select field")}</option>{choices.map(item => <option key={item.key} value={item.key}>{item.flow.name} / {item.output.name}</option>)}</select></label>;
  let inlinePreview: VisualizationResult | undefined, inlineError: unknown;
  if (!onPreview && ready && preview?.key === requestKey && preview.result) {
    try { inlinePreview = appearancePreview(preview.result, JSON.parse(configKey)); } catch (error) { inlineError = error; }
  }
  return <div ref={root}>
    {fieldsHost && createPortal(<ReportFields source={sourceSelection} columns={schema.data?.columns ?? []} kind={schema.data?.kind} type={effectiveType} config={effectiveConfig} onChange={setConfig} busy={busy || blocked || awaitingRecovery || !!saveAttempt} loading={flows.isPending || !!current && schema.isPending} error={flows.error || schema.error} retry={() => { void flows.refetch(); if (current) void schema.refetch(); }} />, fieldsHost)}
    <div className="flex items-center justify-between gap-2"><h2 className="text-lg">{t(embedded ? "Visualization settings" : "Independent visualization")}</h2><button aria-label={t("Close settings")} disabled={busy} onClick={() => leave(close)}>×</button></div>
    <p className="my-2 text-xs text-muted">{t(dirty ? "Visualization has unapplied changes." : "Visualization settings are saved separately from the dashboard layout.")}</p>
    {embedded && <div role="tablist" aria-label={t("Visualization settings")} className="my-4 flex gap-3">{(["data", "appearance", ...(placement ? ["placement"] : [])] as const).map(value => <button role="tab" id={`${tabId}-${value}`} aria-controls={`${tabId}-panel`} tabIndex={tab === value ? 0 : -1} aria-selected={tab === value} key={value} onKeyDown={event => {
      const tabs = Array.from(event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
      const index = tabs.indexOf(event.currentTarget);
      const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
      if (next >= 0) { event.preventDefault(); tabs[next].click(); tabs[next].focus(); }
    }} onClick={() => setTab(value as typeof tab)} className={tab === value ? "border-b-2 border-accent pb-2 text-accent" : "pb-2 text-muted"}>{t(value === "data" ? "Data" : value === "appearance" ? "Appearance" : "Placement")}</button>)}</div>}
    {(error || flows.error || schema.error || uses.error) ? <p role="alert" className="text-danger">{errorText(error || flows.error || schema.error || uses.error)}</p> : null}
    {error instanceof ApiError && error.status === 409 && <div className="my-3"><button onClick={() => void reload()}>{t("Reload saved settings")}</button></div>}
    {storageError && <p role="alert" className="my-3 text-warning">{t(storageError)}</p>}
    {storageError && isVolatileDraft(draftKey) && <p className="my-2 text-sm text-warning">{t(volatileDraftNotice)}</p>}
    {(saveAttempt || recovery.draft?.saveAttempt) && <p role="status" className="my-3 text-warning">{t("Save confirmation is pending. Retry the same save to recover its result without creating a duplicate. Settings stay locked until the outcome is known.")}</p>}
    {recovery.error && <button className="my-2 min-h-10 underline" onClick={() => { setRecovery({ draft: null }); setStorageError(draftStorageError); }}>{t("Continue without local recovery")}</button>}
    {awaitingRecovery ? <section aria-label={t("Draft recovery")} className="my-3 rounded border border-outline p-3 text-sm"><p>{t(recovery.error || "A local visualization draft is available in this tab. Restore it or discard it before editing.")}</p>{recovery.draft && <><p className="my-2 break-words">{recovery.draft.name}</p><button className="mr-3 min-h-10 underline" onClick={restore}>{t("Restore local draft")}</button></>}<button className="min-h-10 underline" onClick={discardDraft}>{t("Discard local draft")}</button></section> : dirty && !storageError && <p className="my-2 text-xs text-muted">{t("A recovery draft is kept in this browser tab. Reopen these settings after returning. Apply to save the report.")}</p>}
    {!flows.isPending && !choices.length && <p>{t("Publish a table or scalar result in the workflow first.")}</p>}
    {!!setupHints.length && <div role="status" className="my-3 rounded border border-outline bg-accent/5 p-3 text-sm"><p className="font-medium">{t("Finish setting up your chart")}</p><ul className="mt-2 list-inside list-disc">{setupHints.map(hint => <li key={hint}>{t(hint)}</li>)}</ul></div>}
    {!flows.isPending && selection && !current && choices.length > 0 && <p role="alert" className="my-3 text-danger">{t("The selected result is unavailable. Choose another published result.")}</p>}
    <div role={embedded ? "tabpanel" : undefined} id={`${tabId}-panel`} aria-labelledby={embedded ? `${tabId}-${tab}` : undefined}><fieldset disabled={busy || blocked || awaitingRecovery || !!saveAttempt}>
      <div hidden={embedded && tab !== "data"}>
        <label>{t("Visualization name")}<input aria-label={t("Visualization name")} className={control} value={name} onChange={e => setName(e.target.value)} /></label>
        {!fieldsHost && sourceSelection}
        <label>{t("Visualization type")}<select aria-label={t("Visualization type")} className={control} value={effectiveType} onChange={e => { setType(e.target.value as Visualization["type"]); setConfig({ ...config, ...(["combo_chart", "bubble_chart", "bullet_chart", "pareto_chart", "funnel_chart", "treemap_chart", "sunburst_chart"].includes(e.target.value) ? { orientation: "vertical" } : {}), spec: schema.data?.suggested_specs?.find(spec => spec.type === e.target.value), additional_series: ["bar_chart", "line_chart"].includes(e.target.value) ? config.additional_series : [] }); }}>{["table", "kpi", "bar_chart", "line_chart", "area_chart", "pie_chart", "donut_chart", "scatter_chart", "box_plot", "histogram_chart", "heatmap_chart", "radar_chart", "waterfall_chart", "combo_chart", "bubble_chart", "bullet_chart", "analytical_table", "pareto_chart", "funnel_chart", "treemap_chart", "sunburst_chart"].filter(value => current?.output.kind !== "scalar" || value === "kpi").map(value => <option key={value} value={value} disabled={["box_plot", "histogram_chart", "heatmap_chart", "waterfall_chart", "analytical_table", "pareto_chart", "funnel_chart", "treemap_chart", "sunburst_chart"].includes(value) && !schema.data?.suggested_specs?.some(spec => spec.type === value)}>{nodeName(value)}</option>)}</select></label>
        <p className="my-3 text-sm text-muted">{t(chartPurpose[effectiveType])}</p>
      </div>
      {schema.data && tab !== "placement" && <VisualizationConfiguration section={embedded ? tab : "all"} version={schema.data.kind === "scalar" ? 2 : 1} type={effectiveType} columns={schema.data.columns} config={effectiveConfig} parameters={schema.data.roles} onChange={setConfig} />}
      {tab === "placement" && placement}
      {shared && <details open className="my-4 rounded border border-outline p-3 text-xs"><summary>{t("Used in saved dashboards")}</summary><ul>{uses.data?.map(item => <li key={item.widget_id}>{item.name}</li>)}</ul><label className="mt-2 flex gap-2"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />{t("Apply these settings to all listed widgets")}</label>{onCopy && <button disabled={!ready || !name.trim()} className="mt-3 underline disabled:opacity-40" onClick={async () => { if (await save(true)) { if (pending) pending(); else close(); } }}>{t("Independent copy")}</button>}</details>}
    </fieldset></div>
    {!setupHints.length && inlinePreview && <div className="h-72"><VisualizationResultView result={inlinePreview} /></div>}
    {inlineError ? <p role="alert" className="text-danger">{errorText(inlineError)}</p> : null}
    {preview?.key === requestKey && preview.error ? <p role="alert" className="text-danger">{errorText(preview.error)}</p> : null}
    <button className="my-3 text-sm underline" disabled={!ready || busy} onClick={async () => {
      if (embedded) { setRetry(value => value + 1); return; }
      try { const result = await apiRequest<VisualizationResult>(`/api/v1/projects/${projectId}/visualizations/preview`, { method: "POST", body: JSON.stringify(body) }); setPreview({ key: requestKey, result }); } catch (error) { setError(error); }
    }}>{t("Preview visualization")}</button>
    {pending && <div role="alert" className="my-3 rounded border border-outline p-3"><p>{t("Apply, discard or continue editing these settings.")}</p><button className="mr-3 underline" onClick={() => { if (!discardDraft()) return; settled.current = serializedDraft; setRestored(false); setEditRevision(base?.revision ?? 1); setName(base?.name ?? ""); setType(base?.type ?? "bar_chart"); setConfig(base?.config ?? {}); setSelection(base ? `${base.workflow_id}/${base.publication_id}` : initialSelection ?? ""); const action = pending; setPending(null); action(); }}>{t("Discard changes")}</button><button className="mr-3 underline" onClick={() => { try { writeDocumentDraft(draftKey, serializedDraft); const action = pending; setPending(null); action(); } catch { setStorageError(draftStorageError); } }}>{t("Keep draft and continue")}</button><button className="underline" onClick={() => setPending(null)}>{t("Continue editing")}</button></div>}
    <div className="sticky bottom-0 flex gap-3 border-t border-outline bg-panel py-4"><button className="rounded bg-primary p-2 text-on-primary disabled:opacity-40" disabled={busy || blocked || awaitingRecovery || !saveAttempt && (!ready || !name.trim() || !!visualization && !copy && (!dirty || uses.isPending || uses.isError || shared && !acknowledged))} onClick={() => void apply()}>{t(embedded ? "Apply visualization" : "Save visualization")}</button><button disabled={busy} onClick={() => leave(close)}>{t(dirty || !embedded ? "Cancel" : "Close")}</button></div>
  </div>;
}
