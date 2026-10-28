"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataStatePanel } from "@/components/ui/workspace";
import { ReportDraftBoundary, useReportDraftAutosave, useReportDraftSession } from "./ReportDraftBoundary";
import type { AlignmentFormDraft } from "./report-draft";
import { ReportFormulaEditor, type ReportFormula } from "./ReportFormulaEditor";
import { AlignMeasuresConfiguration } from "@/features/workflow/AlignMeasuresConfiguration";
import { apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";

type Request = components["schemas"]["AlignmentReportRequest"];
type Input = components["schemas"]["ReportInputRead"];
type Preview = components["schemas"]["AlignmentReportPreview"];

export function AlignmentReportBuilder({ projectId }: { projectId: string }) {
  return <ReportDraftBoundary key={projectId} projectId={projectId} mode="alignment"><AlignmentReportForm projectId={projectId} /></ReportDraftBoundary>;
}
function AlignmentReportForm({ projectId }: { projectId: string }) {
  const { t, cell, errorText } = useI18n();
  const draft = useReportDraftSession();
  const initial = draft.initial?.kind === "alignment" ? draft.initial : undefined;
  const root = `/api/v1/projects/${projectId}`;
  const [requestId] = useState(() => initial?.requestId ?? crypto.randomUUID());
  const [workflow, setWorkflow] = useState(initial?.workflow ?? "");
  const [leftId, setLeft] = useState(initial?.leftId ?? ""), [rightId, setRight] = useState(initial?.rightId ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [alignment, setAlignment] = useState<Record<string, unknown>>(initial?.alignment ?? {});
  const [formulas, setFormulas] = useState<ReportFormula[]>(initial?.formulas ?? []);
  const [pinnedToken, setPinnedToken] = useState(initial?.expectedToken);
  const catalog = useQuery({ queryKey: ["alignment-inputs", projectId], queryFn: () => apiRequest<components["schemas"]["ReportInputList"]>(`${root}/report-builder/inputs`), refetchOnWindowFocus: false });
  const left = useQuery({ queryKey: ["alignment-input", projectId, workflow, leftId], queryFn: () => apiRequest<Input>(`${root}/report-builder/inputs/${workflow}/${leftId}`), enabled: !!workflow && !!leftId, refetchOnWindowFocus: false, retry: false });
  const right = useQuery({ queryKey: ["alignment-input", projectId, workflow, rightId], queryFn: () => apiRequest<Input>(`${root}/report-builder/inputs/${workflow}/${rightId}`), enabled: !!workflow && !!rightId, refetchOnWindowFocus: false, retry: false });
  const tokenMismatch = !!left.data && !!right.data && left.data.expected_token !== right.data.expected_token;
  const config = alignment as Request["alignment"];
  const ready = name.trim() && left.data && right.data && !left.error && !right.error && !tokenMismatch && config.left_value && config.right_value && config.keys?.length && config.keys.every(k => k.left_key && k.right_key);
  const expectedToken = pinnedToken ?? left.data?.expected_token;
  const body: Request | null = ready ? { request_id: requestId, workflow_id: workflow, left_publication_id: leftId, right_publication_id: rightId, expected_token: expectedToken!, name: name.trim(), alignment: config, ...(formulas.length ? { formulas } : {}) } : null;
  const [error, setError] = useState<Error | null>(null);
  const feedback = { onMutate: () => setError(null), onError: (failure: Error) => setError(failure) };
  const fields = useMutation({ ...feedback, mutationFn: (payload: Request) => apiRequest<components["schemas"]["AlignmentReportFields"]>(`${root}/alignment-reports/fields`, { method: "POST", body: JSON.stringify(payload) }) });
  const fieldKey = (payload: Request | undefined | null) => payload ? JSON.stringify({ ...payload, name: "", formulas: [] }) : "";
  const sameInputs = fields.data && !fields.error && fieldKey(body) === fieldKey(fields.variables);
  const preview = useMutation({ ...feedback, mutationFn: (payload: Request) => apiRequest<Preview>(`${root}/alignment-reports/preview`, { method: "POST", body: JSON.stringify(payload) }) });
  const current = !preview.isPending && !preview.error && preview.data && JSON.stringify(body) === JSON.stringify(preview.variables) ? preview.data : null;
  const previewFields = !preview.error && fieldKey(body) === fieldKey(preview.variables) ? preview.data?.formula_fields : undefined;
  const usePreviewFields = previewFields && (!sameInputs || preview.submittedAt > fields.submittedAt);
  const checked = usePreviewFields ? previewFields : sameInputs ? fields.data : undefined;
  const checkedFormulas = usePreviewFields ? preview.variables?.formulas : fields.variables?.formulas;
  const checkedOutputs = checked ? Object.fromEntries(formulas.flatMap((formula, index) => {
    const output = checked.formula_outputs?.[formula.node_id];
    return output && JSON.stringify(checkedFormulas?.slice(0, index + 1)) === JSON.stringify(formulas.slice(0, index + 1)) ? [[formula.node_id, output]] : [];
  })) : {};
  const busy = preview.isPending || fields.isPending || catalog.isFetching || left.isFetching || right.isFetching;
  const draftState: AlignmentFormDraft = { kind: "alignment", requestId, workflow, leftId, rightId, name, alignment, formulas, expectedToken };
  useReportDraftAutosave(draftState, !!initial || !!name || !!workflow || !!leftId || !!rightId);
  const workflows = [...new Map(catalog.data?.items.map(item => [item.workflow_id, item.workflow_name]) ?? []).entries()];
  const choices = catalog.data?.items.filter(item => item.workflow_id === workflow) ?? [];
  const resetInputs = () => { setError(null); setAlignment({}); setPinnedToken(undefined); preview.reset(); fields.reset(); };
  const reload = () => { setError(null); preview.reset(); fields.reset(); setPinnedToken(undefined); void catalog.refetch(); if (leftId) void left.refetch(); if (rightId) void right.refetch(); };
  return <section className="space-y-5 rounded-xl border border-outline bg-panel p-5">
    <h1 className="text-3xl font-semibold">{t("Create alignment report")}</h1>
    <p>{t("Choose two prepared tables in one calculation graph. The report keeps all keys without copying or aggregating prepared values.")}</p>
    {(catalog.error || left.error || right.error) && <DataStatePanel state="error">{errorText(catalog.error || left.error || right.error)}</DataStatePanel>}
    {error && <DataStatePanel state="error" title="Report check failed" focusOnMount>{errorText(error)}</DataStatePanel>}
    {tokenMismatch && <DataStatePanel state="incomplete">{t("Prepared data changed. Reload input fields and preview again.")}</DataStatePanel>}
    {catalog.isPending && <DataStatePanel state="loading" />}
    {!catalog.isPending && !catalog.error && !workflows.length && <DataStatePanel state="empty">{t("Select a prepared result")}</DataStatePanel>}
    <fieldset disabled={busy} className="space-y-4">
      <legend className="text-lg font-semibold">{t("1. Prepared results")}</legend>
      <label className="block">{t("Report name")}<input className="form-control" value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="block">{t("Calculation graph")}<select className="form-control" aria-label={t("Calculation graph")} value={workflow} onChange={e => { setWorkflow(e.target.value); setLeft(""); setRight(""); resetInputs(); }}><option value="">{t("Select workflow")}</option>{workflows.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      {(["left", "right"] as const).map(side => <label key={side} className="block">{t(side === "left" ? "Left prepared result" : "Right prepared result")}<select className="form-control" aria-label={t(side === "left" ? "Left prepared result" : "Right prepared result")} value={side === "left" ? leftId : rightId} onChange={e => { if (side === "left") setLeft(e.target.value); else setRight(e.target.value); resetInputs(); }}><option value="">{t("Select a prepared result")}</option>{choices.map(item => <option key={item.publication_id} value={item.publication_id} disabled={!item.available}>{item.name}{item.reason ? ` — ${t(item.reason)}` : ""}</option>)}</select></label>)}
      {(left.data?.uses_parameters || right.data?.uses_parameters) && <p>{t("Workflow parameter defaults apply to both prepared results.")}</p>}
    </fieldset>
    {left.data && right.data && !left.error && !right.error && <fieldset disabled={busy} className="space-y-3">
      <legend className="text-lg font-semibold">{t("2. Keys and measures")}</legend>
      <AlignMeasuresConfiguration config={alignment} inputColumns={{ left: left.data.columns, right: right.data.columns }} onChange={setAlignment} />
    </fieldset>}
    <section className="space-y-3">
      <Button variant="outline" disabled={busy || !body} onClick={() => body && fields.mutate(body)}>{t("Check formula fields")}</Button>
      <p className="text-xs text-muted">{t("Field checks infer schemas on the server without calculating or saving the report.")}</p>
      <ReportFormulaEditor scope="alignment" formulas={formulas} columns={checked?.columns ?? null} rowOutputs={checkedOutputs} onChange={setFormulas} disabled={busy} />
    </section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">{t("3. Check and save")}</h2>
      <Button disabled={busy || !body} onClick={() => body && preview.mutate(body)}>{t("Preview calculation")}</Button><Button className="ml-3" disabled={busy || !body || !current} onClick={() => body && draft.save(body, draftState)}>{t("Save report")}</Button>
    {preview.isPending && <DataStatePanel state="loading" />}
    {!preview.isPending && !preview.error && preview.data && !current && <DataStatePanel state="previous" title="Preview is out of date. Run the calculation again." />}
    {current && current.rows.length === 0 && <DataStatePanel state="empty" title="The result is empty.">{t("Calculation completed with no rows. Check source data and filters.")}</DataStatePanel>}
      {current && <div className="overflow-auto"><p role="status">{t("Full alignment: {0} matched, {1} only left, {2} only right. Counts cover all rows.", { 0: cell(current.alignment_diagnostics.matched_rows), 1: cell(current.alignment_diagnostics.left_only_rows), 2: cell(current.alignment_diagnostics.right_only_rows) })}</p><p>{t("All rows are calculated on the server. Preview shows up to 50 results.")}</p><table className="data-table"><thead><tr>{current.columns.map(c => <th key={c.column_id}>{c.display_name}</th>)}</tr></thead><tbody>{current.rows.map((row, i) => <tr key={i}>{current.columns.map(c => <td key={c.column_id}>{cell(row[c.engine_name], c.logical_type)}</td>)}</tr>)}</tbody></table></div>}
    </section>
    <Button variant="outline" disabled={busy} onClick={reload}>{t("Reload input fields")}</Button>
  </section>;
}
