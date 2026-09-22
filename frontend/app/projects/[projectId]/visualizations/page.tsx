"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { listVisualizations, type Visualization } from "@/features/dashboard/api";
import { IndependentVisualizationDialog } from "@/features/dashboard/IndependentVisualizationDialog";
import { VisualizationView } from "@/features/dashboard/VisualizationView";

export default function VisualizationsPage() {
  const { projectId } = useParams<{ projectId: string }>(); const { t, nodeName, errorText } = useI18n();
  const [editing, setEditing] = useState<{ visualization?: Visualization; copy?: boolean } | null>(null), [preview, setPreview] = useState<string | null>(null), [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["visualizations", projectId], queryFn: () => listVisualizations(projectId) });
  return <main className="min-h-[calc(100vh-2.75rem)] bg-page p-6 text-foreground">
    <header className="mb-6 flex flex-wrap items-center gap-4"><Link className="text-accent" href={`/projects/${projectId}`}>{t("← Project")}</Link><h1 className="flex-1 text-2xl">{t("Visualizations")}</h1><Link className="text-accent" href={`/projects/${projectId}/workflow`}>{t("Workflow")}</Link><Link className="text-accent" href={`/projects/${projectId}/dashboard`}>{t("Dashboard")}</Link><button className="rounded bg-primary p-2 text-on-primary" onClick={() => setEditing({})}>{t("Create visualization")}</button></header>
    <p className="mb-4 text-sm text-muted">{t("Create and preview visualizations here, then place them on a dashboard.")}</p>
    {query.error ? <p role="alert" className="text-danger">{errorText(query.error)}</p> : null}
    {query.isPending ? <p>{t("Loading…")}</p> : null}
    <input className="mb-4 w-full rounded border border-outline bg-control p-2" aria-label={t("Search visualizations")} placeholder={t("Search visualizations")} value={search} onChange={e => setSearch(e.target.value)} />
    <div className="grid gap-3 md:grid-cols-2">{query.data?.filter(item => item.publication_id && item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(item => <section key={item.id} className="rounded border border-outline bg-panel p-4"><h2>{item.name} · {nodeName(item.type)}</h2><div className="my-3 flex flex-wrap gap-4 text-sm text-accent"><button onClick={() => setEditing({ visualization: item })}>{t("Settings")}</button><button onClick={() => setEditing({ visualization: item, copy: true })}>{t("Independent copy")}</button><button onClick={() => setPreview(preview === item.id ? null : item.id)}>{t("Preview visualization")}</button><Link href={`/projects/${projectId}/workflow?workflow=${item.workflow_id}&node=${item.node_id}&mode=fields`}>{t("Open calculation")}</Link></div>{preview === item.id && <div className="h-72"><VisualizationView id={item.id} revision={item.revision} /></div>}</section>)}</div>
    {editing && <IndependentVisualizationDialog projectId={projectId} visualization={editing.visualization} copy={editing.copy} close={() => setEditing(null)} />}
  </main>;
}
