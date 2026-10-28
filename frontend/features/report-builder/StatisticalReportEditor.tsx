"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataStatePanel } from "@/components/ui/workspace";
import { apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import { ReportDraftBoundary, useReportDraftSession } from "./ReportDraftBoundary";
import { StatisticalReportForm } from "./StatisticalReportBuilder";
import { TemplateCapturePanel } from "./AnalyticalTemplates";

export function StatisticalReportEditor({ projectId, visualizationId }: { projectId: string; visualizationId: string }) {
  return <><TemplateCapturePanel key={`template:${projectId}:${visualizationId}`} projectId={projectId} visualizationId={visualizationId} /><ReportDraftBoundary key={`${projectId}:${visualizationId}`} projectId={projectId} target={visualizationId} mode="statistics-edit"><Editor projectId={projectId} visualizationId={visualizationId} /></ReportDraftBoundary></>;
}
function Editor({ projectId, visualizationId }: { projectId: string; visualizationId: string }) {
  const { t, errorText, nodeName } = useI18n();
  const draft = useReportDraftSession();
  const [generation, setGeneration] = useState(0);
  const saved = useQuery({ queryKey: ["statistical-editor", projectId, visualizationId], queryFn: () => apiRequest<components["schemas"]["StatisticalEditRead"]>(`/api/v1/projects/${projectId}/statistical-reports/${visualizationId}`), retry: false, refetchOnMount: "always", refetchOnWindowFocus: false, refetchOnReconnect: false });
  const reload = async () => {
    if (saved.isFetching || !window.confirm(t("Discard unsaved changes?"))) return;
    const response = await saved.refetch();
    if (!response.error && draft.reset()) setGeneration(n => n + 1);
  };
  if (saved.isPending) return <DataStatePanel state="loading" />;
  if (saved.error) return <DataStatePanel state="error">{errorText(saved.error)}<Button onClick={() => void saved.refetch()}>{t("Retry")}</Button></DataStatePanel>;
  if (!saved.data) return null;
  const edit = saved.data;
  return <section className="space-y-4">
    <div className="flex flex-wrap gap-4"><Button variant="outline" disabled={saved.isFetching} onClick={() => void reload()}>{t("Reload saved report")}</Button><Link className="inline-flex items-center text-accent underline" href={`/projects/${projectId}/workflow?workflow=${edit.workflow_id}&mode=fields`}>{t("Open calculation")}</Link></div>
    {edit.editable && edit.settings ? <fieldset disabled={saved.isFetching} aria-busy={saved.isFetching} className="min-w-0 border-0 p-0"><StatisticalReportForm key={generation} projectId={projectId} edit={edit} /></fieldset> : <DataStatePanel state="incomplete">{t(edit.reason ?? "This calculation is an advanced step. Edit it in the graph.")}</DataStatePanel>}
    <details><summary>{t("Calculation steps")}</summary><ol className="list-inside list-decimal">{edit.steps?.map(step => <li key={step.node_id}>{nodeName(step.type)} · {t(step.editable ? "Editable step" : "Preserved step")}</li>)}</ol></details>
  </section>;
}
