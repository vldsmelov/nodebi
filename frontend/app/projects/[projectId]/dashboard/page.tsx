"use client";

import { useI18n } from "@/lib/i18n";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { listWorkflows } from "@/features/workflow/api";
import { dashboardUrl } from "@/features/dashboard/view-state";
import type { ParameterValues } from "@/features/workflow/types";
import { createDashboard, deleteDashboard, listDashboards, listVisualizations, type Dashboard } from "@/features/dashboard/api";
import { DashboardEditor } from "@/features/dashboard/DashboardEditor";

export default function DashboardPage() {
  const { t, errorText } = useI18n();
  const { projectId } = useParams<{ projectId: string }>();
  const client = useQueryClient();
  const router = useRouter();
  const search = useSearchParams();
  const viewOnly = search.get("mode") === "view";
  const setViewOnly = (view: boolean) => { const next = new URLSearchParams(search.toString()); if (view) next.set("mode", "view"); else next.delete("mode"); router.push(`/projects/${projectId}/dashboard?${next}`); };
  const selected = search.get("dashboard") ?? "";
  const setSelected = (id: string, values: ParameterValues = {}) => router.push(id ? dashboardUrl(projectId, id, values, viewOnly) : `/projects/${projectId}/dashboard${viewOnly ? "?mode=view" : ""}`);
  const workflows = useQuery({ queryKey: ["workflows", projectId], queryFn: () => listWorkflows(projectId) });
  const dashboards = useQuery({ queryKey: ["dashboards", projectId], queryFn: () => listDashboards(projectId) });
  const visualizations = useQuery({ queryKey: ["visualizations", projectId], queryFn: () => listVisualizations(projectId) });
  const create = useMutation({ mutationFn: () => createDashboard(projectId, t("Sales dashboard")), onSuccess: created => { setSelected(created.id); return client.invalidateQueries({ queryKey: ["dashboards", projectId] }); } });
  const current = selected ? dashboards.data?.find(d => d.id === selected) : dashboards.data?.[0];
  const remove = useMutation({ mutationFn: () => deleteDashboard(current!.id), onSuccess: () => { if (current) sessionStorage.removeItem(`nodebi:dashboard-draft:${current.id}`); setSelected(""); return client.invalidateQueries({ queryKey: ["dashboards", projectId] }); } });
  const onSaved = (saved: Dashboard) => client.setQueryData<Dashboard[]>(["dashboards", projectId], old => old?.map(d => d.id === saved.id ? saved : d));
  const error = dashboards.error ?? workflows.error ?? visualizations.error ?? create.error ?? remove.error;
  if (selected && dashboards.data && !current) return <main className="p-6"><p role="alert">{t("The selected dashboard is unavailable.")}</p><button className="mt-3 text-accent" onClick={() => setSelected("")}>{t("Open default dashboard")}</button></main>;
  if (current && visualizations.data) return <DashboardEditor viewOnly={viewOnly} onViewChange={setViewOnly} workflows={workflows.data ?? []} rawParameters={search.get("parameters")} onNavigate={setSelected} key={current.id} initial={current} visualizations={visualizations.data} dashboards={dashboards.data} onSelect={setSelected} onCreate={() => create.mutate()} onDelete={() => remove.mutate()} onSaved={onSaved} managementError={error ?? undefined} managementBusy={create.isPending || remove.isPending} />;
  return <main className="grid min-h-[calc(100vh-2.75rem)] place-items-center bg-page p-6 text-foreground"><div className="text-center"><h1 className="text-3xl">{t("Dashboard")}</h1>{error ? <p role="alert" className="mt-4 text-danger">{errorText(error)}</p> : null}{dashboards.isPending || visualizations.isPending ? <p className="mt-4">{t("Loading…")}</p> : <button onClick={() => create.mutate()} disabled={create.isPending} className="mt-6 rounded-full bg-primary px-5 py-3 text-on-primary">{t("Create dashboard")}</button>}<Link href={`/projects/${projectId}/workflow`} className="mt-5 block text-accent">{t("Workflow")}</Link></div></main>;
}
