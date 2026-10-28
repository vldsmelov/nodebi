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
import { removeDocumentDraft } from "@/features/workspace/document-drafts";
import { dashboardPeriodKey } from "@/features/dashboard/RecoverableDashboardPeriod";
import { defaultReport } from "@/features/dashboard/report-entry";
import { DataStatePanel } from "@/components/ui/workspace";

export default function DashboardPage() {
  const { t, errorText } = useI18n();
  const { projectId } = useParams<{ projectId: string }>();
  const client = useQueryClient();
  const router = useRouter();
  const search = useSearchParams();
  const viewOnly = search.get("mode") === "view";
  const setViewOnly = (view: boolean) => { const next = new URLSearchParams(search.toString()); if (view) next.set("mode", "view"); else next.delete("mode"); router.push(`/projects/${projectId}/dashboard?${next}`); };
  const selected = search.get("dashboard") ?? "";
  const setSelected = (id: string, values: ParameterValues = {}) => router.push(id ? dashboardUrl(projectId, id, values, viewOnly, search.get("period")) : `/projects/${projectId}/dashboard${viewOnly ? "?mode=view" : ""}`);
  const workflows = useQuery({ queryKey: ["workflows", projectId], queryFn: () => listWorkflows(projectId) });
  const dashboards = useQuery({ queryKey: ["dashboards", projectId], queryFn: () => listDashboards(projectId) });
  const visualizations = useQuery({ queryKey: ["visualizations", projectId], queryFn: () => listVisualizations(projectId) });
  const create = useMutation({ mutationFn: () => createDashboard(projectId, t("New dashboard")), onSuccess: created => { router.push(dashboardUrl(projectId, created.id)); return client.invalidateQueries({ queryKey: ["dashboards", projectId] }); } });
  const current = selected ? dashboards.data?.find(d => d.id === selected) : defaultReport(dashboards.data ?? []);
  const remove = useMutation({ mutationFn: () => deleteDashboard(current!.id), onSuccess: () => {
    if (current) {
      for (const key of [`nodebi:dashboard-draft:${current.id}`, dashboardPeriodKey(projectId, current.id)]) {
        try { removeDocumentDraft(key, true); }
        catch { /* Server deletion succeeded; document tombstones prevent stale recovery. */ }
      }
    }
    setSelected(""); return client.invalidateQueries({ queryKey: ["dashboards", projectId] });
  } });
  const onSaved = (saved: Dashboard) => client.setQueryData<Dashboard[]>(["dashboards", projectId], old => old?.map(d => d.id === saved.id ? saved : d));
  const error = dashboards.error ?? workflows.error ?? visualizations.error ?? create.error ?? remove.error;
  const loadError = dashboards.error ?? visualizations.error ?? workflows.error;
  if (loadError && (!current || !visualizations.data)) return <main className="p-6"><DataStatePanel state="error" title="Reports could not be loaded" action={<button className="af-btn" onClick={() => { void dashboards.refetch(); void visualizations.refetch(); void workflows.refetch(); }}>{t("Retry")}</button>}>{errorText(loadError)}</DataStatePanel></main>;
  if (!current && (dashboards.isPending || visualizations.isPending)) return <main className="p-6"><DataStatePanel state="loading" /></main>;
  if (selected && dashboards.data && !current) return <main className="p-6"><p role="alert">{t("The selected dashboard is unavailable.")}</p><button className="mt-3 text-accent" onClick={() => setSelected("")}>{t("Open default dashboard")}</button></main>;
  if (current && visualizations.data) return <DashboardEditor rawPeriod={search.get("period")} onPeriodChange={period => { const next = new URLSearchParams(search.toString()); if (period) next.set("period", JSON.stringify(period)); else next.delete("period"); router.push(`/projects/${projectId}/dashboard?${next}`); }} viewOnly={viewOnly} onViewChange={setViewOnly} workflows={workflows.data ?? []} rawParameters={search.get("parameters")} onNavigate={setSelected} key={current.id} initial={current} visualizations={visualizations.data} dashboards={dashboards.data} onSelect={setSelected} onCreate={() => create.mutate()} onDelete={() => remove.mutate()} onSaved={onSaved} managementError={error ?? undefined} managementBusy={create.isPending || remove.isPending} />;
  return <main className="grid min-h-[calc(100vh-5rem)] place-items-center bg-page p-6 text-foreground"><div className="max-w-xl text-center"><h1 className="text-3xl">{t("Your first report starts with a table")}</h1><p className="mt-4 text-muted">{t("Connect Excel or CSV, then choose measures and dimensions in the report wizard. No manual node connections are needed.")}</p>{error ? <p role="alert" className="mt-4 text-danger">{errorText(error)}</p> : null}{dashboards.isPending || visualizations.isPending ? <p className="mt-4">{t("Loading…")}</p> : <><div className="mt-6 flex flex-wrap justify-center gap-3"><Link className="af-btn" href={`/projects/${projectId}/build`}>{t("Create report")}</Link><Link className="af-btn af-btn--secondary" href={`/projects/${projectId}/data/import`}>{t("Connect data")}</Link></div><button onClick={() => create.mutate()} disabled={create.isPending} className="mt-5 min-h-10 text-sm text-accent underline">{t("Create an empty dashboard")}</button></>}<Link href={`/projects/${projectId}/templates`} className="mt-5 block text-accent">{t("Template catalog")}</Link></div></main>;
}
