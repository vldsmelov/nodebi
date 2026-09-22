"use client";

import { useI18n } from "@/lib/i18n";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Suspense, useCallback } from "react";

import { listSources } from "@/features/data-sources/api";
import { WorkflowEditor } from "@/features/workflow/WorkflowEditor";
import { FieldWorkflowEditor } from "@/features/workflow/FieldWorkflowEditor";
import { createWorkflow, getNodeCatalog, getWorkflow, getWorkflowSchema, listWorkflows, saveWorkflow } from "@/features/workflow/api";

function WorkflowPageContent() {
  const { t, errorText } = useI18n();
  const { projectId } = useParams<{ projectId: string }>();
  const client = useQueryClient();
  const search = useSearchParams();
  const router = useRouter();
  const selectedWorkflowId = search.get("workflow") ?? "";
  const targetNodeId = search.get("node");
  const fieldMode = search.get("mode") === "fields";
  const setSelectedWorkflowId = (id: string) => router.push(`/projects/${projectId}/workflow?workflow=${encodeURIComponent(id)}`);
  const workflows = useQuery({ queryKey: ["workflows", projectId], queryFn: () => listWorkflows(projectId) });
  const invalidWorkflow = Boolean(selectedWorkflowId && workflows.data && !workflows.data.some(item => item.id === selectedWorkflowId));
  const effectiveWorkflowId = selectedWorkflowId ? (workflows.data?.some(item => item.id === selectedWorkflowId) ? selectedWorkflowId : "") : workflows.data?.[0]?.id || "";
  const workflow = useQuery({ queryKey: ["workflow", effectiveWorkflowId], queryFn: () => getWorkflow(effectiveWorkflowId), enabled: Boolean(effectiveWorkflowId) });
  const resolvedSchema = useQuery({ queryKey: ["workflow-schema", effectiveWorkflowId], queryFn: () => getWorkflowSchema(effectiveWorkflowId), enabled: Boolean(effectiveWorkflowId) && (!fieldMode || workflow.data?.version === 1) });
  const catalogVersion = fieldMode && workflow.data?.version === 2 ? 2 : 1;
  const catalog = useQuery({ queryKey: ["node-catalog", catalogVersion], queryFn: () => getNodeCatalog(catalogVersion) });
  const sources = useQuery({ queryKey: ["sources", projectId], queryFn: () => listSources(projectId) });
  const create = useMutation({
    mutationFn: () => createWorkflow(projectId, t("Analysis workflow")),
    onSuccess: (created) => {
      setSelectedWorkflowId(created.id);
      client.setQueryData(["workflow", created.id], created);
      void client.invalidateQueries({ queryKey: ["workflows", projectId] });
    },
  });
  const createFields = useMutation({
    mutationFn: async () => {
      const created = await createWorkflow(projectId, t("Field workflow"));
      return saveWorkflow(created.id, { name: created.name, expected_revision: created.revision, format_version: 2, nodes: [], edges: [], parameters: [], presentation: { workbooks: [], blocks: [] } });
    },
    onSuccess: created => {
      client.setQueryData(["workflow", created.id], created);
      void client.invalidateQueries({ queryKey: ["workflows", projectId] });
      router.push(`/projects/${projectId}/workflow?workflow=${created.id}&mode=fields`);
    },
  });
  const refreshSchema = useCallback(() => {
    if (effectiveWorkflowId) {
      void client.invalidateQueries({ queryKey: ["workflow-schema", effectiveWorkflowId] });
      void client.invalidateQueries({ queryKey: ["workflow", effectiveWorkflowId] });
    }
  }, [client, effectiveWorkflowId]);
  const error = workflows.error ?? workflow.error ?? catalog.error ?? sources.error ?? create.error ?? createFields.error;
  const loading = workflows.isPending || catalog.isPending || sources.isPending || Boolean(effectiveWorkflowId && workflow.isPending);

  return (
    <main className="min-h-[calc(100vh-2.75rem)] bg-page text-foreground">
      <header className="flex h-20 items-center justify-between gap-5 px-6">
        <div className="flex min-w-0 items-center gap-5">
          <Link href={`/projects/${projectId}`} className="text-sm text-muted hover:text-foreground">{t("← Project")}</Link>
          <div className="h-6 w-px bg-raised" />
          <div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">{t("Workflow")}</p><h1 className="truncate text-lg font-medium">{workflow.data?.name ?? t("Workflow editor")}</h1></div>
        </div>
        <div className="flex items-center gap-3">
          <button disabled={createFields.isPending} className="rounded-full border border-outline px-4 py-2 text-sm" onClick={() => createFields.mutate()}>{t("New field workflow")}</button>
          {workflow.data?.version === 2 && <Link className="text-sm underline" href={`/projects/${projectId}/workflow?workflow=${workflow.data.id}${fieldMode ? "" : "&mode=fields"}`}>{t(fieldMode ? "Classic editor" : "Field editor")}</Link>}
          {workflows.data && workflows.data.length > 1 ? <select aria-label={t("Workflow")} value={effectiveWorkflowId} onChange={(event) => setSelectedWorkflowId(event.target.value)} className="rounded-full border border-outline bg-surface px-4 py-2 text-sm">{workflows.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : null}
          <button onClick={() => create.mutate()} disabled={create.isPending} className="rounded-full border border-outline px-4 py-2 text-sm hover:border-accent/50 disabled:opacity-50">{create.isPending ? t("Creating…") : t("New workflow")}</button>
        </div>
      </header>
      {invalidWorkflow ? <p role="alert" className="mx-6 text-danger">{t("The linked workflow is unavailable in this project.")}</p> : null}
      {error ? <div className="mx-6 rounded-xl bg-danger-surface p-4 text-sm text-danger">{errorText(error)}</div> : null}
      {loading ? <div className="grid h-[calc(100vh-7.75rem)] place-items-center text-muted">{t("Loading workflow…")}</div> : null}
      {!loading && workflows.data?.length === 0 ? <div className="grid h-[calc(100vh-5rem)] place-items-center"><div className="text-center"><h2 className="text-2xl">{t("Start with an empty workflow")}</h2><p className="mt-2 text-sm text-muted">{t("Create a canvas, then add an Excel source from the node library.")}</p><button onClick={() => create.mutate()} className="mt-6 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary">{t("Create workflow")}</button></div></div> : null}
      {workflow.data && catalog.data && sources.data ? fieldMode && workflow.data.version === 2 ? <FieldWorkflowEditor targetNodeId={targetNodeId} key={`${workflow.data.id}:fields`} workflow={workflow.data} catalog={catalog.data} sources={sources.data} onSaved={refreshSchema} /> : <WorkflowEditor key={`${workflow.data.id}:${targetNodeId ?? ""}`} targetNodeId={targetNodeId} workflow={workflow.data} catalog={catalog.data} sources={sources.data} resolvedSchema={resolvedSchema.data} onSaved={refreshSchema} /> : null}
    </main>
  );
}

export default function WorkflowPage() { return <Suspense><WorkflowPageContent /></Suspense>; }
