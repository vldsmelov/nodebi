"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import type { ParameterValues } from "@/features/workflow/types";
import { getVisualizationResult, type Dashboard, type NavigationAction, type Visualization, type Widget } from "./api";
import { NavigationConfiguration } from "./DashboardConfiguration";
import { navigationIssues, suggestNavigation } from "./navigation-plan";
import { emptyConfiguration, navigationValues, workflowValues } from "./view-state";

export function WidgetNavigationDialog({ dashboard, dashboards, widget, visualization, values, apply, close }: {
  dashboard: Dashboard; dashboards: Dashboard[]; widget: Widget; visualization: Visualization;
  values: ParameterValues; apply: (action: NavigationAction | null) => void; close: () => void;
}) {
  const { t, errorText, cell } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const [action, setAction] = useState(widget.config?.action ?? null);
  const [preview, setPreview] = useState<ParameterValues | null>(null);
  const [previewError, setPreviewError] = useState<unknown>(null);
  const dirty = JSON.stringify(action) !== JSON.stringify(widget.config?.action ?? null);
  const parameters = workflowValues(dashboard.configuration ?? emptyConfiguration, visualization.workflow_id, values);
  const query = useQuery({ queryKey: ["navigation-fields", visualization.id, parameters], queryFn: () => getVisualizationResult(visualization.id, 0, parameters), retry: false });
  const fields = query.data?.columns ?? [];
  const definitions = dashboard.configuration?.parameters ?? [];
  const target = dashboards.find(item => item.id === action?.dashboard_id);
  const issues = navigationIssues(action, target, definitions, fields);
  const change = (next: NavigationAction | null) => { setAction(next); setPreview(null); setPreviewError(null); };
  const cancel = () => { if (!dirty || window.confirm(t("Discard navigation changes?"))) close(); };
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  const previewTransition = () => {
    if (!action) return;
    try {
      const row = query.data?.rows[0];
      const mapped = row ? Object.fromEntries(fields.map(field => [field.column_id, row[field.engine_name]])) : undefined;
      setPreview(navigationValues(action, dashboards, values, mapped)); setPreviewError(null);
    } catch (error) { setPreview(null); setPreviewError(error); }
  };
  return <dialog ref={dialog} aria-label={t("Configure navigation")} onCancel={event => { event.preventDefault(); cancel(); }} className="m-auto max-h-[90vh] w-[min(760px,94vw)] overflow-auto rounded-xl border border-outline bg-panel p-6 text-foreground backdrop:bg-black/60">
    <h2 className="text-lg">{t("Configure navigation")}: {widget.title || visualization.name}</h2>
    <p className="my-3 text-sm text-muted">{t("Choose the destination, then map its parameters. Changes are staged until you save the dashboard.")}</p>
    <NavigationConfiguration action={action} onChange={change} dashboards={dashboards} parameters={definitions} fields={fields} typed />
    {action && target ? <button disabled={query.isFetching} className="my-3 rounded border border-outline p-2 text-sm disabled:opacity-40" onClick={() => change(suggestNavigation(action, target, definitions, fields))}>{t("Suggest matching values")}</button> : null}
    <p className="my-3 text-xs text-muted">{t("Suggestions use unique name and type matches; existing mappings are preserved.")}</p>
    <p className="my-3 text-xs text-muted">{t("Only fields returned by the visualization are available. Add missing identity fields in visualization navigation fields first.")}</p>
    {query.isFetching ? <p>{t("Loading…")}</p> : null}
    {query.error ? <p role="alert" className="text-danger">{errorText(query.error)} <button onClick={() => void query.refetch()}>{t("Retry")}</button></p> : null}
    {issues.length ? <ul aria-label={t("Navigation issues")} className="my-3 text-sm text-danger">{issues.map((issue, i) => <li key={i}>{issue.parameter}: {t(issue.message)}</li>)}</ul> : null}
    {action ? <button disabled={issues.length > 0 || query.isFetching} onClick={previewTransition} className="my-3 rounded border border-outline p-2 disabled:opacity-40">{t("Preview transition")}</button> : null}
    <p className="text-xs text-muted">{t("Preview uses the first result row and current selections. Other rows may contain missing values.")}</p>
    {previewError ? <p role="alert" className="my-3 text-danger">{errorText(previewError)}</p> : null}
    {preview && target ? <div className="my-3 rounded border border-outline p-3"><h3>{target.name}</h3><dl aria-label={t("Destination parameter preview")}>{Object.entries(preview).map(([name, value]) => <div key={name} className="flex gap-3"><dt>{target.configuration?.parameters?.find(item => item.name === name)?.label || name}</dt><dd>{cell(value, target.configuration?.parameters?.find(item => item.name === name)?.logical_type ?? "string")}</dd></div>)}</dl></div> : null}
    <div className="sticky -bottom-6 -mx-6 -mb-6 mt-4 flex gap-4 border-t border-outline bg-panel p-4"><button disabled={!dirty || issues.length > 0 || query.isFetching} className="rounded bg-primary p-2 text-on-primary disabled:opacity-40" onClick={() => { apply(action); close(); }}>{t("Apply navigation changes")}</button><button onClick={cancel}>{t("Cancel")}</button></div>
  </dialog>;
}
