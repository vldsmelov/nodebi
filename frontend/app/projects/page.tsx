"use client";

import { useI18n } from "@/lib/i18n";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, FolderKanban, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { createProject, deleteProject, listProjects } from "@/features/projects/api";

export default function ProjectsPage() {
  const { t, errorText, cell } = useI18n();
  const [name, setName] = useState("");
  const queryClient = useQueryClient();
  const projects = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const create = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
  const remove = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (name.trim()) create.mutate(name);
  }
  return (
    <main className="min-h-[calc(100vh-2.75rem)] bg-page px-6 py-10 text-foreground">
      <div className="mx-auto max-w-5xl">
        <Link className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground" href="/"><ArrowLeft size={15} />{t("Home")}</Link>
        <div className="mt-12 flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <div><p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">{t("Projects")}</p><h1 className="mt-3 text-4xl font-medium tracking-tight">{t("Your workspaces")}</h1></div>
          <form className="flex gap-2" onSubmit={submit}>
            <input aria-label={t("Project name")} className="rounded-full border border-outline bg-raised px-5 py-3 outline-none focus:border-accent" maxLength={200} onChange={(event) => setName(event.target.value)} placeholder={t("Project name")} value={name} />
            <button aria-label={t("Create project")} className="grid size-12 place-items-center rounded-full bg-primary text-on-primary disabled:opacity-40" disabled={create.isPending || !name.trim()}><Plus /></button>
          </form>
        </div>
        {create.error ? <p className="mt-4 text-sm text-danger">{errorText(create.error)}</p> : null}
        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          {projects.isPending ? <p className="text-muted">{t("Loading projects…")}</p> : null}
          {projects.error ? <p className="text-danger">{errorText(projects.error)}</p> : null}
          {projects.data?.length === 0 ? <div className="rounded-3xl border border-dashed border-outline p-10 text-center text-muted">{t("Create a project to begin.")}</div> : null}
          {projects.data?.map((project) => (
            <article className="rounded-3xl border border-outline bg-raised p-6" key={project.id}>
              <FolderKanban className="text-accent" size={24} /><h2 className="mt-8 text-xl font-medium">{project.name}</h2><p className="mt-1 text-xs text-muted">{t("Updated")}{" "}{cell(project.updated_at, "date")}</p>
              <div className="mt-6 flex items-center justify-between"><Link className="inline-flex items-center gap-2 text-sm text-accent" href={`/projects/${project.id}`}>{t("Open")}{" "}<ArrowRight size={15} /></Link><button aria-label={t("Delete {0}", {"0": project.name})} className="text-muted hover:text-danger" onClick={() => { if (window.confirm(t("Delete “{0}” and all its contents?", {"0": project.name}))) remove.mutate(project.id); }}><Trash2 size={17} /></button></div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
