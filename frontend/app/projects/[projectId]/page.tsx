"use client";

import { useI18n } from "@/lib/i18n";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Database, GitBranch, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { dashboardUrl } from "@/features/dashboard/view-state";
import { getProject, renameProject } from "@/features/projects/api";

const sections = [
  { name: "Data", icon: Database, path: "data", hint: "Upload Excel books and inspect their sheets." },
  { name: "Workflow", icon: GitBranch, path: "workflow", hint: "Join tables, calculate fields and publish results." },
  { name: "Dashboard", icon: BarChart3, path: "dashboard", hint: "Add charts from your results and arrange them here." },
];

export default function ProjectPage() {
  const { t, errorText, cell } = useI18n();
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const project = useQuery({ queryKey: ["project", projectId], queryFn: () => getProject(projectId) });
  const report = useQuery({ queryKey: ["report-state", projectId], queryFn: () => apiRequest<components["schemas"]["ReportState"]>(`/api/v1/projects/${projectId}/report-state`) });
  const rename = useMutation({ mutationFn: (name: string) => renameProject(projectId, name), onSuccess: (value) => queryClient.setQueryData(["project", projectId], value) });
  if (project.isPending) return <main className="min-h-[calc(100vh-2.75rem)] bg-page p-10 text-muted">{t("Loading project…")}</main>;
  if (project.error) return <main className="min-h-[calc(100vh-2.75rem)] bg-page p-10 text-danger">{errorText(project.error)}</main>;
  return (
    <main className="min-h-[calc(100vh-2.75rem)] bg-page px-6 py-10 text-foreground"><div className="mx-auto max-w-6xl"><Link href="/projects" className="text-sm text-muted">{t("← All projects")}</Link><header className="mt-10 flex items-center gap-3"><h1 className="text-4xl font-medium">{project.data.name}</h1><button aria-label={t("Rename project")} className="text-muted hover:text-accent" onClick={() => { const name = window.prompt(t("Project name"), project.data.name); if (name?.trim()) rename.mutate(name); }}><Pencil size={18} /></button></header>{!!report.data?.restored_views?.length && <section className="mt-6 rounded border border-outline p-4"><h2>{t("Restored report views")}</h2>{report.data.restored_views.map(view => <Link className="mr-4 mt-3 inline-block underline" key={view.dashboard_id} href={dashboardUrl(projectId, view.dashboard_id, view.context.values, false, view.context.period ? JSON.stringify(view.context.period) : null)}>{view.name}</Link>)}</section>}<nav className="mt-12 grid gap-4 md:grid-cols-3">{sections.map(({ name, icon: Icon, path, hint }, index) => <Link href={`/projects/${projectId}/${path}`} key={name} className="rounded-3xl border border-outline bg-raised p-7 transition hover:border-accent/40"><Icon className="text-accent" /><h2 className="mt-8 text-xl">{index + 1}. {t(name)}</h2><p className="mt-2 text-sm text-muted">{t(hint)}</p></Link>)}</nav>{report.data && <div className="mt-6 space-y-1 text-sm text-muted">{report.data.last_update_name && <p>{t("Last successful update: {0}", { 0: report.data.last_update_name })} ? {cell(report.data.last_update_at, "datetime")}</p>}<p>{t("Pending data updates: {0}", { 0: report.data.pending_updates ?? 0 })}</p><p>{t({ missing: "Report has not been checked yet.", outdated: "Report checks are outdated. Run them again.", error: "Report checks found errors.", warning: "Report checks found warnings.", passed: "No report errors found." }[report.data.check_status ?? "missing"])}</p></div>}<Link className="mt-6 mr-6 inline-block rounded bg-primary px-5 py-3 text-on-primary" href={`/projects/${projectId}/reports`}>{t("Update data and release report")}</Link><Link className="mt-6 inline-block text-sm text-accent underline" href={`/projects/${projectId}/visualizations`}>{t("Available visualizations")}</Link>{rename.error ? <p role="alert" className="mt-4 text-danger">{errorText(rename.error)}</p> : null}</div></main>
  );
}
