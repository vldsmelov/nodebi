"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { getWorkflow, getWorkflowSchema } from "@/features/workflow/api";
import type { WorkflowSummary, ParameterValues } from "@/features/workflow/types";
import type { DashboardParameter } from "./api";

type Options = NonNullable<DashboardParameter["options"]>;
const control = "rounded-lg border border-outline bg-control p-2 text-xs";

export function ParameterOptionsConfiguration({ definition, workflows, onChange }: {
  definition: DashboardParameter; workflows: WorkflowSummary[]; onChange: (options: Options | null) => void;
}) {
  const { t, nodeName, errorText } = useI18n();
  const options = definition.options;
  const workflow = useQuery({ queryKey: ["options-workflow", options?.workflow_id], enabled: !!options?.workflow_id, queryFn: () => getWorkflow(options!.workflow_id) });
  const schema = useQuery({ queryKey: ["options-schema", options?.workflow_id, workflow.data?.revision], enabled: !!options?.workflow_id && !!workflow.data, queryFn: () => getWorkflowSchema(options!.workflow_id), retry: false });
  const columns = schema.data?.nodes.find(node => node.node_id === options?.node_id)?.columns ?? [];
  return <div className="flex flex-wrap items-center gap-2 text-xs"><span>{t("Choices from data")}</span>
    <select aria-label={t("Choices workflow for {0}", { 0: definition.name })} className={control} value={options?.workflow_id ?? ""} onChange={e => onChange(e.target.value ? { workflow_id: e.target.value, node_id: "", column_id: "" } : null)}><option value="">{t("Manual input")}</option>{workflows.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
    {options ? <><select aria-label={t("Choices node for {0}", { 0: definition.name })} className={control} value={options.node_id} onChange={e => onChange({ ...options, node_id: e.target.value, column_id: "", label_column_id: null })}><option value="">{t("Select node")}</option>{workflow.data?.nodes.map(item => <option key={item.id} value={item.id}>{nodeName(item.type)} ({item.id.slice(0, 6)})</option>)}</select>
      <select aria-label={t("Choices field for {0}", { 0: definition.name })} className={control} value={options.column_id} onChange={e => onChange({ ...options, column_id: e.target.value })}><option value="">{t("Select field")}</option>{columns.filter(item => item.logical_type === definition.logical_type || (item.logical_type === "integer" && definition.logical_type === "float")).map(item => <option key={item.column_id} value={item.column_id}>{item.display_name}</option>)}</select>
      <select aria-label={t("Choices label field for {0}", { 0: definition.name })} className={control} value={options.label_column_id ?? ""} onChange={e => onChange({ ...options, label_column_id: e.target.value || null })}><option value="">{t("Display the value itself")}</option>{columns.map(item => <option key={item.column_id} value={item.column_id}>{item.display_name}</option>)}</select>
      <span className="text-muted">{t("The value is used in filters; the label is shown in the list.")}</span></> : null}
    {schema.error || workflow.error ? <span role="alert" className="text-danger">{errorText(schema.error ?? workflow.error)}</span> : null}
  </div>;
}

export function ParameterChoices({ definition, parameters, value, onChange }: {
  definition: DashboardParameter; parameters: ParameterValues; value: string | number | boolean | null;
  onChange: (value: string | number | boolean | null) => void;
}) {
  const { t, errorText, cell } = useI18n();
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const options = definition.options!;
  const query = useQuery({ queryKey: ["parameter-choices", options, parameters, appliedSearch, value], enabled: !!options.node_id && !!options.column_id,
    queryFn: () => apiRequest<components["schemas"]["NodeValuesRead"]>(`/api/v1/workflows/${options.workflow_id}/nodes/${options.node_id}/values`, { method: "POST", body: JSON.stringify({ column_id: options.column_id, label_column_id: options.label_column_id ?? null, selected_value: value ?? null, parameters, search: appliedSearch, limit: 200 }) }), retry: false });
  const choices = query.data?.choices ?? [];
  const selected = query.data?.selected;
  const choiceText = (item: components["schemas"]["NodeValueChoice"]) => {
    const id = item.value === "" ? t("(empty)") : cell(item.value, definition.logical_type);
    if (!options.label_column_id || item.label == null || item.label === "") return id;
    const label = cell(item.label, query.data?.label_column?.logical_type ?? "string");
    return `${label} (${id})`;
  };
  return <div className="mt-2 space-y-2"><div className="flex gap-2"><input aria-label={t("Search choices for {0}", { 0: definition.name })} className={control} value={search} maxLength={200} onChange={e => setSearch(e.target.value)} /><button type="button" className={control} onClick={() => setAppliedSearch(search)}>{t("Search choices")}</button></div>
    <select aria-label={t("Dashboard selection {0}", { 0: definition.name })} className={control} value={value == null ? "" : JSON.stringify(value)} onChange={e => onChange(e.target.value === "" ? null : JSON.parse(e.target.value))}>
      <option value="">{t("Not set")}</option>{value != null && !choices.some(item => item.value === value) ? <option value={JSON.stringify(value)}>{selected ? choiceText(selected) : cell(value, definition.logical_type)}</option> : null}
      {choices.map(item => <option key={JSON.stringify(item.value)} value={JSON.stringify(item.value)}>{choiceText(item)}</option>)}
    </select>
    {query.isSuccess && value != null && !selected ? <p className="text-warning">{t("The selected value is not in the available data. Choose another value or clear the selection.")}</p> : null}
    {query.isFetching ? <p className="text-muted">{t("Loading…")}</p> : null}
    {query.data?.truncated ? <p className="text-warning">{t("More choices are available. Refine the search.")}</p> : null}
    {query.error ? <p role="alert" className="text-danger">{errorText(query.error)}<button type="button" className="ml-2 underline" onClick={() => void query.refetch()}>{t("Retry")}</button></p> : null}
  </div>;
}
