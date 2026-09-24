"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { getWorkflow, getWorkflowSchema, saveWorkflow } from "@/features/workflow/api";
import type { Workflow, WorkflowSchemaResult } from "@/features/workflow/types";
import { VisualizationConfiguration } from "@/features/workflow/VisualizationConfiguration";
import { listDashboards, type Dashboard, type Visualization } from "./api";

type Snapshot = { workflow: Workflow; schema: WorkflowSchemaResult; dashboards: Dashboard[] };
export function VisualizationSettingsDialog({ visualization, projectId, close, placement }: { visualization: Visualization; projectId: string; close: () => void; placement?: ReactNode }) {
  const { t, errorText } = useI18n(); const client = useQueryClient();
  const dialog = useRef<HTMLDialogElement>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), [config, setConfig] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<unknown>(null), [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(0);
  const [sharedAcknowledged, setSharedAcknowledged] = useState(false);
  const node = snapshot?.workflow.nodes.find(node => node.id === visualization.node_id);
  const dirty = !!node && JSON.stringify(config) !== JSON.stringify(node.config ?? {});
  const uses = snapshot?.dashboards.flatMap(dashboard => dashboard.widgets.filter(widget => widget.visualization_id === visualization.id).map(widget => ({ dashboard: dashboard.name, id: widget.id, title: widget.title }))) ?? [];
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    let active = true;
    Promise.all([getWorkflow(visualization.workflow_id), getWorkflowSchema(visualization.workflow_id), listDashboards(projectId)]).then(([workflow, schema, dashboards]) => {
      if (!active) return;
      if (workflow.revision !== schema.revision) { setError(new Error("The workflow changed while loading. Reload the settings.")); return; }
      const node = workflow.nodes.find(node => node.id === visualization.node_id);
      if (!node || node.type !== visualization.type) { setError(new Error("The visualization node is unavailable.")); return; }
      setSnapshot({ workflow, schema, dashboards }); setConfig(node.config ?? {}); setError(null);
    }).catch(error => { if (active) setError(error); });
    return () => { active = false; };
  }, [visualization.workflow_id, visualization.node_id, visualization.type, projectId, attempt]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty, busy]);
  const cancel = () => { if (!busy && (!dirty || window.confirm(t("Discard unsaved visualization settings?")))) close(); };
  const reload = () => { if (!dirty || window.confirm(t("Discard unsaved visualization settings?"))) { setSnapshot(null); setError(null); setSharedAcknowledged(false); setAttempt(value => value + 1); } };
  const save = async () => {
    if (!snapshot || !node || busy) return;
    setBusy(true); setError(null);
    try {
      const workflow = snapshot.workflow;
      await saveWorkflow(workflow.id, { format_version: workflow.version === 2 ? 2 : 1, presentation: workflow.presentation, name: workflow.name, expected_revision: workflow.revision, parameters: workflow.parameters, nodes: workflow.nodes.map(item => item.id === node.id ? { ...item, config } : item), edges: workflow.edges });
    } catch (error) { setError(error); setBusy(false); return; }
    // The write has succeeded. Cache refresh failure must never turn into a repeated write.
    await Promise.allSettled([
      client.invalidateQueries({ queryKey: ["visualizations", projectId] }),
      client.invalidateQueries({ queryKey: ["visualization-result"] }),
      client.invalidateQueries({ queryKey: ["workflow", visualization.workflow_id] }),
      client.invalidateQueries({ queryKey: ["workflow-schema", visualization.workflow_id] }),
      client.invalidateQueries({ queryKey: ["workflows", projectId] }),
    ]);
    close();
  };
  const inputId = snapshot?.workflow.edges.find(edge => edge.target_node_id === visualization.node_id && edge.target_port === (node?.version === 2 ? "table" : "input"))?.source_node_id;
  const columns = snapshot?.schema.nodes.find(node => node.node_id === inputId)?.columns ?? null;
  return <dialog ref={dialog} aria-label={t("Edit visualization")} onCancel={event => { event.preventDefault(); cancel(); }} onKeyDown={event => event.stopPropagation()} className="m-auto max-h-[90vh] w-[min(700px,94vw)] overflow-auto rounded-xl border border-outline bg-panel p-6 text-foreground backdrop:bg-black/60">
    <h2 className="text-lg">{t("Edit visualization")}</h2>
    <p className="my-2 text-sm text-muted">{t("Settings belong to the workflow node. Saving updates every widget using this visualization.")}</p>
    {error ? <div role="alert" className="my-3 text-danger">{errorText(error)}<button disabled={busy} onClick={reload} className="ml-3 underline">{t("Reload settings")}</button></div> : null}
    {!snapshot && !error ? <p>{t("Loading…")}</p> : null}
    {snapshot && node ? <fieldset disabled={busy}>
      <h3 className="mt-3 font-medium">{t("Used in saved dashboards")}</h3><ul className="my-2 list-inside list-disc text-sm">{uses.map(use => <li key={use.id}>{use.dashboard} / {use.title || visualization.name}</li>)}</ul>
      {uses.length > 1 ? <label className="my-3 flex gap-2 text-sm"><input type="checkbox" checked={sharedAcknowledged} onChange={event => setSharedAcknowledged(event.target.checked)} />{t("Apply these settings to all listed widgets")}</label> : null}
      <VisualizationConfiguration version={node.version} type={node.type} config={config} columns={columns} parameters={snapshot.workflow.parameters} onChange={setConfig} />
    </fieldset> : null}
    {placement}
    <div className="sticky -bottom-6 -mx-6 -mb-6 mt-4 flex gap-4 border-t border-outline bg-panel p-4"><button disabled={!dirty || busy || uses.length > 1 && !sharedAcknowledged} className="rounded bg-primary p-2 text-on-primary disabled:opacity-40" onClick={() => void save()}>{busy ? t("Saving…") : t("Save visualization")}</button><button disabled={busy} onClick={cancel}>{t("Cancel")}</button></div>
  </dialog>;
}
