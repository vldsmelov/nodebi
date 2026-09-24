"use client";

import { useI18n } from "@/lib/i18n";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import {
  deleteSource,
  listSources,
  previewSheet,
  uploadSource,
} from "@/features/data-sources/api";

export default function DataPage() {
  const { t, errorText, cell } = useI18n();
  const { projectId } = useParams<{ projectId: string }>();
  const client = useQueryClient();
  const sources = useQuery({ queryKey: ["sources", projectId], queryFn: () => listSources(projectId) });
  const [sourceId, setSourceId] = useState("");
  const [sheetName, setSheetName] = useState("");
  const effectiveSourceId = sourceId || sources.data?.[0]?.id || "";
  const selected = sources.data?.find((source) => source.id === effectiveSourceId);
  const effectiveSheetName =
    selected?.workbook.sheets.some((sheet) => sheet.name === sheetName)
      ? sheetName
      : selected?.workbook.sheets[0]?.name ?? "";
  const preview = useQuery({
    queryKey: ["preview", effectiveSourceId, effectiveSheetName],
    queryFn: () => previewSheet(effectiveSourceId, effectiveSheetName),
    enabled: Boolean(effectiveSourceId && effectiveSheetName),
  });
  const upload = useMutation({
    mutationFn: (file: File) => uploadSource(projectId, file),
    onSuccess: (source) => {
      setSourceId(source.id);
      setSheetName(source.workbook.sheets[0]?.name ?? "");
      void client.invalidateQueries({ queryKey: ["sources", projectId] });
    },
  });
  const remove = useMutation({
    mutationFn: deleteSource,
    onSuccess: () => {
      setSourceId("");
      void client.invalidateQueries({ queryKey: ["sources", projectId] });
    },
  });
  return (
    <main className="min-h-[calc(100vh-2.75rem)] bg-page px-6 py-10 text-foreground">
      <div className="mx-auto max-w-7xl">
        <Link href={`/projects/${projectId}`} className="text-sm text-muted">{t("← Project")}</Link>
        <header className="mt-8 flex flex-wrap items-end justify-between gap-6"><div><p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">{t("Data")}</p><h1 className="mt-3 text-4xl font-medium">{t("Excel sources")}</h1></div><label className="focus-within:outline-2 focus-within:outline-accent inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary"><Upload size={16} />{upload.isPending ? t("Uploading…") : t("Upload workbook")}<input aria-label={t("Upload workbook")} className="sr-only" type="file" accept=".xlsx,.xlsm" disabled={upload.isPending} onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) upload.mutate(file); }} /></label></header>
        {(upload.error || remove.error) ? <p role="alert" className="mt-5 rounded-xl bg-danger-surface p-4 text-sm text-danger">{errorText(upload.error ?? remove.error)}</p> : null}
        {selected && <div className="mt-6 rounded-xl border border-outline p-4"><Link className="font-medium text-accent underline" href={`/projects/${projectId}/workflow?mode=fields`}>{t("Continue to calculations")}</Link><p className="mt-2 text-sm text-muted">{t("Open a workbook sheet in the editor, then join, calculate or summarize.")}</p></div>}
        <div className="mt-10 grid gap-6 lg:grid-cols-[18rem_1fr]">
          <aside className="space-y-3">{sources.isPending ? <p className="text-muted">{t("Loading sources…")}</p> : null}{sources.error ? <p className="text-danger">{errorText(sources.error)}</p> : null}{sources.data?.length === 0 ? <div className="rounded-2xl border border-dashed border-outline p-6 text-sm text-muted">{t("Upload an Excel workbook to inspect its data.")}</div> : null}{sources.data?.map((source) => <div key={source.id} className="flex items-center gap-2"><button aria-pressed={source.id === effectiveSourceId} onClick={() => { setSourceId(source.id); setSheetName(source.workbook.sheets[0]?.name ?? ""); }} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${source.id === effectiveSourceId ? "border-accent/50 bg-accent/10" : "border-outline bg-raised"}`}><FileSpreadsheet className="shrink-0 text-accent" size={20} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{source.name}</span><span className="block text-xs text-muted">{t("Sheets: {0}", { 0: cell(source.workbook.sheets.length) })}</span></span></button><button disabled={remove.isPending} className="rounded p-3" aria-label={t("Delete {0}", {"0": source.name})} onClick={(event) => { event.stopPropagation(); if (window.confirm(t("Delete “{0}”?", {"0": source.name}))) remove.mutate(source.id); }}><Trash2 size={15} className="text-muted hover:text-danger" /></button></div>)}</aside>
          <section className="min-w-0 rounded-3xl border border-outline bg-raised p-5">{selected ? <><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-medium">{selected.original_filename}</h2><p className="text-xs text-muted">{cell(selected.file_size)}{" "}{t("bytes")}</p></div><select aria-label={t("Worksheet")} value={effectiveSheetName} onChange={(event) => setSheetName(event.target.value)} className="rounded-full border border-outline bg-surface px-4 py-2 text-sm">{selected.workbook.sheets.map((sheet) => <option key={sheet.name}>{sheet.name}</option>)}</select></div>{preview.isPending ? <p className="mt-10 text-muted">{t("Loading preview…")}</p> : null}{preview.error ? <p className="mt-10 text-danger">{errorText(preview.error)}</p> : null}{preview.data ? <div className="mt-6 overflow-auto"><div className="mb-3 flex gap-2 text-xs text-muted">{preview.data.columns.map((column) => <span className="rounded-full bg-raised px-3 py-1" key={column.column_id}>{column.display_name}: {t(column.logical_type)}{column.nullable ? "?" : ""}</span>)}</div><table className="w-full border-collapse text-sm"><thead><tr>{preview.data.columns.map((column) => <th className="border-b border-outline p-3 text-left text-muted" key={column.column_id}>{column.display_name}</th>)}</tr></thead><tbody>{preview.data.rows.map((row, index) => <tr key={index}>{preview.data.columns.map((column) => <td className="border-b border-outline p-3" key={column.column_id}>{cell(row[column.column_id], column.logical_type)}</td>)}</tr>)}</tbody></table>{preview.data.rows.length === 0 ? <p className="py-10 text-center text-muted">{t("This worksheet is empty.")}</p> : null}</div> : null}</> : <p className="grid min-h-64 place-items-center text-muted">{t("Select a source to preview it.")}</p>}</section>
        </div>
      </div>
    </main>
  );
}
