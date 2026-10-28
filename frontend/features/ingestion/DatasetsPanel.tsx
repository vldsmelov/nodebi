"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "@/features/spreadsheet/source-link";
import { useI18n } from "@/lib/i18n";
import { DataStatePanel } from "@/components/ui/workspace";
import { listDatasets, listImports } from "./api";

export function DatasetsPanel({ projectId }: { projectId: string }) {
  const { t, cell, errorText } = useI18n();
  const datasets = useQuery({ queryKey: ["datasets", projectId], queryFn: () => listDatasets(projectId) });
  const sources = useQuery({ queryKey: ["imports", projectId], queryFn: () => listImports(projectId) });
  return <section className="mt-6 space-y-4 rounded-xl border border-outline bg-panel p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{t("Prepared datasets")}</h2><Link className="rounded-lg bg-primary px-4 py-2 text-on-primary" href={`/projects/${projectId}/data/import`}>{t("Connect data")}</Link></div>
    <p className="text-muted">{t("Import Excel or CSV, check fields and create a reusable table.")}</p>
    {datasets.isPending && <DataStatePanel state="loading" />}
    {datasets.error && <DataStatePanel state="error">{errorText(datasets.error)}</DataStatePanel>}
    {sources.error && <DataStatePanel state="error">{errorText(sources.error)}</DataStatePanel>}
    {sources.data?.filter(source => source.has_draft).map(source => <article key={source.id} className="rounded-lg border border-dashed border-outline p-4">
      <h3 className="font-semibold">{source.name} · {t("Unfinished import")}</h3>
      <p className="my-2 text-sm text-muted">{t("The original file is saved. Continue configuring its fields without uploading it again.")}</p>
      <Link className="inline-block min-h-10 py-2 text-accent underline" href={`/projects/${projectId}/data/import?source=${encodeURIComponent(source.id)}`}>{t("Resume import")}</Link>
    </article>)}
    {datasets.data?.map(dataset => <article key={dataset.id} className="rounded-lg border border-outline p-4">
      <h3 className="font-semibold">{dataset.profile.name}</h3><p className="text-sm text-muted">{t("Rows: {0}", { 0: cell(dataset.row_count) })} · {dataset.profile.grain}</p>
      <p className="mt-2 text-sm">{dataset.columns.map(column => column.display_name).join(" · ")}</p>
      <div className="mt-3 flex gap-4"><Link className="inline-block min-h-10 py-2 text-accent underline" href={`/projects/${projectId}/build`}>{t("Create report")}</Link>
      <Link className="inline-block min-h-10 py-2 text-accent underline" href={`/projects/${projectId}/data/update?source=${dataset.source_id}`}>{t("Update data from a file")}</Link></div>
    </article>)}
    {datasets.data?.length === 0 && <p className="text-sm text-muted">{t("No prepared datasets yet. Existing Excel sources remain available below.")}</p>}
  </section>;
}
