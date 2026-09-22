"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { components } from "@/lib/api-schema";
import { getWorkflow, listWorkflows } from "@/features/workflow/api";
import { VisualizationConfiguration } from "@/features/workflow/VisualizationConfiguration";
import { VisualizationResultView } from "./VisualizationView";
import type { Visualization, VisualizationResult } from "./api";

export function IndependentVisualizationDialog({ projectId, visualization, copy = false, close, onCreated }: { projectId: string; visualization?: Visualization; copy?: boolean; close: () => void; onCreated?: (value: Visualization) => void }) {
  const { t, nodeName, errorText } = useI18n(); const client = useQueryClient(); const dialog = useRef<HTMLDialogElement>(null);
  const [selection, setSelection] = useState(visualization ? `${visualization.workflow_id}/${visualization.publication_id}` : "");
  const [name, setName] = useState(visualization?.name ?? ""), [type, setType] = useState<Visualization["type"]>(visualization?.type ?? "bar_chart"), [config, setConfig] = useState<Record<string, unknown>>(visualization?.config ?? {});
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null), [acknowledged, setAcknowledged] = useState(false), [preview, setPreview] = useState<VisualizationResult | null>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const flows = useQuery({ queryKey: ["published-workflows", projectId], queryFn: async () => Promise.all((await listWorkflows(projectId)).map(item => getWorkflow(item.id))) });
  const choices = flows.data?.flatMap(flow => (flow.result_catalog?.outputs ?? []).map(output => ({ flow, output, key: `${flow.id}/${output.id}` }))) ?? [];
  const current = choices.find(item => item.key === (selection || choices[0]?.key));
  const effectiveType = current?.output.kind === "scalar" ? "kpi" : type;
  const schema = useQuery({ queryKey: ["publication-schema", current?.key, current?.flow.revision], queryFn: () => apiRequest<components["schemas"]["PublicationSchema"]>(`/api/v1/workflows/${current!.flow.id}/publications/${current!.output.id}/schema`), enabled: !!current });
  const uses = useQuery({ queryKey: ["visualization-uses", visualization?.id], queryFn: () => apiRequest<components["schemas"]["VisualizationUse"][]>(`/api/v1/visualizations/${visualization!.id}/uses`), enabled: !!visualization && !copy });
  const control = "my-1 w-full rounded border border-outline bg-control p-2 text-sm";
  const save = async (showPreview = false) => {
    if (!current || !schema.data || !name.trim()) return;
    setBusy(true); setError(null);
    try {
      const body = { workflow_id: current.flow.id, publication_id: current.output.id, expected_workflow_revision: schema.data.workflow_revision, expected_revision: visualization?.revision ?? 1, name: name.trim(), type: effectiveType, config };
      if (showPreview) {
        const result = await apiRequest<VisualizationResult>(`/api/v1/projects/${projectId}/visualizations/preview`, { method: "POST", body: JSON.stringify(body) });
        setPreview(result);
      } else {
        const path = visualization && !copy ? `/api/v1/visualizations/${visualization.id}` : copy && visualization ? `/api/v1/visualizations/${visualization.id}/copy` : `/api/v1/projects/${projectId}/visualizations`;
        const result = await apiRequest<Visualization>(path, { method: visualization && !copy ? "PUT" : "POST", body: JSON.stringify(body) });
        await Promise.allSettled([client.invalidateQueries({ queryKey: ["visualizations", projectId] }), client.invalidateQueries({ queryKey: ["visualization-result"] })]);
        onCreated?.(result); close();
      }
    } catch (error) { setError(error); } finally { setBusy(false); }
  };
  const dirty = type !== (visualization?.type ?? "bar_chart") || selection !== (visualization ? `${visualization.workflow_id}/${visualization.publication_id}` : "") || name !== (visualization?.name ?? "") || JSON.stringify(config) !== JSON.stringify(visualization?.config ?? {});
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, busy]);
  const cancel = () => { if (!busy && (!dirty || window.confirm(t("Discard unsaved visualization settings?")))) close(); };

  return <dialog ref={dialog} aria-label={t("Independent visualization")} onCancel={event => { event.preventDefault(); cancel(); }} className="m-auto max-h-[90vh] w-[min(740px,94vw)] overflow-auto rounded-xl border border-outline bg-panel p-6 text-foreground backdrop:bg-black/60">
    <h2 className="text-lg">{t("Independent visualization")}</h2><p className="my-2 text-sm text-muted">{t("Settings belong to this visualization. Calculations stay in the published workflow result.")}</p>
    {(error || flows.error || schema.error || uses.error) && <p role="alert" className="text-danger">{errorText(error || flows.error || schema.error || uses.error)}</p>}
    {!flows.isPending && !choices.length && <p>{t("Publish a table or scalar result in the workflow first.")}</p>}
    <fieldset disabled={busy} onChange={() => setPreview(null)}>
      <label>{t("Visualization name")}<input aria-label={t("Visualization name")} className={control} value={name} onChange={e => setName(e.target.value)} /></label>
      <label>{t("Published result")}<select aria-label={t("Published result")} className={control} value={current?.key ?? ""} onChange={e => { setSelection(e.target.value); setConfig({}); }}>{choices.map(item => <option key={item.key} value={item.key}>{item.flow.name} / {item.output.name}</option>)}</select></label>
      <label>{t("Visualization type")}<select aria-label={t("Visualization type")} className={control} value={effectiveType} onChange={e => setType(e.target.value as Visualization["type"])}>{["table", "kpi", "bar_chart", "line_chart", "area_chart", "pie_chart", "donut_chart", "scatter_chart"].filter(value => current?.output.kind !== "scalar" || value === "kpi").map(value => <option key={value} value={value}>{nodeName(value)}</option>)}</select></label>
      {schema.data && <VisualizationConfiguration version={schema.data.kind === "scalar" ? 2 : 1} type={effectiveType} columns={schema.data.columns} config={config} parameters={schema.data.roles} onChange={setConfig} />}
      {!!uses.data?.length && <><h3>{t("Used in saved dashboards")}</h3><ul>{uses.data.map(item => <li key={item.widget_id}>{item.name}</li>)}</ul><label><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} /> {t("Apply these settings to all listed widgets")}</label></>}
    </fieldset>
    {preview && <div className="h-72"><VisualizationResultView result={preview} /></div>}
    <button disabled={busy || !schema.data || !name.trim()} onClick={() => void save(true)}>{t("Preview visualization")}</button>
    <div className="mt-4 flex gap-4"><button className="rounded bg-primary p-2 text-on-primary disabled:opacity-40" disabled={busy || !schema.data || !name.trim() || !!visualization && !copy && (uses.isPending || uses.isError) || !!uses.data?.length && !acknowledged} onClick={() => void save()}>{t("Save visualization")}</button><button disabled={busy} onClick={cancel}>{t("Cancel")}</button></div>
  </dialog>;
}
