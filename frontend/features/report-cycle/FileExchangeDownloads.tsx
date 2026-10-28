"use client";

import { useState } from "react";
import Link from "@/features/spreadsheet/source-link";
import type { Update } from "./api";
import { useI18n } from "@/lib/i18n";
import { SpreadsheetLink } from "@/features/spreadsheet/open-window";
import { downloadInputFile } from "./download-input-file";

export function FileExchangeDownloads({ row, disabled, editorBlocked }: { row: Update; disabled: boolean; editorBlocked: boolean; refresh: () => Promise<unknown>; prepared: (update: Update) => Promise<void> }) {
  const { t, errorText } = useI18n();
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  const info = row.file_exchange;
  if (!info) return null;
  async function download(kind: "current" | "template") {
    setBusy(true); setError(null);
    try {
      await downloadInputFile(row, kind);
    } catch (failure) { setError(failure); } finally { setBusy(false); }
  }
  return <section className="my-4 space-y-3 rounded-lg border border-outline bg-page p-4" aria-label={t("Download and replace source file")}>
    <h3 className="font-semibold">{info.source_name}</h3>
    <p className="text-sm">{t("Open the table, edit the values and save. Checks and report updates run automatically.")}</p>
    {["draft", "checked"].includes(row.status) ? disabled || busy || editorBlocked ? <button className="af-btn" disabled>{t("Open spreadsheet")}</button> : <SpreadsheetLink className="af-btn" project={row.project_id} update={row.id}>{t(row.browser_editor_pending ? "Resume browser editing" : "Open spreadsheet")}</SpreadsheetLink> : <p role="status" className="text-success">{t(row.status === "applied" ? "Changes saved. Reports have been updated." : "This data update is already closed.")}</p>}
    {editorBlocked && <p className="text-sm text-muted">{t("Save update settings before opening the browser editor.")}</p>}
    {row.browser_editor_pending && <p role="status" className="text-sm text-warning">{t("You have a saved draft. Open the table to continue and save your changes.")}</p>}
    <details className="space-y-3"><summary className="cursor-pointer text-sm text-accent">{t("Edit in Excel or replace the file")}</summary>
    <div className="flex flex-wrap gap-3"><button className="af-btn af-btn--secondary" disabled={disabled || busy} onClick={() => void download("current")}>{t("Download current input file")}</button>{info.template_available && <button className="af-btn af-btn--secondary" disabled={disabled || busy} onClick={() => void download("template")}>{t("Download blank data template")}</button>}</div>
    {info.template_reason && <p className="text-sm text-muted">{t(info.template_reason)}</p>}
    <p className="text-sm text-muted">{t("Keep worksheet names and headers unchanged. The download contains source input, not calculated report results. Upload the edited file below, then check and apply it.")}</p>
    {info.connector === "csv" && <p className="text-sm text-warning">{t("When opening CSV in Excel, import identifier and money columns as text to preserve leading zeros and exact decimals. Keep the original delimiter and encoding.")}</p>}
    </details>
    {busy && <p role="status">{t("Downloading…")}</p>}
    {error != null && <p role="alert" className="text-danger">{errorText(error)}</p>}
    <Link className="inline-block min-h-10 py-2 text-accent underline" href={`/projects/${row.project_id}/data/update?source=${info.source_id}`}>{t("Start a new update from current data")}</Link>
  </section>;
}
