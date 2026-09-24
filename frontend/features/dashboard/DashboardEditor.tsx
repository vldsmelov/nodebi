"use client";

import { useI18n } from "@/lib/i18n";

import { getWorkflow } from "@/features/workflow/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import GridLayout, { useContainerWidth, noCompactor, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { saveDashboard, type Dashboard, type Visualization } from "./api";
import { DashboardSettings, DashboardValueForm } from "./DashboardConfiguration";
import { PeriodCoverage } from "./PeriodCoverage";
import { PublicationNavigationDialog } from "./PublicationNavigationDialog";
import { VisualizationLibrary } from "./VisualizationLibrary";
import { DashboardPeriod, parsePeriod, type Period } from "./DashboardPeriod";
import { VisualizationEditor, type EditorHandle, type DraftPreview } from "./VisualizationEditor";
import { DashboardSidePanel } from "./DashboardSidePanel";
import { WidgetPlacement } from "./WidgetPlacement";
import { placeWidget } from "./placement";
import { Settings, MoreHorizontal, GripVertical } from "lucide-react";
import { CreateVisualizationDialog } from "./CreateVisualizationDialog";
import { VisualizationSettingsDialog } from "./VisualizationSettingsDialog";
import { WidgetNavigationDialog } from "./WidgetNavigationDialog";
import { LayoutTemplates } from "./LayoutTemplates";
import { WidgetActions } from "./WidgetActions";
import { emptyConfiguration, parseViewValues, resolveViewValues, workflowValues, navigationValues } from "./view-state";
import type { NavigationAction } from "./api";
import type { WorkflowSummary, ParameterValues } from "@/features/workflow/types";
import { VisualizationResultView, VisualizationView } from "./VisualizationView";

type Props = { rawPeriod?: string | null; onPeriodChange?: (value: Period | null) => void; viewOnly?: boolean; onViewChange?: (view: boolean) => void; workflows?: WorkflowSummary[]; rawParameters?: string | null; onNavigate?: (id: string, values: ParameterValues) => void; initial: Dashboard; visualizations: Visualization[]; dashboards?: Dashboard[];
  onSelect?: (id: string) => void; onCreate?: () => void; onDelete?: () => void;
  onSaved?: (dashboard: Dashboard) => void; managementError?: Error; managementBusy?: boolean };
export function DashboardEditor({ rawPeriod = null, onPeriodChange, viewOnly = false, onViewChange, initial, visualizations, dashboards = [], onSelect, onCreate, onDelete, onSaved, managementError, managementBusy, workflows = [], rawParameters = null, onNavigate }: Props) {
  const { t, errorText } = useI18n();
  const contextualFlows = useQuery({ queryKey: ["published-workflows", initial.project_id], queryFn: () => Promise.all(workflows.map(item => getWorkflow(item.id))), enabled: workflows.length > 0 });
  const key = `nodebi:dashboard-draft:${initial.id}`;
  const [dashboard, setDashboard] = useState<Dashboard>(() => {
    try { const stored = sessionStorage.getItem(key); if (stored) { const parsed = JSON.parse(stored); if (parsed.id === initial.id && Array.isArray(parsed.widgets)) return parsed; } } catch { /* Ignore an unreadable draft; the saved dashboard is still available. */ }
    return initial;
  });
  const [past, setPast] = useState<Dashboard[]>([]), [future, setFuture] = useState<Dashboard[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editingBusy, setEditingBusy] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [draftPreview, setDraftPreview] = useState<DraftPreview | null>(null);
  const editor = useRef<EditorHandle>(null);
  const switchPanel = (action: () => void) => { if (editor.current) editor.current.leave(action); else action(); };
  const closePanel = () => { setAuthoring(null); setEditingVisualization(null); setSelectedWidget(null); setDraftPreview(null); setLibraryOpen(false); };
  const editVisualization = (value: Visualization, widgetId?: string) => switchPanel(() => { closePanel(); setEditingVisualization(value); setSelectedWidget(widgetId ?? null); });
  const [navigationError, setNavigationError] = useState<unknown>(null);
  const [saved, setSaved] = useState(initial);
  const [authoring, setAuthoring] = useState<{ copy?: { visualization: Visualization; widgetId: string } } | null>(null);
  const [editingVisualization, setEditingVisualization] = useState<Visualization | null>(null);
  const [navigationWidgetId, setNavigationWidgetId] = useState<string | null>(null);
  const navigationWidget = dashboard.widgets.find(item => item.id === navigationWidgetId);
  const navigationVisualization = visualizations.find(item => item.id === navigationWidget?.visualization_id);

  const [storageError, setStorageError] = useState("");
  const dirty = JSON.stringify(dashboard) !== JSON.stringify(saved);
  const { width, containerRef, mounted } = useContainerWidth();
  const save = useMutation({ mutationFn: () => saveDashboard(dashboard), onSuccess: result => {
    setDashboard(result); setSaved(result);
    try { sessionStorage.removeItem(key); } catch { setStorageError("Saved successfully, but local draft cleanup failed."); }
    onSaved?.(result);
  } });
  const busy = save.isPending || managementBusy || editingBusy;
  const change = (update: Dashboard | ((current: Dashboard) => Dashboard)) => {
    if (save.isPending || managementBusy) return;
    const next = typeof update === "function" ? update(dashboard) : update;
    if (JSON.stringify(next) === JSON.stringify(dashboard)) return;
    setPast(items => [...items.slice(-99), dashboard]); setFuture([]);
    try { sessionStorage.setItem(key, JSON.stringify(next)); }
    catch { setStorageError("Local draft storage is unavailable. Save before leaving this page."); }
    setDashboard(next);
  };
  const history = (redo: boolean) => {
    const stack = redo ? future : past;
    const snapshot = stack.at(-1); if (!snapshot || busy) return;
    const next = { ...snapshot, revision: saved.revision };
    if (redo) { setFuture(stack.slice(0, -1)); setPast(items => [...items, dashboard]); }
    else { setPast(stack.slice(0, -1)); setFuture(items => [...items, dashboard]); }
    try { sessionStorage.setItem(key, JSON.stringify(next)); } catch { setStorageError("Local draft storage is unavailable. Save before leaving this page."); }
    setDashboard(next);
  };
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  const leave = (action: () => void) => switchPanel(() => { if (!dirty || window.confirm(t("Dashboard changes are not saved. Keep this draft and continue?"))) action(); });
  const config = dashboard.configuration ?? emptyConfiguration;
  const availableDashboards = dashboards.map(item => item.id === dashboard.id ? dashboard : item);
  let supplied: Record<string, unknown> = {}, values: ParameterValues = {}, viewError: unknown = null;
  let period: Period | null = null;
  try { period = parsePeriod(rawPeriod); supplied = parseViewValues(rawParameters); values = resolveViewValues(config, supplied); } catch (error) { viewError = error; }
  const navigate = (action: NavigationAction, row?: Record<string, unknown>) => {
    try { const mapped = navigationValues(action, availableDashboards, values, row); setNavigationError(null); leave(() => onNavigate?.(action.dashboard_id, mapped)); }
    catch (error) { setNavigationError(error); }
  };
  const updateLayout = (layout: Layout) => change(current => ({ ...current, widgets: current.widgets.map(widget => {
    const item = layout.find(item => item.i === widget.id);
    return item ? { ...widget, x: item.x, y: item.y, width: item.w, height: item.h } : widget;
  }) }));
  const add = (identity: string, created?: Visualization) => {
    if (!identity) return;
    const visualization = created ?? visualizations.find(item => item.id === identity);
    const flow = contextualFlows.data?.find(item => item.id === visualization?.workflow_id);
    const published = flow?.result_catalog?.outputs?.find(item => item.id === visualization?.publication_id);
    const roles = flow?.result_catalog?.contexts?.filter(item => published?.context_ids?.includes(item.id)).flatMap(item => item.roles ?? []) ?? [];
    const parameters = [...(config.parameters ?? [])];
    for (const role of roles) if (!parameters.some(item => item.name === role.name)) parameters.push({ ...role, required: false });


    change(current => ({ ...current, configuration: { ...config, parameters }, widgets: [...current.widgets, { id: crypto.randomUUID(), visualization_id: identity, ...placeWidget(current.widgets, visualization?.type ?? "bar_chart") }] }));
  };
  const panelOpen = !viewOnly && (libraryOpen || !!authoring && (!authoring.copy || !!authoring.copy.visualization.publication_id) || !!editingVisualization?.publication_id);
  const selected = dashboard.widgets.find(item => item.id === selectedWidget);
  return <main className={`min-h-[calc(100vh-2.75rem)] bg-page p-6 text-foreground ${panelOpen ? "xl:pr-[464px]" : ""}`}>
    {authoring && authoring.copy && !authoring.copy.visualization.publication_id && <CreateVisualizationDialog dashboard={saved} workflows={workflows} copy={authoring.copy} close={() => setAuthoring(null)} created={result => { setDashboard(result); setSaved(result); try { sessionStorage.removeItem(key); } catch { setStorageError("Saved successfully, but local draft cleanup failed."); } onSaved?.(result); }} />}
    {panelOpen && <DashboardSidePanel title={t(libraryOpen ? "Add chart" : "Visualization settings")} onClose={() => switchPanel(closePanel)}>
      {libraryOpen ? <><div className="flex items-center justify-between"><h2>{t("Add chart")}</h2><button aria-label={t("Close settings")} onClick={closePanel}>&#215;</button></div><button className="my-4 rounded bg-primary p-2 text-on-primary" disabled={busy || dashboard.widgets.length >= 100 || !workflows.length} onClick={() => { setLibraryOpen(false); setAuthoring({}); }}>{t("Create visualization")}</button><VisualizationLibrary items={visualizations} dashboards={availableDashboards} busy={busy || dashboard.widgets.length >= 100} onAdd={id => { add(id); closePanel(); }} onEdit={value => editVisualization(value)} /></> : <VisualizationEditor key={`${editingVisualization?.id ?? authoring?.copy?.visualization.id ?? "new"}:${selectedWidget}:${!!authoring?.copy}`} editorRef={editor} embedded
        visualization={editingVisualization ?? authoring?.copy?.visualization} projectId={initial.project_id} copy={!!authoring?.copy} close={closePanel}
        context={{ period, values, highlight_only: selected?.config?.highlight_only ?? [] }}
        onPreview={selected ? setDraftPreview : undefined}
        onBusyChange={setEditingBusy} blocked={save.isPending || managementBusy}
        placement={selected ? <WidgetPlacement widget={selected} widgets={dashboard.widgets} name={editingVisualization?.name ?? ""} onChange={widgets => change(current => ({ ...current, widgets }))} /> : undefined}
        onCopy={selected ? result => change(current => ({ ...current, widgets: current.widgets.map(item => item.id === selected.id ? { ...item, visualization_id: result.id } : item) })) : undefined}
        onCreated={result => { if (authoring?.copy) change(current => ({ ...current, widgets: current.widgets.map(item => item.id === authoring.copy!.widgetId ? { ...item, visualization_id: result.id } : item) })); else if (authoring) add(result.id, result); }} />}
    </DashboardSidePanel>}

    {navigationWidget && navigationVisualization && !navigationVisualization.publication_id && <WidgetNavigationDialog canSaveContext={!dirty} saved={result => { setDashboard(result); setSaved(result); try { sessionStorage.removeItem(key); } catch { setStorageError("Saved successfully, but local draft cleanup failed."); } onSaved?.(result); }} key={navigationWidget.id} dashboard={dashboard} dashboards={availableDashboards} widget={navigationWidget} visualization={navigationVisualization} values={values} close={() => setNavigationWidgetId(null)} apply={action => change(current => ({ ...current, widgets: current.widgets.map(item => item.id === navigationWidget.id ? { ...item, config: { show_title: true, ...item.config, action } } : item) }))} />}
    {navigationWidget && navigationVisualization?.publication_id && <PublicationNavigationDialog visualization={navigationVisualization} widget={navigationWidget} dashboard={dashboard} dashboards={availableDashboards} close={() => setNavigationWidgetId(null)} apply={(action, highlight_only) => change(current => ({ ...current, widgets: current.widgets.map(item => item.id === navigationWidget.id ? { ...item, config: { show_title: true, ...item.config, action, highlight_only } } : item) }))} />}
    {editingVisualization && !editingVisualization.publication_id && <VisualizationSettingsDialog placement={selected ? <WidgetPlacement widget={selected} widgets={dashboard.widgets} name={editingVisualization.name} onChange={widgets => change(current => ({ ...current, widgets }))} /> : undefined} key={editingVisualization.id} visualization={editingVisualization} projectId={initial.project_id} close={() => setEditingVisualization(null)} />}
    <header className="flex flex-wrap items-center gap-4">
      {!viewOnly && <Link href={`/projects/${initial.project_id}/workflow`} onClick={event => { event.preventDefault(); const href = event.currentTarget.href; leave(() => { window.location.href = href; }); }} className="text-accent">{t("Workflow")}</Link>}
      {viewOnly ? <h1 className="min-w-0 flex-1 text-2xl">{dashboard.name}</h1> : <input aria-label={t("Dashboard name")} value={dashboard.name} disabled={busy} onChange={e => change({ ...dashboard, name: e.target.value })} className="min-w-0 flex-1 bg-transparent text-2xl" />}
      <span className="text-xs text-muted">{save.isPending ? t("Saving…") : dirty ? t("Unsaved changes") : t("Saved")}</span>
      {!viewOnly && <button onClick={() => save.mutate()} disabled={!dirty || busy} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary disabled:opacity-40">{t("Save dashboard")}</button>}
      {onViewChange ? <button disabled={busy} className="rounded border border-outline px-4 py-2 text-sm" onClick={() => switchPanel(() => { closePanel(); onViewChange(!viewOnly); })}>{t(viewOnly ? "Edit dashboard" : "View dashboard")}</button> : null}
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
    <details hidden={viewOnly} className="my-3"><summary className="text-sm text-muted">{t("Advanced dashboard settings")}</summary><fieldset disabled={busy || viewOnly}>
      <label className="my-3 block"><input type="checkbox" checked={config.period_enabled ?? false} onChange={e => change({ ...dashboard, configuration: { ...config, period_enabled: e.target.checked } })} /> {t("Show shared period")}</label>
      <DashboardSettings config={config} onChange={configuration => change({ ...dashboard, configuration })} workflows={workflows} dashboards={availableDashboards} />
      <WidgetActions dashboard={dashboard} dashboards={availableDashboards} visualizations={visualizations} values={values} onChange={widgets => change({ ...dashboard, widgets })} />
    </fieldset></details>
    {(config.period_enabled || rawPeriod) && <DashboardPeriod timezone={contextualFlows.data?.flatMap(flow => flow.result_catalog?.contexts ?? [])[0]?.timezone} key={rawPeriod} period={period} onChange={value => onPeriodChange?.(value)} />}
    {config.period_enabled && <PeriodCoverage visualizations={visualizations.filter(item => dashboard.widgets.some(widget => widget.visualization_id === item.id))} />}
    {dashboard.widgets.some(widget => !visualizations.find(item => item.id === widget.visualization_id)?.publication_id) ? <DashboardValueForm key={`${rawParameters}:${JSON.stringify(config.parameters)}`} dashboard={dashboard} supplied={supplied} onApply={next => { setNavigationError(null); onNavigate?.(dashboard.id, next); }} /> : <div className="my-3 flex flex-wrap gap-3 text-sm">{(config.parameters ?? []).filter(item => values[item.name] != null).map(item => <span key={item.name}>{item.label || item.name}: {String(values[item.name])}</span>)}{Object.values(values).some(value => value != null) && <button className="text-accent underline" onClick={() => leave(() => window.history.back())}>{t("Back")}</button>}</div>}
    {viewError ? <div role="alert" className="my-3 text-danger">{errorText(viewError)}<button className="ml-3 underline" onClick={() => onNavigate?.(dashboard.id, {})}>{t("Reset selections")}</button></div> : null}
    {navigationError ? <p role="alert" className="my-3 text-danger">{errorText(navigationError)}</p> : null}
    <nav className="my-3 flex gap-3">{config.links?.map((link, index) => <button key={index} className="text-sm text-accent underline" onClick={() => navigate(link.action)}>{link.label}</button>)}</nav>
    {!viewOnly && <div className="my-4 flex flex-wrap items-center gap-3"><button className="rounded bg-primary px-4 py-2 text-on-primary" disabled={busy} onClick={() => switchPanel(() => { closePanel(); setLibraryOpen(true); })}>{t("Add chart")}</button><LayoutTemplates showUndo={false} widgets={dashboard.widgets} visualizations={visualizations} busy={busy} onChange={widgets => change(current => ({ ...current, widgets }))} /><button disabled={busy || !past.length} onClick={() => history(false)}>{t("Undo layout change")}</button><button disabled={busy || !future.length} onClick={() => history(true)}>{t("Redo layout change")}</button></div>}
    {!dashboard.widgets.length ? <p className="py-20 text-center text-muted">{t("Add a saved visualization from your workflow.")}</p> : null}
    <div ref={containerRef}>{mounted ? <GridLayout compactor={noCompactor} width={width} gridConfig={{ cols: 12, rowHeight: 30, margin: [12, 12] }} dragConfig={{ enabled: !busy && !viewOnly, handle: ".widget-handle" }} resizeConfig={{ enabled: !busy && !viewOnly }} layout={dashboard.widgets.map(w => ({ i: w.id, x: w.x, y: w.y, w: w.width, h: w.height, minW: 2, minH: 2, maxH: 40, static: viewOnly }))} onDragStop={layout => { if (!viewOnly) updateLayout(layout); }} onResizeStop={layout => { if (!viewOnly) updateLayout(layout); }}>
      {dashboard.widgets.map(widget => <div key={widget.id} data-widget-id={widget.id} className={`flex flex-col rounded-xl border bg-surface ${selectedWidget === widget.id ? "border-accent ring-1 ring-accent" : "border-outline"}`}>
        {!viewOnly && <div className="flex shrink-0 items-center gap-2 border-b border-outline px-3 py-2">
          <div className="widget-handle flex min-w-0 flex-1 cursor-move items-center gap-2 text-sm" aria-label={t("Move widget")}><GripVertical size={16} className="shrink-0 text-muted" /><span className="truncate">{widget.title || visualizations.find(item => item.id === widget.visualization_id)?.name}</span></div>
          <button aria-label={t("Edit visualization")} title={t("Settings")} disabled={busy} className="rounded p-2 hover:bg-accent/10" onClick={() => { const value = visualizations.find(item => item.id === widget.visualization_id); if (value) editVisualization(value, widget.id); }}><Settings size={17} /></button>
          <details className="relative"><summary aria-label={t("Widget actions")} className="cursor-pointer list-none rounded p-2"><MoreHorizontal size={17} /></summary><div className="absolute right-0 top-8 z-20 grid w-52 gap-3 rounded border border-outline bg-panel p-3 text-xs shadow-lg">
            <button disabled={busy} onClick={() => switchPanel(() => { closePanel(); setNavigationWidgetId(widget.id); })}>{t("Configure navigation")}</button>
            {visualizations.find(item => item.id === widget.visualization_id) && <Link href={`/projects/${initial.project_id}/workflow?workflow=${encodeURIComponent(visualizations.find(item => item.id === widget.visualization_id)!.workflow_id)}&mode=fields&node=${encodeURIComponent(visualizations.find(item => item.id === widget.visualization_id)!.node_id)}`} onClick={event => { event.preventDefault(); const href = event.currentTarget.href; leave(() => { window.location.href = href; }); }}>{t("Open calculation")}</Link>}
            <button disabled={busy || dirty && !visualizations.find(item => item.id === widget.visualization_id)?.publication_id} aria-label={t("Independent visualization copy")} onClick={() => switchPanel(() => { const value = visualizations.find(item => item.id === widget.visualization_id); if (value) { closePanel(); setAuthoring({ copy: { visualization: value, widgetId: widget.id } }); setSelectedWidget(widget.id); } })}>{t("Independent copy")}</button>
            <button aria-label={t("Remove widget")} disabled={busy} className="text-danger" onClick={() => switchPanel(() => { closePanel(); change(current => ({ ...current, widgets: current.widgets.filter(w => w.id !== widget.id) })); })}>{t("Remove widget")}</button>
          </div></details>
        </div>}
        <div className="min-h-0 flex-1 overflow-hidden rounded-b-xl">{!viewError && selectedWidget === widget.id && draftPreview ? <div className="flex h-full flex-col"><p className="px-3 text-xs text-accent">{t("Preview")}</p>{draftPreview.message ? <p role="status" className="p-4 text-sm text-muted">{t(draftPreview.message)}</p> : draftPreview.loading ? <p role="status">{t("Updating preview")}</p> : draftPreview.error ? <p role="alert" className="p-3 text-danger">{errorText(draftPreview.error)}</p> : draftPreview.result ? <div className="min-h-0 flex-1"><VisualizationResultView result={draftPreview.result} titleOverride={widget.title ?? undefined} hideTitle={widget.config?.show_title === false} /></div> : null}</div> : !viewError ? <VisualizationView id={widget.visualization_id} revision={visualizations.find(v => v.id === widget.visualization_id)?.revision} context={visualizations.find(v => v.id === widget.visualization_id)?.publication_id ? { period, values, highlight_only: widget.config?.highlight_only } : undefined} parameters={workflowValues(config, visualizations.find(v => v.id === widget.visualization_id)?.workflow_id ?? "", values)} onSelect={widget.config?.action ? row => navigate(widget.config!.action!, row) : undefined} titleOverride={widget.title ?? undefined} hideTitle={widget.config?.show_title === false} /> : null}</div>
      </div>)}
    </GridLayout> : null}</div>
  </main>;
}
