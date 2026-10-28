"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDynamicListFocus } from "@/components/ui/useDynamicListFocus";
import { DataStatePanel, WizardHeading, WizardSteps } from "@/components/ui/workspace";
import { apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import { ReportDraftBoundary, useReportDraftAutosave, useReportDraftSession } from "./ReportDraftBoundary";
import type { ReportFormDraft } from "./report-draft";
import { ReportFormulaEditor, formulaFieldId, type ReportFormula } from "./ReportFormulaEditor";
import { ReportInputPicker, reportInputKey, useReportInput } from "./ReportInputPicker";
import { ReportComparisonControls, type Comparison } from "./ReportComparisonControls";
import { ComboConfiguration } from "@/features/workflow/ComboConfiguration";
import { comboDraft, type ComboDraft } from "@/features/dashboard/combo-draft";
import { VisualizationResultView } from "@/features/dashboard/VisualizationView";
import { RadarConfiguration } from "@/features/workflow/RadarConfiguration";
import { radarDraft, type RadarDraft } from "@/features/dashboard/radar-draft";
import { AnalyticalTemplatePicker } from "./AnalyticalTemplates";

type BuildRequest = components["schemas"]["ReportBuildRequest"];
type Preview = components["schemas"]["ReportBuildPreview"];
type Edit = components["schemas"]["ReportEditRead"];
type EditRequest = components["schemas"]["ReportEditRequest"];
type Measure = BuildRequest["measures"][number];
const steps = ["Data", "Measures", "Dimensions", "Filters", "Presentation"];

type Props = { projectId: string; edit?: Edit; onReload?: () => void; datasetId?: string };
export function ReportBuilder(props: Props) {
  return <ReportDraftBoundary key={`${props.projectId}:${props.edit?.visualization_id ?? "new"}`} projectId={props.projectId} mode={props.edit ? "edit" : "create"} target={props.edit?.visualization_id}><ReportBuilderForm {...props} /></ReportDraftBoundary>;
}
export function ReportBuilderForm({ projectId, edit, onReload, datasetId }: Props) {
  const { t, nodeName, cell, errorText } = useI18n();
  const draft = useReportDraftSession();
  const initial = draft.initial?.kind === "report" ? draft.initial : undefined;
  const savedSettings = initial?.settings ?? edit?.settings;
  const input = useReportInput(projectId, !edit, initial?.input ?? (datasetId && !edit ? { kind: "import", selected: datasetId } : undefined));
  const columns = edit?.columns ?? input.columns;
  const stableMeasures = !edit || !!edit.settings?.measures.every(m => m.output_id);
  const ready = !!edit || input.ready;
  const [name, setName] = useState(savedSettings?.name ?? "");
  const [measures, setMeasures] = useState<Measure[]>(savedSettings?.measures ?? []);
  const [rowFormulas, setRowFormulas] = useState<ReportFormula[]>(savedSettings?.row_formulas ?? []);
  const [summaryFormulas, setSummaryFormulas] = useState<ReportFormula[]>(savedSettings?.summary_formulas ?? []);
  const [valueField, setValueField] = useState<string | null>(savedSettings?.value_field_id ?? null);
  const [dimensions, setDimensions] = useState<string[]>(savedSettings?.dimensions ?? []);
  const [filters, setFilters] = useState<NonNullable<BuildRequest["filters"]>>(savedSettings?.filters ?? []);
  const measureFocus = useDynamicListFocus<HTMLInputElement>(measures.length);
  const filterFocus = useDynamicListFocus<HTMLSelectElement>(filters.length);
  const [presentation, setPresentation] = useState<NonNullable<BuildRequest["presentation"]>>(savedSettings?.presentation ?? "table");
  const [combo, setCombo] = useState<ComboDraft>(() => savedSettings?.combo ?? comboDraft({}));
  const [radar, setRadar] = useState<RadarDraft>(() => savedSettings?.radar ?? radarDraft({}));
  const [scale, setScale] = useState(savedSettings?.decimal_average_scale ?? 6);
  const [rebind, setRebind] = useState(savedSettings?.rebind_fields ?? false);
  const [acknowledgeShared, setAcknowledgeShared] = useState(false);
  const [step, setStep] = useState(initial?.step ?? 0);
  const [requestId] = useState(() => initial?.requestId ?? crypto.randomUUID());
  const [showSteps, setShowSteps] = useState(initial?.showSteps ?? false);
  const [comparison, setComparison] = useState<Comparison | null>(savedSettings?.comparison ?? null);
  const [error, setError] = useState<Error | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);
  const feedback = { onMutate: () => setError(null), onError: (failure: Error) => setError(failure) };
  const settings = { name, dimensions, measures, filters, presentation, decimal_average_scale: scale, row_formulas: rowFormulas, summary_formulas: summaryFormulas, value_field_id: valueField, comparison, ...(presentation === "combo_chart" ? { combo } : {}), ...(presentation === "radar_chart" ? { radar: radar as components["schemas"]["RadarSpec"] } : {}) };
  const expectedToken = initial?.expectedToken ?? edit?.expected_token;
  const request: BuildRequest | EditRequest | null = edit ? { request_id: requestId, expected_token: expectedToken!, settings: { ...settings, rebind_fields: rebind }, acknowledge_shared: acknowledgeShared } : input.source ? { request_id: requestId, ...input.source, ...settings } : null;
  const endpoint = `/api/v1/projects/${projectId}/report-builder${edit ? `/${edit.visualization_id}` : ""}`;
  const fieldSettings = { ...settings, presentation: "table" as const, combo: undefined, radar: undefined, comparison: null, summary_formulas: [], value_field_id: null, measures: measures.length ? measures : [{ name: "Rows", operation: "count" as const, column_id: null, ...(stableMeasures ? { output_id: requestId } : {}) }] };
  const fieldRequest: BuildRequest | EditRequest | null = request ? "settings" in request ? { ...request, settings: { ...fieldSettings, rebind_fields: false } } : { ...request, ...fieldSettings } : null;
  const fields = useMutation({ ...feedback, mutationFn: (body: BuildRequest | EditRequest) => apiRequest<components["schemas"]["ReportFormulaFields"]>(`${endpoint}/fields`, { method: "POST", body: JSON.stringify(body) }) });
  const checkedFields = fields.data && JSON.stringify(fields.variables) === JSON.stringify(fieldRequest) ? fields.data : null;
  const summaryRequest = fieldRequest ? "settings" in fieldRequest ? { ...fieldRequest, settings: { ...fieldRequest.settings, summary_formulas: summaryFormulas } } : { ...fieldRequest, summary_formulas: summaryFormulas } : null;
  const summaryFields = useMutation({ ...feedback, mutationFn: (body: BuildRequest | EditRequest) => apiRequest<components["schemas"]["ReportFormulaFields"]>(`${endpoint}/fields?include_summary=true`, { method: "POST", body: JSON.stringify(body) }) });
  const summaryBase = (body: BuildRequest | EditRequest | undefined) => body ? "settings" in body ? { ...body, settings: { ...body.settings, summary_formulas: [] } } : { ...body, summary_formulas: [] } : null;
  const checkedSummaryBase = !summaryFields.error && summaryFields.data && JSON.stringify(summaryBase(summaryFields.variables)) === JSON.stringify(fieldRequest) ? summaryFields.data : null;
  const previousSummaries = summaryFields.variables && ("settings" in summaryFields.variables ? summaryFields.variables.settings : summaryFields.variables).summary_formulas;
  const checkedSummaryOutputs = checkedSummaryBase ? Object.fromEntries(summaryFormulas.flatMap((formula, index) => {
    const output = checkedSummaryBase.summary_outputs?.[formula.node_id];
    return output && JSON.stringify(previousSummaries?.slice(0, index + 1)) === JSON.stringify(summaryFormulas.slice(0, index + 1)) ? [[formula.node_id, output]] : [];
  })) : undefined;
  const measureColumns = checkedFields?.measure_columns ?? checkedSummaryBase?.measure_columns ?? null;
  const rowKey = (body: BuildRequest | EditRequest | null | undefined) => body ? JSON.stringify([reportInputKey(body), ("settings" in body ? body.settings : body).row_formulas ?? []]) : "";
  const checkedRows = fields.data && rowKey(fields.variables) === rowKey(fieldRequest) ? fields.data : null;
  const previousRows = fields.variables && ("settings" in fields.variables ? fields.variables.settings : fields.variables).row_formulas;
  const sameSource = !!fields.variables && reportInputKey(fields.variables) === reportInputKey(request);
  // A new formula can use a checked unchanged prefix; later edits must not reuse stale schemas.
  const checkedRowOutputs = sameSource ? Object.fromEntries(rowFormulas.flatMap((formula, index) => {
    const output = fields.data?.row_outputs?.[formula.node_id];
    return output && JSON.stringify(previousRows?.slice(0, index + 1)) === JSON.stringify(rowFormulas.slice(0, index + 1)) ? [[formula.node_id, output]] : [];
  })) : undefined;
  const rowColumns = checkedRows?.row_columns ?? columns;
  const comboMeasures = summaryFormulas.length ? checkedSummaryOutputs?.[summaryFormulas.at(-1)!.node_id] ?? measureColumns : measureColumns;
  const outputChoices = [...(measureColumns ?? []), ...summaryFormulas.map(f => ({ column_id: formulaFieldId(f), display_name: f.name }))];
  const preview = useMutation({ ...feedback, mutationFn: (body: BuildRequest | EditRequest) => apiRequest<Preview>(`${endpoint}/preview`, { method: "POST", body: JSON.stringify(body) }) });
  const currentPreview = preview.data && JSON.stringify(preview.variables) === JSON.stringify(request) ? preview.data : null;
  const calculationKey = (body: BuildRequest | EditRequest | null | undefined) => {
    if (!body) return "";
    const s = "settings" in body ? body.settings : body;
    return JSON.stringify([reportInputKey(body), s.dimensions, s.measures, s.row_formulas, s.summary_formulas, s.filters, s.decimal_average_scale, s.comparison]);
  };
  // A fresh full preview also checks output fields after restoring a draft. Series labels/axes
  // do not change this schema; changed calculations or sources must not reuse it.
  const previewColumns = preview.data && calculationKey(preview.variables) === calculationKey(request) ? preview.data.columns : null;
  const comboColumns = previewColumns ?? [...rowColumns.filter(column => dimensions.includes(column.column_id)), ...(comboMeasures ?? [])];
  const busy = templateBusy || preview.isPending || fields.isPending || summaryFields.isPending || (!edit && input.kind === "publication" && input.detail.isFetching);
  const numeric = rowColumns.filter(column => ["decimal", "integer", "float"].includes(column.logical_type));
  const validFormula = (f: ReportFormula) => !!f.name.trim() && !!f.expression.trim() && (f.precision ?? 38) >= 1 && (f.precision ?? 38) <= 38 && (f.scale ?? 2) >= 0 && (f.scale ?? 2) <= (f.precision ?? 38);
  const fieldReady = ready && !!name.trim() && rowFormulas.every(validFormula) && measures.every(item => !!item.name.trim() && (item.operation === "count" || !!item.column_id));
  const comparisonChart = !!comparison && ["bar_chart", "line_chart"].includes(presentation);
  const validComparison = !comparison || (!!comparison.name?.trim() && dimensions.includes(comparison.date_column_id) && !!comparison.value_column_id && (comparison.ratio_scale ?? 6) >= 0 && (comparison.ratio_scale ?? 6) <= 18 && (presentation === "table" || (comparisonChart && dimensions.length === 1)));
  const validCombo = presentation !== "combo_chart" || (dimensions.length === 1 && dimensions[0] === combo.category_column_id && combo.series.length >= 2 && combo.series.every(series => !!series.column_id));
  const validRadar = presentation !== "radar_chart" || (dimensions.length === 1 && dimensions[0] === radar.profile_column_id && ["shared", "min_max"].includes(radar.normalization) && radar.axes.length >= 3 && radar.axes.every(axis => !!axis.column_id && !!axis.minimum.trim() && !!axis.maximum.trim()));
  const presentationIssue = presentation === "kpi" && dimensions.length > 0 ? "A KPI shows one total. Remove breakdowns or choose a table or chart."
    : ["bar_chart", "line_chart"].includes(presentation) && dimensions.length !== 1 ? "Bar and line charts need exactly one breakdown. Choose one field or use a table."
      : null;
  const measuresReady = measures.length > 0 && measures.every(item => !!item.name.trim() && (item.operation === "count" || !!item.column_id));
  const valid = fieldReady && measuresReady && !presentationIssue && summaryFormulas.every(validFormula) && validComparison && validCombo && validRadar && (!edit || edit.widget_count <= 1 || acknowledgeShared);
  const stepIssue = !ready ? "Select a dataset to continue." : !name.trim() ? "Give the report a name to continue."
    : step === 1 && !measuresReady ? "Add at least one measure and choose its field and name." : null;
  const dirty = edit ? rebind || JSON.stringify([name, dimensions, measures, filters, presentation, scale, rowFormulas, summaryFormulas, valueField, comparison, presentation === "combo_chart" ? combo : null, presentation === "radar_chart" ? radar : null]) !== JSON.stringify([edit.settings?.name, edit.settings?.dimensions, edit.settings?.measures, edit.settings?.filters, edit.settings?.presentation, edit.settings?.decimal_average_scale, edit.settings?.row_formulas ?? [], edit.settings?.summary_formulas ?? [], edit.settings?.value_field_id ?? null, edit.settings?.comparison ?? null, edit.settings?.combo ?? null, edit.settings?.radar ?? null]) : !!name || !!input.selected;
  const draftState: ReportFormDraft = { kind: "report", requestId, settings: { ...settings, rebind_fields: rebind }, input: { kind: input.kind, selected: input.selected, source: input.source }, expectedToken, step, showSteps };
  useReportDraftAutosave(draftState, !!initial || dirty);
  function updateMeasure(index: number, value: Partial<Measure>) { setMeasures(measures.map((item, i) => i === index ? { ...item, ...value } : item)); }
  return <div className="report-builder-container space-y-6">
    {!edit && <AnalyticalTemplatePicker family="report" key={JSON.stringify(input.source)} projectId={projectId} requestId={requestId} source={input.source} columns={columns} ready={ready && !busy} onBusyChange={setTemplateBusy} onApply={loaded => {
      setName(loaded.name); setDimensions(loaded.dimensions ?? []); setMeasures(loaded.measures);
      setRowFormulas(loaded.row_formulas ?? []); setSummaryFormulas(loaded.summary_formulas ?? []);
      setFilters(loaded.filters ?? []); setPresentation(loaded.presentation ?? "table");
      setScale(loaded.decimal_average_scale ?? 6); setValueField(loaded.value_field_id ?? null);
      setComparison(loaded.comparison ?? null); setCombo(loaded.combo ?? comboDraft({})); setRadar(loaded.radar ?? radarDraft({}));
      setError(null); setStep(1);
    }} />}
    <WizardSteps labels={steps} current={step} />
    {edit && <section className="space-y-3 rounded-xl border border-outline bg-panel p-4"><p>{t("The wizard edits the current graph. Preserved steps and dashboard layout stay unchanged.")}</p><div className="flex flex-wrap gap-4"><Link className="text-accent underline" href={`/projects/${projectId}/workflow?workflow=${edit.workflow_id}&mode=fields`}>{t("Open calculation")}</Link><Button variant="outline" disabled={busy} onClick={onReload}>{t("Reload saved report")}</Button></div>{edit.widget_count > 1 && <label className="flex items-center gap-2"><input type="checkbox" checked={acknowledgeShared} disabled={busy} onChange={e => setAcknowledgeShared(e.target.checked)} />{t("Update all {0} widgets using this visualization", { 0: cell(edit.widget_count) })}</label>}</section>}
    {error && <DataStatePanel state="error" title="Report check failed" focusOnMount>{errorText(error)}</DataStatePanel>}
    <div className="report-builder-panels grid items-start gap-4">
      <fieldset disabled={busy} className="min-w-0 space-y-4 rounded-xl border border-outline bg-panel p-5"><legend className="px-2 font-semibold"><WizardHeading stage={step}>{t(steps[step])}</WizardHeading></legend>
        {step === 0 && <>{edit ? <p className="text-sm text-muted">{t("Input fields come from the saved calculation. Change its source in the graph.")}</p> : <ReportInputPicker input={input} onChange={() => { setDimensions([]); setMeasures([]); setFilters([]); setRowFormulas([]); setSummaryFormulas([]); setValueField(null); setComparison(null); setCombo(comboDraft({})); setRadar(radarDraft({})); }} />}<label className="block">{t(edit ? "Visualization name" : "Report name")}<input className="form-control" value={name} onChange={event => setName(event.target.value)} /></label>{!edit && <Link href={`/projects/${projectId}/data/import`} className="inline-block py-2 text-sm text-accent underline">{t("Connect data")}</Link>}</>}
        {step === 1 && <><ReportFormulaEditor scope="row" formulas={rowFormulas} columns={columns} rowOutputs={checkedRowOutputs} onChange={setRowFormulas} /><Button variant="outline" disabled={!fieldReady || busy} onClick={() => fieldRequest && fields.mutate(fieldRequest)}>{t("Check formula fields")}</Button><p className="text-xs text-muted">{t("Field checks infer schemas on the server without calculating or saving the report.")}</p>{measures.map((measure, index) => <div key={index} className="space-y-3 rounded-lg border border-outline p-3">
          <label className="block">{t("Measure name")}<input ref={el => measureFocus.registerInput(index, el)} className="form-control" value={measure.name} onChange={event => updateMeasure(index, { name: event.target.value })} /></label>
          <label className="block">{t("Aggregation")}<select className="form-control" value={measure.operation} onChange={event => updateMeasure(index, { operation: event.target.value as Measure["operation"] })}>{["sum", "count", "average", "min", "max", "distinct_count"].map(operation => <option key={operation} value={operation}>{t(operation)}</option>)}</select></label>
          <label className="block">{t("Field")}<select className="form-control" value={measure.column_id ?? ""} onChange={event => updateMeasure(index, { column_id: event.target.value || null })}><option value="">{measure.operation === "count" ? t("All rows") : t("Select field")}</option>{measure.column_id && !rowColumns.some(c => c.column_id === measure.column_id) ? <option value={measure.column_id}>{t("Unavailable field")}</option> : null}{(measure.operation === "sum" || measure.operation === "average" ? numeric : rowColumns).map(column => <option key={column.column_id} value={column.column_id}>{column.display_name}</option>)}</select></label>
          <Button variant="outline" onClick={() => { measureFocus.afterRemove(index); setMeasures(measures.filter((_, i) => i !== index)); }}>{t("Remove measure")}</Button>
        </div>)}<Button ref={el => measureFocus.registerAddButton(el)} variant="outline" disabled={measures.length >= 16} onClick={() => { measureFocus.afterAdd(); setMeasures([...measures, { ...(stableMeasures ? { output_id: crypto.randomUUID() } : {}), name: t("Total"), operation: numeric.length ? "sum" : "count", column_id: numeric[0]?.column_id ?? null }]); }}>{t("Add measure")}</Button><p className="text-sm text-muted">{t("Average means the average of individual values, not a ratio of totals.")}</p><label className="block">{t("Decimal places for averages")}<input className="form-control" type="number" min={0} max={18} value={scale} onChange={e => setScale(Number(e.target.value))} /></label><Button variant="outline" disabled={!stableMeasures || !fieldReady || !measures.length || !summaryFormulas.every(validFormula) || busy} onClick={() => summaryRequest && summaryFields.mutate(summaryRequest)}>{t("Check after-total fields")}</Button><p className="text-sm text-muted">{t("Check completed formulas before using their results in the next formula. Changing earlier calculations requires another check.")}</p><ReportFormulaEditor scope="summary" formulas={summaryFormulas} columns={measureColumns} rowOutputs={checkedSummaryOutputs} onChange={setSummaryFormulas} disabled={!stableMeasures} />{!stableMeasures && <p className="text-sm text-muted">{t("After-total formulas require stable measures. Legacy reports remain unchanged.")}</p>}</>}
        {step === 2 && <><p className="text-sm text-muted">{t("Without dimensions, the report contains one total.")}</p>{rowColumns.map(column => <label key={column.column_id} className="flex min-h-10 items-center gap-2"><input type="checkbox" disabled={dimensions.length >= 8 && !dimensions.includes(column.column_id)} checked={dimensions.includes(column.column_id)} onChange={event => setDimensions(event.target.checked ? [...dimensions, column.column_id] : dimensions.filter(id => id !== column.column_id))} />{column.display_name}</label>)}</>}
        {step === 3 && <><p className="text-sm text-muted">{t("Filters are applied before aggregation.")}</p>{filters.map((filter, index) => <div key={index} className="space-y-2 rounded-lg border border-outline p-3">
          <label>{t("Field")}<select ref={el => filterFocus.registerInput(index, el)} className="form-control" value={filter.column_id} onChange={e => setFilters(filters.map((item, i) => i === index ? { ...item, column_id: e.target.value } : item))}>{rowColumns.map(column => <option key={column.column_id} value={column.column_id}>{column.display_name}</option>)}</select></label>
          <label>{t("Operator")}<select className="form-control" value={filter.operator} onChange={e => setFilters(filters.map((item, i) => i === index ? { ...item, operator: e.target.value as typeof filter.operator } : item))}>{["equals", "not_equals", "greater_than", "greater_or_equal", "less_than", "less_or_equal", "contains", "does_not_contain", "starts_with", "ends_with", "is_null", "is_not_null"].map(value => <option key={value} value={value}>{t(value.replaceAll("_", " "))}</option>)}</select></label>
          {!filter.operator.includes("null") && <label>{t("Value")}<input className="form-control" value={String(filter.value ?? "")} onChange={e => setFilters(filters.map((item, i) => i === index ? { ...item, value: e.target.value } : item))} /></label>}
          <Button variant="outline" onClick={() => { filterFocus.afterRemove(index); setFilters(filters.filter((_, i) => i !== index)); }}>{t("Remove filter")}</Button>
        </div>)}<Button ref={el => filterFocus.registerAddButton(el)} variant="outline" disabled={!rowColumns.length || filters.length >= 32} onClick={() => { filterFocus.afterAdd(); setFilters([...filters, { column_id: rowColumns[0].column_id, operator: "equals", value: "" }]); }}>{t("Add filter")}</Button></>}
        {step === 4 && <>
          {edit && <><label className="flex items-center gap-2"><input type="checkbox" checked={rebind} onChange={e => { setRebind(e.target.checked); if (!e.target.checked) { setPresentation(edit.settings?.presentation ?? "table"); setCombo(edit.settings?.combo ?? comboDraft({})); setRadar(edit.settings?.radar ?? radarDraft({})); } }} />{t("Update visualization field bindings")}</label><p className="text-sm text-muted">{t("By default, existing field order, series and appearance are preserved. Updating bindings uses the selected dimensions and measures; appearance stays unchanged.")}</p></>}
          <label className="block">{t("Presentation")}<select className="form-control" disabled={!!edit && !rebind} value={presentation} onChange={event => setPresentation(event.target.value as typeof presentation)}>{["table", "bar_chart", "line_chart", "kpi", "combo_chart", "radar_chart"].map(type => <option key={type} value={type} disabled={!!comparison && (["kpi", "combo_chart", "radar_chart"].includes(type) || (type !== "table" && dimensions.length !== 1))}>{nodeName(type)}</option>)}</select></label>
          {presentation === "radar_chart" ? <>
            <p className="text-sm text-muted">{t("Choose one profile dimension and at least three measures. The graph aggregates each profile; choose axis scales explicitly.")}</p>
            <Button variant="outline" disabled={!fieldReady || busy || !summaryFormulas.every(validFormula)} onClick={() => summaryRequest && summaryFields.mutate(summaryRequest, { onSuccess: data => {
              if (!radar.axes.some(axis => axis.column_id)) {
                const fields = summaryFormulas.length ? data.summary_outputs?.[summaryFormulas.at(-1)!.node_id] ?? data.measure_columns : data.measure_columns;
                setRadar({ ...radar, profile_column_id: dimensions.length === 1 ? dimensions[0] : "", axes: radar.axes.map((axis, index) => ({ ...axis, column_id: fields[index]?.column_id ?? "" })) });
              }
            } })}>{t("Check presentation fields")}</Button>
            <fieldset disabled={!!edit && !rebind}><RadarConfiguration config={{ spec: radar }} columns={comboColumns} onChange={config => setRadar(radarDraft(config))} /></fieldset>
          </> : presentation === "combo_chart" ? <>
            <p className="text-sm text-muted">{t("Plan and actual are separate measures. Choose one dimension; the graph calculates one row per category before drawing bars and lines.")}</p>
            <Button variant="outline" disabled={!fieldReady || busy || !summaryFormulas.every(validFormula)} onClick={() => summaryRequest && summaryFields.mutate(summaryRequest, { onSuccess: data => {
              if (!combo.series.some(series => series.column_id)) {
                const fields = summaryFormulas.length ? data.summary_outputs?.[summaryFormulas.at(-1)!.node_id] ?? data.measure_columns : data.measure_columns;
                setCombo({ ...combo, category_column_id: dimensions.length === 1 ? dimensions[0] : "", series: combo.series.map((series, index) => ({ ...series, column_id: fields[index]?.column_id ?? "" })) });
              }
            } })}>{t("Check presentation fields")}</Button>
            <fieldset disabled={!!edit && !rebind}><ComboConfiguration config={{ spec: combo }} columns={comboColumns} onChange={config => setCombo(comboDraft(config))} /></fieldset>
          </> : comparisonChart ? <p className="text-sm text-muted">{t("Comparison charts show the compared measure and its baseline on one axis. Difference and change % remain in the table preview. Changing the compared measure requires updating field bindings.")}</p> : <label className="block">{t("Primary output measure")}<select className="form-control" disabled={!!edit && !rebind} value={valueField ?? ""} onChange={e => setValueField(e.target.value || null)}><option value="">{t("First measure")}</option>{valueField && !outputChoices.some(c => c.column_id === valueField) && <option value={valueField}>{t("Selected output (check fields to view names)")}</option>}{outputChoices.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}</select></label>}
          <p className="text-sm text-muted">{t("A KPI can display a selected after-total formula. Tables retain all measures.")}</p><p className="text-sm text-muted">{t("Table supports multiple dimensions. Charts use one dimension; KPI uses one measure and no dimensions.")}</p>
        </>}
        {step === 3 && <><Button variant="outline" disabled={!fieldReady || busy} onClick={() => fieldRequest && fields.mutate(fieldRequest)}>{t("Check formula fields")}</Button><ReportComparisonControls value={comparison} onChange={value => { setComparison(value); if (value && presentation === "kpi") setPresentation("table"); }} dates={rowColumns.filter(c => c.logical_type === "date" && dimensions.includes(c.column_id))} measures={outputChoices} />{edit && <p className="text-sm text-muted">{t("Adding or removing a comparison requires updating visualization field bindings on the Presentation step.")}</p>}</>}
    {step === 4 && presentationIssue && <section role="status" className="rounded-xl border border-outline bg-panel p-4 text-sm"><p>{t(presentationIssue)}</p><div className="mt-2 flex flex-wrap gap-3">{presentation === "kpi" ? <Button variant="outline" disabled={busy} onClick={() => setDimensions([])}>{t("Use a total without breakdowns")}</Button> : <Button variant="outline" disabled={busy} onClick={() => setStep(2)}>{t("Choose breakdowns")}</Button>}<Button variant="outline" disabled={busy} onClick={() => setPresentation("table")}>{t("Use a table")}</Button></div></section>}
    {step < 4 && stepIssue && <p role="status" className="text-sm text-muted">{t(stepIssue)}</p>}
    <div className="flex flex-wrap gap-3">{step > 0 && <Button variant="outline" disabled={busy} onClick={() => setStep(step - 1)}>{t("Back")}</Button>}{step < 4 ? <Button disabled={!!stepIssue || busy || (step === 1 && !rowFormulas.every(validFormula))} onClick={() => setStep(step + 1)}>{t("Next")}</Button> : <Button disabled={!currentPreview || !ready || !valid || busy} onClick={() => request && draft.save(request, draftState)}>{t("Save report")}</Button>}</div>
      </fieldset>
      <section className="min-w-0 space-y-4 rounded-xl border border-outline bg-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{t("Report preview")}</h2><Button variant="outline" disabled={!valid || busy} onClick={() => request && preview.mutate(request)}>{t("Preview calculation")}</Button></div>
        {currentPreview?.visualization && !preview.isPending && <div className="h-[28rem] min-w-0" data-testid="report-chart-preview"><VisualizationResultView result={currentPreview.visualization} /></div>}
        {currentPreview && !preview.isPending && currentPreview.total_rows === 0 && <DataStatePanel state="empty" title="The result is empty.">{t("Calculation completed with no rows. Check source data and filters.")}</DataStatePanel>}
        {preview.isPending ? <DataStatePanel state="loading" /> : currentPreview ? <div className="overflow-auto"><p className="mb-3 text-sm text-muted">{t("All rows are calculated on the server. Preview shows up to 50 results.")}</p><table className="data-table"><thead><tr>{currentPreview.columns.map(column => <th key={column.column_id}>{column.display_name}</th>)}</tr></thead><tbody>{currentPreview.rows.map((row, index) => <tr key={index}>{currentPreview.columns.map(column => <td key={column.column_id} data-numeric={["decimal", "integer", "float"].includes(column.logical_type)}>{cell(row[column.engine_name], column.logical_type)}</td>)}</tr>)}</tbody></table></div> : <DataStatePanel state={preview.data ? "previous" : "incomplete"}>{t("Choose fields, then preview the calculation before saving.")}</DataStatePanel>}
        <button className="min-h-10 text-sm text-accent underline" aria-expanded={showSteps} onClick={() => setShowSteps(!showSteps)}>{t("How it is calculated")}</button>
        {showSteps && <ol className="list-decimal space-y-2 pl-6 text-sm">{edit ? (edit.steps ?? []).map(item => <li key={item.node_id}>{nodeName(item.type)} · {t(item.editable ? "Simple settings" : "Preserved step")}{!item.editable && <Link className="ml-2 underline" href={`/projects/${projectId}/workflow?workflow=${edit.workflow_id}&mode=fields&node=${item.node_id}`}>{t("Open calculation")}</Link>}</li>) : currentPreview ? currentPreview.steps.map((type, index) => <li key={index}>{nodeName(type)}</li>) : <li>{t("Preview calculation")}</li>}</ol>}
      </section>
      <aside className="rounded-xl border border-outline bg-panel p-4"><h2 className="mb-3 font-semibold">{t("Available fields")}</h2>{ready ? <ul className="space-y-2 text-sm">{columns.map(column => <li key={column.column_id} className="rounded border border-outline p-2"><span>{column.display_name}</span><span className="block text-xs text-muted">{t(column.logical_type)}</span></li>)}</ul> : <p className="text-sm text-muted">{t("Select a dataset")}</p>}</aside>
    </div>

  </div>;
}
