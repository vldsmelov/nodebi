"use client";
import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { components } from "@/lib/api-schema";
import { getWorkflow, listWorkflows } from "@/features/workflow/api";
import { VisualizationConfiguration } from "@/features/workflow/VisualizationConfiguration";
import { VisualizationResultView } from "./VisualizationView";
import { appearancePreview, executionConfig } from "./editor-preview";
import type { Visualization, VisualizationResult } from "./api";

export type EditorHandle = { leave: (action: () => void) => void };
export type DraftPreview = { result?: VisualizationResult; loading?: boolean; error?: unknown };
export type VisualizationEditorProps = {
  projectId: string; visualization?: Visualization; initialSelection?: string; copy?: boolean;
  close: () => void; onCreated?: (value: Visualization) => void;
  embedded?: boolean; placement?: ReactNode; context?: components["schemas"]["ViewContext"];
  onPreview?: (preview: DraftPreview) => void; onCopy?: (value: Visualization) => void;
  onBusyChange?: (busy: boolean) => void; blocked?: boolean;
  editorRef?: Ref<EditorHandle>;
};

export function VisualizationEditor({ projectId, visualization, initialSelection, copy = false, close, onCreated, embedded = false, placement, context, onPreview, onCopy, onBusyChange, blocked = false, editorRef }: VisualizationEditorProps) {
  const { t, nodeName, errorText } = useI18n(); const client = useQueryClient();
  const [base, setBase] = useState(visualization);
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
  const effectiveType = current?.output.kind === "scalar" ? "kpi" : type;
  const schema = useQuery({ queryKey: ["publication-schema", current?.key, current?.flow.revision], queryFn: () => apiRequest<components["schemas"]["PublicationSchema"]>(`/api/v1/workflows/${current!.flow.id}/publications/${current!.output.id}/schema`), enabled: !!current });
  const uses = useQuery({ queryKey: ["visualization-uses", visualization?.id], queryFn: () => apiRequest<components["schemas"]["VisualizationUse"][]>(`/api/v1/visualizations/${visualization!.id}/uses`), enabled: !!visualization && !copy });
  const shared = (uses.data?.length ?? 0) > 1;
  const dirty = type !== (base?.type ?? "bar_chart") || selection !== (base ? `${base.workflow_id}/${base.publication_id}` : initialSelection ?? "") || name !== (base?.name ?? "") || JSON.stringify(config) !== JSON.stringify(base?.config ?? {});
  const draftKey = visualization && !copy ? `nodebi:visualization-draft:${visualization.id}` : null;
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, busy]);
  const leave = (action: () => void) => { if (busy) return; if (dirty) setPending(() => action); else action(); };
  useImperativeHandle(editorRef, () => ({ leave }));
  const body = current && schema.data ? { workflow_id: current.flow.id, publication_id: current.output.id, expected_workflow_revision: schema.data.workflow_revision, expected_revision: base?.revision ?? 1, name: name.trim() || t("Preview"), type: effectiveType, config, context } : null;
  const requestKey = JSON.stringify([current?.key, schema.data?.workflow_revision, effectiveType, executionConfig(config), context, retry]);
  const latestBody = useRef(body); useEffect(() => { latestBody.current = body; });
  const notify = useRef(onPreview); useEffect(() => { notify.current = onPreview; });
  const ready = !!body;
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
    try {
      notify.current?.(preview?.key === requestKey ? { result: preview.result ? appearancePreview(preview.result, JSON.parse(configKey)) : undefined, error: preview.error } : { loading: true });
    } catch (error) { notify.current?.({ error }); }
  }, [embedded, requestKey, preview, configKey]);

  const save = async (asCopy = copy): Promise<boolean> => {
    if (!body || !name.trim() || busy || blocked || visualization && !asCopy && (uses.isPending || uses.isError || shared && !acknowledged)) return false;
    setBusy(true); setError(null);
    try {
      const path = visualization && !asCopy ? `/api/v1/visualizations/${visualization.id}` : asCopy && visualization ? `/api/v1/visualizations/${visualization.id}/copy` : `/api/v1/projects/${projectId}/visualizations`;
      const result = await apiRequest<Visualization>(path, { method: visualization && !asCopy ? "PUT" : "POST", body: JSON.stringify(body) });
      await Promise.allSettled([client.invalidateQueries({ queryKey: ["visualizations", projectId] }), client.invalidateQueries({ queryKey: ["visualization-result", result.id] }), client.invalidateQueries({ queryKey: ["visualization-uses"] })]);
      if (draftKey) { try { sessionStorage.removeItem(draftKey); } catch { /* Saved remotely; stale recovery storage does not undo a successful save. */ } }
      if (asCopy && onCopy) onCopy(result); else onCreated?.(result);
      return true;
    } catch (error) {
      setError(error);
      if (draftKey) { try { sessionStorage.setItem(draftKey, JSON.stringify({ selection, name, type, config, revision: base?.revision })); } catch { /* Keep the open editor draft even if storage is unavailable. */ } }
      return false;
    } finally { setBusy(false); }
  };
  const apply = async () => { if (await save()) { if (pending) pending(); else close(); } };
  const reload = async () => {
    if (!visualization || !window.confirm(t("Reload saved settings? The current draft will remain recoverable."))) return;
    try { const value = await apiRequest<Visualization>(`/api/v1/visualizations/${visualization.id}`); setBase(value); setName(value.name); setType(value.type); setSelection(`${value.workflow_id}/${value.publication_id}`); setConfig(value.config ?? {}); setError(null); setAcknowledged(false); await flows.refetch(); }
    catch (error) { setError(error); }
  };
  const restore = () => { if (!draftKey) return; try { const value = JSON.parse(sessionStorage.getItem(draftKey) ?? "null"); if (value) { setSelection(value.selection); setName(value.name); setType(value.type); setConfig(value.config); } } catch (error) { setError(error); } };
  const control = "my-1 w-full rounded border border-outline bg-control p-2 text-sm";
  let inlinePreview: VisualizationResult | undefined, inlineError: unknown;
  if (!onPreview && preview?.key === requestKey && preview.result) {
    try { inlinePreview = appearancePreview(preview.result, JSON.parse(configKey)); } catch (error) { inlineError = error; }
  }
  return <div>
    <div className="flex items-center justify-between gap-2"><h2 className="text-lg">{t(embedded ? "Visualization settings" : "Independent visualization")}</h2><button aria-label={t("Close settings")} disabled={busy} onClick={() => leave(close)}>×</button></div>
    <p className="my-2 text-xs text-muted">{t(dirty ? "Visualization has unapplied changes." : "Visualization settings are saved separately from the dashboard layout.")}</p>
    {embedded && <div role="tablist" aria-label={t("Visualization settings")} className="my-4 flex gap-3">{(["data", "appearance", ...(placement ? ["placement"] : [])] as const).map(value => <button role="tab" aria-selected={tab === value} key={value} onClick={() => setTab(value as typeof tab)} className={tab === value ? "border-b-2 border-accent pb-2 text-accent" : "pb-2 text-muted"}>{t(value === "data" ? "Data" : value === "appearance" ? "Appearance" : "Placement")}</button>)}</div>}
    {(error || flows.error || schema.error || uses.error) ? <p role="alert" className="text-danger">{errorText(error || flows.error || schema.error || uses.error)}</p> : null}
    {error instanceof ApiError && error.status === 409 && <div className="my-3"><button onClick={() => void reload()}>{t("Reload saved settings")}</button></div>}
    {draftKey && <details className="my-2 text-xs"><summary>{t("Draft recovery")}</summary><button onClick={restore}>{t("Restore last failed draft")}</button></details>}
    {!flows.isPending && !choices.length && <p>{t("Publish a table or scalar result in the workflow first.")}</p>}
    <fieldset disabled={busy || blocked}>
      <div hidden={embedded && tab !== "data"}>
        <label>{t("Visualization name")}<input aria-label={t("Visualization name")} className={control} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>{t("Published result")}<select aria-label={t("Published result")} className={control} value={current?.key ?? ""} onChange={e => { setSelection(e.target.value); setConfig({}); }}><option value="" disabled>{t("Select field")}</option>{choices.map(item => <option key={item.key} value={item.key}>{item.flow.name} / {item.output.name}</option>)}</select></label>
        <label>{t("Visualization type")}<select aria-label={t("Visualization type")} className={control} value={effectiveType} onChange={e => { setType(e.target.value as Visualization["type"]); if (!["bar_chart", "line_chart"].includes(e.target.value)) setConfig({ ...config, additional_series: [] }); }}>{["table", "kpi", "bar_chart", "line_chart", "area_chart", "pie_chart", "donut_chart", "scatter_chart"].filter(value => current?.output.kind !== "scalar" || value === "kpi").map(value => <option key={value} value={value}>{nodeName(value)}</option>)}</select></label>
      </div>
      {schema.data && tab !== "placement" && <VisualizationConfiguration section={embedded ? tab : "all"} version={schema.data.kind === "scalar" ? 2 : 1} type={effectiveType} columns={schema.data.columns} config={config} parameters={schema.data.roles} onChange={setConfig} />}
      {tab === "placement" && placement}
      {shared && <details open className="my-4 rounded border border-outline p-3 text-xs"><summary>{t("Used in saved dashboards")}</summary><ul>{uses.data?.map(item => <li key={item.widget_id}>{item.name}</li>)}</ul><label className="mt-2 flex gap-2"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />{t("Apply these settings to all listed widgets")}</label>{onCopy && <button disabled={!body || !name.trim()} className="mt-3 underline disabled:opacity-40" onClick={async () => { if (await save(true)) { if (pending) pending(); else close(); } }}>{t("Independent copy")}</button>}</details>}
    </fieldset>
    {inlinePreview && <div className="h-72"><VisualizationResultView result={inlinePreview} /></div>}
    {inlineError ? <p role="alert" className="text-danger">{errorText(inlineError)}</p> : null}
    {preview?.key === requestKey && preview.error ? <p role="alert" className="text-danger">{errorText(preview.error)}</p> : null}
    <button className="my-3 text-sm underline" disabled={!body || busy} onClick={async () => {
      if (embedded) { setRetry(value => value + 1); return; }
      try { const result = await apiRequest<VisualizationResult>(`/api/v1/projects/${projectId}/visualizations/preview`, { method: "POST", body: JSON.stringify(body) }); setPreview({ key: requestKey, result }); } catch (error) { setError(error); }
    }}>{t("Preview visualization")}</button>
    {pending && <div role="alert" className="my-3 rounded border border-outline p-3"><p>{t("Apply, discard or continue editing these settings.")}</p><button className="mr-3 underline" onClick={() => { const action = pending; setPending(null); action(); }}>{t("Discard changes")}</button><button className="underline" onClick={() => setPending(null)}>{t("Continue editing")}</button></div>}
    <div className="sticky bottom-0 flex gap-3 border-t border-outline bg-panel py-4"><button className="rounded bg-primary p-2 text-on-primary disabled:opacity-40" disabled={busy || blocked || !schema.data || !name.trim() || !!visualization && !copy && (!dirty || uses.isPending || uses.isError || shared && !acknowledged)} onClick={() => void apply()}>{t(embedded ? "Apply visualization" : "Save visualization")}</button><button disabled={busy} onClick={() => leave(close)}>{t(dirty || !embedded ? "Cancel" : "Close")}</button></div>
  </div>;
}
