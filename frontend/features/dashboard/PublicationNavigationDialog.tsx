"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { getWorkflow } from "@/features/workflow/api";
import { apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import type { Dashboard, Visualization, Widget, NavigationAction } from "./api";
import { NavigationConfiguration } from "./DashboardConfiguration";

export function PublicationNavigationDialog({ visualization, widget, dashboard, dashboards, close, apply }: { visualization: Visualization; widget: Widget; dashboard: Dashboard; dashboards: Dashboard[]; close: () => void; apply: (action: NavigationAction | null, highlight: string[]) => void }) {
  const { t, errorText } = useI18n(); const dialog = useRef<HTMLDialogElement>(null);
  const [action, setAction] = useState(widget.config?.action ?? null), [highlight, setHighlight] = useState(widget.config?.highlight_only ?? []);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const data = useQuery({ queryKey: ["publication-navigation", visualization.id, visualization.revision], queryFn: async () => {
    const [workflow, schema] = await Promise.all([getWorkflow(visualization.workflow_id), apiRequest<components["schemas"]["PublicationSchema"]>(`/api/v1/workflows/${visualization.workflow_id}/publications/${visualization.publication_id}/schema`)]);
    if (workflow.revision !== schema.workflow_revision) throw new Error("This workflow was changed elsewhere. Reload before saving.");
    const publication = workflow.result_catalog?.outputs?.find(item => item.id === visualization.publication_id);
    const fields = new Set([...Object.values(publication?.semantic_fields ?? {}), ...(visualization.config?.context_column_ids ?? []), ...(visualization.type === "table" ? visualization.config?.column_ids ?? schema.columns.map(item => item.column_id) : [visualization.config?.category_column_id, visualization.config?.value_column_id])]);
    return { schema, publication, fields: schema.columns.filter(item => fields.has(item.column_id)) };
  } });
  const dirty = JSON.stringify(action) !== JSON.stringify(widget.config?.action ?? null) || JSON.stringify(highlight) !== JSON.stringify(widget.config?.highlight_only ?? []);
  const cancel = () => { if (!dirty || window.confirm(t("Discard navigation changes?"))) close(); };
  const change = (next: NavigationAction | null) => {
    if (next && next.dashboard_id !== action?.dashboard_id) {
      const destination = next.dashboard_id;
      const target = dashboards.find(item => item.id === destination);
      next = { ...next, values: Object.fromEntries((target?.configuration?.parameters ?? []).flatMap(role => {
        const field = data.data?.publication?.semantic_fields?.[role.name];
        return field && data.data?.fields.some(item => item.column_id === field && item.logical_type === role.logical_type) ? [[role.name, { source: "field" as const, name: field }]] : [];
      })) };
    }
    setAction(next);
  };
  return <dialog ref={dialog} onCancel={e => { e.preventDefault(); cancel(); }} aria-label={t("Configure navigation")} className="m-auto max-h-[90vh] w-[min(700px,94vw)] overflow-auto rounded-xl border border-outline bg-panel p-6 text-foreground backdrop:bg-black/60">
    <h2>{t("Configure navigation")}</h2><p className="my-3 text-sm text-muted">{t("Navigation preserves the period. Data roles supply suggested fields.")}</p>
    {data.error ? <p role="alert" className="text-danger">{errorText(data.error)}</p> : null}
    {data.data && <><NavigationConfiguration action={action} onChange={change} dashboards={dashboards} parameters={dashboard.configuration?.parameters ?? []} fields={data.data.fields} typed />
      {data.data.schema.roles.filter(role => data.data.publication?.semantic_fields?.[role.name]).map(role => <label className="my-3 block" key={role.name}><input type="checkbox" checked={highlight.includes(role.name)} onChange={e => setHighlight(current => e.target.checked ? [role.name] : current.filter(item => item !== role.name))} /> {t("Highlight only")} · {role.label || role.name}</label>)}</>}
    <div className="mt-4 flex gap-4"><button disabled={!data.data} onClick={() => { apply(action, highlight); close(); }}>{t("Apply")}</button><button onClick={cancel}>{t("Cancel")}</button></div>
  </dialog>;
}
