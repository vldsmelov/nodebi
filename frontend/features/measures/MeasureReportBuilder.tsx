"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataStatePanel } from "@/components/ui/workspace";
import { ReportDraftBoundary, useReportDraftAutosave, useReportDraftSession } from "@/features/report-builder/ReportDraftBoundary";
import type { MeasureFormDraft } from "@/features/report-builder/report-draft";
import { apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";

type Request = components["schemas"]["MeasureReportRequest"];
type Props = { projectId: string; workflowId: string; publicationId: string; measureId: string };
export function MeasureReportBuilder(props: Props) {
  const target = `${props.workflowId}/${props.publicationId}/${props.measureId}`;
  return <ReportDraftBoundary key={`${props.projectId}:${target}`} projectId={props.projectId} mode="measure" target={target}><MeasureReportForm {...props} /></ReportDraftBoundary>;
}
function MeasureReportForm({ projectId, workflowId, publicationId, measureId }: Props) {
  const { t, cell, errorText, nodeName } = useI18n();
  const draft = useReportDraftSession();
  const initial = draft.initial?.kind === "measure" ? draft.initial : undefined;
  const root = `/api/v1/projects/${projectId}`;
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<Request["presentation"]>(initial?.presentation ?? "table");
  const [additional, setAdditional] = useState<string[]>(initial?.additional ?? []);
  const [requestId] = useState(() => initial?.requestId ?? crypto.randomUUID());
  const [pinnedToken, setPinnedToken] = useState(initial?.expectedToken);
  const catalog = useQuery({ queryKey: ["measure-report-catalog", projectId], queryFn: () => apiRequest<components["schemas"]["MeasureList"]>(`${root}/measures`), refetchOnWindowFocus: false });
  const source = useQuery({ queryKey: ["measure-report-source", projectId, workflowId, publicationId], queryFn: () => apiRequest<components["schemas"]["ReportInputRead"]>(`${root}/report-builder/inputs/${workflowId}/${publicationId}`), refetchOnWindowFocus: false, retry: false });
  const entry = catalog.data?.items.find(item => item.workflow_id === workflowId && item.publication_id === publicationId && item.definition.id === measureId);
  const compatible = catalog.data?.items.filter(item => item.workflow_id === workflowId && item.publication_id === publicationId && item.definition.id !== measureId && item.definition.column_id !== entry?.definition.column_id && JSON.stringify([...(item.definition.grain_column_ids ?? [])].sort()) === JSON.stringify([...(entry?.definition.grain_column_ids ?? [])].sort())) ?? [];
  const unavailable = additional.filter(id => !compatible.some(item => item.definition.id === id));
  const expectedToken = pinnedToken ?? source.data?.expected_token;
  const body: Request | null = entry && source.data && !source.error && !catalog.error && !unavailable.length ? { request_id: requestId, workflow_id: workflowId, publication_id: publicationId, measure_id: measureId, ...(additional.length ? { additional_measure_ids: additional } : {}), expected_token: expectedToken!, name: name.trim() || entry.definition.name, presentation: type } : null;
  const preview = useMutation({ mutationFn: (request: Request) => apiRequest<components["schemas"]["VisualizationResult"]>(`${root}/measure-reports/preview`, { method: "POST", body: JSON.stringify(request) }) });
  const busy = preview.isPending || source.isFetching || catalog.isFetching;
  const current = preview.data && JSON.stringify(body) === JSON.stringify(preview.variables) ? preview.data : null;
  const draftState: MeasureFormDraft = { kind: "measure", requestId, workflowId, publicationId, measureId, name: name || entry?.definition.name || "", presentation: type, additional, expectedToken };
  useReportDraftAutosave(draftState, !!initial || !!name || type !== "table" || !!additional.length || !!preview.data || preview.isPending);
  return <section className="space-y-4 rounded-xl border border-outline bg-panel p-5">
    <h1 className="text-3xl font-semibold">{t("Create report from measure")}</h1>
    <p>{t("Prepared values are displayed at their original grain. No new aggregation or formula is created.")}</p>
    {(catalog.error || source.error || preview.error) && <DataStatePanel state="error">{errorText(catalog.error || source.error || preview.error)}</DataStatePanel>}
    {catalog.isPending || source.isPending ? <DataStatePanel state="loading" /> : !entry ? <DataStatePanel state="incomplete">{t("Select an available reusable measure.")}</DataStatePanel> : <>
      <h2 className="text-xl">{entry.definition.name}</h2><p>{entry.definition.description}</p><p>{t("Grain: one row per combination")}: {(entry.definition.grain_column_ids ?? []).map(id => source.data?.columns.find(c => c.column_id === id)?.display_name ?? t("Unavailable field")).join(" × ") || t("Single total")}</p>
      <fieldset disabled={busy} className="space-y-3"><label className="block">{t("Report name")}<input className="form-control" value={name} placeholder={entry.definition.name} onChange={e => setName(e.target.value)} /></label>
        <fieldset><legend>{t("Additional reusable measures")}</legend><p className="text-sm text-muted">{t("Select up to seven more measures from this result with the same grain. Values are shown side by side in a table, without joins or reaggregation.")}</p>
          {compatible.map(item => <label key={item.definition.id} className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={additional.includes(item.definition.id)} disabled={!additional.includes(item.definition.id) && (additional.length >= 7 || compatible.some(other => additional.includes(other.definition.id) && other.definition.column_id === item.definition.column_id))} onChange={e => { setAdditional(e.target.checked ? [...additional, item.definition.id] : additional.filter(id => id !== item.definition.id)); if (e.target.checked) setType("table"); }} />{item.definition.name}</label>)}
          {unavailable.map(id => <label key={id} className="flex min-h-10 items-center gap-2 text-danger"><input type="checkbox" checked onChange={() => setAdditional(additional.filter(value => value !== id))} />{t("Selected measure is unavailable. Deselect it or reload the catalog.")}</label>)}
        </fieldset>
        <label className="block">{t("Presentation")}<select className="form-control" value={type} onChange={e => setType(e.target.value as Request["presentation"])}>{["table", "kpi", "bar_chart", "line_chart"].map(kind => <option key={kind} value={kind} disabled={!!additional.length && kind !== "table"}>{nodeName(kind)}</option>)}</select></label>
        <Button disabled={!body} onClick={() => body && preview.mutate(body)}>{t("Preview calculation")}</Button><Button disabled={!current || !body} onClick={() => body && draft.save(body, draftState)}>{t("Save report")}</Button>
      </fieldset>
    </>}
    {current && <div className="overflow-auto"><p>{t("All rows are calculated on the server. Preview shows up to 50 results.")}</p><table className="data-table"><thead><tr>{current.columns.map(c => <th key={c.column_id}>{c.display_name}</th>)}</tr></thead><tbody>{current.rows.map((row, i) => <tr key={i}>{current.columns.map(c => <td key={c.column_id}>{cell(row[c.engine_name], c.logical_type)}</td>)}</tr>)}</tbody></table></div>}
    <Button variant="outline" disabled={busy} onClick={() => { preview.reset(); setPinnedToken(undefined); void source.refetch(); void catalog.refetch(); }}>{t("Reload input fields")}</Button><Link className="ml-3 text-accent underline" href={`/projects/${projectId}/workflow?workflow=${workflowId}&mode=fields`}>{t("Open source calculation")}</Link>
  </section>;
}
