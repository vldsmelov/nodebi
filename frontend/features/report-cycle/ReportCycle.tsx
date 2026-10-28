"use client";
import Link from "@/features/spreadsheet/source-link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { listDashboards } from "@/features/dashboard/api";
import { DashboardPeriod, hasPeriodEdits } from "@/features/dashboard/DashboardPeriod";
import { useReleaseDraft } from "./useReleaseDraft";
import { useDirtyGuard } from "./useDirtyGuard";
import { volatileDraftNotice } from "@/features/workspace/document-drafts";
import { ReleaseContext } from "./ReleaseContext";
import { CheckResults } from "./CheckResults";
import { UpdateEditor } from "./UpdateEditor";
import { QualityRules } from "./QualityRules";
import { FrozenRelease } from "./FrozenRelease";
import type { Job, Release, Update } from "./api";
import { DataStatePanel } from "@/components/ui/workspace";

const button = "rounded border border-outline px-4 py-2 disabled:opacity-40";
const control = "my-1 w-full rounded border border-outline bg-control p-2";
export function ReportCycle({ projectId }: { projectId: string }) {
  const { t, errorText } = useI18n();
  const router = useRouter();
  const client = useQueryClient();
  const search = useSearchParams();
  const selected = search.get("update");
  const selectUpdate = (id: string | null) => {
    const query = new URLSearchParams(search.toString());
    if (id) query.set("update", id); else query.delete("update");
    router.replace(`/projects/${projectId}/reports${query.size ? `?${query}` : ""}`, { scroll: false });
  };
  const openCreatedUpdate = (update: Update) => {
    client.setQueryData<Update[]>(["data-updates", projectId], rows => [update, ...(rows ?? []).filter(row => row.id !== update.id)]);
    selectUpdate(update.id);
  };
  const root = `/api/v1/projects/${projectId}`;
  const state = useQuery({ queryKey: ["report-state", projectId], queryFn: () => apiRequest<{ token: string }>(`${root}/report-state`), refetchInterval: 2000 });
  const updates = useQuery({ queryKey: ["data-updates", projectId], queryFn: () => apiRequest<Update[]>(`${root}/updates`), refetchInterval: 2000 });
  const jobs = useQuery({ queryKey: ["report-jobs", projectId], queryFn: () => apiRequest<Job[]>(`${root}/report-jobs`), refetchInterval: 1500 });
  const releases = useQuery({ queryKey: ["releases", projectId], queryFn: () => apiRequest<Release[]>(`${root}/releases`), refetchInterval: 3000 });
  const boards = useQuery({ queryKey: ["dashboards", projectId], queryFn: () => listDashboards(projectId) });
  const [frozen, setFrozen] = useState<Release | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  const draft = useReleaseDraft(projectId);
  const { name, period, comment, dashboardIds, datePeriod, contexts } = draft.settings;
  const dateScratch = draft.settings.dateScratch ?? { start: datePeriod?.start ?? "", end: datePeriod?.end ?? "" };
  const pendingPeriod = hasPeriodEdits(datePeriod, dateScratch);
  const releaseName = useRef<HTMLInputElement>(null);
  useEffect(() => { if (draft.generation > 0) releaseName.current?.focus(); }, [draft.generation]);
  const [acknowledge, setAcknowledge] = useState(false);
  const [dirtyUpdate, setDirtyUpdate] = useState(false), [dirtyRules, setDirtyRules] = useState(false);
  useDirtyGuard(draft.dirty && !dirtyUpdate && !dirtyRules);
  const missingBoards = boards.isSuccess && dashboardIds.some(id => !boards.data.some(board => board.id === id));
  const canLeaveUpdate = () => !dirtyUpdate || window.confirm(t("Discard unsaved changes?"));
  const running = jobs.data?.some(job => ["queued", "running"].includes(job.status)) ?? false;
  const actionsReady = jobs.isSuccess && state.isSuccess && updates.isSuccess;
  const checked = jobs.data?.find(job => job.status === "succeeded" && job.check && !job.result_id)?.check;
  const current = updates.data?.find(row => row.id === selected);
  const refresh = async () => { await Promise.all([updates.refetch(), jobs.refetch(), releases.refetch(), state.refetch()]); };
  async function act(action: () => Promise<unknown>) { setBusy(true); setError(null); try { await action(); await refresh(); } catch (error) { setError(error); } finally { setBusy(false); } }
  return <main className="min-h-screen bg-page p-6 text-foreground"><div className="mx-auto max-w-6xl">
    <Link className="text-sm text-muted" href={`/projects/${projectId}`}>{t("← Project")}</Link>
    <h1 className="my-6 text-3xl">{t("Report cycle")}</h1>
    <nav className="my-5 flex flex-wrap gap-5"><Link className="underline" href={`/projects/${projectId}/data`}>{t("Data")}</Link><a className="underline" href="#checks">{t("Report checks")}</a><Link className="underline" href={`/projects/${projectId}/dashboard`}>{t("Dashboard")}</Link><a className="underline" href="#releases">{t("Report releases")}</a><Link className="text-muted underline" href={`/projects/${projectId}/workflow?mode=fields`}>{t("Open calculation")}</Link></nav>
    {error || updates.error || jobs.error || releases.error || boards.error || state.error ? <DataStatePanel state="error" title="Report action failed" focusOnMount={!!error}>{errorText(error || updates.error || jobs.error || releases.error || boards.error || state.error)}</DataStatePanel> : null}
    <div className="my-5 flex flex-wrap gap-3"><Link className="af-btn" href={`/projects/${projectId}/data/update`}>{t("Update data from a file")}</Link><button className={`${button} bg-primary text-on-primary`} disabled={!actionsReady || busy || running} onClick={() => void act(async () => { if (!canLeaveUpdate()) return; const created = await apiRequest<Update>(`${root}/updates`, { method: "POST" }); openCreatedUpdate(created); })}>{t("Advanced data update")}</button><button className={button} disabled={!actionsReady || busy || running || dirtyRules} onClick={() => void act(() => apiRequest(`${root}/checks`, { method: "POST" }))}>{t("Check current report")}</button></div>
    {(updates.isPending || jobs.isPending || releases.isPending || state.isPending) && <DataStatePanel state="loading" />}
    {(updates.error || jobs.error || releases.error || state.error) && <button className={button} onClick={() => void refresh()}>{t("Retry")}</button>}
    {!!jobs.data?.length && <details open={running} aria-label={t("Report tasks")} className="my-5 rounded border border-outline p-3"><summary>{t("Report tasks")}</summary>{jobs.data.slice(0, 3).map(job => <div key={job.id} className="my-2"><p role="status">{t(job.status)} · {job.progress}% {job.message && t(job.message)}</p>{["queued", "running"].includes(job.status) && <button className="text-sm underline" onClick={() => void act(() => apiRequest(`/api/v1/report-jobs/${job.id}/cancel`, { method: "POST", body: JSON.stringify({ expected_revision: job.revision }) }))}>{t("Cancel task")}</button>}</div>)}</details>}
    <details className="my-5"><summary>{t("Update history and drafts")}</summary>{updates.isSuccess && !updates.data.length && <p role="status">{t("No data updates yet.")}</p>}<ul className="my-3 flex flex-wrap gap-3">{updates.data?.map(row => <li key={row.id}><button className={button} aria-pressed={selected === row.id} onClick={() => { if (row.id === selected || canLeaveUpdate()) selectUpdate(row.id); }}>{row.name} · {t(row.status)} · {new Date(row.created_at).toLocaleString()}</button></li>)}</ul></details>
    {selected && updates.isSuccess && !current && <DataStatePanel state="incomplete" title="Update not found" action={<button className={button} onClick={() => selectUpdate(null)}>{t("Show update history")}</button>}>{t("This update is unavailable in this project. Choose a saved update from history.")}</DataStatePanel>}
    {current && <UpdateEditor onDirty={setDirtyUpdate} onRollbackCreated={openCreatedUpdate} key={current.id} row={current} busy={running || !actionsReady} refresh={refresh} currentToken={state.data?.token} />}
    <section id="checks" className="my-8"><h2 className="text-xl">{t("Report checks")}</h2><p className="my-2 text-sm text-muted">{t("Checks apply to saved data and calculations. Changes require a new check.")}</p><QualityRules projectId={projectId} onDirty={setDirtyRules} />{checked?.token === state.data?.token ? <CheckResults value={checked} projectId={projectId} /> : checked ? <p role="status">{t("Report checks are outdated. Run them again.")}</p> : null}</section>
    <section id="releases" className="my-8"><h2 className="text-xl">{t("Report releases")}</h2><p className="my-2 text-sm text-muted">{t("A release preserves the data, calculations and dashboard. Restore creates a separate editable project.")}</p>
      {draft.pending && <p role="status">{t("Release settings are available in this tab. Restore or discard them before editing.")} <button className={button} disabled={busy || running} onClick={draft.restore}>{t("Restore local draft")}</button></p>}
      {draft.unreadable && <p role="alert">{t("Release settings could not be read. Discard them or continue without recovery.")} <button className={button} onClick={draft.continueWithoutRecovery}>{t("Continue without recovery")}</button></p>}
      {draft.storageError && <p role="alert">{t("Local draft storage is unavailable. Save before leaving this page.")}</p>}
      {draft.volatile && <p role="status">{t(volatileDraftNotice)}</p>}
      {draft.dirty && !draft.volatile && !draft.storageError && <p role="status">{t("Release settings are kept in this tab. Check tasks and release history before submitting again.")}</p>}
      {(draft.dirty || draft.pending || draft.unreadable) && <button className={button} disabled={busy || running} onClick={() => { if (window.confirm(t("Discard unsaved changes?"))) { draft.discard(); setAcknowledge(false); } }}>{t("Discard local draft")}</button>}
      <fieldset disabled={busy || running || !draft.ready || !!draft.pending || draft.unreadable} className="my-4 grid gap-3 rounded border border-outline p-4 sm:grid-cols-2">
        <label>{t("Release name")}<input ref={releaseName} className={control} value={name} onChange={e => draft.change("name", e.target.value)} /></label><label>{t("Period label")}<input className={control} value={period} onChange={e => draft.change("period", e.target.value)} /></label><label className="sm:col-span-2">{t("Comment")}<textarea className={control} value={comment} onChange={e => draft.change("comment", e.target.value)} /></label>
        <fieldset><legend>{t("Dashboards in this release")}</legend>{boards.data?.map(board => <label key={board.id} className="my-2 flex gap-2"><input type="checkbox" checked={dashboardIds.includes(board.id)} onChange={e => draft.change("dashboardIds", e.target.checked ? [...dashboardIds, board.id] : dashboardIds.filter(id => id !== board.id))} />{board.name}</label>)}</fieldset>
        {missingBoards && <p role="alert">{t("Some selected dashboards are unavailable. Select dashboards again.")} <button className={button} onClick={() => draft.change("dashboardIds", [])}>{t("Clear selection")}</button></p>}
        <label className="flex items-start gap-2"><input type="checkbox" checked={acknowledge} onChange={e => setAcknowledge(e.target.checked)} />{t("I reviewed the warnings")}</label>
        <div className="sm:col-span-2"><DashboardPeriod key={draft.generation} period={datePeriod} scratch={dateScratch} onScratchChange={value => draft.change("dateScratch", value)} onChange={value => draft.change("datePeriod", value)} /></div>
        <ReleaseContext boards={(boards.data ?? []).filter(board => dashboardIds.includes(board.id))} values={contexts} onChange={value => draft.change("contexts", value)} />
        <button className={`${button} bg-primary text-on-primary`} disabled={!actionsReady || !releases.isSuccess || pendingPeriod || dirtyRules || !boards.isSuccess || missingBoards || !checked || checked.token !== state.data?.token || !!checked.issues?.some(issue => issue.severity === "error") || (!!checked.issues?.length && !acknowledge) || !name.trim() || !period.trim() || !dashboardIds.length} onClick={() => void act(async () => { await apiRequest(`${root}/releases`, { method: "POST", body: JSON.stringify({ name, period, comment, dashboard_ids: dashboardIds, expected_token: checked?.token, acknowledge_warnings: acknowledge, context: { period: datePeriod }, dashboard_contexts: Object.fromEntries(dashboardIds.map(id => [id, { period: datePeriod, values: contexts[id] ?? {} }])) }) }); setAcknowledge(false); })}>{t("Fix report release")}</button>
      </fieldset>
      {releases.isSuccess && !releases.data.length && <p role="status">{t("No report releases yet.")}</p>}
      <ul>{releases.data?.map(release => <li key={release.id} className="my-3 flex flex-wrap items-center gap-4 rounded border border-outline p-3"><span className="flex-1">{release.name} · {release.period}</span><button className={button} onClick={() => setFrozen(release)}>{t("Open release")}</button><button className={button} disabled={busy} onClick={() => { const name = window.prompt(t("Restored project name"), release.name); if (name?.trim()) void act(async () => { const project = await apiRequest<{ id: string }>(`/api/v1/releases/${release.id}/restore`, { method: "POST", body: JSON.stringify({ name }) }); router.push(`/projects/${project.id}`); }); }}>{t("Restore as new project")}</button></li>)}</ul>
    </section>
    {frozen && <FrozenRelease release={frozen} close={() => setFrozen(null)} />}
  </div></main>;
}
