"use client";
import { useEffect, useRef, useState } from "react";
import { parsePeriod, type Period, type PeriodScratch } from "@/features/dashboard/DashboardPeriod";
import type { ParameterValues } from "@/features/workflow/types";
import { isVolatileDraft, readDocumentDraft, removeDocumentDraft, writeDocumentDraft } from "@/features/workspace/document-drafts";

export type ReleaseSettings = {
  name: string; period: string; comment: string; dashboardIds: string[];
  datePeriod: Period | null; contexts: Record<string, ParameterValues>;
  dateScratch?: PeriodScratch;
};
export const releaseDraftKey = (projectId: string) => `nodebi:release-draft:${projectId}`;
const empty = (): ReleaseSettings => ({ name: "", period: "", comment: "", dashboardIds: [], datePeriod: null, contexts: {} });
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
export function parseReleaseDraft(raw: string, projectId: string): ReleaseSettings {
  if (raw.length > 1_000_000) throw new Error("Invalid release draft");
  const value: unknown = JSON.parse(raw);
  if (!object(value) || value.version !== 1 || value.projectId !== projectId || !object(value.settings)) throw new Error("Invalid release draft");
  const s = value.settings;
  if (![s.name, s.period, s.comment].every(v => typeof v === "string")
    || s.datePeriod === undefined
    || !Array.isArray(s.dashboardIds) || !s.dashboardIds.every(v => typeof v === "string")
    || !object(s.contexts) || !Object.values(s.contexts).every(v => object(v) && Object.values(v).every(p => p === null || ["string", "boolean"].includes(typeof p) || typeof p === "number" && Number.isFinite(p)))) throw new Error("Invalid release draft");
  const datePeriod = s.datePeriod === null ? null : parsePeriod(JSON.stringify(s.datePeriod));
  const scratch = s.dateScratch;
  if (scratch !== undefined && (!object(scratch) || ![scratch.start, scratch.end].every(v => typeof v === "string" && (v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v))))) throw new Error("Invalid release draft");
  return { name: s.name as string, period: s.period as string, comment: s.comment as string, dashboardIds: s.dashboardIds as string[], datePeriod, contexts: s.contexts as Record<string, ParameterValues>, ...(scratch === undefined ? {} : { dateScratch: scratch as PeriodScratch }) };
}

/** Settings only: never restores check tokens, warning consent or automatically submits. */
export function useReleaseDraft(projectId: string) {
  const key = releaseDraftKey(projectId);
  const [settings, setSettings] = useState<ReleaseSettings>(empty);
  const current = useRef(settings);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<ReleaseSettings | null>(null);
  const [unreadable, setUnreadable] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [volatile, setVolatile] = useState(false);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    // Browser storage is external and must be read after hydration, never during server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { const raw = readDocumentDraft(key); if (raw !== null) setPending(parseReleaseDraft(raw, projectId)); }
    catch { setUnreadable(true); }
    setVolatile(isVolatileDraft(key)); setReady(true);
  }, [key, projectId]);
  const assign = (next: ReleaseSettings) => { current.current = next; setSettings(next); };
  const change = <K extends keyof ReleaseSettings>(field: K, value: ReleaseSettings[K]) => {
    const next = { ...current.current, [field]: value };
    assign(next);
    try { writeDocumentDraft(key, JSON.stringify({ version: 1, projectId, settings: next })); setStorageError(false); }
    catch { setStorageError(true); }
    setVolatile(isVolatileDraft(key));
  };
  const discard = () => {
    try { removeDocumentDraft(key); }
    catch { setStorageError(true); return; }
    assign(empty()); setPending(null); setUnreadable(false); setStorageError(false); setVolatile(false); setGeneration(v => v + 1);
  };
  return { settings, change, ready, pending, unreadable, storageError, volatile, discard, generation,
    restore: () => { if (pending) { assign(pending); setPending(null); setGeneration(v => v + 1); } },
    continueWithoutRecovery: () => { setUnreadable(false); setStorageError(true); },
    dirty: JSON.stringify(settings) !== JSON.stringify(empty()),
  };
}
