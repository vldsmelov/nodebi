"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useDynamicListFocus } from "@/components/ui/useDynamicListFocus";
import { Button } from "@/components/ui/button";
import { DataStatePanel } from "@/components/ui/workspace";
import { VisualizationResultView } from "@/features/dashboard/VisualizationView";
import { apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import { ReportDraftBoundary, useReportDraftAutosave, useReportDraftSession } from "./ReportDraftBoundary";
import { ReportInputPicker, useReportInput } from "./ReportInputPicker";
import type { StatisticalFormDraft } from "./report-draft";
import { StatisticalAnalysisConfiguration, analysisComplete, newAnalysis, type Analysis } from "./StatisticalAnalysisConfiguration";
import { AnalyticalTemplatePicker } from "./AnalyticalTemplates";

type Request = components["schemas"]["StatisticalReportRequest"];
type Preview = components["schemas"]["StatisticalReportPreview"];
type EditRequest = components["schemas"]["StatisticalEditRequest"];

export function StatisticalReportBuilder({ projectId }: { projectId: string }) {
  return <ReportDraftBoundary key={projectId} projectId={projectId} mode="statistics"><StatisticalReportForm projectId={projectId} /></ReportDraftBoundary>;
}
export function StatisticalReportForm({ projectId, edit }: { projectId: string; edit?: components["schemas"]["StatisticalEditRead"] }) {
  const { t, errorText, nodeName } = useI18n();
  const draft = useReportDraftSession();
  const initial = draft.initial?.kind === "statistics" ? draft.initial : undefined;
  const input = useReportInput(projectId, !edit, initial?.input);
  const columns = edit?.columns ?? input.columns;
  const [requestId] = useState(() => initial?.requestId ?? crypto.randomUUID());
  const [name, setName] = useState(initial?.name ?? edit?.settings?.name ?? "");
  const [analysis, setAnalysis] = useState<Analysis>(initial?.analysis ?? edit?.settings?.analysis ?? { type: "histogram", value_column_id: "", bin_count: 20 });
  const [filters, setFilters] = useState<NonNullable<Request["filters"]>>(initial?.filters ?? edit?.settings?.filters ?? []);
  const filterFocus = useDynamicListFocus<HTMLSelectElement>(filters.length);
  const [token] = useState(initial?.edit?.expectedToken ?? edit?.expected_token ?? "");
  const [rebindFields, setRebindFields] = useState(initial?.edit?.rebindFields ?? false);
  const [acknowledgeShared, setAcknowledgeShared] = useState(initial?.edit?.acknowledgeShared ?? false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [settled, setSettled] = useState<{ key: string; data: Preview }>();
  const preview = useMutation({ mutationFn: ({ body, offset }: { body: Request | EditRequest; offset: number }) => apiRequest<Preview>(`/api/v1/projects/${projectId}/statistical-reports${edit ? `/${edit.visualization_id}` : ""}/preview?offset=${offset}`, { method: "POST", body: JSON.stringify(body) }), onSuccess: (data, variables) => setSettled({ key: JSON.stringify(variables.body), data }) });
  const body: Request | EditRequest | null = name.trim() && analysisComplete(analysis) ? edit ? { request_id: requestId, expected_token: token, settings: { name: name.trim(), analysis, filters }, rebind_fields: rebindFields, acknowledge_shared: acknowledgeShared } : input.ready && input.source ? { ...input.source, request_id: requestId, name: name.trim(), analysis, filters } : null : null;
  const current = body && !preview.error && settled?.key === JSON.stringify(body) ? settled.data : null;
  const resetPreview = () => { preview.reset(); setSettled(undefined); };
  const state: StatisticalFormDraft = { kind: "statistics", requestId, name, input: { kind: input.kind, selected: input.selected, source: input.source }, analysis, filters, ...(edit ? { edit: { visualizationId: edit.visualization_id, expectedToken: token, rebindFields, acknowledgeShared } } : {}) };
  const changed = edit ? JSON.stringify({ name, analysis, filters }) !== JSON.stringify({ name: edit.settings?.name, analysis: edit.settings?.analysis, filters: edit.settings?.filters ?? [] }) || rebindFields || acknowledgeShared : !!name || !!input.selected || !!filters.length || JSON.stringify(analysis) !== JSON.stringify({ type: "histogram", value_column_id: "", bin_count: 20 });
  useReportDraftAutosave(state, !!initial || changed);
  const busy = preview.isPending;
  return <section className="report-builder-container space-y-5">
    <h1 className="text-3xl font-semibold">{t(edit ? "Edit analytical calculation" : "Create analytical report")}</h1>
    <p className="max-w-3xl text-muted">{t("Explore distributions, contributions, stages or grouped totals. Choose data at the intended grain; calculations use all selected data on the server.")}</p>
    <div className="statistical-builder-panels grid items-start gap-5">
      <fieldset disabled={busy || templateBusy} className="min-w-0 space-y-4 rounded-xl border border-outline bg-panel p-5">
        <legend className="px-2 font-semibold">{t("Data and calculation")}</legend>
        <label className="block">{t("Report name")}<input className="form-control" maxLength={200} value={name} onChange={e => setName(e.target.value)} /></label>
        {!edit && <ReportInputPicker input={input} onChange={resetPreview} onRefresh={resetPreview} />}
        {!edit && <AnalyticalTemplatePicker key={JSON.stringify(input.source)} projectId={projectId} requestId={requestId} source={input.source} columns={columns} ready={input.ready} onBusyChange={setTemplateBusy} onApply={settings => { setAnalysis(settings.analysis); setFilters(settings.filters ?? []); if (!name.trim()) setName(settings.name); resetPreview(); }} />}
        <label className="block">{t("Analysis type")}<select disabled={!!edit} className="form-control" value={analysis.type} onChange={e => { setAnalysis(newAnalysis(e.target.value as Request["analysis"]["type"], analysis)); resetPreview(); }}>
          <option value="histogram">{t("Histogram statistics")}</option><option value="boxplot_stats">{t("Box-plot statistics")}</option>
          <option value="heatmap_stats">{t("Heatmap")}</option><option value="table_rollup">{t("Analytical table")}</option>
          <option value="pareto">{t("Pareto chart")}</option><option value="funnel_steps">{t("Funnel")}</option>
          <option value="waterfall_steps">{t("Waterfall")}</option>
          <option value="treemap_chart">{t("Treemap")}</option><option value="sunburst_chart">{t("Sunburst")}</option>
        </select></label>
        <StatisticalAnalysisConfiguration analysis={analysis} columns={columns} onChange={setAnalysis} />
        {["heatmap_stats", "table_rollup"].includes(analysis.type ?? "") && <p className="text-sm text-muted">{t("Use visualization settings for colour scales, pinned columns and conditional formatting. Advanced calculations remain available in the graph.")}</p>}
        {edit && analysis.type === "table_rollup" && <label className="flex gap-2 text-sm"><input type="checkbox" checked={rebindFields} onChange={e => setRebindFields(e.target.checked)} />{t("Update table fields after changing grouping or measures")}</label>}
        {edit && ["treemap_chart", "sunburst_chart"].includes(analysis.type ?? "") && <label className="flex gap-2 text-sm"><input type="checkbox" checked={rebindFields} onChange={e => setRebindFields(e.target.checked)} />{t("Update hierarchy fields after changing grouping or measures")}</label>}
        {edit && edit.widget_count > 1 && <label className="flex gap-2 text-sm"><input type="checkbox" checked={acknowledgeShared} onChange={e => setAcknowledgeShared(e.target.checked)} />{t("Confirm updating all widgets that use this visualization.")}</label>}
        <details><summary className="cursor-pointer py-2 font-medium">{t("Filters before statistics")} ({filters.length})</summary>
          <p className="text-sm text-muted">{t("Filters select observations before calculating statistics, heatmap cells and totals.")}</p>
          {filters.map((filter, index) => <div key={index} className="my-3 space-y-2 border-t border-outline pt-3">
            <label className="block">{t("Field")}<select ref={element => filterFocus.registerInput(index, element)} className="form-control" value={filter.column_id} onChange={e => setFilters(filters.map((f, i) => i === index ? { ...f, column_id: e.target.value } : f))}>
              {filter.column_id && !columns.some(c => c.column_id === filter.column_id) && <option value={filter.column_id}>{t("Unavailable field")}</option>}
              {columns.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}
            </select></label>
            <label className="block">{t("Condition")}<select className="form-control" value={filter.operator} onChange={e => setFilters(filters.map((f, i) => i === index ? { ...f, operator: e.target.value as typeof f.operator } : f))}>{["equals", "not_equals", "greater_than", "greater_or_equal", "less_than", "less_or_equal", "contains", "does_not_contain", "starts_with", "ends_with", "is_null", "is_not_null"].map(op => <option key={op} value={op}>{t(op.replaceAll("_", " "))}</option>)}</select></label>
            {!filter.operator.includes("null") && <label className="block">{t("Value")}<input className="form-control" value={String(filter.value ?? "")} onChange={e => setFilters(filters.map((f, i) => i === index ? { ...f, value: e.target.value } : f))} /></label>}
            <Button variant="outline" onClick={() => { filterFocus.afterRemove(index); setFilters(filters.filter((_, i) => i !== index)); }}>{t("Remove filter")}</Button>
          </div>)}
          <Button ref={element => filterFocus.registerAddButton(element)} variant="outline" disabled={!columns.length || filters.length >= 32} onClick={() => { filterFocus.afterAdd(); setFilters([...filters, { column_id: columns[0].column_id, operator: "equals", value: "" }]); }}>{t("Add filter")}</Button>
        </details>
        <div className="flex flex-wrap gap-3"><Button disabled={!body || busy} onClick={() => body && preview.mutate({ body, offset: 0 })}>{t("Preview calculation")}</Button><Button disabled={!current || busy} onClick={() => body && current && draft.save(body, state)}>{t("Save report")}</Button></div>
      </fieldset>
      <section aria-label={t("Report preview")} aria-busy={busy} className="min-w-0 space-y-3 rounded-xl border border-outline bg-panel p-5">
        <h2 className="text-xl font-semibold">{t("Report preview")}</h2>
        {preview.error && <DataStatePanel state="error" title="Report check failed" focusOnMount>{errorText(preview.error)}</DataStatePanel>}
        {busy && <DataStatePanel state="loading">{current && t("Showing previous result. Waiting for updated data.")}</DataStatePanel>}
        {current ? <>
          <fieldset disabled={busy} className="flex h-[34rem] min-w-0 flex-col border-0 p-0"><VisualizationResultView result={current.result} setOffset={offset => body && preview.mutate({ body, offset })} /></fieldset>
          <details><summary className="cursor-pointer py-2">{t("How it is calculated")}</summary><ol className="list-inside list-decimal space-y-1">{current.steps.map((step, i) => <li key={i}>{nodeName(step)}</li>)}</ol></details>
        </> : !busy && !preview.error && (settled ? <DataStatePanel state="previous" title="Preview is out of date. Run the calculation again." /> : <DataStatePanel state="incomplete">{t("Choose data and complete the calculation settings, then preview before saving.")}</DataStatePanel>)}
      </section>
    </div>
  </section>;
}
