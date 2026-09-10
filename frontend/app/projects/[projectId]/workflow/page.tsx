"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";

import { listSources } from "@/features/data-sources/api";
import { WorkflowEditor } from "@/features/workflow/WorkflowEditor";
import { createWorkflow, getNodeCatalog, getWorkflow, getWorkflowSchema, listWorkflows } from "@/features/workflow/api";

export default function WorkflowPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const client = useQueryClient();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const workflows = useQuery({ queryKey: ["workflows", projectId], queryFn: () => listWorkflows(projectId) });
  const effectiveWorkflowId = selectedWorkflowId || workflows.data?.[0]?.id || "";
  const workflow = useQuery({ queryKey: ["workflow", effectiveWorkflowId], queryFn: () => getWorkflow(effectiveWorkflowId), enabled: Boolean(effectiveWorkflowId) });
  const resolvedSchema = useQuery({ queryKey: ["workflow-schema", effectiveWorkflowId], queryFn: () => getWorkflowSchema(effectiveWorkflowId), enabled: Boolean(effectiveWorkflowId) });
  const catalog = useQuery({ queryKey: ["node-catalog"], queryFn: getNodeCatalog });
  const sources = useQuery({ queryKey: ["sources", projectId], queryFn: () => listSources(projectId) });
  const create = useMutation({
    mutationFn: () => createWorkflow(projectId, "Analysis workflow"),
    onSuccess: (created) => {
      setSelectedWorkflowId(created.id);
      client.setQueryData(["workflow", created.id], created);
      void client.invalidateQueries({ queryKey: ["workflows", projectId] });
    },
  });
  const refreshSchema = useCallback(() => {
    if (effectiveWorkflowId) {
      void client.invalidateQueries({ queryKey: ["workflow-schema", effectiveWorkflowId] });
      void client.invalidateQueries({ queryKey: ["workflow", effectiveWorkflowId] });
    }
  }, [client, effectiveWorkflowId]);
  const error = workflows.error ?? workflow.error ?? catalog.error ?? sources.error ?? create.error;
  const loading = workflows.isPending || catalog.isPending || sources.isPending || Boolean(effectiveWorkflowId && workflow.isPending);

  return (
    <main className="min-h-screen bg-[#0b0f0a] text-white">
      <header className="flex h-20 items-center justify-between gap-5 px-6">
        <div className="flex min-w-0 items-center gap-5">
          <Link href={`/projects/${projectId}`} className="text-sm text-white/40 hover:text-white">← Project</Link>
          <div className="h-6 w-px bg-white/10" />
          <div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#b7ff5a]">Workflow</p><h1 className="truncate text-lg font-medium">{workflow.data?.name ?? "Workflow editor"}</h1></div>
        </div>
        <div className="flex items-center gap-3">
          {workflows.data && workflows.data.length > 1 ? <select aria-label="Workflow" value={effectiveWorkflowId} onChange={(event) => setSelectedWorkflowId(event.target.value)} className="rounded-full border border-white/10 bg-[#11170f] px-4 py-2 text-sm">{workflows.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : null}
          <button onClick={() => create.mutate()} disabled={create.isPending} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-[#b7ff5a]/50 disabled:opacity-50">{create.isPending ? "Creating…" : "New workflow"}</button>
        </div>
      </header>
      {error ? <div className="mx-6 rounded-xl bg-red-400/10 p-4 text-sm text-red-200">{error.message}</div> : null}
      {loading ? <div className="grid h-[calc(100vh-5rem)] place-items-center text-white/35">Loading workflow…</div> : null}
      {!loading && workflows.data?.length === 0 ? <div className="grid h-[calc(100vh-5rem)] place-items-center"><div className="text-center"><h2 className="text-2xl">Start with an empty workflow</h2><p className="mt-2 text-sm text-white/35">Create a canvas, then add an Excel source from the node library.</p><button onClick={() => create.mutate()} className="mt-6 rounded-full bg-[#b7ff5a] px-5 py-3 text-sm font-semibold text-[#11170d]">Create workflow</button></div></div> : null}
      {workflow.data && catalog.data && sources.data ? <WorkflowEditor key={workflow.data.id} workflow={workflow.data} catalog={catalog.data} sources={sources.data} resolvedSchema={resolvedSchema.data} onSaved={refreshSchema} /> : null}
    </main>
  );
}
