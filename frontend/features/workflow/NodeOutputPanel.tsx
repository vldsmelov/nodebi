"use client";

import { useI18n } from "@/lib/i18n";

import { useMutation } from "@tanstack/react-query";
import { previewWorkflowNode } from "./api";
import type { GraphIssue, NodeSchemaResult } from "./types";

type Props = {
  workflowId: string;
  nodeId: string;
  revision: number;
  dirty: boolean;
  schema?: NodeSchemaResult;
  issues: GraphIssue[];
};

/** Schema and preview are visible only for the currently acknowledged graph revision. */
export function NodeOutputPanel({ workflowId, nodeId, revision, dirty, schema, issues }: Props) {
  const { t, errorText, cell } = useI18n();
  const preview = useMutation({ mutationFn: (request: { nodeId: string; revision: number }) => previewWorkflowNode(workflowId, request.nodeId) });
  const result = !dirty && preview.data?.revision === revision ? preview.data : undefined;
  return <>
    <button onClick={() => preview.mutate({ nodeId, revision })} disabled={preview.isPending || dirty}
      className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-40">
      {preview.isPending ? t("Running preview…") : t("Preview output")}
    </button>
    {!dirty && issues.map(issue => <p key={`${issue.code}:${issue.field}`}
      className={`mt-4 rounded-xl p-3 text-xs ${issue.severity === "error" ? "bg-danger-surface text-danger" : "bg-amber-400/10 text-warning"}`}>
      {errorText(issue)}
    </p>)}
    {!dirty && schema?.columns && <section className="mt-6">
      <h3 className="text-xs uppercase tracking-[0.18em] text-muted">{t("Output fields")}</h3>
      <div className="mt-3 space-y-2">{schema.columns.map(column => <div key={column.column_id}
        className="flex items-center justify-between rounded-lg border border-outline px-3 py-2 text-xs">
        <span className="truncate">{column.display_name}</span>
        <span className="ml-2 text-muted">{t(column.logical_type)}{column.nullable ? "?" : ""}</span>
      </div>)}</div>
    </section>}
    {preview.error && !dirty && preview.variables?.revision === revision && <p role="alert" className="mt-4 rounded-xl bg-danger-surface p-3 text-xs text-danger">{errorText(preview.error)}</p>}
    {result && <section className="mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted">{t("Preview")}</h3>
        <span className="text-[11px] text-muted">{t("Rows: {0} · {1} ms", { 0: cell(result.total_rows), 1: cell(result.duration_ms) })}</span>
      </div>
      {result.rows.length === 0 ? <p className="mt-3 text-xs text-muted">{t("The result is empty.")}</p> :
        <div className="mt-3 overflow-auto rounded-xl border border-outline"><table className="min-w-full text-[11px]">
          <thead><tr>{result.columns.map(column => <th key={column.column_id}
            className="border-b border-outline px-2 py-2 text-left text-muted">{column.display_name}</th>)}</tr></thead>
          <tbody>{result.rows.map((row, index) => <tr key={index}>{result.columns.map(column =>
            <td key={column.column_id} className="border-b border-outline px-2 py-2 whitespace-nowrap">
              {cell(row[column.engine_name], column.logical_type)}
            </td>)}</tr>)}</tbody>
        </table></div>}
    </section>}
  </>;
}
