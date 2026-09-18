"use client";

import { useI18n } from "@/lib/i18n";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import GridLayout, { useContainerWidth, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { saveDashboard, type Dashboard, type Visualization } from "./api";
import { DashboardSettings, DashboardValueForm } from "./DashboardConfiguration";
import { CreateVisualizationDialog } from "./CreateVisualizationDialog";
import { VisualizationSettingsDialog } from "./VisualizationSettingsDialog";
import { WidgetNavigationDialog } from "./WidgetNavigationDialog";
import { LayoutTemplates } from "./LayoutTemplates";
import { WidgetActions } from "./WidgetActions";
import { emptyConfiguration, parseViewValues, resolveViewValues, workflowValues, navigationValues } from "./view-state";
import type { NavigationAction } from "./api";
import type { WorkflowSummary, ParameterValues } from "@/features/workflow/types";
import { VisualizationView } from "./VisualizationView";

type Props = { viewOnly?: boolean; onViewChange?: (view: boolean) => void; workflows?: WorkflowSummary[]; rawParameters?: string | null; onNavigate?: (id: string, values: ParameterValues) => void; initial: Dashboard; visualizations: Visualization[]; dashboards?: Dashboard[];
  onSelect?: (id: string) => void; onCreate?: () => void; onDelete?: () => void;
  onSaved?: (dashboard: Dashboard) => void; managementError?: Error; managementBusy?: boolean };
export function DashboardEditor({ viewOnly = false, onViewChange, initial, visualizations, dashboards = [], onSelect, onCreate, onDelete, onSaved, managementError, managementBusy, workflows = [], rawParameters = null, onNavigate }: Props) {
  const { t, errorText } = useI18n();
  const key = `nodebi:dashboard-draft:${initial.id}`;
  const [dashboard, setDashboard] = useState<Dashboard>(() => {
    try { const stored = sessionStorage.getItem(key); if (stored) { const parsed = JSON.parse(stored); if (parsed.id === initial.id && Array.isArray(parsed.widgets)) return parsed; } } catch { /* Ignore an unreadable draft; the saved dashboard is still available. */ }
    return initial;
  });
  const [navigationError, setNavigationError] = useState<unknown>(null);
  const [saved, setSaved] = useState(initial);
  const [authoring, setAuthoring] = useState<{ copy?: { visualization: Visualization; widgetId: string } } | null>(null);
  const [editingVisualization, setEditingVisualization] = useState<Visualization | null>(null);
  const [navigationWidgetId, setNavigationWidgetId] = useState<string | null>(null);
  const navigationWidget = dashboard.widgets.find(item => item.id === navigationWidgetId);
  const navigationVisualization = visualizations.find(item => item.id === navigationWidget?.visualization_id);
  const [selected, setSelected] = useState("");
  const [storageError, setStorageError] = useState("");
  const dirty = JSON.stringify(dashboard) !== JSON.stringify(saved);
  const { width, containerRef, mounted } = useContainerWidth();
  const save = useMutation({ mutationFn: () => saveDashboard(dashboard), onSuccess: result => {
    setDashboard(result); setSaved(result);
    try { sessionStorage.removeItem(key); } catch { setStorageError("Saved successfully, but local draft cleanup failed."); }
    onSaved?.(result);
  } });
  const busy = save.isPending || managementBusy;
  const change = (update: Dashboard | ((current: Dashboard) => Dashboard)) => {
    const next = typeof update === "function" ? update(dashboard) : update;
    try { sessionStorage.setItem(key, JSON.stringify(next)); }
    catch { setStorageError("Local draft storage is unavailable. Save before leaving this page."); }
    setDashboard(next);
  };
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  const leave = (action: () => void) => { if (!dirty || window.confirm(t("Dashboard changes are not saved. Keep this draft and continue?"))) action(); };
  const config = dashboard.configuration ?? emptyConfiguration;
  const availableDashboards = dashboards.map(item => item.id === dashboard.id ? dashboard : item);
  let supplied: Record<string, unknown> = {}, values: ParameterValues = {}, viewError: unknown = null;
  try { supplied = parseViewValues(rawParameters); values = resolveViewValues(config, supplied); } catch (error) { viewError = error; }
  const navigate = (action: NavigationAction, row?: Record<string, unknown>) => {
    try { const mapped = navigationValues(action, availableDashboards, values, row); setNavigationError(null); leave(() => onNavigate?.(action.dashboard_id, mapped)); }
    catch (error) { setNavigationError(error); }
  };
  const updateLayout = (layout: Layout) => change(current => ({ ...current, widgets: current.widgets.map(widget => {
    const item = layout.find(item => item.i === widget.id);
    return item ? { ...widget, x: item.x, y: item.y, width: item.w, height: item.h } : widget;
  }) }));
  const add = () => {
    if (!selected) return;
    const y = Math.max(0, ...dashboard.widgets.map(widget => widget.y + widget.height));
    change(current => ({ ...current, widgets: [...current.widgets, { id: crypto.randomUUID(), visualization_id: selected, x: 0, y, width: 6, height: 8 }] }));
  };
  return <main className="min-h-[calc(100vh-2.75rem)] bg-page p-6 text-foreground">
    {authoring && <CreateVisualizationDialog dashboard={saved} workflows={workflows} copy={authoring.copy} close={() => setAuthoring(null)} created={result => { setDashboard(result); setSaved(result); try { sessionStorage.removeItem(key); } catch { setStorageError("Saved successfully, but local draft cleanup failed."); } onSaved?.(result); }} />}
    {navigationWidget && navigationVisualization && <WidgetNavigationDialog canSaveContext={!dirty} saved={result => { setDashboard(result); setSaved(result); try { sessionStorage.removeItem(key); } catch { setStorageError("Saved successfully, but local draft cleanup failed."); } onSaved?.(result); }} key={navigationWidget.id} dashboard={dashboard} dashboards={availableDashboards} widget={navigationWidget} visualization={navigationVisualization} values={values} close={() => setNavigationWidgetId(null)} apply={action => change(current => ({ ...current, widgets: current.widgets.map(item => item.id === navigationWidget.id ? { ...item, config: { show_title: true, ...item.config, action } } : item) }))} />}
    {editingVisualization && <VisualizationSettingsDialog key={editingVisualization.id} visualization={editingVisualization} projectId={initial.project_id} close={() => setEditingVisualization(null)} />}
    <header className="flex flex-wrap items-center gap-4">
      {!viewOnly && <Link href={`/projects/${initial.project_id}/workflow`} onClick={event => { if (dirty && !window.confirm(t("Dashboard changes are not saved. Leave with a recoverable local draft?"))) event.preventDefault(); }} className="text-accent">{t("Workflow")}</Link>}
      {viewOnly ? <h1 className="min-w-0 flex-1 text-2xl">{dashboard.name}</h1> : <input aria-label={t("Dashboard name")} value={dashboard.name} disabled={busy} onChange={e => change({ ...dashboard, name: e.target.value })} className="min-w-0 flex-1 bg-transparent text-2xl" />}
      <span className="text-xs text-muted">{save.isPending ? t("Saving…") : dirty ? t("Unsaved changes") : t("Saved")}</span>
      {!viewOnly && <button onClick={() => save.mutate()} disabled={!dirty || busy} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary disabled:opacity-40">{t("Save dashboard")}</button>}
      {onViewChange ? <button disabled={busy} className="rounded border border-outline px-4 py-2 text-sm" onClick={() => onViewChange(!viewOnly)}>{t(viewOnly ? "Edit dashboard" : "View dashboard")}</button> : null}
      {viewOnly && dirty ? <p className="w-full text-xs text-warning">{t("Viewing unsaved changes. Return to editing to save them.")}</p> : null}
    </header>
    <nav className="mt-4 flex flex-wrap items-center gap-3 text-xs">
      {dashboards.length > 1 ? <select aria-label={t("Dashboard")} value={initial.id} disabled={save.isPending || managementBusy} onChange={e => leave(() => onSelect?.(e.target.value))} className="rounded-lg border border-outline bg-control px-3 py-2">{dashboards.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select> : null}
      {!viewOnly && onCreate ? <button disabled={save.isPending || managementBusy} onClick={() => leave(onCreate)} className="rounded-lg border border-outline px-3 py-2">{t("New dashboard")}</button> : null}
      {!viewOnly && onDelete ? <button disabled={save.isPending || managementBusy} onClick={() => { if (window.confirm(t("Delete this dashboard and its widgets? The workflow visualizations remain."))) onDelete(); }} className="text-danger">{t("Delete dashboard")}</button> : null}
    </nav>
    {managementError ? <p role="alert" className="mt-3 text-danger">{errorText(managementError)}</p> : null}
    {storageError ? <p role="alert" className="mt-3 text-warning">{errorText(storageError)}</p> : null}
    {save.error ? <div role="alert" className="mt-3 rounded-lg bg-danger-surface p-3 text-danger">{errorText(save.error)}<button className="ml-4 underline" onClick={() => { if (window.confirm(t("Discard this dashboard draft and reload?"))) { sessionStorage.removeItem(key); window.location.reload(); } }}>{t("Discard draft and reload")}</button></div> : null}
    <fieldset hidden={viewOnly} disabled={busy || viewOnly}>
      <DashboardSettings config={config} onChange={configuration => change({ ...dashboard, configuration })} workflows={workflows} dashboards={availableDashboards} />
      <WidgetActions dashboard={dashboard} dashboards={availableDashboards} visualizations={visualizations} values={values} onChange={widgets => change({ ...dashboard, widgets })} />
    </fieldset>
    <DashboardValueForm key={`${rawParameters}:${JSON.stringify(config.parameters)}`} dashboard={dashboard} supplied={supplied} onApply={next => { setNavigationError(null); onNavigate?.(dashboard.id, next); }} />
    {viewError ? <div role="alert" className="my-3 text-danger">{errorText(viewError)}<button className="ml-3 underline" onClick={() => onNavigate?.(dashboard.id, {})}>{t("Reset selections")}</button></div> : null}
    {navigationError ? <p role="alert" className="my-3 text-danger">{errorText(navigationError)}</p> : null}
    <nav className="my-3 flex gap-3">{config.links?.map((link, index) => <button key={index} className="text-sm text-accent underline" onClick={() => navigate(link.action)}>{link.label}</button>)}</nav>
    {!viewOnly && <div className="mt-4 flex items-center gap-3"><button className="rounded border border-outline p-2" disabled={dirty || busy || dashboard.widgets.length >= 100 || !workflows.length} onClick={() => setAuthoring({})}>{t("Create visualization widget")}</button>{dirty ? <p className="text-xs text-muted">{t("Save dashboard changes before creating or copying a visualization.")}</p> : null}</div>}
    {!viewOnly && <div className="my-5 flex gap-3"><select aria-label={t("Add visualization")} value={selected} disabled={busy} onChange={e => setSelected(e.target.value)} className="rounded-lg border border-outline bg-control px-3 py-2"><option value="">{t("Select visualization")}</option>{visualizations.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><button onClick={add} disabled={!selected || busy || dashboard.widgets.length >= 100} className="rounded-lg border border-outline px-4 py-2 disabled:opacity-40">{t("Add widget")}</button></div>}
    <div hidden={viewOnly}><LayoutTemplates widgets={dashboard.widgets} visualizations={visualizations} busy={busy} onChange={widgets => change(current => ({ ...current, widgets }))} /></div>
    {!dashboard.widgets.length ? <p className="py-20 text-center text-muted">{t("Add a saved visualization from your workflow.")}</p> : null}
    <div ref={containerRef}>{mounted ? <GridLayout width={width} gridConfig={{ cols: 12, rowHeight: 30, margin: [12, 12] }} dragConfig={{ enabled: !busy && !viewOnly, handle: ".widget-handle" }} resizeConfig={{ enabled: !busy && !viewOnly }} layout={dashboard.widgets.map(w => ({ i: w.id, x: w.x, y: w.y, w: w.width, h: w.height, minW: 2, minH: 2, maxH: 40, static: viewOnly }))} onDragStop={layout => { if (!viewOnly) updateLayout(layout); }} onResizeStop={layout => { if (!viewOnly) updateLayout(layout); }}>
      {dashboard.widgets.map(widget => <div key={widget.id} data-widget-id={widget.id} className="flex flex-col overflow-hidden rounded-xl border border-outline bg-surface">
        {!viewOnly && <div className="flex shrink-0 items-center border-b border-outline"><div className="widget-handle flex-1 cursor-move px-4 py-2 text-xs text-muted" aria-label={t("Move widget")}>{t("Drag to move")}</div><button aria-label={t("Remove widget")} disabled={busy} className="px-3 text-muted" onClick={() => change(current => ({ ...current, widgets: current.widgets.filter(w => w.id !== widget.id) }))}>×</button></div>}
        {!viewOnly && <div className="flex items-center gap-2 px-3 py-1"><button disabled={busy || !visualizations.some(item => item.id === widget.visualization_id)} className="text-xs text-accent underline" onClick={() => setNavigationWidgetId(widget.id)}>{t("Configure navigation")}</button>{visualizations.find(item => item.id === widget.visualization_id) ? <Link className="text-xs text-accent underline" href={`/projects/${initial.project_id}/workflow?workflow=${encodeURIComponent(visualizations.find(item => item.id === widget.visualization_id)!.workflow_id)}&node=${encodeURIComponent(widget.visualization_id)}`} onClick={event => { if (dirty && !window.confirm(t("Dashboard changes are not saved. Leave with a recoverable local draft?"))) event.preventDefault(); }}>{t("Open calculation")}</Link> : null}<button disabled={dirty || busy} className="text-xs text-accent underline" aria-label={t("Independent visualization copy")} onClick={() => { const visualization = visualizations.find(item => item.id === widget.visualization_id); if (visualization) setAuthoring({ copy: { visualization, widgetId: widget.id } }); }}>{t("Independent copy")}</button><button disabled={busy} className="text-xs text-accent underline" aria-label={t("Edit visualization")} onClick={() => { const visualization = visualizations.find(item => item.id === widget.visualization_id); if (visualization) setEditingVisualization(visualization); }}>{t("Settings")}</button><input aria-label={t("Widget title")} placeholder={visualizations.find(v => v.id === widget.visualization_id)?.name ?? t("Widget title")} value={widget.title ?? ""} disabled={busy} onChange={e => change(current => ({ ...current, widgets: current.widgets.map(w => w.id === widget.id ? { ...w, title: e.target.value || null } : w) }))} className="min-w-0 flex-1 bg-transparent text-xs" /><label className="flex gap-1 text-[10px] text-muted"><input type="checkbox" aria-label={t("Show widget title")} checked={widget.config?.show_title !== false} disabled={busy} onChange={e => change(current => ({ ...current, widgets: current.widgets.map(w => w.id === widget.id ? { ...w, config: { ...w.config, show_title: e.target.checked } } : w) }))} />{t("Title")}</label></div>}
        <div className="min-h-0 flex-1">{!viewError ? <VisualizationView id={widget.visualization_id} parameters={workflowValues(config, visualizations.find(v => v.id === widget.visualization_id)?.workflow_id ?? "", values)} onSelect={widget.config?.action ? row => navigate(widget.config!.action!, row) : undefined} titleOverride={widget.title ?? undefined} hideTitle={widget.config?.show_title === false} /> : null}</div>
      </div>)}
    </GridLayout> : null}</div>
  </main>;
}
