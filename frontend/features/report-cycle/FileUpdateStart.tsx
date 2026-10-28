"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { DataStatePanel } from "@/components/ui/workspace";
import { listImports } from "@/features/ingestion/api";
import { listSources } from "@/features/data-sources/api";
import { SpreadsheetLink, spreadsheetUrl } from "@/features/spreadsheet/open-window";
import { useRouter } from "next/navigation";
import { downloadInputFile } from "./download-input-file";
import type { Update } from "./api";

export function FileUpdateStart({ projectId, sourceId }: { projectId: string; sourceId?: string | null }) {
  const { t, errorText } = useI18n();
  const router = useRouter();
  const [row, setRow] = useState<Update | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null), [saved, setSaved] = useState(false);
  const requests = useRef(new Map<string, string>());
  const autoOpened = useRef(false);
  const sources = useQuery({ queryKey: ["file-update-sources", projectId], queryFn: async () => {
    const [legacy, imported] = await Promise.all([listSources(projectId), listImports(projectId)]);
    return [...legacy.map(item => ({ id: item.id, name: item.name })), ...imported.filter(item => Object.keys(item.active_snapshots).length > 0).map(item => ({ id: item.id, name: item.name }))];
  }, retry: false });
  async function start(source: string) {
    setBusy(true); setError(null); setSaved(false);
    if (!requests.current.has(source)) requests.current.set(source, crypto.randomUUID());
    try {
      const update = await apiRequest<Update>(`/api/v1/projects/${projectId}/file-updates`, {
        method: "POST", body: JSON.stringify({ source_id: source, request_id: requests.current.get(source), reuse_existing: true }),
      });
      requests.current.delete(source);
      setRow(update);
    } catch (failure) { setError(failure); } finally { setBusy(false); }
  }
  const direct = sources.data?.find(source => source.id === sourceId)?.id
    ?? (sources.data?.length === 1 ? sources.data[0].id : undefined);
  useEffect(() => {
    if (!direct || autoOpened.current) return;
    autoOpened.current = true;
    // A direct source link opens the table, without a separate "start draft" step.
    router.replace(spreadsheetUrl(projectId, { source: direct }));
    // Initial opening only; explicit card actions handle subsequent edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direct]);
  return <section className="space-y-5 rounded-xl border border-outline bg-panel p-6">
    <h1 className="text-3xl">{t("Edit project data")}</h1>
    <p className="text-muted">{t("Open the table, edit the values and save. Checks and report updates run automatically.")}</p>
    {sources.isPending && <DataStatePanel state="loading" />}
    {sources.error && <DataStatePanel state="error" action={<button className="underline" onClick={() => void sources.refetch()}>{t("Retry")}</button>}>{errorText(sources.error)}</DataStatePanel>}
    {busy && <p role="status">{t("Opening table…")}</p>}
    {saved && <p role="status" className="rounded-lg border border-outline p-4 text-success">{t("Changes saved. Reports have been updated.")} <Link href={`/projects/${projectId}/dashboard`} className="underline">{t("Open dashboard")}</Link></p>}
    {error != null && <p role="alert" className="text-danger">{errorText(error)}</p>}
    {sources.data && !sources.data.length && <DataStatePanel state="empty" title="Connect a table to start"><Link href={`/projects/${projectId}/data/import`} className="text-accent underline">{t("Connect data")}</Link></DataStatePanel>}
    <div className="grid gap-3 sm:grid-cols-2">{sources.data?.map(source => <article key={source.id} className="space-y-3 rounded-lg border border-outline p-4">
      <h2 className="font-semibold">{source.name}</h2>
      <SpreadsheetLink className="af-btn" project={projectId} source={source.id}>{t("Open spreadsheet")}</SpreadsheetLink>
      <button className="block text-sm text-accent underline" disabled={busy} onClick={() => void start(source.id)}>{t("Edit in Excel or replace the file")}</button>
    </article>)}</div>
    {row && !saved && <div className="space-y-3 rounded-lg border border-outline p-4">
      <p>{row.file_exchange?.source_name}</p>
      <button className="af-btn af-btn--secondary" disabled={busy} onClick={async () => { setError(null); try { await downloadInputFile(row); } catch (failure) { setError(failure); } }}>{t("Download current input file")}</button>
      <Link className="block text-accent underline" href={`/projects/${projectId}/reports?update=${row.id}`}>{t("Upload a replacement or open advanced settings")}</Link>
    </div>}
  </section>;
}
