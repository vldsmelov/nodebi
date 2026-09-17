"use client";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { calculationScope, filterReferences } from "./calculation-scope";
import type { WorkflowNode, WorkflowEdge, WorkflowParameter, WorkflowSchemaResult } from "./types";
export function CalculationScopePanel({ nodes, edges, selected, schema, parameters, highlight, openNode }: {
  nodes: WorkflowNode[]; edges: WorkflowEdge[]; selected: string; schema: WorkflowSchemaResult; parameters: WorkflowParameter[];
  highlight: (ids: string[] | null) => void; openNode: (id: string) => void;
}) {
  const { t, nodeName } = useI18n(); const [calculation, setCalculation] = useState("");
  const { candidates, scope } = useMemo(() => calculationScope(nodes, edges, selected, calculation), [nodes, edges, selected, calculation]);
  const label = (node: WorkflowNode) => String(node.ui?.label || node.config?.name || node.config?.title || nodeName(node.type));
  const describeField = (node: WorkflowNode, id: string) => {
    const input = edges.find(edge => edge.target_node_id === node.id && edge.target_port === "input")?.source_node_id;
    return schema.nodes.find(node => node.node_id === input)?.columns?.find(column => column.column_id === id)?.display_name ?? id;
  };
  const filterList = (title: string, filters: WorkflowNode[]) => <div className="mt-3"><h4 className="font-medium">{t(title)}</h4>{filters.length ? <ul className="mt-1 space-y-2">{filters.map(node => <li key={node.id}>
    <button className="text-accent underline" onClick={() => openNode(node.id)}>{label(node)}</button>
    {filterReferences(node).map((ref, index) => <p key={index} className="break-words text-muted">{describeField(node, ref.field)}: {ref.parameter ? `${parameters.find(parameter => parameter.name === ref.parameter)?.label || ref.parameter} [${ref.parameter}]` : t("Literal value")}</p>)}
  </li>)}</ul> : <p className="text-muted">{t("No filters")}</p>}</div>;
  if (!candidates.length) return null;
  const chosen = candidates.find(node => node.id === calculation);
  const groupValue = chosen?.config?.partitions ?? chosen?.config?.dimensions;
  const groups = Array.isArray(groupValue) ? groupValue.filter((id): id is string => typeof id === "string") : [];
  return <details className="mt-4 rounded border border-outline p-3 text-xs" aria-label={t("Calculation scope")}>
    <summary>{t("Calculation scope")}</summary>
    <p className="my-2 text-muted">{t("Choose the total or rank node to inspect. Connections show execution order; they do not infer the denominator from a formula.")}</p>
    <select aria-label={t("Calculation to inspect")} className="w-full rounded border border-outline bg-control p-2" value={chosen?.id ?? ""} onChange={event => { setCalculation(event.target.value); highlight(null); }}>
      <option value="">{t("Select node")}</option>{candidates.map(node => <option key={node.id} value={node.id}>{label(node)} ({nodeName(node.type)})</option>)}
    </select>
    {scope && chosen && <>
      <p className="mt-2 text-muted">{t("Grouping")}: {groups.length ? groups.map(id => describeField(chosen, id)).join(", ") : t("All input rows")}</p>
      <div className="mt-3 flex flex-wrap gap-2"><button className="rounded border border-outline p-2" onClick={() => highlight([...scope.before])}>{t("Highlight calculation inputs")}</button><button className="rounded border border-outline p-2" onClick={() => highlight([...scope.path])}>{t("Highlight path to selected node")}</button><button className="underline" onClick={() => highlight(null)}>{t("Clear highlight")}</button></div>
      {filterList("Before calculation: affects totals and ranks", scope.beforeFilters)}
      {filterList("After calculation: filters computed rows", scope.afterFilters)}
      {filterList("Other input branches", scope.otherFilters)}
      <p className="mt-3 text-muted">{t("To reuse the full comparison, open the calculation node and add a branch before the selection Filter.")}</p>
      <button className="mt-2 text-accent underline" onClick={() => openNode(chosen.id)}>{t("Open calculation node")}</button>
    </>}
  </details>;
}
