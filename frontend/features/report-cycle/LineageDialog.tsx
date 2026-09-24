"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { components } from "@/lib/api-schema";
import { getWorkflowSchema } from "@/features/workflow/api";
import { formulaParts } from "@/features/workflow/formula-presentation";

export function LineageDialog({ id, close }: { id: string; close: () => void }) {
  const { t, nodeName, errorText } = useI18n(); const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const lineage = useQuery({ queryKey: ["visualization-lineage", id], queryFn: () => apiRequest<components["schemas"]["LineageRead"]>(`/api/v1/visualizations/${id}/lineage`) });
  const workflow = lineage.data?.workflow;
  const schema = useQuery({ queryKey: ["lineage-schema", workflow?.id, workflow?.revision], enabled: !!workflow, queryFn: () => getWorkflowSchema(workflow!.id) });
  return <dialog ref={dialog} aria-label={t("How calculated")} onCancel={close} className="m-auto max-h-[90vh] w-[min(800px,94vw)] overflow-auto rounded-xl border border-outline bg-panel p-6 text-foreground backdrop:bg-black/60"><div className="flex justify-between"><h2 className="text-xl">{t("How calculated")}</h2><button onClick={close}>{t("Close")}</button></div>
    {lineage.error || schema.error ? <p role="alert">{errorText(lineage.error || schema.error)}</p> : null}
    {lineage.data?.sources.map(source => <section className="my-4 rounded border border-outline p-3" key={source.source_id}><h3>{source.name}</h3>{source.files.map(file => <p className="text-sm text-muted" key={file}>{file}</p>)}<p>{source.periods.join(" · ")}</p></section>)}
    {workflow?.nodes.map(node => { const columns = schema.data?.revision === workflow.revision ? schema.data.nodes.find(item => item.node_id === node.id)?.columns ?? null : null; const label = String(node.ui?.label || node.config?.name || node.config?.sheet_name || nodeName(node.type)); return <section className="my-3 border-l-2 border-accent pl-3" key={node.id}><Link className="underline" href={`/projects/${workflow.project_id}/workflow?workflow=${workflow.id}&mode=fields&node=${node.id}`}>{label}</Link><p className="text-xs text-muted">{nodeName(node.type)}</p>{typeof node.config?.expression === "string" && <p className="my-2 text-sm">{formulaParts(node.config?.expression, columns).map(part => part.reference ? part.column?.display_name ?? t("Unavailable field") : part.text).join("")}</p>}<p className="text-xs">{workflow.edges.filter(edge => edge.target_node_id === node.id).map(edge => { const source = workflow.nodes.find(item => item.id === edge.source_node_id); return source ? String(source.ui?.label || source.config?.name || source.config?.sheet_name || nodeName(source.type)) : ""; }).join(" + ")}</p><p className="text-xs text-muted">{columns?.map(column => column.display_name).join(" · ")}</p></section>; })}
  </dialog>;
}
