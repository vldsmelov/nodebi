"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { listDashboards } from "@/features/dashboard/api";
import { DashboardPeriod, type Period } from "@/features/dashboard/DashboardPeriod";
import type { ParameterValues } from "@/features/workflow/types";
import { ReleaseContext } from "./ReleaseContext";
import { CheckResults } from "./CheckResults";
import { UpdateEditor } from "./UpdateEditor";
import { QualityRules } from "./QualityRules";
import { FrozenRelease } from "./FrozenRelease";
import type { Job, Release, Update } from "./api";

const button = "rounded border border-outline px-4 py-2 disabled:opacity-40";
const control = "my-1 w-full rounded border border-outline bg-control p-2";
export function ReportCycle({ projectId }: { projectId: string }) {
  const { t, errorText } = useI18n();
  const router = useRouter();
  const root = `/api/v1/projects/${projectId}`;
  const state = useQuery({ queryKey: ["report-state", projectId], queryFn: () => apiRequest<{ token: string }>(`${root}/report-state`), refetchInterval: 2000 });
  const updates = useQuery({ queryKey: ["data-updates", projectId], queryFn: () => apiRequest<Update[]>(`${root}/updates`), refetchInterval: 2000 });
  const jobs = useQuery({ queryKey: ["report-jobs", projectId], queryFn: () => apiRequest<Job[]>(`${root}/report-jobs`), refetchInterval: 1500 });
  const releases = useQuery({ queryKey: ["releases", projectId], queryFn: () => apiRequest<Release[]>(`${root}/releases`), refetchInterval: 3000 });
  const boards = useQuery({ queryKey: ["dashboards", projectId], queryFn: () => listDashboards(projectId) });
  const [selected, setSelected] = useState<string | null>(null), [frozen, setFrozen] = useState<Release | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  const [name, setName] = useState(""), [period, setPeriod] = useState(""), [comment, setComment] = useState("");
  const [dashboardIds, setDashboardIds] = useState<string[]>([]), [acknowledge, setAcknowledge] = useState(false);
  const [datePeriod, setDatePeriod] = useState<Period | null>(null);
  const [contexts, setContexts] = useState<Record<string, ParameterValues>>({});
  const [dirtyUpdate, setDirtyUpdate] = useState(false), [dirtyRules, setDirtyRules] = useState(false);
  const canLeaveUpdate = () => !dirtyUpdate || window.confirm(t("Discard unsaved changes?"));
  const running = jobs.data?.some(job => ["queued", "running"].includes(job.status)) ?? false;
  const checked = jobs.data?.find(job => job.status === "succeeded" && job.check && !job.result_id)?.check;
  const current = updates.data?.find(row => row.id === selected);
  const refresh = async () => { await Promise.all([updates.refetch(), jobs.refetch(), releases.refetch(), state.refetch()]); };
  async function act(action: () => Promise<unknown>) { setBusy(true); setError(null); try { await action(); await refresh(); } catch (error) { setError(error); } finally { setBusy(false); } }
  return <main className="min-h-screen bg-page p-6 text-foreground"><div className="mx-auto max-w-6xl">
    <Link className="text-sm text-muted" href={`/projects/${projectId}`}>{t("← Project")}</Link>
    <h1 className="my-6 text-3xl">{t("Report cycle")}</h1>
    <nav className="my-5 flex flex-wrap gap-5"><Link className="underline" href={`/projects/${projectId}/data`}>{t("Data")}</Link><a className="underline" href="#checks">{t("Report checks")}</a><Link className="underline" href={`/projects/${projectId}/dashboard`}>{t("Dashboard")}</Link><a className="underline" href="#releases">{t("Report releases")}</a><Link className="text-muted underline" href={`/projects/${projectId}/workflow?mode=fields`}>{t("Open calculation")}</Link></nav>
    {error || updates.error || jobs.error || releases.error || boards.error || state.error ? <p role="alert" className="my-4 text-danger">{errorText(error || updates.error || jobs.error || releases.error || boards.error || state.error)}</p> : null}
    <div className="my-5 flex flex-wrap gap-3"><button className={`${button} bg-primary text-on-primary`} disabled={busy || running} onClick={() => void act(async () => { if (!canLeaveUpdate()) return; const created = await apiRequest<Update>(`${root}/updates`, { method: "POST" }); setSelected(created.id); })}>{t("Update data")}</button><button className={button} disabled={busy || running || dirtyRules} onClick={() => void act(() => apiRequest(`${root}/checks`, { method: "POST" }))}>{t("Check current report")}</button></div>
    {!!jobs.data?.length && <section aria-label={t("Report tasks")} className="my-5 rounded border border-outline p-3">{jobs.data.slice(0, 3).map(job => <div key={job.id} className="my-2"><p role="status">{t(job.status)} · {job.progress}% {job.message && t(job.message)}</p>{["queued", "running"].includes(job.status) && <button className="text-sm underline" onClick={() => void act(() => apiRequest(`/api/v1/report-jobs/${job.id}/cancel`, { method: "POST", body: JSON.stringify({ expected_revision: job.revision }) }))}>{t("Cancel task")}</button>}</div>)}</section>}
    <details className="my-5" open><summary>{t("Update history and drafts")}</summary><ul className="my-3 flex flex-wrap gap-3">{updates.data?.map(row => <li key={row.id}><button className={button} aria-pressed={selected === row.id} onClick={() => { if (row.id === selected || canLeaveUpdate()) setSelected(row.id); }}>{row.name} · {t(row.status)} · {new Date(row.created_at).toLocaleString()}</button></li>)}</ul></details>
    {current && <UpdateEditor onDirty={setDirtyUpdate} key={current.id} row={current} busy={running} refresh={refresh} currentToken={state.data?.token} />}
    <section id="checks" className="my-8"><h2 className="text-xl">{t("Report checks")}</h2><p className="my-2 text-sm text-muted">{t("Checks apply to saved data and calculations. Changes require a new check.")}</p><QualityRules projectId={projectId} onDirty={setDirtyRules} />{checked?.token === state.data?.token ? <CheckResults value={checked} projectId={projectId} /> : checked ? <p role="status">{t("Report checks are outdated. Run them again.")}</p> : null}</section>
    <section id="releases" className="my-8"><h2 className="text-xl">{t("Report releases")}</h2><p className="my-2 text-sm text-muted">{t("A release preserves the data, calculations and dashboard. Restore creates a separate editable project.")}</p>
      <fieldset disabled={busy || running} className="my-4 grid gap-3 rounded border border-outline p-4 sm:grid-cols-2">
        <label>{t("Release name")}<input className={control} value={name} onChange={e => setName(e.target.value)} /></label><label>{t("Period label")}<input className={control} value={period} onChange={e => setPeriod(e.target.value)} /></label><label className="sm:col-span-2">{t("Comment")}<textarea className={control} value={comment} onChange={e => setComment(e.target.value)} /></label>
        <fieldset><legend>{t("Dashboards in this release")}</legend>{boards.data?.map(board => <label key={board.id} className="my-2 flex gap-2"><input type="checkbox" checked={dashboardIds.includes(board.id)} onChange={e => setDashboardIds(ids => e.target.checked ? [...ids, board.id] : ids.filter(id => id !== board.id))} />{board.name}</label>)}</fieldset>
        <label className="flex items-start gap-2"><input type="checkbox" checked={acknowledge} onChange={e => setAcknowledge(e.target.checked)} />{t("I reviewed the warnings")}</label>
        <div className="sm:col-span-2"><DashboardPeriod period={datePeriod} onChange={setDatePeriod} /></div>
        <ReleaseContext boards={(boards.data ?? []).filter(board => dashboardIds.includes(board.id))} values={contexts} onChange={setContexts} />
        <button className={`${button} bg-primary text-on-primary`} disabled={dirtyRules || !checked || checked.token !== state.data?.token || !!checked.issues?.some(issue => issue.severity === "error") || (!!checked.issues?.length && !acknowledge) || !name.trim() || !period.trim() || !dashboardIds.length} onClick={() => void act(() => apiRequest(`${root}/releases`, { method: "POST", body: JSON.stringify({ name, period, comment, dashboard_ids: dashboardIds, expected_token: checked?.token, acknowledge_warnings: acknowledge, context: { period: datePeriod }, dashboard_contexts: Object.fromEntries(dashboardIds.map(id => [id, { period: datePeriod, values: contexts[id] ?? {} }])) }) }))}>{t("Fix report release")}</button>
      </fieldset>
      <ul>{releases.data?.map(release => <li key={release.id} className="my-3 flex flex-wrap items-center gap-4 rounded border border-outline p-3"><span className="flex-1">{release.name} · {release.period}</span><button className={button} onClick={() => setFrozen(release)}>{t("Open release")}</button><button className={button} disabled={busy} onClick={() => { const name = window.prompt(t("Restored project name"), release.name); if (name?.trim()) void act(async () => { const project = await apiRequest<{ id: string }>(`/api/v1/releases/${release.id}/restore`, { method: "POST", body: JSON.stringify({ name }) }); router.push(`/projects/${project.id}`); }); }}>{t("Restore as new project")}</button></li>)}</ul>
    </section>
    {frozen && <FrozenRelease release={frozen} close={() => setFrozen(null)} />}
  </div></main>;
}
