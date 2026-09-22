"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import type { ParameterValues } from "@/features/workflow/types";
import { getWorkflow, getWorkflowSchema } from "@/features/workflow/api";
import { saveDashboardNavigation, getVisualizationResult, type Dashboard, type NavigationAction, type Visualization, type Widget } from "./api";
import { NavigationConfiguration } from "./DashboardConfiguration";
import { navigationIssues, suggestNavigation } from "./navigation-plan";
import { emptyConfiguration, navigationValues, workflowValues } from "./view-state";

export function WidgetNavigationDialog({ dashboard, dashboards, widget, visualization, values, apply, close, canSaveContext, saved }: {
  dashboard: Dashboard; dashboards: Dashboard[]; widget: Widget; visualization: Visualization;
  canSaveContext: boolean; saved: (board: Dashboard) => void;
  values: ParameterValues; apply: (action: NavigationAction | null) => void; close: () => void;
}) {
  const { t, errorText, cell } = useI18n();
  const client = useQueryClient();
  const [requestKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [reviewed, setReviewed] = useState(false);
  const snapshot = useQuery({ queryKey: ["navigation-context", visualization.id, requestKey], retry: false, staleTime: Infinity, refetchOnWindowFocus: false,
    queryFn: async () => {
      const [workflow, schema] = await Promise.all([getWorkflow(visualization.workflow_id), getWorkflowSchema(visualization.workflow_id)]);
      if (workflow.revision !== schema.revision) throw new Error("This workflow was changed elsewhere. Reload before saving.");
      const node = workflow.nodes.find(item => item.id === visualization.node_id);
      const input = workflow.edges.find(edge => edge.target_node_id === visualization.node_id && edge.target_port === (node?.version === 2 ? "table" : "input"));
      return { workflow, columns: schema.nodes.find(item => item.node_id === input?.source_node_id)?.columns ?? [] };
    } });
  const dialog = useRef<HTMLDialogElement>(null);
  const [action, setAction] = useState(widget.config?.action ?? null);
  const [preview, setPreview] = useState<ParameterValues | null>(null);
  const [previewError, setPreviewError] = useState<unknown>(null);
  const parameters = workflowValues(dashboard.configuration ?? emptyConfiguration, visualization.workflow_id, values);
  const query = useQuery({ queryKey: ["navigation-fields", visualization.id, parameters], queryFn: () => getVisualizationResult(visualization.id, 0, parameters), retry: false });
  const resultFields = query.data?.columns ?? [];
  const matchingRevision = Boolean(snapshot.data && query.data && snapshot.data.workflow.revision === query.data.revision);
  const fields = matchingRevision ? [...snapshot.data!.columns, ...resultFields.filter(field => !snapshot.data!.columns.some(item => item.column_id === field.column_id))] : resultFields;
  const missing = [...new Set(Object.values(action?.values ?? {}).filter(item => item.source === "field").map(item => item.name))].filter(id => fields.some(field => field.column_id === id) && !resultFields.some(field => field.column_id === id));
  const dirty = missing.length > 0 || JSON.stringify(action) !== JSON.stringify(widget.config?.action ?? null);
  const uses = dashboards.flatMap(board => board.widgets.filter(item => item.visualization_id === visualization.id).map(item => ({ id: `${board.id}:${item.id}`, label: `${board.name} / ${item.title || visualization.name}` })));
  const definitions = dashboard.configuration?.parameters ?? [];
  const target = dashboards.find(item => item.id === action?.dashboard_id);
  const issues = navigationIssues(action, target, definitions, fields);
  const change = (next: NavigationAction | null) => { setAction(next); setReviewed(false); setPreview(null); setPreviewError(null); };
  const cancel = () => { if (busy) return; if (!dirty || window.confirm(t("Discard navigation changes?"))) close(); };
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, busy]);
  const previewTransition = () => {
    if (!action) return;
    try {
      const row = query.data?.rows[0];
      const mapped = row ? Object.fromEntries(fields.map(field => [field.column_id, row[field.engine_name]])) : undefined;
      setPreview(navigationValues(action, dashboards, values, mapped)); setPreviewError(null);
    } catch (error) { setPreview(null); setPreviewError(error); }
  };
  const saveContext = async () => {
    if (!action || !snapshot.data || !target || busy || !canSaveContext || !reviewed || !matchingRevision) return;
    setBusy(true); setSaveError(null);
    try {
      const result = await saveDashboardNavigation(dashboard.id, { workflow_id: visualization.workflow_id, widget_id: widget.id,
        expected_workflow_revision: snapshot.data.workflow.revision, expected_dashboard_revision: dashboard.revision,
        expected_target_revision: target.revision, action, add_context_column_ids: missing, parameters, acknowledge_shared: reviewed });
      await Promise.allSettled([...["workflow", "workflow-schema", "workflows", "visualization-result", "navigation-fields", "dashboards"].map(key => client.invalidateQueries({ queryKey: [key] }))]);
      saved(result); close();
    } catch (error) { setSaveError(error); setBusy(false); }
  };
  return <dialog ref={dialog} aria-label={t("Configure navigation")} onCancel={event => { event.preventDefault(); cancel(); }} className="m-auto max-h-[90vh] w-[min(760px,94vw)] overflow-auto rounded-xl border border-outline bg-panel p-6 text-foreground backdrop:bg-black/60">
    <h2 className="text-lg">{t("Configure navigation")}: {widget.title || visualization.name}</h2>
    <p className="my-3 text-sm text-muted">{t(missing.length ? "Review new fields and save them with the transition in one operation." : "Choose the destination, then map its parameters. Changes are staged until you save the dashboard.")}</p>
    <fieldset disabled={busy}><NavigationConfiguration action={action} onChange={change} dashboards={dashboards} parameters={definitions} fields={fields} typed />
    {action && target ? <button disabled={query.isFetching || snapshot.isFetching} className="my-3 rounded border border-outline p-2 text-sm disabled:opacity-40" onClick={() => change(suggestNavigation(action, target, definitions, fields))}>{t("Suggest matching values")}</button> : null}
    <p className="my-3 text-xs text-muted">{t("Suggestions use unique name and type matches; existing mappings are preserved.")}</p>
    {missing.length ? <section className="my-3 rounded border border-outline p-3" aria-label={t("Review added navigation fields")}>
      <h3>{t("Fields to add to the visualization")}</h3><ul>{missing.map(id => <li key={id}>{fields.find(field => field.column_id === id)?.display_name}</li>)}</ul>
      <h3 className="mt-3">{t("Used in saved dashboards")}</h3><ul>{uses.map(use => <li key={use.id}>{use.label}</li>)}</ul>
      <p className="my-2 text-xs">{t("Added fields are shared by these widgets. The transition is saved for this widget.")}</p>
      {!canSaveContext ? <p className="text-warning">{t("Save dashboard changes before adding navigation fields.")}</p> : null}
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />{t("I reviewed the added fields and transition")}</label>
    </section> : null}
    {snapshot.error ? <p role="alert" className="text-danger">{errorText(snapshot.error)}</p> : null}
    {saveError ? <p role="alert" className="text-danger">{errorText(saveError)} <button onClick={() => { if (window.confirm(t("Discard navigation changes?"))) window.location.reload(); }}>{t("Reload dashboard")}</button></p> : null}
    {query.isFetching ? <p>{t("Loading…")}</p> : null}
    {query.error ? <p role="alert" className="text-danger">{errorText(query.error)} <button onClick={() => void query.refetch()}>{t("Retry")}</button></p> : null}
    {issues.length ? <ul aria-label={t("Navigation issues")} className="my-3 text-sm text-danger">{issues.map((issue, i) => <li key={i}>{issue.parameter}: {t(issue.message)}</li>)}</ul> : null}
    {action ? <button disabled={issues.length > 0 || query.isFetching || missing.length > 0} onClick={previewTransition} className="my-3 rounded border border-outline p-2 disabled:opacity-40">{t("Preview transition")}</button> : null}
    {missing.length ? <p className="text-xs text-muted">{t("Save the added fields and transition together before previewing the new values.")}</p> : null}
    <p className="text-xs text-muted">{t("Preview uses the first result row and current selections. Other rows may contain missing values.")}</p>
    {previewError ? <p role="alert" className="my-3 text-danger">{errorText(previewError)}</p> : null}
    {preview && target ? <div className="my-3 rounded border border-outline p-3"><h3>{target.name}</h3><dl aria-label={t("Destination parameter preview")}>{Object.entries(preview).map(([name, value]) => <div key={name} className="flex gap-3"><dt>{target.configuration?.parameters?.find(item => item.name === name)?.label || name}</dt><dd>{cell(value, target.configuration?.parameters?.find(item => item.name === name)?.logical_type ?? "string")}</dd></div>)}</dl></div> : null}
    </fieldset>
    <div className="sticky -bottom-6 -mx-6 -mb-6 mt-4 flex gap-4 border-t border-outline bg-panel p-4"><button disabled={busy || !dirty || issues.length > 0 || query.isFetching || (missing.length > 0 && (!reviewed || !canSaveContext || !matchingRevision))} className="rounded bg-primary p-2 text-on-primary disabled:opacity-40" onClick={() => { if (missing.length) void saveContext(); else { apply(action); close(); } }}>{t(missing.length ? "Save fields and transition" : "Apply navigation changes")}</button><button disabled={busy} onClick={cancel}>{t("Cancel")}</button></div>
  </dialog>;
}
