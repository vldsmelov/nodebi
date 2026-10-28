"use client";

import { useI18n } from "@/lib/i18n";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, FolderKanban, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { createProject, deleteProject, listProjects } from "@/features/projects/api";
import { DataStatePanel } from "@/components/ui/workspace";

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
    if (name.trim() && !create.isPending) create.mutate(name);
  }
  return (
    <main className="corporate-page min-h-[calc(100vh-5rem)] text-foreground">
        <header className="corporate-page-heading">
          <div><span className="corporate-eyebrow">{t("Business intelligence")}</span><h1>{t("Projects")}</h1><p>{t("Connect data, build reports and keep them up to date.")}</p></div>
          {projects.data && <div className="corporate-summary"><strong>{cell(projects.data.length)}</strong><span>{t("Saved projects")}</span></div>}
        </header>
        <form className="corporate-project-form" onSubmit={submit}>
          <label className="af-field"><span className="af-label">{t("Project name")}</span><input className="af-input" maxLength={200} onChange={(event) => setName(event.target.value)} placeholder={t("Project name")} value={name} /></label>
          <button className="af-btn" disabled={create.isPending || !name.trim()}><Plus size={18} aria-hidden="true" />{t("Create project")}</button>
        </form>
        {(create.error || remove.error) && <DataStatePanel state="error" title="Project action failed" focusOnMount action={<button className="underline" onClick={() => { if (create.isError) create.reset(); if (remove.isError) remove.reset(); }}>{t("Dismiss")}</button>}>{errorText(create.error || remove.error)}</DataStatePanel>}
        <section className="corporate-project-grid" aria-label={t("Projects")}>
          {projects.isPending ? <p className="text-muted">{t("Loading projects…")}</p> : null}
          {projects.error ? <DataStatePanel state="error" action={<button className="underline" onClick={() => void projects.refetch()}>{t("Retry")}</button>}>{errorText(projects.error)}</DataStatePanel> : null}
          {projects.isSuccess && projects.data.length === 0 ? <div className="af-card text-muted">{t("Create a project to begin.")}</div> : null}
          {projects.data?.map((project, index) => (
            <article className="corporate-project-card" key={project.id}>
              <div className="flex items-center justify-between"><span className="corporate-project-icon"><FolderKanban size={24} aria-hidden="true" /></span><span className="corporate-card-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span></div>
              <h2>{project.name}</h2><p className="text-xs text-muted">{t("Updated")}{" "}{cell(project.updated_at, "date")}</p>
              <footer><Link className="af-btn af-btn--secondary" href={`/projects/${project.id}`}>{t("Open")}<ArrowRight size={16} aria-hidden="true" /></Link><button aria-label={t("Delete {0}", {"0": project.name})} className="project-delete" disabled={remove.isPending} onClick={() => { if (window.confirm(t("Delete “{0}” and all its contents?", {"0": project.name}))) remove.mutate(project.id); }}><Trash2 size={17} aria-hidden="true" /></button></footer>
            </article>
          ))}
        </section>
    </main>
  );
}
