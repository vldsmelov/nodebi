"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { getVisualizationResult, type Dashboard, type Visualization, type Widget } from "./api";
import { NavigationConfiguration } from "./DashboardConfiguration";
import { emptyConfiguration, workflowValues } from "./view-state";
import type { ParameterValues } from "@/features/workflow/types";

export function WidgetActions({ dashboard, dashboards, visualizations, values, onChange }: {
  dashboard: Dashboard; dashboards: Dashboard[]; visualizations: Visualization[];
  values: ParameterValues; onChange: (widgets: Widget[]) => void;
}) {
  const { t, errorText } = useI18n();
  const [selected, setSelected] = useState("");
  const widget = dashboard.widgets.find(item => item.id === selected);
  const visualization = visualizations.find(item => item.id === widget?.visualization_id);
  const parameters = workflowValues(dashboard.configuration ?? emptyConfiguration, visualization?.workflow_id ?? "", values);
  const query = useQuery({ queryKey: ["navigation-fields", visualization?.id, parameters], enabled: !!visualization, queryFn: () => getVisualizationResult(visualization!.id, 0, parameters), retry: false });
  return <details className="my-3 rounded-lg border border-outline p-3"><summary className="cursor-pointer text-sm">{t("Widget navigation")}</summary>
    <select aria-label={t("Configure widget navigation")} className="my-3 rounded border border-outline bg-control p-2 text-xs" value={selected} onChange={e => setSelected(e.target.value)}><option value="">{t("Select widget")}</option>{dashboard.widgets.map(item => <option key={item.id} value={item.id}>{item.title || visualizations.find(v => v.id === item.visualization_id)?.name || item.id}</option>)}</select>
    {query.error ? <p role="alert" className="text-xs text-danger">{errorText(query.error)}</p> : null}
    {widget ? <NavigationConfiguration action={widget.config?.action} dashboards={dashboards} parameters={dashboard.configuration?.parameters ?? []} fields={query.data?.columns ?? []} onChange={action => onChange(dashboard.widgets.map(item => item.id === widget.id ? { ...item, config: { show_title: true, ...item.config, action } } : item))} /> : null}
  </details>;
}
