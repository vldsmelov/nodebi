"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataStatePanel } from "@/components/ui/workspace";
import { listDatasets } from "@/features/ingestion/api";
import { apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import type { ReportInputDraft } from "./report-draft";

type BuildRequest = components["schemas"]["ReportBuildRequest"];
type InputList = components["schemas"]["ReportInputList"];
type InputRead = components["schemas"]["ReportInputRead"];
type InputKind = "import" | "publication";
type Source = Pick<BuildRequest, "source_id" | "resource_id" | "expected_snapshot_id" | "published_input">;

export function reportInputKey(body: BuildRequest | components["schemas"]["ReportEditRequest"] | null | undefined): string {
  if (!body) return "";
  if ("settings" in body) return body.expected_token;
  return JSON.stringify(body.published_input ?? [body.source_id, body.resource_id, body.expected_snapshot_id]);
}

export function useReportInput(projectId: string, enabled: boolean, initial?: ReportInputDraft) {
  const [kind, setKind] = useState<InputKind>(initial?.kind ?? "import");
  const [selected, setSelected] = useState(initial?.selected ?? "");
  const [pinnedSource, setPinnedSource] = useState(initial?.source);
  const datasets = useQuery({ queryKey: ["datasets", projectId], queryFn: () => listDatasets(projectId), enabled: enabled && kind === "import" });
  const root = `/api/v1/projects/${projectId}/report-builder/inputs`;
  const choices = useQuery({ queryKey: ["report-inputs", projectId], queryFn: () => apiRequest<InputList>(root), enabled: enabled && kind === "publication" });
  const choice = kind === "publication" ? choices.data?.items.find(item => `${item.workflow_id}/${item.publication_id}` === selected) : undefined;
  const detail = useQuery({
    queryKey: ["report-input", projectId, selected],
    queryFn: () => apiRequest<InputRead>(`${root}/${selected}`),
    enabled: enabled && !!choice?.available,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const dataset = kind === "import" ? datasets.data?.find(item => item.id === selected) : undefined;
  const prepared = choice?.available && !detail.error ? detail.data : undefined;
  const currentSource: Source | null = dataset ? { source_id: dataset.source_id, resource_id: dataset.resource_id, expected_snapshot_id: dataset.id } : prepared ? { published_input: { workflow_id: prepared.workflow_id, publication_id: prepared.publication_id, expected_token: prepared.expected_token } } : null;
  const source = kind === initial?.kind && selected === initial?.selected && pinnedSource ? pinnedSource : currentSource;
  return { projectId, kind, setKind, selected, setSelected, datasets, choices, choice, detail, prepared, source, clearPinnedSource: () => setPinnedSource(undefined), columns: dataset?.columns ?? prepared?.columns ?? [], ready: !!currentSource && !(kind === "import" && (datasets.error || datasets.isFetching)) && !(kind === "publication" && (choices.error || detail.isFetching)) };
}

export function ReportInputPicker({ input, onChange, onRefresh }: { input: ReturnType<typeof useReportInput>; onChange: () => void; onRefresh?: () => void }) {
  const { t, errorText } = useI18n();
  const change = (kind: InputKind, selected: string) => { input.clearPinnedSource(); input.setKind(kind); input.setSelected(selected); onChange(); };
  const error = input.kind === "import" ? input.datasets.error : input.choices.error || input.detail.error;
  return <div className="space-y-3">
    <label className="block">{t("Report data source")}<select className="form-control" value={input.kind} onChange={event => change(event.target.value as InputKind, "")}>
      <option value="import">{t("Imported tables")}</option><option value="publication">{t("Prepared calculation results")}</option>
    </select></label>
    {input.kind === "import" ? <label className="block">{t("Prepared dataset")}<select className="form-control" value={input.selected} onChange={event => change("import", event.target.value)}>
      <option value="">{t("Select a dataset")}</option>{input.datasets.data?.map(item => <option key={item.id} value={item.id}>{item.profile.name}</option>)}
    </select></label> : <>
      <label className="block">{t("Prepared calculation result")}<select className="form-control" value={input.selected} onChange={event => change("publication", event.target.value)}>
        <option value="">{t("Select a prepared result")}</option>{input.choices.data?.items.map(item => <option key={`${item.workflow_id}/${item.publication_id}`} value={`${item.workflow_id}/${item.publication_id}`} disabled={!item.available}>{item.name} · {item.workflow_name}{item.reason ? ` — ${t(item.reason)}` : ""}</option>)}
      </select></label>
      {!input.choices.isPending && !input.choices.error && input.choices.data?.items.length === 0 && <p className="text-sm text-muted">{t("No prepared results yet. Publish a table output in Calculations.")}</p>}
      <p className="text-sm text-muted">{t("The report adds a branch to the existing calculation. Shared steps are not copied; changes to them affect all dependent reports.")}</p>
      {input.choice && <Link className="inline-block text-sm text-accent underline" href={`/projects/${input.projectId}/workflow?workflow=${input.choice.workflow_id}&mode=fields`}>{t("Open source calculation")}</Link>}
      {input.prepared?.uses_parameters && <p className="text-sm text-muted">{t("This report uses the current default parameters of the shared calculation.")}</p>}
      <Button variant="outline" disabled={input.choices.isFetching || input.detail.isFetching} onClick={() => { input.clearPinnedSource(); onRefresh?.(); void input.choices.refetch(); if (input.choice?.available) void input.detail.refetch(); }}>{t("Reload input fields")}</Button>
    </>}
    {input.kind === "import" && input.datasets.data && !input.datasets.error && !input.datasets.isFetching && !input.datasets.data.length && <DataStatePanel state="empty" title="Connect a table to start"><p>{t("Import Excel or CSV first. If your data already comes from a graph, choose Prepared calculation results above.")}</p><Link className="inline-flex min-h-10 items-center text-accent underline" href={`/projects/${input.projectId}/data/import`}>{t("Connect data")}</Link></DataStatePanel>}
    {input.kind === "import" && !!input.selected && input.datasets.data && !input.datasets.isFetching && !input.datasets.data.some(item => item.id === input.selected) && <DataStatePanel state="incomplete" title="The selected dataset is no longer available"><p>{t("The source may have been refreshed or removed. Select its current dataset and check the report fields again.")}</p><Button variant="outline" onClick={() => change("import", "")}>{t("Select another dataset")}</Button></DataStatePanel>}
    {(input.kind === "import" ? input.datasets.isFetching : input.choices.isFetching || input.detail.isFetching) && <DataStatePanel state="loading" />}
    {error && <DataStatePanel state="error">{errorText(error)}</DataStatePanel>}
  </div>;
}
