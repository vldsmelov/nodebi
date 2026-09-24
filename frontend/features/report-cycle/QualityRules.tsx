"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { getWorkflow, listWorkflows } from "@/features/workflow/api";
import type { components } from "@/lib/api-schema";
import type { Rule, Rules } from "./api";

import { useDirtyGuard } from "./useDirtyGuard";

const control = "my-1 w-full rounded border border-outline bg-control p-2";
type Choice = { workflow: string; id: string; node: string; port: string; kind: string; name: string };
export function QualityRules({ projectId, onDirty }: { projectId: string; onDirty: (dirty: boolean) => void }) {
  const { t, errorText } = useI18n();
  const saved = useQuery({ queryKey: ["quality-rules", projectId], queryFn: () => apiRequest<Rules>(`/api/v1/projects/${projectId}/quality-rules`), refetchOnWindowFocus: false });
  const flows = useQuery({ queryKey: ["report-rule-outputs", projectId], queryFn: async () => Promise.all((await listWorkflows(projectId)).map(flow => getWorkflow(flow.id))) });
  const [draft, setDraft] = useState<Rules | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  useDirtyGuard(!!draft);
  useEffect(() => { onDirty(!!draft); return () => onDirty(false); }, [draft, onDirty]);
  const value = draft ?? saved.data;
  const choices: Choice[] = flows.data?.flatMap(flow => (flow.result_catalog?.outputs ?? []).map(output => ({ workflow: flow.id, id: output.id, node: output.node_id, port: output.port, kind: output.kind, name: `${flow.name} / ${output.name}` }))) ?? [];
  const change = (rules: Rule[]) => setDraft({ revision: value?.revision ?? 1, rules });
  return <details className="my-5 rounded border border-outline p-4"><summary>{t("Quality rules")}</summary><p className="my-3 text-sm text-muted">{t("Checks inspect complete results. Calculate control totals in the workflow, then compare published scalars.")}</p>
    {error || saved.error || flows.error ? <p role="alert" className="text-danger">{errorText(error || saved.error || flows.error)}</p> : null}
    {error ? <button className="underline" onClick={async () => { if (!draft || window.confirm(t("Discard unsaved changes?"))) { const loaded = await saved.refetch(); if (!loaded.error) { setDraft(null); setError(null); } } }}>{t("Reload saved rules")}</button> : null}
    <fieldset disabled={busy || !value}>
      {value?.rules.map((rule, index) => <RuleForm key={rule.id} rule={rule} choices={choices} onChange={next => change(value.rules.map((item, i) => i === index ? next : item))} remove={() => change(value.rules.filter((_, i) => i !== index))} />)}
      <button className="my-3 mr-3 rounded border border-outline p-2 disabled:opacity-40" disabled={!choices.length} onClick={() => { const first = choices[0]; change([...(value?.rules ?? []), { id: crypto.randomUUID(), name: t("New quality rule"), workflow_id: first.workflow, node_id: first.node, port: first.port, kind: first.kind === "scalar" ? "compare" : "required", columns: [], severity: "error", tolerance: 0, other_port: "value" }]); }}>{t("Add quality rule")}</button>
      <button className="rounded border border-outline p-2 disabled:opacity-40" disabled={!draft} onClick={async () => { setBusy(true); setError(null); try { await apiRequest(`/api/v1/projects/${projectId}/quality-rules`, { method: "PUT", body: JSON.stringify({ expected_revision: value?.revision, rules: value?.rules }) }); await saved.refetch(); setDraft(null); } catch (error) { setError(error); } finally { setBusy(false); } }}>{t("Save quality rules")}</button>
    </fieldset>
    {!choices.length && !flows.isPending && <p>{t("Publish a table or scalar result in the workflow first.")}</p>}
  </details>;
}

function RuleForm({ rule, choices, onChange, remove }: { rule: Rule; choices: Choice[]; onChange: (rule: Rule) => void; remove: () => void }) {
  const { t, errorText } = useI18n();
  const selected = choices.find(choice => choice.workflow === rule.workflow_id && choice.node === rule.node_id && choice.port === rule.port);
  const schema = useQuery({ queryKey: ["quality-schema", selected?.workflow, selected?.id], queryFn: () => apiRequest<components["schemas"]["PublicationSchema"]>(`/api/v1/workflows/${selected!.workflow}/publications/${selected!.id}/schema`), enabled: !!selected });
  const patch = (patch: Partial<Rule>) => onChange({ ...rule, ...patch });
  return <section className="my-4 rounded border border-outline p-3">
    <label>{t("Rule name")}<input className={control} value={rule.name} onChange={e => patch({ name: e.target.value })} /></label>
    <label>{t("Published result")}<select className={control} value={selected?.id ?? ""} onChange={e => { const next = choices.find(choice => choice.id === e.target.value)!; patch({ workflow_id: next.workflow, node_id: next.node, port: next.port, columns: [], other_node_id: null, kind: next.kind === "scalar" ? "compare" : "required" }); }}><option value="" disabled>{t("Select field")}</option>{choices.map(choice => <option key={choice.id} value={choice.id}>{choice.name}</option>)}</select></label>
    <label>{t("Check type")}<select className={control} value={rule.kind} onChange={e => patch({ kind: e.target.value as Rule["kind"] })}>{(selected?.kind === "scalar" ? ["compare", "change"] : ["required", "unique"]).map(kind => <option key={kind} value={kind}>{t(kind === "required" ? "Required values" : kind === "unique" ? "Unique key" : kind === "change" ? "Change since previous update" : "Compare control totals")}</option>)}</select></label>
    {["compare", "change"].includes(rule.kind) ? <>{rule.kind === "compare" && <label>{t("Compare with")}<select className={control} value={choices.find(choice => choice.node === rule.other_node_id && choice.workflow === rule.workflow_id)?.id ?? ""} onChange={e => { const other = choices.find(choice => choice.id === e.target.value)!; patch({ other_node_id: other.node, other_port: other.port }); }}><option value="" disabled>{t("Select field")}</option>{choices.filter(choice => choice.kind === "scalar" && choice.workflow === rule.workflow_id).map(choice => <option key={choice.id} value={choice.id}>{choice.name}</option>)}</select></label>}<label>{t("Allowed absolute difference")}<input className={control} type="number" min={0} step="any" value={rule.tolerance ?? 0} onChange={e => patch({ tolerance: Number(e.target.value) })} /></label></> : <fieldset><legend>{t("Fields")}</legend>{schema.error ? <p role="alert">{errorText(schema.error)}</p> : null}{schema.data?.columns.map(column => <label key={column.column_id} className="my-2 flex gap-2"><input type="checkbox" checked={rule.columns?.includes(column.column_id) ?? false} onChange={e => patch({ columns: e.target.checked ? [...(rule.columns ?? []), column.column_id] : rule.columns?.filter(id => id !== column.column_id) })} />{column.display_name}</label>)}</fieldset>}
    <label>{t("Severity")}<select className={control} value={rule.severity ?? "error"} onChange={e => patch({ severity: e.target.value as Rule["severity"] })}><option value="error">{t("Error")}</option><option value="warning">{t("Warning")}</option></select></label>
    <button className="mt-2 text-danger underline" onClick={remove}>{t("Remove")}</button>
  </section>;
}
