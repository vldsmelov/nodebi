"use client";

import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import { useDirtyGuard } from "./useDirtyGuard";
import type { Update } from "./api";
import { clipboardTable } from "./clipboard-table";
import { applyInputUpdate, assertInputRevision, checkInputUpdate, readInputUpdate } from "./save-input-update";
import { translateKnownMessage } from "@/lib/localized-errors";

type Page = components["schemas"]["EditorPage"];
type Save = components["schemas"]["EditorSave"];
export function BrowserFileEditor({ row, close, refresh, prepared, download }: {
  row: Update; close: () => void; refresh: () => Promise<unknown>; prepared: (update: Update) => Promise<void>;
  download?: () => Promise<void>;
}) {
  const { t, errorText, cell, locale } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const lifecycle = useRef<AbortController | null>(null);
  const reviewPanel = useRef<HTMLElement>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, string>[]>([]);
  const [busy, setBusy] = useState(true), [error, setError] = useState<unknown>(null);
  const [deleted, setDeleted] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [stage, setStage] = useState("");
  const [review, setReview] = useState<Update | null>(row.check?.issues?.length ? row : null);
  const [acknowledge, setAcknowledge] = useState(false);
  const [replacement, setReplacement] = useState<File | null>(null);
  const [fallback, setFallback] = useState(false);
  const [selected, setSelected] = useState<{ row: string; column: number } | null>(null);
  const [jumpRow, setJumpRow] = useState("1");
  const saveRequest = useRef<{ signature: string; request: Save } | null>(null);
  const commitRequest = useRef<{ revision: number; id: string } | null>(null);
  const dirty = Object.keys(changes).length > 0;
  useDirtyGuard(dirty || busy || !!replacement);
  const root = `/api/v1/updates/${row.id}/editor`;
  useEffect(() => { const el = dialog.current; el?.showModal(); return () => el?.close(); }, []);
  useEffect(() => { const controller = new AbortController(); lifecycle.current = controller; return () => controller.abort(); }, []);
  useEffect(() => { if (review) reviewPanel.current?.focus(); }, [review]);
  useEffect(() => {
    let active = true;
    apiRequest<Page>(`/api/v1/updates/${row.id}/editor`).then(data => { if (active) setPage(data); }).catch(failure => {
      if (!active) return;
      if (failure instanceof ApiError && failure.code === "BROWSER_EDITOR_UNAVAILABLE") setFallback(true);
      else setError(failure);
    }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [row.id]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(null); setNotice("");
    try { await action(); } catch (failure) { setError(failure); } finally { setBusy(false); }
  }
  function requestClose() {
    if (!busy && ((!dirty && !replacement) || window.confirm(t("Discard unsaved cell edits? Saved browser drafts remain available.")))) close();
  }
  function edit(patch: Record<string, string>) {
    setReview(null); setAcknowledge(false); setNotice("");
    setHistory(items => [...items.slice(-49), changes]); setChanges({ ...changes, ...patch });
  }
  async function persist(extra?: Pick<Save, "append_rows" | "delete_rows" | "restore_rows">) {
    if (!page) throw new Error("Load the input table before editing.");
    if (!dirty && !extra) return page;
    setReview(null); setAcknowledge(false);
    const cells = Object.entries(changes).map(([key, value]) => { const at = key.lastIndexOf("|"); return { row_id: key.slice(0, at), column: Number(key.slice(at + 1)), value, formula: false, override_protection: false }; });
    const body = { expected_revision: page.revision, resource_id: page.resource_id, cells, ...extra };
    const signature = JSON.stringify(body);
    if (saveRequest.current?.signature !== signature) saveRequest.current = { signature, request: { ...body, request_id: crypto.randomUUID() } };
    const result = await apiRequest<Page>(`${root}?offset=${page.offset}&limit=${page.limit}`, { method: "POST", body: JSON.stringify(saveRequest.current.request) });
    setPage(result); setChanges({}); setHistory([]); saveRequest.current = null; setNotice("Browser draft saved. Report data is unchanged.");
    await refresh(); return result;
  }
  async function navigate(resource: string, offset: number) {
    const current = await persist();
    const result = await apiRequest<Page>(`${root}?resource=${encodeURIComponent(resource)}&offset=${offset}&limit=${current.limit}`);
    setPage(result); setChanges({}); setHistory([]); setDeleted(null); setSelected(null);
  }
  async function saveChanges() {
    setReview(null); setAcknowledge(false); setStage("Saving changes…");
    try {
      const current = await persist();
      let update = await readInputUpdate(row.project_id, row.id);
      assertInputRevision(update, current.revision);
      if (current.pending) {
        if (current.workbook) setStage("Recalculating formulas…");
        if (commitRequest.current?.revision !== current.revision) commitRequest.current = { revision: current.revision, id: crypto.randomUUID() };
        update = await apiRequest<Update>(`${root}/prepare`, { method: "POST", body: JSON.stringify({ expected_revision: current.revision, request_id: commitRequest.current.id }) });
      }
      // Row identities may change after deletion/serialization; reload before further edits.
      setPage(await apiRequest<Page>(`${root}?resource=${encodeURIComponent(current.resource_id)}&offset=${current.offset}&limit=${current.limit}`));
      await finishSave(update, current);
    } finally { setStage(""); }
  }
  async function finishSave(update: Update, current?: Page) {
    await prepared(update);
    setStage("Checking changes…");
    const checked = await checkInputUpdate(update, lifecycle.current?.signal);
    if (current) setPage(await apiRequest<Page>(`${root}?resource=${encodeURIComponent(current.resource_id)}&offset=${current.offset}&limit=${current.limit}`));
    await prepared(checked);
    if (checked.check?.issues?.length) { setReview(checked); return; }
    lifecycle.current?.signal.throwIfAborted();
    setStage("Updating reports…");
    const applied = await applyInputUpdate(checked);
    await prepared(applied); close();
  }
  async function saveReplacement() {
    const info = row.file_exchange;
    if (!info) return;
    setStage("Saving changes…"); setReview(null); setAcknowledge(false);
    try {
      let update = row;
      if (replacement) {
        const body = new FormData(); body.append("file", replacement);
        const version = await apiRequest<components["schemas"]["VersionRead"]>(`/api/v1/sources/${info.source_id}/versions`, { method: "POST", body });
        update = await apiRequest<Update>(`/api/v1/updates/${row.id}`, { method: "PUT", body: JSON.stringify({
          expected_revision: row.revision, name: row.name,
          items: [{ ...row.items.find(item => item.source_id === info.source_id), source_id: info.source_id, version_id: version.id, mode: "replace" }],
        }) });
        setReplacement(null);
      }
      await finishSave(update);
    } finally { setStage(""); }
  }
  async function appendRow() {
    const current = await persist({ append_rows: [crypto.randomUUID()] });
    const offset = Math.floor((current.total_rows - 1) / current.limit) * current.limit;
    const result = await apiRequest<Page>(`${root}?resource=${encodeURIComponent(current.resource_id)}&offset=${offset}&limit=${current.limit}`);
    setPage(result); setDeleted(null);
  }
  function paste(event: ClipboardEvent<HTMLTextAreaElement>, rowIndex: number, column: number) {
    const text = event.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n") && !text.includes("\r")) return;
    event.preventDefault();
    try {
      const matrix = clipboardTable(text);
      if (!page || rowIndex + matrix.length > page.rows.length || matrix.some(values => column + values.length > page.columns.length)) throw new Error("The pasted range does not fit this page. Add rows or paste a smaller range.");
      const patch: Record<string, string> = {};
      matrix.forEach((values, i) => values.forEach((value, j) => { if (value.length > 10000) throw new Error("The pasted range is too large. Paste a smaller range."); if (page.rows[rowIndex + i].readonly?.includes(column + j)) throw new Error("Formula, merged and protected cells cannot be changed. Edit the input cells instead."); patch[`${page.rows[rowIndex + i].id}|${column + j}`] = value; }));
      edit(patch); setError(null);
    } catch (failure) { setError(failure); }
  }
  const selectedRecord = page?.rows.find(record => record.id === selected?.row);
  const selectedColumn = selected?.column ?? 0;
  const selectedFormula = selectedRecord?.formulas?.[selectedColumn];
  const selectedReadonly = selectedRecord?.readonly?.includes(selectedColumn) ?? false;
  return <dialog ref={dialog} aria-label={t(fallback ? "Update Excel workbook" : "Edit input in browser")} onCancel={event => { event.preventDefault(); requestClose(); }} className="m-auto max-h-[94dvh] w-[min(1500px,96vw)] overflow-auto rounded-xl border border-outline bg-panel p-4 text-foreground backdrop:bg-black/60 sm:p-6">
    <h2 className="text-xl">{t(fallback ? "Update Excel workbook" : "Edit input in browser")}</h2>
    {page && <><p className="my-2 text-sm text-muted">{t(page.workbook ? "Edit the source cells directly here. Formula results are read-only and recalculate when you save." : "Edit cells or paste a range from Excel. Column headers are protected.")}</p>
    <p className="my-2 text-sm text-muted">{t("Click Save changes when finished. We will check the data and update the reports automatically. Problems will appear here before anything is applied.")}</p></>}
    {error != null && <p role="alert" className="my-3 text-sm text-danger">{errorText(error)}</p>}
    {notice && <p role="status" className="my-3 text-sm text-success">{t(notice)}</p>}
    {busy && <p role="status" className="my-2 text-sm">{t(stage || "Loading…")}</p>}
    {!page && !busy && fallback && row.file_exchange && <div className="my-4 space-y-3 rounded-lg border border-outline p-4">
      <p>{t("This workbook needs Excel to preserve its calculations and structure. Download it, make your changes, then select the corrected file here.")}</p>
      {download && <button className="af-btn af-btn--secondary" onClick={() => void run(download)}>{t("Download current input file")}</button>}
      <label className="block space-y-2"><span className="block">{t("Corrected source file")}</span><span className="af-btn af-btn--secondary cursor-pointer focus-within:outline-2 focus-within:outline-accent">{t("Choose corrected file")}<input aria-label={t("Corrected source file")} className="sr-only" type="file" accept={row.file_exchange.connector === "csv" ? ".csv" : ".xlsx,.xlsm"} onChange={event => { setReplacement(event.target.files?.[0] ?? null); setReview(null); setAcknowledge(false); }} /></span><span className="block break-all text-sm text-muted">{replacement?.name ?? t("No file selected")}</span></label>
      <p className="text-sm text-muted">{t("Save changes will check the file and update reports. Errors or warnings will appear here first.")}</p>
    </div>}
    <fieldset disabled={busy} className="min-w-0 space-y-3">
      {page && <>
        {page.external_cached_values && <p className="rounded-lg border border-outline bg-page p-3 text-sm" role="note">{t("External linked values use the saved workbook cache. External files have not been refreshed.")}</p>}
        {page.precision_as_displayed && <p className="text-sm text-muted">{t("This workbook calculates formulas using the displayed Excel precision.")}</p>}
        <div className="flex flex-wrap items-center gap-3"><label>{t("Input table")}<select className="form-control" value={page.resource_id} onChange={e => void run(() => navigate(e.target.value, 0))}>{page.resources.map(id => <option key={id}>{id}</option>)}</select></label><span className="text-sm">{t("Rows: {0}", { 0: cell(page.total_rows) })} · {t(dirty ? "Unsaved cell edits" : page.pending ? "Saved browser draft" : "Current input")}</span></div>
        <div className="flex flex-wrap gap-3">
          {page.can_change_rows !== false && <button className="af-btn af-btn--secondary" onClick={() => void run(appendRow)}>{t("Add data row")}</button>}
          <button className="af-btn af-btn--secondary" disabled={!history.length} onClick={() => { const last = history.at(-1); if (last) { setChanges(last); setHistory(history.slice(0, -1)); } }}>{t("Undo cell edit")}</button>
          {deleted && <button className="af-btn af-btn--secondary" onClick={() => void run(async () => { await persist({ restore_rows: [deleted] }); setDeleted(null); })}>{t("Restore deleted row")}</button>}
        </div>
        {page.workbook && <div className="flex flex-wrap items-center gap-3 rounded-lg border border-outline bg-control p-3">
          <span className="min-w-16 font-mono text-sm">{selectedRecord ? `${page.columns[selectedColumn].name}${page.offset + page.rows.indexOf(selectedRecord) + 1}` : t("Select a cell")}</span>
          <label className="flex min-w-0 flex-1 items-center gap-2"><span className="text-sm text-muted">{selectedFormula ? "ƒx" : t("Value")}</span>
            <input className="form-control min-w-0 w-full font-mono" aria-label={t("Selected cell value or formula")} disabled={!selectedRecord} readOnly={selectedReadonly}
              value={selectedFormula ?? (selectedRecord ? changes[`${selectedRecord.id}|${selectedColumn}`] ?? selectedRecord.values[selectedColumn] : "")}
              onChange={event => { if (selectedRecord && !selectedReadonly) edit({ [`${selectedRecord.id}|${selectedColumn}`]: event.target.value }); }} />
          </label>
          {selectedReadonly && <span className="text-xs text-muted">{t(selectedFormula ? "Calculated cell" : "Protected cell")}</span>}
        </div>}
        <div role="region" aria-label={t("Editable input rows")} tabIndex={0} className="max-h-[50dvh] overflow-auto rounded-lg border border-outline">
          <table className="w-full border-collapse text-sm">
            <caption className="p-2 text-left text-xs text-muted">{t("Showing rows {0}–{1} of {2}", { 0: cell(page.total_rows ? page.offset + 1 : 0), 1: cell(page.offset + page.rows.length), 2: cell(page.total_rows) })}</caption>
            <thead className="sticky top-0 z-10 bg-panel"><tr>
              <th className="sticky left-0 z-20 border border-outline bg-panel p-2">#</th>
              {page.columns.map(column => <th key={column.index} className="min-w-36 border border-outline p-2 text-left">
                {column.name}
                <span className="block max-w-64 break-words text-xs font-normal text-muted">
                  {t(column.description)}
                  {column.date_format && <> · {t("Expected format: {0}", { 0: column.date_format })}</>}
                  {column.decimal_separator && <> · {t("Decimal separator: {0}", { 0: column.decimal_separator })}</>}
                </span>
              </th>)}
              {page.can_change_rows !== false && <th className="border border-outline p-2">{t("Actions")}</th>}
            </tr></thead>
            <tbody>{page.rows.map((record, i) => <tr key={record.id}>
              <th className="sticky left-0 z-10 border border-outline bg-panel p-2">{page.offset + i + 1}</th>
              {record.values.map((value, j) => <td className="border border-outline p-1" key={j}>
                <textarea rows={1} maxLength={10000} readOnly={record.readonly?.includes(j)} data-editor-cell={`${i}:${j}`} title={record.formulas?.[j]}
                  className={`block min-h-9 w-full min-w-36 resize-y rounded border border-outline p-2 focus:border-accent ${record.readonly?.includes(j) ? "bg-page text-muted" : "bg-control"}`}
                  aria-label={t("Row {0}, field {1}", { 0: page.offset + i + 1, 1: page.columns[j].name })}
                  onFocus={() => setSelected({ row: record.id, column: j })}
                  onKeyDown={event => { if (event.key === "Enter" && !event.altKey) { event.preventDefault(); const next = dialog.current?.querySelector<HTMLTextAreaElement>(`[data-editor-cell="${i + (event.shiftKey ? -1 : 1)}:${j}"]`); next?.focus(); } }}
                  value={changes[`${record.id}|${j}`] ?? value} onChange={e => edit({ [`${record.id}|${j}`]: e.target.value })} onPaste={e => paste(e, i, j)} />
              </td>)}
              {page.can_change_rows !== false && <td className="border border-outline p-2">
                <button className="text-danger underline" aria-label={t("Delete data row {0}", { 0: page.offset + i + 1 })}
                  onClick={() => void run(async () => { await persist({ delete_rows: [record.id] }); setDeleted(record.id); })}>{t("Delete row")}</button>
              </td>}
            </tr>)}</tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-3"><button className="af-btn af-btn--secondary" disabled={page.offset === 0} onClick={() => void run(() => navigate(page.resource_id, Math.max(0, page.offset - page.limit)))}>{t("Previous page")}</button><button className="af-btn af-btn--secondary" disabled={page.offset + page.rows.length >= page.total_rows} onClick={() => void run(() => navigate(page.resource_id, page.offset + page.limit))}>{t("Next page")}</button><span className="text-xs text-muted">{t("Page changes save your cell edits first.")}</span></div>
        {page.workbook && <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-sm">{t("Go to row")}<input type="number" min={1} max={page.total_rows} className="form-control w-24" value={jumpRow} onChange={event => setJumpRow(event.target.value)} /></label><button className="af-btn af-btn--secondary" disabled={!Number.isInteger(Number(jumpRow)) || Number(jumpRow) < 1 || Number(jumpRow) > page.total_rows} onClick={() => void run(() => navigate(page.resource_id, Math.floor((Number(jumpRow) - 1) / page.limit) * page.limit))}>{t("Go")}</button><span className="text-xs text-muted">{t("Workbook structure is preserved. Enter moves to the next row; Tab moves to the next cell.")}</span></div>}
      </>}
      <div className="sticky bottom-0 z-30 mt-4 flex flex-wrap gap-3 border-t border-outline bg-panel py-4">
        <button className="af-btn" disabled={page ? (!dirty && !page.pending && !row.items.length) : (!replacement && !row.items.length)} onClick={() => void run(page ? saveChanges : saveReplacement)}>{t("Save changes")}</button>
        <button className="af-btn af-btn--secondary" onClick={requestClose}>{t("Close")}</button>
        {page && <details className="p-2 text-sm"><summary className="cursor-pointer text-accent">{t("Draft actions")}</summary>
          <div className="mt-3 flex flex-wrap gap-3">
            <button className="af-btn af-btn--secondary" disabled={!dirty} onClick={() => void run(async () => { await persist(); })}>{t("Save browser draft")}</button>
            <button className="af-btn af-btn--secondary" disabled={!dirty && !page.pending && !row.browser_editor_pending} onClick={() => { if (window.confirm(t("Discard all browser edits? The source data will not change."))) void run(async () => { const update = await apiRequest<Update>(`${root}/discard`, { method: "POST", body: JSON.stringify({ expected_revision: page.revision }) }); setChanges({}); await prepared(update); close(); }); }}>{t("Discard browser edits")}</button>
          </div>
        </details>}
      </div>
      {review?.check?.issues?.length ? <section ref={reviewPanel} tabIndex={-1} className="space-y-3 rounded-lg border border-outline p-4" aria-label={t("Review changes")}>
        <h3 className="font-semibold">{t(review.check.issues.some(issue => issue.severity === "error") ? "Fix the errors and save again" : "Review warnings before saving")}</h3>
        <ul className="list-disc space-y-2 pl-5">{review.check.issues.map((issue, index) => <li key={index} className={issue.severity === "error" ? "text-danger" : "text-warning"}>{translateKnownMessage(locale, issue.message) ?? t(issue.message)}</li>)}</ul>
        {!review.check.issues.some(issue => issue.severity === "error") && <>
          <label className="flex gap-2"><input type="checkbox" checked={acknowledge} onChange={event => setAcknowledge(event.target.checked)} />{t("I reviewed the warnings")}</label>
          <button className="af-btn" disabled={!acknowledge || dirty} onClick={() => void run(async () => { const applied = await applyInputUpdate(review, true); await prepared(applied); close(); })}>{t("Confirm and save")}</button>
        </>}
      </section> : null}
    </fieldset>
  </dialog>;
}
