"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataStatePanel } from "@/components/ui/workspace";
import { apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import { ReportBuilder, ReportBuilderForm } from "./ReportBuilder";
import { ReportDraftBoundary, useReportDraftSession } from "./ReportDraftBoundary";
import { MeasureReportBuilder } from "@/features/measures/MeasureReportBuilder";
import { AlignmentReportBuilder } from "./AlignmentReportBuilder";
import { AlignmentReportEditor } from "./AlignmentReportEditor";
import { StatisticalReportBuilder } from "./StatisticalReportBuilder";
import { StatisticalReportEditor } from "./StatisticalReportEditor";
import { TemplateCapturePanel } from "./AnalyticalTemplates";

export function ReportBuilderWorkspace({ projectId }: { projectId: string }) {
  const search = useSearchParams();
  const visualization = search.get("visualization");
  const { t } = useI18n();
  if (visualization && search.get("alignment") === "1") return <AlignmentReportEditor projectId={projectId} visualizationId={visualization} />;
  if (visualization && search.get("statistics") === "1") return <StatisticalReportEditor projectId={projectId} visualizationId={visualization} />;
  if (!visualization && search.get("measure") && search.get("workflow") && search.get("publication")) return <MeasureReportBuilder projectId={projectId} workflowId={search.get("workflow")!} publicationId={search.get("publication")!} measureId={search.get("measure")!} />;
  if (!visualization && search.get("alignment") === "1") return <AlignmentReportBuilder projectId={projectId} />;
  if (!visualization && search.get("statistics") === "1") return <StatisticalReportBuilder projectId={projectId} />;
  if (!visualization) return <><h1 className="text-3xl font-semibold">{t("Create report")}</h1><p className="text-muted">{t("Start with a business question: what to measure, how to group it and what decision the report supports.")}</p><div className="grid gap-3 md:grid-cols-3"><section className="rounded-xl border border-accent bg-panel p-4"><h2 className="text-base">{t("Totals and trends")}</h2><p className="mt-2 text-sm text-muted">{t("For example: revenue by month, expenses by department, actual versus plan. Configure this report below.")}</p></section><Link className="rounded-xl border border-outline bg-panel p-4 hover:border-accent" href={`/projects/${projectId}/build?statistics=1`}><h2 className="text-base">{t("Distributions and structure")}</h2><p className="mt-2 text-sm text-muted">{t("Compare delivery times, find outliers, build a heatmap or show a sales funnel.")}</p></Link><Link className="rounded-xl border border-outline bg-panel p-4 hover:border-accent" href={`/projects/${projectId}/build?alignment=1`}><h2 className="text-base">{t("Compare separate datasets")}</h2><p className="mt-2 text-sm text-muted">{t("Match actual and plan by the same keys and calculate differences without hiding missing matches.")}</p></Link></div><ReportBuilder projectId={projectId} datasetId={search.get("dataset") ?? undefined} /></>;
  return <><TemplateCapturePanel key={`template:${projectId}:${visualization}`} family="report" projectId={projectId} visualizationId={visualization} /><ReportDraftBoundary key={`${projectId}:${visualization}`} projectId={projectId} mode="edit" target={visualization}><EditReportWorkspace projectId={projectId} visualization={visualization} /></ReportDraftBoundary></>;
}
function EditReportWorkspace({ projectId, visualization }: { projectId: string; visualization: string }) {
  const { t, errorText, nodeName } = useI18n();
  const draft = useReportDraftSession();
  const [reloadGeneration, setReloadGeneration] = useState(0);
  const [reloading, setReloading] = useState(false);
  const saved = useQuery({
    queryKey: ["report-editor", projectId, visualization],
    queryFn: () => apiRequest<components["schemas"]["ReportEditRead"]>(`/api/v1/projects/${projectId}/report-builder/${encodeURIComponent(visualization!)}`),
    enabled: !!visualization, retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false, refetchOnMount: "always",
  });
  const reload = async () => {
    if (reloading || !window.confirm(t("Discard unsaved changes?"))) return;
    setReloading(true);
    try {
      const result = await saved.refetch();
      // Explicit discard must reset local form state even if the server token is unchanged.
      if (!result.error && draft.reset()) setReloadGeneration(value => value + 1);
    } finally { setReloading(false); }
  };
  if (saved.isPending) return <DataStatePanel state="loading" />;
  if (saved.error) return <DataStatePanel state="error">{errorText(saved.error)}<Button variant="outline" onClick={() => void saved.refetch()}>{t("Retry")}</Button></DataStatePanel>;
  if (!saved.data) return null;
  const graph = `/projects/${projectId}/workflow?workflow=${saved.data.workflow_id}&mode=fields`;
  return <><h1 className="text-3xl font-semibold">{t("Edit report calculation")}</h1>
    {saved.data.editable && saved.data.settings ? <fieldset disabled={reloading || saved.isFetching} aria-busy={reloading || saved.isFetching} className="min-w-0 border-0 p-0">
      {reloading ? <p role="status">{t("Loading…")}</p> : null}
      <ReportBuilderForm key={`${visualization}:${reloadGeneration}`} projectId={projectId} edit={saved.data} onReload={() => void reload()} />
    </fieldset> : <section className="space-y-4 rounded-xl border border-outline bg-panel p-5">
      <h2 className="text-lg font-semibold">{saved.data.name}</h2><DataStatePanel state="incomplete">{t(saved.data.reason ?? "This calculation is an advanced step. Edit it in the graph.")}</DataStatePanel>
      {saved.data.analytical_editor && <Link className="inline-flex min-h-10 items-center text-accent underline" href={`/projects/${projectId}/build?visualization=${encodeURIComponent(visualization)}&statistics=1`}>{t("Edit analytical calculation")}</Link>}
      {saved.data.alignment_editor && <Link className="inline-flex min-h-10 items-center text-accent underline" href={`/projects/${projectId}/build?visualization=${encodeURIComponent(visualization)}&alignment=1`}>{t("Edit aligned calculation")}</Link>}
      <p>{t("The existing calculation has not been changed.")}</p>
      <ul className="space-y-2">{(saved.data.steps ?? []).map(step => <li key={step.node_id}>{nodeName(step.type)} · {t("Preserved step")}</li>)}</ul>
      <Link className="inline-flex min-h-10 items-center text-accent underline" href={graph}>{t("Open calculation")}</Link>
    </section>}
  </>;
}
