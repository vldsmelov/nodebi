"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataStatePanel } from "@/components/ui/workspace";
import { apiRequest, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { dashboardUrl } from "@/features/dashboard/view-state";
import { isVolatileDraft, writeDocumentDraft, removeDocumentDraft, volatileDraftNotice } from "@/features/workspace/document-drafts";
import { useOutsideLinkGuard } from "@/features/workspace/useOutsideLinkGuard";
import { readReportDraft, reportDraftKey, reportDraftName, type ReportDraft, type ReportDraftMode, type ReportDraftState } from "./report-draft";

type Result = { workflow_id: string; visualization_id: string; dashboard_id?: string | null };
type Session = {
  initial?: ReportDraftState;
  persist: (state: ReportDraftState, dirty: boolean) => void;
  save: (request: object, state: ReportDraftState) => void;
  reset: () => boolean;
};
const DraftContext = createContext<Session | null>(null);
export function useReportDraftSession() {
  const value = useContext(DraftContext);
  if (!value) throw new Error("Report draft boundary is required");
  return value;
}
export function useReportDraftAutosave(state: ReportDraftState, dirty: boolean) {
  const { persist } = useReportDraftSession();
  const serialized = JSON.stringify(state);
  useEffect(() => { persist(JSON.parse(serialized) as ReportDraftState, dirty); }, [persist, serialized, dirty]);
}

type BoundaryProps = { projectId: string; mode: ReportDraftMode; target?: string; children: ReactNode };
const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function ReportDraftBoundary(props: BoundaryProps) {
  // Browser-only draft reads must not decide the server's initial markup. Mount the
  // recovery session after hydration, before any form can autosave over a saved draft.
  const ready = useSyncExternalStore(subscribeToHydration, clientReady, serverReady);
  return ready ? <ReportDraftSession {...props} /> : <DataStatePanel state="loading" />;
}

function ReportDraftSession({ projectId, mode, target, children }: BoundaryProps) {
  const { t, errorText } = useI18n(); const client = useQueryClient();
  const scope = reportDraftKey(projectId, mode, target);
  const [recovery, setRecovery] = useState<{ draft?: ReportDraft; failed?: boolean }>(() => {
    try { return { draft: readReportDraft(scope, mode) ?? undefined }; } catch { return { failed: true }; }
  });
  const [initial, setInitial] = useState<ReportDraftState>();
  const [pending, setPending] = useState<ReportDraft>();
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState<unknown>();
  const [storageError, setStorageError] = useState(() => isVolatileDraft(scope));
  const [generation, setGeneration] = useState(0);
  const [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false);
  const active = useRef(false), latest = useRef<ReportDraft | undefined>(undefined);
  const [leaving, setLeaving] = useState<(() => void) | null>(null);
  const noExcludedRoot = useRef<HTMLElement | null>(null);
  const notice = useRef<HTMLHeadingElement>(null);
  useEffect(() => { notice.current?.focus(); }, [recovery, pending, result]);
  const blocked = !!recovery.draft || !!recovery.failed || !!pending || !!result;
  const write = useCallback((draft: ReportDraft) => {
    latest.current = draft;
    try { const raw = JSON.stringify(draft); if (raw.length > 1_000_000) throw new Error("Draft too large"); writeDocumentDraft(scope, raw); setStorageError(false); return true; }
    catch { setStorageError(true); return false; }
  }, [scope]);
  const clear = useCallback((confirmedSaved = false) => {
    try { removeDocumentDraft(scope, confirmedSaved); latest.current = undefined; setStorageError(false); return true; }
    catch { setStorageError(true); return false; }
  }, [scope]);
  const persist = useCallback((state: ReportDraftState, changed: boolean) => {
    if (blocked || active.current) return;
    setDirty(changed);
    if (changed) write({ version: 1, scope, state });
    else if (latest.current) clear(true);
  }, [blocked, scope, write, clear]);
  const reset = () => {
    if (!clear()) return false;
    setInitial(undefined); setPending(undefined); setRecovery({}); setError(undefined); setDirty(false);
    return true;
  };
  const abandon = () => {
    if ((pending || recovery.draft?.pending) && !window.confirm(t("The report may already be saved. Check Reports before discarding this recovery request."))) return false;
    if (!reset()) return false;
    setGeneration(n => n + 1); return true;
  };
  const unsaved = !result && (dirty || !!pending || !!recovery.draft || !!recovery.failed);
  useOutsideLinkGuard(noExcludedRoot, unsaved || busy, action => { if (!active.current) setLeaving(() => action); });
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (unsaved || busy) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", unload); return () => window.removeEventListener("beforeunload", unload);
  }, [unsaved, busy]);
  const send = async (draft: ReportDraft) => {
    if (active.current || !draft.pending) return;
    active.current = true; setBusy(true); setError(undefined); setPending(draft); write(draft);
    const endpoint = mode === "alignment-edit" ? `alignment-reports/${encodeURIComponent(target!)}` : mode === "statistics-edit" ? `statistical-reports/${encodeURIComponent(target!)}` : mode === "statistics" ? "statistical-reports" : mode === "measure" ? "measure-reports" : mode === "alignment" ? "alignment-reports" : `report-builder${mode === "edit" ? `/${encodeURIComponent(target!)}` : ""}`;
    try {
      const saved = await apiRequest<Result>(`/api/v1/projects/${projectId}/${endpoint}/apply`, { method: "POST", body: draft.pending });
      clear(true); setPending(undefined); setDirty(false); setResult(saved); setLeaving(null);
      for (const key of ["workflows", "dashboards", "visualizations", "report-state", "report-inputs", "measures"]) void client.invalidateQueries({ queryKey: [key, projectId] });
      void client.invalidateQueries({ queryKey: ["workflow", saved.workflow_id] });
      void client.invalidateQueries({ queryKey: ["visualization-result", saved.visualization_id] });
    } catch (caught) {
      setError(caught);
      if (caught instanceof ApiError && caught.code !== "REQUEST_FAILED" && [400, 404, 409, 410, 422].includes(caught.status)) {
        // A rejected operation can be corrected. Never reuse its key for a changed payload.
        const state = { ...draft.state, requestId: crypto.randomUUID() };
        setPending(undefined); setInitial(state); setGeneration(n => n + 1); setDirty(true);
        write({ version: 1, scope, state });
      }
    } finally { active.current = false; setBusy(false); }
  };
  const session: Session = { initial, persist, reset, save: (request, state) => { void send({ version: 1, scope, state, pending: JSON.stringify(request) }); } };
  return <DraftContext.Provider value={session}>
    {storageError && <p role="alert" className="my-3 text-warning">{t(result ? "Saved successfully, but local draft cleanup failed." : "Local report recovery is unavailable. Keep this page open until saving is confirmed.")}</p>}
    {storageError && isVolatileDraft(scope) && <p className="my-2 text-sm text-warning">{t(volatileDraftNotice)}</p>}
    {error ? <p role="alert" className="my-3 text-danger">{errorText(error)}</p> : null}
    {result ? <section className="space-y-4 rounded-xl border border-outline bg-panel p-6"><h2 ref={notice} tabIndex={-1} className="text-xl font-semibold">{t("Report is ready")}</h2><p>{t("You can adjust its calculation in the graph without losing the report.")}</p><div className="flex flex-wrap gap-4"><Link className="text-accent underline" href={result.dashboard_id ? dashboardUrl(projectId, result.dashboard_id, {}, true) : `/projects/${projectId}/dashboard?mode=view`}>{t("Open report")}</Link><Link className="text-accent underline" href={`/projects/${projectId}/workflow?workflow=${result.workflow_id}&mode=fields`}>{t("How it is calculated")}</Link></div></section>
      : recovery.draft || recovery.failed ? <section aria-label={t("Draft recovery")} className="space-y-3 rounded-xl border border-outline bg-panel p-5"><h2 ref={notice} tabIndex={-1} className="text-lg font-semibold">{t("Draft recovery")}</h2>{recovery.draft && <p className="break-words">{reportDraftName(recovery.draft.state)}</p>}<p>{t(recovery.failed ? "The local report draft cannot be read. Discard it or explicitly continue without recovery." : "A report draft is available in this tab. Restore it or discard it before editing.")}</p><div className="flex flex-wrap gap-3">{recovery.draft && <Button onClick={() => { const draft = recovery.draft!; latest.current = draft; setInitial(draft.state); setPending(draft.pending ? draft : undefined); setDirty(true); setRecovery({}); }}>{t("Restore local draft")}</Button>}<Button variant="outline" onClick={abandon}>{t("Discard local draft")}</Button>{recovery.failed && <Button variant="outline" onClick={() => { setRecovery({}); setStorageError(true); }}>{t("Continue without local recovery")}</Button>}</div></section>
        : pending ? <section aria-label={t("Pending report save")} className="space-y-3 rounded-xl border border-outline bg-panel p-5"><h2 ref={notice} tabIndex={-1} className="text-lg font-semibold">{t("Pending report save")}</h2><p className="break-words">{reportDraftName(pending.state)}</p><p role="status">{t("Report save confirmation is pending. Retry the original request without changing settings or creating another report.")}</p><div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void send(pending)}>{t("Retry report save")}</Button><Button variant="outline" disabled={busy} onClick={abandon}>{t("Discard local draft")}</Button></div></section>
          : <div key={generation}>{dirty && !storageError && <p className="my-2 text-sm text-muted">{t("Report settings are kept in this tab. Restored drafts require a fresh preview; they are not saved reports.")}</p>}{children}</div>}
    {leaving && <section role="alert" className="my-3 space-x-3 rounded border border-outline bg-panel p-4"><p>{t("Keep this report draft before leaving, discard it, or continue editing.")}</p><Button variant="outline" disabled={busy} onClick={() => { const draft = pending ?? recovery.draft ?? latest.current; if (draft && write(draft)) { const action = leaving; setLeaving(null); action(); } }}>{t("Keep draft and continue")}</Button><Button variant="outline" disabled={busy} onClick={() => { if (abandon()) { const action = leaving; setLeaving(null); action(); } }}>{t("Discard changes")}</Button><Button onClick={() => setLeaving(null)}>{t("Continue editing")}</Button></section>}
  </DraftContext.Provider>;
}
