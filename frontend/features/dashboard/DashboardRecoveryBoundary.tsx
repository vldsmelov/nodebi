"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { DataStatePanel } from "@/components/ui/workspace";
import { readDocumentDraft, removeDocumentDraft } from "@/features/workspace/document-drafts";
import { parseDashboardDraft } from "./dashboard-draft";
import type { Dashboard } from "./api";

type Recovery = { ready: boolean; draft?: Dashboard; failed?: boolean; bypassed?: boolean; removalFailed?: boolean; focus?: boolean };
function read(key: string, id: string, projectId: string): Recovery {
  try { const raw = readDocumentDraft(key); return { ready: true, draft: raw === null ? undefined : parseDashboardDraft(raw, id, projectId) }; }
  catch { return { ready: true, failed: true }; }
}
export function DashboardRecoveryBoundary({ initial, children }: { initial: Dashboard; children: (draft: Dashboard | undefined, bypassed: boolean, focus: boolean) => ReactNode }) {
  const { t } = useI18n();
  const key = `nodebi:dashboard-draft:${initial.id}`;
  const [recovery, setRecovery] = useState<Recovery>({ ready: false });
  useEffect(() => {
    // Storage is external: read only after hydration, before mounting potentially unsafe widgets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecovery(read(key, initial.id, initial.project_id));
  }, [key, initial.id, initial.project_id]);
  if (!recovery.ready) return <main className="p-6"><p role="status">{t("Loading…")}</p></main>;
  if (recovery.failed) return <main className="min-h-screen bg-page p-6 text-foreground"><DataStatePanel state="error" title="Dashboard draft could not be restored" focusOnMount>
    <p>{t("The saved dashboard is unchanged. Retry recovery, discard the local draft, or explicitly continue with saved settings. New edits can replace this draft.")}</p>
    {recovery.removalFailed && <p>{t("The local draft could not be removed. Nothing was discarded.")}</p>}
    <div className="mt-4 flex flex-wrap gap-3">
      <button className="rounded border border-outline px-3 py-2" onClick={() => setRecovery({ ...read(key, initial.id, initial.project_id), focus: true })}>{t("Retry recovery")}</button>
      <button className="rounded border border-outline px-3 py-2" onClick={() => { if (!window.confirm(t("Discard unsaved changes?"))) return; try { removeDocumentDraft(key); setRecovery({ ready: true, focus: true }); } catch { setRecovery({ ready: true, failed: true, removalFailed: true }); } }}>{t("Discard local draft")}</button>
      <button className="rounded border border-outline px-3 py-2" onClick={() => setRecovery({ ready: true, bypassed: true, focus: true })}>{t("Continue with saved dashboard")}</button>
    </div>
  </DataStatePanel></main>;
  return children(recovery.draft, !!recovery.bypassed, !!recovery.focus);
}
