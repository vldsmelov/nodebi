"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, FolderKanban, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { createProject, deleteProject, listProjects } from "@/features/projects/api";

export default function ProjectsPage() {
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
    <main className="min-h-screen bg-[#0b0f0a] px-6 py-10 text-[#f6f8f3]">
      <div className="mx-auto max-w-5xl">
        <Link className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white" href="/"><ArrowLeft size={15} /> Home</Link>
        <div className="mt-12 flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <div><p className="font-mono text-xs uppercase tracking-[0.25em] text-[#b7ff5a]">Projects</p><h1 className="mt-3 text-4xl font-medium tracking-tight">Your workspaces</h1></div>
          <form className="flex gap-2" onSubmit={submit}>
            <input aria-label="Project name" className="rounded-full border border-white/15 bg-white/5 px-5 py-3 outline-none focus:border-[#b7ff5a]" maxLength={200} onChange={(event) => setName(event.target.value)} placeholder="Project name" value={name} />
            <button aria-label="Create project" className="grid size-12 place-items-center rounded-full bg-[#b7ff5a] text-[#11170d] disabled:opacity-40" disabled={create.isPending || !name.trim()}><Plus /></button>
          </form>
        </div>
        {create.error ? <p className="mt-4 text-sm text-red-300">{create.error.message}</p> : null}
        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          {projects.isPending ? <p className="text-white/50">Loading projects…</p> : null}
          {projects.error ? <p className="text-red-300">{projects.error.message}</p> : null}
          {projects.data?.length === 0 ? <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-white/45">Create a project to begin.</div> : null}
          {projects.data?.map((project) => (
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6" key={project.id}>
              <FolderKanban className="text-[#b7ff5a]" size={24} /><h2 className="mt-8 text-xl font-medium">{project.name}</h2><p className="mt-1 text-xs text-white/35">Updated {new Date(project.updated_at).toLocaleDateString()}</p>
              <div className="mt-6 flex items-center justify-between"><Link className="inline-flex items-center gap-2 text-sm text-[#b7ff5a]" href={`/projects/${project.id}`}>Open <ArrowRight size={15} /></Link><button aria-label={`Delete ${project.name}`} className="text-white/30 hover:text-red-300" onClick={() => { if (window.confirm(`Delete “${project.name}” and all its contents?`)) remove.mutate(project.id); }}><Trash2 size={17} /></button></div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
