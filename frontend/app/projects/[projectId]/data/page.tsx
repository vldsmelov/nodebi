"use client";

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
    <main className="min-h-screen bg-[#0b0f0a] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <Link href={`/projects/${projectId}`} className="text-sm text-white/45">← Project</Link>
        <header className="mt-8 flex flex-wrap items-end justify-between gap-6"><div><p className="font-mono text-xs uppercase tracking-[0.25em] text-[#b7ff5a]">Data</p><h1 className="mt-3 text-4xl font-medium">Excel sources</h1></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#b7ff5a] px-5 py-3 text-sm font-semibold text-[#11170d]"><Upload size={16} />{upload.isPending ? "Uploading…" : "Upload workbook"}<input className="hidden" type="file" accept=".xlsx,.xlsm" disabled={upload.isPending} onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); }} /></label></header>
        {(upload.error || remove.error) ? <p className="mt-5 rounded-xl bg-red-400/10 p-4 text-sm text-red-200">{upload.error?.message ?? remove.error?.message}</p> : null}
        <div className="mt-10 grid gap-6 lg:grid-cols-[18rem_1fr]">
          <aside className="space-y-3">{sources.isPending ? <p className="text-white/40">Loading sources…</p> : null}{sources.error ? <p className="text-red-300">{sources.error.message}</p> : null}{sources.data?.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-white/40">Upload an Excel workbook to inspect its data.</div> : null}{sources.data?.map((source) => <button key={source.id} onClick={() => { setSourceId(source.id); setSheetName(source.workbook.sheets[0]?.name ?? ""); }} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${source.id === effectiveSourceId ? "border-[#b7ff5a]/50 bg-[#b7ff5a]/10" : "border-white/10 bg-white/[0.03]"}`}><FileSpreadsheet className="shrink-0 text-[#b7ff5a]" size={20} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{source.name}</span><span className="block text-xs text-white/35">{source.workbook.sheets.length} sheets</span></span><span role="button" aria-label={`Delete ${source.name}`} onClick={(event) => { event.stopPropagation(); if (window.confirm(`Delete “${source.name}”?`)) remove.mutate(source.id); }}><Trash2 size={15} className="text-white/30 hover:text-red-300" /></span></button>)}</aside>
          <section className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.035] p-5">{selected ? <><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-medium">{selected.original_filename}</h2><p className="text-xs text-white/35">{selected.file_size.toLocaleString()} bytes</p></div><select aria-label="Worksheet" value={effectiveSheetName} onChange={(event) => setSheetName(event.target.value)} className="rounded-full border border-white/15 bg-[#11170f] px-4 py-2 text-sm">{selected.workbook.sheets.map((sheet) => <option key={sheet.name}>{sheet.name}</option>)}</select></div>{preview.isPending ? <p className="mt-10 text-white/40">Loading preview…</p> : null}{preview.error ? <p className="mt-10 text-red-300">{preview.error.message}</p> : null}{preview.data ? <div className="mt-6 overflow-auto"><div className="mb-3 flex gap-2 text-xs text-white/45">{preview.data.columns.map((column) => <span className="rounded-full bg-white/5 px-3 py-1" key={column.column_id}>{column.display_name}: {column.logical_type}{column.nullable ? "?" : ""}</span>)}</div><table className="w-full border-collapse text-sm"><thead><tr>{preview.data.columns.map((column) => <th className="border-b border-white/10 p-3 text-left text-white/45" key={column.column_id}>{column.display_name}</th>)}</tr></thead><tbody>{preview.data.rows.map((row, index) => <tr key={index}>{preview.data.columns.map((column) => <td className="border-b border-white/5 p-3" key={column.column_id}>{String(row[column.column_id] ?? "—")}</td>)}</tr>)}</tbody></table>{preview.data.rows.length === 0 ? <p className="py-10 text-center text-white/35">This worksheet is empty.</p> : null}</div> : null}</> : <p className="grid min-h-64 place-items-center text-white/35">Select a source to preview it.</p>}</section>
        </div>
      </div>
    </main>
  );
}
