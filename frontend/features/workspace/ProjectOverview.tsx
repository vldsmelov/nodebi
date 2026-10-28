"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Database, GitBranch } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { getProject } from "@/features/projects/api";
import { listDashboards } from "@/features/dashboard/api";
import { dashboardUrl } from "@/features/dashboard/view-state";
import { listDatasets, listImports } from "@/features/ingestion/api";
import { listSources } from "@/features/data-sources/api";
import { OverviewSection } from "./OverviewSection";
import { ProjectHeading } from "./ProjectHeading";
import { ProjectJourney } from "./ProjectJourney";
import { OverviewReports, overviewLink as link } from "./OverviewReports";

const checkLabels = {
  missing: "Report has not been checked yet.", outdated: "Report checks are outdated. Run them again.",
  error: "Report checks found errors.", warning: "Report checks found warnings.", passed: "No report errors found.",
};

export function ProjectOverview({ projectId }: { projectId: string }) {
  const { t, cell, errorText } = useI18n(), root = `/projects/${projectId}`;
  const project = useQuery({ queryKey: ["project", projectId], queryFn: () => getProject(projectId) });
  const enabled = !!project.data;
  const reports = useQuery({ queryKey: ["dashboards", projectId], queryFn: () => listDashboards(projectId), enabled });
  const state = useQuery({ queryKey: ["report-state", projectId], queryFn: () => apiRequest<components["schemas"]["ReportState"]>(`/api/v1/projects/${projectId}/report-state`), enabled });
  const datasets = useQuery({ queryKey: ["datasets", projectId], queryFn: () => listDatasets(projectId), enabled });
  const imports = useQuery({ queryKey: ["imports", projectId], queryFn: () => listImports(projectId), enabled });
  const sources = useQuery({ queryKey: ["sources", projectId], queryFn: () => listSources(projectId), enabled });
  if (project.isPending) return <p role="status" className="p-8">{t("Loading project…")}</p>;
  if (project.isError) return <div role="alert" className="p-8 text-danger"><p>{errorText(project.error)}</p><button className={link} onClick={() => void project.refetch()}>{t("Retry")}</button></div>;
  return <main className="mx-auto max-w-7xl px-4 py-6 text-foreground sm:px-8 sm:py-8">
    <ProjectHeading project={project.data} />
    {datasets.data && sources.data && reports.data && <ProjectJourney projectId={projectId} hasData={datasets.data.length > 0 || sources.data.length > 0} reports={reports.data} checked={state.data?.check_status === "passed"} />}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div className="min-w-0 space-y-5">
        <OverviewSection title="Saved reports" query={reports} action={<Link className={link} href={`${root}/dashboard?mode=view`}>{t("All reports")}</Link>}>{items => <OverviewReports items={items} projectId={projectId} />}</OverviewSection>
        <OverviewSection title="Prepared datasets" query={datasets} action={<Link className={link} href={`${root}/data`}>{t("Manage data")}</Link>}>{items => <>
          <p className="mb-3 text-sm text-muted">{t("Normalized Excel and CSV tables. Row counts describe stored snapshots, not live external systems.")}</p>
          {items.length ? <ul className="divide-y divide-outline">{items.slice(0, 5).map(item => <li key={item.id} className="flex items-start gap-3 py-3"><Database size={18} className="mt-1 shrink-0 text-accent" aria-hidden="true" /><div className="min-w-0"><h3 className="break-words font-medium">{item.profile.name}</h3><p className="text-xs text-muted">{t("Rows: {0}", { 0: cell(item.row_count) })}</p>{item.profile.grain && <p className="mt-1 break-words text-sm text-muted">{item.profile.grain}</p>}</div></li>)}</ul> : <p className="text-sm text-muted">{t("No prepared datasets yet. Existing Excel sources remain available below.")}</p>}
          {items.length > 5 && <p className="text-xs text-muted">{t("Showing {0} of {1}", { 0: 5, 1: items.length })}</p>}
          <Link className={link} href={`${root}/data/import`}>{t("Connect data")}</Link>
        </>}</OverviewSection>
        <OverviewSection title="Existing Excel sources" query={sources}>{items => <><p className="text-sm text-muted">{t("Existing workbook connections: {0}", { 0: items.length })}</p><Link className={link} href={`${root}/data`}>{t("Inspect existing sources")}</Link></>}</OverviewSection>
      </div>
      <aside className="min-w-0 space-y-5" aria-label={t("Project actions and checks")}>
        <OverviewSection title="Checks and updates" query={state}>{value => <>
          <p className={`rounded-lg p-3 text-sm font-medium ${value.check_status === "error" ? "bg-danger-surface text-danger" : value.check_status === "passed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{t(checkLabels[value.check_status])}</p>
          <p className="mt-4 text-sm">{t("Pending data updates: {0}", { 0: value.pending_updates })}</p>
          {value.last_update_name ? <div className="mt-3 text-xs text-muted"><p className="break-words">{t("Last successful update: {0}", { 0: value.last_update_name })}</p>{value.last_update_at && <p className="mt-1">{cell(value.last_update_at, "datetime")}</p>}</div> : <p className="mt-3 text-xs text-muted">{t("No completed data replacement yet. Initial imports are listed under Data.")}</p>}
          <Link className={link} href={`${root}/reports`}>{t("Review checks and updates")}</Link>
          {!!value.restored_views?.length && <div className="mt-4 border-t border-outline pt-4"><h3 className="font-medium">{t("Restored report views")}</h3>{value.restored_views.map(view => <Link className={`${link} block break-words`} key={view.dashboard_id} href={dashboardUrl(projectId, view.dashboard_id, view.context.values, true, view.context.period ? JSON.stringify(view.context.period) : null)}>{view.name}</Link>)}</div>}
        </>}</OverviewSection>
        <OverviewSection title="Continue importing" query={imports}>{items => {
          const drafts = items.filter(item => item.has_draft);
          return drafts.length ? <><p className="mb-3 text-xs text-muted">{t("The original files are saved; unfinished imports do not change active reports.")}</p><ul className="divide-y divide-outline">{drafts.slice(0, 5).map(item => <li key={item.id} className="py-2"><p className="break-words text-sm font-medium">{item.name}</p><Link className={link} href={`${root}/data/import?source=${encodeURIComponent(item.id)}`} aria-label={t("Resume import {0}", { 0: item.name })}>{t("Resume import")}</Link></li>)}</ul>{drafts.length > 5 && <Link className={link} href={`${root}/data`}>{t("Manage data")}</Link>}</> : <p className="text-sm text-muted">{t("No unfinished imports.")}</p>;
        }}</OverviewSection>
        <section className="rounded-2xl border border-dashed border-outline p-5"><GitBranch size={20} className="text-muted" aria-hidden="true" /><h2 className="mt-3 font-semibold">{t("Calculation details")}</h2><p className="mt-2 text-sm text-muted">{t("Inspect formulas, joins and preparation steps when the report needs a deeper adjustment.")}</p><div className="flex flex-wrap gap-x-4"><Link className={link} href={`${root}/workflow`}>{t("Open calculations")}</Link><Link className={link} href={`${root}/visualizations`}>{t("Available visualizations")}</Link></div></section>
      </aside>
    </div>
  </main>;
}
