"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { isVolatileDraft, readDocumentDraft, removeDocumentDraft, volatileDraftNotice, writeDocumentDraft } from "@/features/workspace/document-drafts";
import { DashboardPeriod, hasPeriodEdits, parsePeriod, type Period, type PeriodScratch } from "./DashboardPeriod";

type Draft = { version: 1; projectId: string; dashboardId: string; period: Period | null; scratch: PeriodScratch };
export const dashboardPeriodKey = (projectId: string, dashboardId: string) => `nodebi:dashboard-period:${projectId}:${dashboardId}`;
export function readPeriodDraft(raw: string, projectId: string, dashboardId: string): Draft {
  if (raw.length > 4096) throw new Error("Invalid period draft");
  const v = JSON.parse(raw);
  if (!v || v.version !== 1 || v.projectId !== projectId || v.dashboardId !== dashboardId || v.period === undefined
    || !v.scratch || ![v.scratch.start, v.scratch.end].every(s => typeof s === "string" && (s === "" || /^\d{4}-\d{2}-\d{2}$/.test(s)))) throw new Error("Invalid period draft");
  return { version: 1, projectId, dashboardId, period: v.period === null ? null : parsePeriod(JSON.stringify(v.period)), scratch: { start: v.scratch.start, end: v.scratch.end } };
}

export function RecoverableDashboardPeriod({ projectId, dashboardId, period, timezone, onChange }: {
  projectId: string; dashboardId: string; period: Period | null; timezone?: string; onChange: (value: Period | null) => void;
}) {
  const { t } = useI18n();
  const key = dashboardPeriodKey(projectId, dashboardId);
  const base = JSON.stringify(period);
  const [scratch, setScratch] = useState<PeriodScratch>({ start: period?.start ?? "", end: period?.end ?? "" });
  const [pending, setPending] = useState<Draft | null>(null);
  const [unreadable, setUnreadable] = useState(false), [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false), [volatile, setVolatile] = useState(false);
  const [generation, setGeneration] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const appliedHere = useRef<string | null>(null);
  useEffect(() => {
    // Synchronize external browser recovery when the URL's applied period changes, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScratch(JSON.parse(base) ?? { start: "", end: "" });
    setPending(null); setUnreadable(false);
    // Our own explicit Apply already retired recovery. A denied read must not reopen a
    // nonexistent recovery decision and disable the button that just changed this URL.
    const ownApplication = appliedHere.current === base;
    appliedHere.current = null;
    if (!ownApplication) {
      setStorageError(false);
      try { const raw = readDocumentDraft(key); if (raw !== null) setPending(readPeriodDraft(raw, projectId, dashboardId)); }
      catch { setUnreadable(true); }
    }
    setVolatile(isVolatileDraft(key)); setReady(true);
  }, [key, projectId, dashboardId, base]);
  const dirty = !pending && hasPeriodEdits(period, scratch);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [dirty]);
  useEffect(() => { if (generation) root.current?.querySelector<HTMLInputElement>('input[type="date"]')?.focus(); }, [generation]);
  const edit = (value: PeriodScratch) => {
    appliedHere.current = null;
    setScratch(value);
    try {
      if (hasPeriodEdits(period, value)) writeDocumentDraft(key, JSON.stringify({ version: 1, projectId, dashboardId, period, scratch: value }));
      else removeDocumentDraft(key, true);
      setStorageError(false);
    } catch { setStorageError(true); }
    setVolatile(isVolatileDraft(key));
  };
  const discard = () => {
    try { removeDocumentDraft(key); }
    catch { setStorageError(true); return; }
    setScratch(period ?? { start: "", end: "" }); setPending(null); setUnreadable(false); setStorageError(false); setVolatile(false); setGeneration(v => v + 1);
  };
  const apply = (value: Period | null) => {
    appliedHere.current = JSON.stringify(value);
    onChange(value);
    // Explicit URL application retires scratch; it is not a server/dashboard configuration save.
    try { removeDocumentDraft(key, true); setStorageError(false); }
    catch { setStorageError(true); }
    setVolatile(false); setScratch(value ?? { start: "", end: "" });
  };
  const button = "rounded border border-outline px-3 py-2";
  return <div ref={root}>
    {pending && <p role="status">{t("Unapplied dates are available in this tab. Restore or discard them.")} <button className={button} onClick={() => { setScratch(pending.scratch); setPending(null); setGeneration(v => v + 1); }}>{t("Restore local draft")}</button></p>}
    {pending && JSON.stringify(pending.period) !== base && <p role="status">{t("The applied period has changed. Restoring date inputs will not change the report.")}</p>}
    {unreadable && <p role="alert">{t("Date edits could not be read. Discard them or continue without recovery.")} <button className={button} onClick={() => { setUnreadable(false); setStorageError(true); setGeneration(v => v + 1); }}>{t("Continue without recovery")}</button></p>}
    {storageError && <p role="alert">{t("Date recovery storage is unavailable. Keep this page open until you apply the period.")}</p>}
    {volatile && <p role="status">{t(volatileDraftNotice)}</p>}
    {dirty && !volatile && !storageError && <p role="status">{t("Unapplied dates are kept in this tab. Return to this dashboard to restore them.")}</p>}
    {(pending || unreadable || dirty) && <button className={button} onClick={() => { if (window.confirm(t("Discard unsaved changes?"))) discard(); }}>{t("Discard local draft")}</button>}
    <fieldset disabled={!ready || !!pending || unreadable} className="min-w-0">
      <DashboardPeriod key={generation} period={period} scratch={scratch} onScratchChange={edit} onChange={apply} timezone={timezone} />
    </fieldset>
  </div>;
}
