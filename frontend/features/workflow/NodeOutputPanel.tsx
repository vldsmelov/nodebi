"use client";

import { useI18n } from "@/lib/i18n";
import { useState, useEffect } from "react";
import { ApiError } from "@/lib/api";

import { useMutation } from "@tanstack/react-query";
import { previewWorkflowNode } from "./api";
import type { GraphIssue, NodeSchemaResult } from "./types";
import { JoinDiagnostics } from "./JoinDiagnostics";

type Props = {
  isJoin?: boolean;
  outputPort?: string;
  parameters?: import("./types").ParameterValues;
  workflowId: string;
  nodeId: string;
  revision: number;
  dirty: boolean;
  schema?: NodeSchemaResult;
  issues: GraphIssue[];
  onRuntimeIssues?: (issues: GraphIssue[]) => void;
};

/** Schema and preview are visible only for the currently acknowledged graph revision. */
function NodeOutputContent({ isJoin, workflowId, nodeId, revision, dirty, schema, issues, parameters = {}, outputPort, onRuntimeIssues }: Props) {
  const { t, errorText, cell } = useI18n();
  const [diagnostic, setDiagnostic] = useState("");
  const [offset, setOffset] = useState(0);
  const preview = useMutation({ mutationFn: (request: { nodeId: string; revision: number; diagnostic: string; offset: number }) => previewWorkflowNode(workflowId, request.nodeId, 100, parameters, outputPort, request.diagnostic || undefined, request.offset) });
  const result = !dirty && preview.data?.revision === revision && preview.variables?.diagnostic === diagnostic && preview.variables?.offset === offset ? preview.data : undefined;
  useEffect(() => {
    const error = !dirty && !preview.isPending && preview.variables?.revision === revision && preview.variables?.diagnostic === diagnostic && preview.variables?.offset === offset && preview.error instanceof ApiError ? preview.error : null;
    onRuntimeIssues?.(error?.issues.map(issue => ({ ...issue, severity: "error", node_id: issue.node_id ?? error.nodeId ?? null, edge_id: issue.edge_id ?? null, field: issue.field ?? null })) ?? []);
  }, [dirty, revision, diagnostic, offset, preview.error, preview.isPending, preview.variables, onRuntimeIssues]);
  return <>
    {(isJoin || result?.join_diagnostics || diagnostic) && <div className="mt-3"><select aria-label={t("Join records")} value={diagnostic} onChange={event => { setDiagnostic(event.target.value); setOffset(0); }} className="rounded border border-outline bg-control p-2"><option value="">{t("Joined result")}</option>{["left_unmatched", "right_unmatched", "left_duplicates", "right_duplicates"].map(kind => <option key={kind} value={kind}>{t(kind)}</option>)}</select><button disabled={!offset || dirty} onClick={() => setOffset(Math.max(0, offset - 100))}>{t("Previous page")}</button><button disabled={!result?.truncated || dirty} onClick={() => setOffset(offset + 100)}>{t("Next page")}</button></div>}
    {dirty && <p className="mt-3 text-xs text-warning">{t("Preview is stale. Save changes before running again.")}</p>}
    <button onClick={() => preview.mutate({ nodeId, revision, diagnostic, offset })} disabled={preview.isPending || dirty}
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
    {preview.error && !dirty && preview.variables?.revision === revision && preview.variables?.diagnostic === diagnostic && preview.variables?.offset === offset && <p role="alert" className="mt-4 rounded-xl bg-danger-surface p-3 text-xs text-danger">{errorText(preview.error)}</p>}
    {result && <section className="mt-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted">{t("Preview")}</h3>
        <span className="text-[11px] text-muted">{t("Rows: {0} · {1} ms", { 0: cell(result.total_rows), 1: cell(result.duration_ms) })}</span>
      </div>
      {result.join_diagnostics && <JoinDiagnostics value={result.join_diagnostics} />}
      {result.truncated && <p className="mt-2 text-xs text-muted">{t("Showing {0} of {1} rows", { 0: cell(result.returned_rows), 1: cell(result.total_rows) })}</p>}
      {result.rows.length === 0 ? <p className="mt-3 text-xs text-muted">{t("The result is empty.")}</p> :
        <div className="mt-3 max-h-[30vh] overflow-auto rounded-xl border border-outline"><table className="min-w-full text-xs">
          <thead><tr>{result.columns.map(column => <th key={column.column_id}
            className="sticky top-0 border-b border-outline bg-panel px-3 py-2 text-left text-muted">{column.display_name}<span className="block font-normal">{t(column.logical_type)}</span></th>)}</tr></thead>
          <tbody>{result.rows.map((row, index) => <tr key={index}>{result.columns.map(column =>
            <td key={column.column_id} className="border-b border-outline px-2 py-2 whitespace-nowrap">
              {cell(row[column.engine_name], column.logical_type)}
            </td>)}</tr>)}</tbody>
        </table></div>}
    </section>}
  </>;
}

export function NodeOutputPanel(props: Props) {
  return <NodeOutputContent key={`${props.workflowId}:${props.nodeId}:${props.outputPort ?? ""}:${props.revision}:${props.dirty}:${JSON.stringify(props.parameters ?? {})}`} {...props} />;
}
