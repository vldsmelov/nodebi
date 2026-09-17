"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { getWorkflow, getWorkflowSchema, getNodeCatalog } from "@/features/workflow/api";
import type { Workflow, WorkflowSchemaResult, WorkflowSummary, NodeDefinition } from "@/features/workflow/types";
import { VisualizationConfiguration } from "@/features/workflow/VisualizationConfiguration";
import { createDashboardVisualization, type Dashboard, type Visualization, type DashboardVisualizationCreate } from "./api";
type Snapshot = { workflow: Workflow; schema: WorkflowSchemaResult; catalog: NodeDefinition[] };
export function CreateVisualizationDialog({ dashboard, workflows, copy, close, created }: {
  dashboard: Dashboard; workflows: WorkflowSummary[]; copy?: { visualization: Visualization; widgetId: string };
  close: () => void; created: (dashboard: Dashboard) => void;
}) {
  const { t, errorText, nodeName } = useI18n(); const client = useQueryClient(); const dialog = useRef<HTMLDialogElement>(null);
  const [workflowId, setWorkflowId] = useState(copy?.visualization.workflow_id ?? workflows[0]?.id ?? "");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), [input, setInput] = useState("");
  const [type, setType] = useState<DashboardVisualizationCreate["type"]>(copy?.visualization.type ?? "bar_chart");
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<unknown>(null), [busy, setBusy] = useState(false), [changed, setChanged] = useState(false);
  const [ids] = useState(() => ({ node_id: crypto.randomUUID(), edge_id: crypto.randomUUID(), widget_id: copy?.widgetId ?? crypto.randomUUID() }));
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    let active = true;
    if (!workflowId) return;
    Promise.all([getWorkflow(workflowId), getWorkflowSchema(workflowId), getNodeCatalog()]).then(([workflow, schema, catalog]) => {
      if (!active) return;
      if (workflow.revision !== schema.revision) { setError(new Error("The workflow changed while loading. Reload the settings.")); return; }
      if (copy) {
        const node = workflow.nodes.find(node => node.id === copy.visualization.node_id);
        const edge = workflow.edges.find(edge => edge.target_node_id === node?.id && edge.target_port === "input");
        if (!node || !edge || node.type !== copy.visualization.type) { setError(new Error("The visualization node is unavailable.")); return; }
        setInput(edge.source_node_id); setConfig(node.config ?? {});
      }
      setSnapshot({ workflow, schema, catalog });
    }).catch(error => { if (active) setError(error); });
    return () => { active = false; };
  }, [workflowId, copy]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (changed || busy) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [changed, busy]);
  const cancel = () => { if (!busy && (!changed || window.confirm(t("Discard unsaved visualization settings?")))) close(); };
  const save = async () => {
    if (!snapshot || !input || busy) return;
    setBusy(true); setError(null);
    let result: Dashboard;
    try { result = await createDashboardVisualization(dashboard.id, { ...ids, workflow_id: snapshot.workflow.id, expected_workflow_revision: snapshot.workflow.revision, expected_dashboard_revision: dashboard.revision, source_node_id: input, type, config, replace_existing: !!copy }); }
    catch (error) { setError(error); setBusy(false); return; }
    await Promise.allSettled([client.invalidateQueries({ queryKey: ["visualizations", dashboard.project_id] }), client.invalidateQueries({ queryKey: ["workflow", workflowId] }), client.invalidateQueries({ queryKey: ["workflow-schema", workflowId] }), client.invalidateQueries({ queryKey: ["workflows", dashboard.project_id] })]);
    created(result); close();
  };
  const columns = snapshot?.schema.nodes.find(node => node.node_id === input)?.columns ?? null;
  const inputs = snapshot?.workflow.nodes.filter(node => snapshot.catalog.some(def => def.type === node.type && def.version === node.version && def.output_ports.some(port => port.id === "dataset" && port.kind === "dataset"))) ?? [];
  const control = "mt-1 w-full rounded border border-outline bg-control p-2 text-sm";
  return <dialog ref={dialog} aria-label={t(copy ? "Independent visualization copy" : "Create visualization widget")} onCancel={event => { event.preventDefault(); cancel(); }} onKeyDown={event => event.stopPropagation()} className="m-auto max-h-[90vh] w-[min(700px,94vw)] overflow-auto rounded-xl border border-outline bg-panel p-6 text-foreground backdrop:bg-black/60">
    <h2 className="text-lg">{t(copy ? "Independent visualization copy" : "Create visualization widget")}</h2>
    <p className="my-2 text-sm text-muted">{t(copy ? "Only this widget will use the new node. Other uses keep their original visualization." : "A normal workflow node and its widget are saved together.")}</p>
    {error ? <div role="alert" className="my-3 text-danger">{errorText(error)}<button disabled={busy} className="ml-3 underline" onClick={() => { if (window.confirm(t("Reload dashboard and discard this unapplied form? A completed operation will be visible after reload."))) window.location.reload(); }}>{t("Reload dashboard")}</button></div> : null}
    <fieldset disabled={busy}>
      <label>{t("Workflow")}<select aria-label={t("Widget workflow")} className={control} value={workflowId} disabled={!!copy} onChange={event => { setSnapshot(null); setError(null); setInput(""); setConfig({}); setChanged(true); setWorkflowId(event.target.value); }}><option value="">{t("Select workflow")}</option>{workflows.map(workflow => <option key={workflow.id} value={workflow.id}>{workflow.name}</option>)}</select></label>
      {snapshot ? <>
        <label className="mt-3 block">{t("Input dataset")}<select aria-label={t("Widget input dataset")} disabled={!!copy} className={control} value={input} onChange={event => { setInput(event.target.value); setConfig({ title: config.title ?? "" }); setChanged(true); }}><option value="">{t("Select node")}</option>{inputs.map(node => <option key={node.id} value={node.id}>{String(node.ui?.label || node.config?.name || node.config?.sheet_name || nodeName(node.type))} ({node.id.slice(0, 6)})</option>)}</select></label>
        <label className="mt-3 block">{t("Visualization type")}<select aria-label={t("Visualization type")} disabled={!!copy} className={control} value={type} onChange={event => { setType(event.target.value as DashboardVisualizationCreate["type"]); setConfig({ title: config.title ?? "" }); setChanged(true); }}>{snapshot.catalog.filter(def => def.category === "visualization" && def.version === 1).map(def => <option key={def.type} value={def.type}>{nodeName(def.type)}</option>)}</select></label>
        {input ? <VisualizationConfiguration type={type} config={config} columns={columns} parameters={snapshot.workflow.parameters} onChange={config => { setConfig(config); setChanged(true); }} /> : null}
      </> : workflowId && !error ? <p className="my-3">{t("Loading…")}</p> : null}
    </fieldset>
    <div className="sticky -bottom-6 -mx-6 -mb-6 mt-4 flex gap-4 border-t border-outline bg-panel p-4"><button disabled={busy || !snapshot || !input || !columns} className="rounded bg-primary p-2 text-on-primary disabled:opacity-40" onClick={() => void save()}>{busy ? t("Saving…") : t(copy ? "Create independent copy" : "Create widget")}</button><button disabled={busy} onClick={cancel}>{t("Cancel")}</button></div>
  </dialog>;
}
