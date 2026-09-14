"use client";

import { useI18n } from "@/lib/i18n";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Database, GitBranch, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { getProject, renameProject } from "@/features/projects/api";

const sections = [
  { name: "Data", icon: Database, path: "data" },
  { name: "Workflow", icon: GitBranch, path: "workflow" },
  { name: "Dashboard", icon: BarChart3, path: "dashboard" },
];

export default function ProjectPage() {
  const { t, errorText } = useI18n();
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const project = useQuery({ queryKey: ["project", projectId], queryFn: () => getProject(projectId) });
  const rename = useMutation({ mutationFn: (name: string) => renameProject(projectId, name), onSuccess: (value) => queryClient.setQueryData(["project", projectId], value) });
  if (project.isPending) return <main className="min-h-[calc(100vh-2.75rem)] bg-page p-10 text-muted">{t("Loading project…")}</main>;
  if (project.error) return <main className="min-h-[calc(100vh-2.75rem)] bg-page p-10 text-danger">{errorText(project.error)}</main>;
  return (
    <main className="min-h-[calc(100vh-2.75rem)] bg-page px-6 py-10 text-foreground"><div className="mx-auto max-w-6xl"><Link href="/projects" className="text-sm text-muted">{t("← All projects")}</Link><header className="mt-10 flex items-center gap-3"><h1 className="text-4xl font-medium">{project.data.name}</h1><button aria-label={t("Rename project")} className="text-muted hover:text-accent" onClick={() => { const name = window.prompt(t("Project name"), project.data.name); if (name?.trim()) rename.mutate(name); }}><Pencil size={18} /></button></header><nav className="mt-12 grid gap-4 md:grid-cols-3">{sections.map(({ name, icon: Icon, path }) => <Link href={`/projects/${projectId}/${path}`} key={name} className="rounded-3xl border border-outline bg-raised p-7 transition hover:border-accent/40"><Icon className="text-accent" /><h2 className="mt-8 text-xl">{t(name)}</h2><p className="mt-2 text-sm text-muted">{t(`Configure ${path} for this project.`)}</p></Link>)}</nav></div></main>
  );
}
