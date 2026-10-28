"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { components } from "@/lib/api-schema";

export type Period = components["schemas"]["DatePeriod"];
export type PeriodScratch = { start: string; end: string };
export function hasPeriodEdits(period: Period | null, scratch: PeriodScratch): boolean {
  return scratch.start !== (period?.start ?? "") || scratch.end !== (period?.end ?? "");
}
export function parsePeriod(raw: string | null): Period | null {
  if (!raw) return null;
  try {
    if (raw.length > 100) throw new Error();
    const value = JSON.parse(raw);
    if (!value || Object.keys(value).sort().join() !== "end,start") throw new Error();
    for (const date of [value.start, value.end]) {
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error();
    }
    if (value.start > value.end || value.end === "9999-12-31") throw new Error();
    return value;
  } catch { throw new Error("Select a valid start and end date."); }
}

export function presetPeriod(unit: "month" | "quarter" | "year", timezone: string, now = new Date()): Period {
  const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "numeric" }).formatToParts(now);
  const year = Number(parts.find(item => item.type === "year")!.value), month = Number(parts.find(item => item.type === "month")!.value) - 1;
  const first = unit === "year" ? 0 : unit === "quarter" ? Math.floor(month / 3) * 3 : month;
  const length = unit === "year" ? 12 : unit === "quarter" ? 3 : 1;
  return { start: new Date(Date.UTC(year, first, 1)).toISOString().slice(0, 10), end: new Date(Date.UTC(year, first + length, 0)).toISOString().slice(0, 10) };
}

export function DashboardPeriod({ period, onChange, timezone = "Europe/Moscow", scratch, onScratchChange }: { period: Period | null; onChange: (value: Period | null) => void; timezone?: string; scratch?: PeriodScratch; onScratchChange?: (value: PeriodScratch) => void }) {
  const { t, errorText } = useI18n();
  const [local, setLocal] = useState<PeriodScratch>({ start: period?.start ?? "", end: period?.end ?? "" });
  const [error, setError] = useState<unknown>(null);
  const { start, end } = scratch ?? local;
  const edit = (value: PeriodScratch) => { setLocal(value); onScratchChange?.(value); setError(null); };
  return <fieldset className="my-4 flex flex-wrap items-end gap-3 rounded border border-outline p-3">
    <legend>{t("Period")}</legend>
    <select aria-label={t("Period preset")} className="rounded bg-control p-2" value="" onChange={e => { if (e.target.value) { try { const value = presetPeriod(e.target.value as "month" | "quarter" | "year", timezone); edit(value); onChange(value); } catch (error) { setError(error); } } }}><option value="">{t("Choose period")}</option><option value="month">{t("Current month")}</option><option value="quarter">{t("Current quarter")}</option><option value="year">{t("Current year")}</option></select>
    <label>{t("Start date")}<input type="date" aria-label={t("Start date")} value={start} onChange={e => edit({ start: e.target.value, end })} className="ml-2 rounded bg-control p-2" /></label>
    <label>{t("End date")}<input type="date" aria-label={t("End date")} value={end} onChange={e => edit({ start, end: e.target.value })} className="ml-2 rounded bg-control p-2" /></label>
    <button className="rounded border border-outline p-2" onClick={() => { try { const checked = parsePeriod(JSON.stringify({ start, end })); setError(null); onChange(checked); } catch (error) { setError(error); } }}>{t("Apply period")}</button>
    <button className="rounded border border-outline p-2" onClick={() => { edit({ start: "", end: "" }); onChange(null); }}>{t("All time")}</button>
    {hasPeriodEdits(period, { start, end }) && <p role="status" className="w-full text-sm text-muted">{t("Date edits are not applied. Apply the period or choose All time.")}</p>}
    {error ? <p role="alert" className="w-full text-danger">{errorText(error)}</p> : null}
  </fieldset>;
}
