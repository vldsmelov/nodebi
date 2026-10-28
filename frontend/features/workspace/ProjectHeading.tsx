"use client";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { renameProject, type Project } from "@/features/projects/api";

export function ProjectHeading({ project }: { project: Project }) {
  const { t, errorText } = useI18n(), client = useQueryClient();
  const [editing, setEditing] = useState(false), [name, setName] = useState(project.name);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => { setEditing(false); requestAnimationFrame(() => trigger.current?.focus()); };
  const rename = useMutation({ mutationFn: () => renameProject(project.id, name.trim()), onSuccess: value => { client.setQueryData(["project", project.id], value); close(); } });
  return <header className="mb-8">
    <Link className="inline-block min-h-10 py-2 text-sm text-muted underline" href="/projects">{t("← All projects")}</Link>
    <div className="mt-4 flex flex-col items-start justify-between gap-5 sm:flex-row">
      <div className="min-w-0 max-w-full flex-1 self-stretch"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{t("Project overview")}</p>
        {editing ? <form className="max-w-xl" onSubmit={e => { e.preventDefault(); if (name.trim() && !rename.isPending) rename.mutate(); }}>
          <label className="text-sm">{t("Project name")}<input autoFocus className="form-control mt-2" maxLength={200} value={name} disabled={rename.isPending} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Escape" && !rename.isPending) { e.preventDefault(); close(); } }} /></label>
          <div className="mt-2 flex gap-4"><button className="min-h-10 text-accent underline disabled:opacity-40" disabled={!name.trim() || rename.isPending}>{t("Save project name")}</button><button type="button" className="min-h-10 underline" disabled={rename.isPending} onClick={close}>{t("Cancel")}</button></div>
          {rename.error && <p role="alert" className="text-sm text-danger">{errorText(rename.error)}</p>}
        </form> : <div className="flex items-center gap-2"><h1 className="min-w-0 break-words text-3xl font-semibold sm:text-4xl">{project.name}</h1><button ref={trigger} aria-label={t("Rename project")} className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-outline text-muted" onClick={() => { setName(project.name); rename.reset(); setEditing(true); }}><Pencil size={16} aria-hidden="true" /></button></div>}
        <p className="mt-3 max-w-2xl text-sm text-muted">{t("Open a report, prepare data or resolve pending checks. Calculations stay available when you need detail.")}</p>
      </div>
      <Link className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 py-2 text-sm font-medium text-on-primary" href={`/projects/${project.id}/build`}>{t("Create report")}</Link>
    </div>
  </header>;
}
