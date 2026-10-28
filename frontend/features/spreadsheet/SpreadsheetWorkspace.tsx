"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ClipboardPaste, Copy, Eraser, FileSpreadsheet, Maximize2, Redo2, Save, Search, Scissors, Snowflake, Undo2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import { useDirtyGuard } from "@/features/report-cycle/useDirtyGuard";
import { applyInputUpdate, assertInputRevision, checkInputUpdate, readInputUpdate } from "@/features/report-cycle/save-input-update";
import type { Update } from "@/features/report-cycle/api";
import { clipboardTable } from "@/features/report-cycle/clipboard-table";
import { columnLetter, SpreadsheetSession, formatDefaults, type FormatPatch, type Page, type Workspace, type CellChange } from "./session";
import FormatToolbar from "./FormatToolbar";
import type { CanvasHandle, Selection } from "./UniverCanvas";
import "./spreadsheet.css";
import { listSources } from "@/features/data-sources/api";
import { listImports } from "@/features/ingestion/api";
import { spreadsheetUrl } from "./open-window";

const Canvas = dynamic(() => import("./UniverCanvas"), { ssr: false });
type SaveBody = components["schemas"]["EditorSave"];
export default function SpreadsheetWorkspace({ projectId, sourceId, updateId }: { projectId: string; sourceId: string | null; updateId: string | null }) {
  const { t, locale, errorText } = useI18n();
  const [update, setUpdate] = useState<Update | null>(null), [session, setSession] = useState<SpreadsheetSession | null>(null);
  const [busy, setBusy] = useState(true), [loading, setLoading] = useState(0), [stage, setStage] = useState("Opening table…");
  const [error, setError] = useState<unknown>(null), [saved, setSaved] = useState(false);
  const [review, setReview] = useState<Update | null>(null), [ack, setAck] = useState(false);
  const [selection, setSelection] = useState<Selection>({ sheet: "", row: 0, column: 0, endRow: 0, endColumn: 0 });
  const [tab, setTab] = useState("home"), [frozen, setFrozen] = useState(false), [find, setFind] = useState(false), [query, setQuery] = useState("");
  const [matches, setMatches] = useState<{ row: number; column: number }[]>([]), [matchIndex, setMatchIndex] = useState(0);
  const [searchComplete, setSearchComplete] = useState(false);
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);
  const [canvasReady, setCanvasReady] = useState(false);
  const [nativeEditing, setNativeEditing] = useState(false);
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [workbookEditing, setWorkbookEditing] = useState(false);
  const [deletedRows, setDeletedRows] = useState<{ sheet: string; ids: string[]; row: number }[]>([]);
  const workbookMode = useRef(false);
  const [, redraw] = useState(0);
  const canvas = useRef<CanvasHandle | null>(null), lifecycle = useRef<AbortController | null>(null);
  const pending = useRef(new Map<string, Promise<void>>());
  const opening = useRef(crypto.randomUUID());
  const saveRequest = useRef<{ signature: string; body: SaveBody } | null>(null);
  const prepareRequest = useRef<{ revision: number; id: string } | null>(null);
  const rowRequest = useRef<{ signature: string; body: SaveBody } | null>(null);
  const findInput = useRef<HTMLInputElement>(null);
  const resume = useRef<Selection | null>(null);
  const requestLock = useRef(false);
  const finishingEdit = useRef(false);
  const openingRequests = useRef(new Map<string, Promise<Update>>());
  const cell = session?.cell(selection.sheet, selection.row, selection.column);
  useDirtyGuard(!!session?.dirty || nativeEditing || busy);
  const address = `${columnLetter(selection.column)}${selection.row + 1}`;
  const root = update ? `/api/v1/updates/${update.id}/editor` : "";

  async function begin(source: string, requestId: string, reuse = true) {
    const pending = openingRequests.current.get(requestId);
    if (pending) return pending;
    const job = apiRequest<Update>(`/api/v1/projects/${projectId}/file-updates`, { method: "POST", body: JSON.stringify({ source_id: source, request_id: requestId, reuse_existing: reuse }) })
      .finally(() => openingRequests.current.delete(requestId));
    openingRequests.current.set(requestId, job);
    return job;
  }
  async function open(row: Update, target?: Selection) {
    setUpdate(row);
    const data = await apiRequest<Workspace>(`/api/v1/updates/${row.id}/editor/workspace`);
    if (target || canvas.current) resume.current = target ?? canvas.current!.selection();
    const next = new SpreadsheetSession(data); next.workbookEditing = workbookMode.current;
    setUpdate(row); setSession(next);
    setSelection({ sheet: data.page.resource_id, row: 0, column: 0, endRow: 0, endColumn: 0 });
    setReview(null); setAck(false); pending.current.clear(); setMatches([]); setSearchComplete(false);
  }
  useEffect(() => {
    const controller = new AbortController(); lifecycle.current = controller;
    let active = true;
    void (async () => {
      try {
        let row = updateId ? await readInputUpdate(projectId, updateId) : sourceId ? await begin(sourceId, opening.current) : null;
        if (!row) {
          const [legacy, imported] = await Promise.all([listSources(projectId), listImports(projectId)]);
          const choices = [...legacy, ...imported.filter(i => Object.keys(i.active_snapshots).length)].map(i => ({ id: i.id, name: i.name }));
          if (choices.length === 1) row = await begin(choices[0].id, opening.current);
          else { if (active) setSources(choices); return; }
        }
        if (row.status === "applied" && row.file_exchange) row = await begin(row.file_exchange.source_id, opening.current);
        if (active) await open(row);
      } catch (failure) { if (active) setError(failure); }
      finally { if (active) setBusy(false); }
    })();
    return () => { active = false; controller.abort(); };
    // A source/update link is the session identity. Changes after save are opened explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, sourceId, updateId]);

  const load = useCallback(async (sheet: string, start: number, end: number) => {
    if (!session || !update || requestLock.current) return false;
    const meta = session.workspace.sheets.find(s => s.name === sheet);
    if (!meta) return false;
    let loaded = false;
    const size = Math.min(100, Math.max(1, Math.floor(2000 / meta.columns)));
    for (let offset = Math.floor(Math.max(0, start) / size) * size; offset <= Math.min(meta.rows - 1, end); offset += size) {
      if (session.rows.get(sheet)?.has(offset) && session.rows.get(sheet)?.has(Math.min(meta.rows - 1, offset + size - 1))) continue;
      const key = `${sheet}:${offset}`;
      let job = pending.current.get(key);
      if (!job) {
        setLoading(n => n + 1);
        const sourceOffset = session.workspace.page.workbook ? offset : Math.max(0, offset - 1);
        job = apiRequest<Page>(`${root}?resource=${encodeURIComponent(sheet)}&offset=${sourceOffset}&limit=100`, { signal: lifecycle.current?.signal })
          .then(page => { session.accept(page); redraw(n => n + 1); }).finally(() => { pending.current.delete(key); setLoading(n => n - 1); });
        pending.current.set(key, job);
      }
      await job;
      loaded = true;
    }
    return loaded;
  }, [session, update, root]);
  const changed = useCallback((changes: CellChange[]) => {
    if (!session || requestLock.current) throw new Error("Wait for saving to finish before editing.");
    session.edit(changes); setSaved(false); setReview(null); setAck(false); setError(null); redraw(n => n + 1);
  }, [session]);
  const selected = useCallback((value: Selection) => { setSelection(value); }, []);
  const ready = useCallback((value: CanvasHandle | null) => {
    canvas.current = value; setCanvasReady(!!value);
    if (value && resume.current) { const target = resume.current; resume.current = null; value.show(target.sheet, target.row, target.column); }
  }, []);

  async function run(action: () => void | Promise<void>) { try { setError(null); await action(); } catch (failure) { setError(failure); } }
  async function toggleWorkbookMode() {
    if (!session || !session.workspace.page.workbook || busy) return;
    await canvas.current?.finishEditing();
    workbookMode.current = !workbookMode.current;
    session.workbookEditing = workbookMode.current;
    setWorkbookEditing(workbookMode.current); setError(null); canvas.current?.repaint(); redraw(n => n + 1);
  }
  async function undo(redo = false) {
    if (!session || busy) return;
    await canvas.current?.finishEditing();
    const edits = redo ? session.redo() : session.undo(); canvas.current?.repaint(edits); setReview(null); setSaved(false); redraw(n => n + 1);
  }
  async function rangeCells(): Promise<CellChange[]> {
    if (!session) return [];
    await canvas.current?.finishEditing();
    const s = { ...(canvas.current?.selection() ?? selection) };
    const merge = session.workspace.sheets.find(sheet => sheet.name === s.sheet)?.merges?.find(([l, t, r, b]) => s.column === l - 1 && s.row === t - 1 && s.endColumn === r - 1 && s.endRow === b - 1);
    if (merge) { s.endRow = s.row; s.endColumn = s.column; }
    if ((s.endRow - s.row + 1) * (s.endColumn - s.column + 1) > 2000) throw new Error("The pasted range is too large. Paste a smaller range.");
    await load(s.sheet, s.row, s.endRow);
    const changes: CellChange[] = [];
    for (let row = s.row; row <= s.endRow; row++) for (let column = s.column; column <= s.endColumn; column++) {
      const current = session.cell(s.sheet, row, column);
      if (!current) throw new Error("Wait for the selected rows to load before editing.");
      changes.push({ sheet: s.sheet, row, column, value: current.value });
    }
    return changes;
  }
  async function formatRange(patch: FormatPatch) {
    if (!session || requestLock.current) return;
    const cells = await rangeCells();
    const targets = [...new Map(cells.map(c => { const anchor = session.anchor(c.sheet, c.row, c.column); const target = { ...c, ...anchor }; return [`${c.sheet}:${anchor.row}:${anchor.column}`, target] as const; })).values()];
    session.format(targets, patch); canvas.current?.repaint(targets);
    setSaved(false); setReview(null); setAck(false); setError(null); redraw(n => n + 1);
  }
  async function copy(cut = false) {
    const cells = await rangeCells(), range = canvas.current?.selection() ?? selection;
    if (!cut && canvas.current) { await canvas.current.copy(); return; }
    const width = range.endColumn - range.column + 1;
    const lines: string[] = [];
    for (let i = 0; i < cells.length; i += width) lines.push(cells.slice(i, i + width).map(c => /[\t\r\n"]/.test(c.value) ? `"${c.value.replaceAll('"', '""')}"` : c.value).join("\t"));
    await navigator.clipboard.writeText(lines.join("\n"));
    if (cut) { const edits = cells.map(c => ({ ...c, value: "" })); changed(edits); canvas.current?.repaint(edits); }
  }
  async function paste(valuesOnly = false) {
    await canvas.current?.finishEditing();
    const s = { ...(canvas.current?.selection() ?? selection) };
    if (!valuesOnly && await canvas.current?.pasteInternal()) return;
    const matrix = clipboardTable(await navigator.clipboard.readText());
    await load(s.sheet, s.row, s.row + matrix.length - 1);
    const edits = matrix.flatMap((values, i) => values.map((value, j) => ({ sheet: s.sheet, row: s.row + i, column: s.column + j, value })));
    changed(edits); canvas.current?.repaint(edits);
  }
  async function save() {
    if (!session || !update || !canvas.current || requestLock.current || finishingEdit.current) return;
    finishingEdit.current = true;
    try { await canvas.current.finishEditing(); } finally { finishingEdit.current = false; }
    if (requestLock.current) return;
    if (!session.dirty && !session.pending && !update.items.length) return;
    requestLock.current = true; setBusy(true); setError(null); setReview(null); setAck(false); setStage("Saving changes…");
    try {
      await Promise.all(pending.current.values());
      await persistDraft();
      let row = await readInputUpdate(projectId, update.id); assertInputRevision(row, session.revision);
      if (session.pending) {
        setStage("Recalculating formulas…");
        if (prepareRequest.current?.revision !== session.revision) prepareRequest.current = { revision: session.revision, id: crypto.randomUUID() };
        row = await apiRequest<Update>(`${root}/prepare`, { method: "POST", body: JSON.stringify({ expected_revision: session.revision, request_id: prepareRequest.current.id }) });
        // Preparing a replacement assigns new row identities; old deletion IDs no longer apply.
        setDeletedRows([]);
      }
      setUpdate(row); session.revision = row.revision; session.pending = false;
      setStage("Checking changes…");
      const checked = await checkInputUpdate(row, lifecycle.current?.signal);
      setUpdate(checked); session.revision = checked.revision;
      if (checked.check?.issues?.length) { await open(checked); setReview(checked); return; }
      await apply(checked);
    } finally { requestLock.current = false; setBusy(false); setStage(""); }
  }
  async function persistDraft() {
    if (!session) return;
    while (session.dirty) {
        const all = [...session.changes.values()], allFormats = [...session.formats.values()];
        const sheet = (all[0] ?? allFormats[0]).sheet, changes = all.filter(c => c.sheet === sheet).slice(0, 2000);
        const formats = allFormats.filter(c => c.sheet === sheet).slice(0, 2000 - changes.length);
        const body = { expected_revision: session.revision, resource_id: sheet, cells: changes.map(c => ({ row_id: session.cell(c.sheet, c.row, c.column)!.id, column: c.column, value: c.value, formula: !!c.formula, override_protection: !!c.override_protection })), formats: formats.map(c => ({ row_id: session.cell(c.sheet, c.row, c.column)!.id, column: c.column, patch: c.patch, override_protection: !!c.override_protection })) };
        const signature = JSON.stringify(body);
        if (saveRequest.current?.signature !== signature) saveRequest.current = { signature, body: { ...body, request_id: crypto.randomUUID() } };
        const page = await apiRequest<Page>(root, { method: "POST", body: JSON.stringify(saveRequest.current.body) });
        session.persisted(changes, page.revision); session.persistedFormats(formats, page.revision); saveRequest.current = null; redraw(n => n + 1);
    }
  }
  async function rowsAction(action: "append" | "delete" | "restore" = "append") {
    if (!session || !update || requestLock.current) return;
    await canvas.current?.finishEditing();
    const removed = action === "restore" ? deletedRows.at(-1) : undefined;
    if (action === "restore" && !removed) return;
    const remove = action === "delete";
    const selected = removed ? { ...selection, sheet: removed.sheet, row: removed.row } : canvas.current?.selection() ?? selection;
    if (remove && (selected.row === 0 || selected.endRow - selected.row >= 100)) throw new Error("Select up to 100 data rows. The header is protected.");
    if (remove) await load(selected.sheet, selected.row, selected.endRow);
    requestLock.current = true; setBusy(true); setStage("Saving changes…");
    try {
      await Promise.all(pending.current.values()); await persistDraft();
      const ids = removed?.ids ?? (remove ? Array.from({ length: selected.endRow - selected.row + 1 }, (_, i) => session.cell(selected.sheet, selected.row + i, 0)!.id) : []);
      const signature = JSON.stringify([session.revision, selected.sheet, action, ids]);
      if (rowRequest.current?.signature !== signature) rowRequest.current = { signature, body: { expected_revision: session.revision, resource_id: selected.sheet, request_id: crypto.randomUUID(), append_rows: action === "append" ? [crypto.randomUUID()] : [], delete_rows: remove ? ids : [], restore_rows: removed ? ids : [] } };
      const page = await apiRequest<Page>(root, { method: "POST", body: JSON.stringify(rowRequest.current.body) });
      const row = await readInputUpdate(projectId, update.id); assertInputRevision(row, page.revision);
      await open(row, { sheet: selected.sheet, row: action === "append" ? page.total_rows : Math.min(selected.row, page.total_rows), column: 0, endRow: 0, endColumn: 0 });
      if (remove) setDeletedRows(groups => [...groups, { sheet: selected.sheet, ids, row: selected.row }]);
      if (removed) setDeletedRows(groups => groups.slice(0, -1));
      rowRequest.current = null;
    } finally { requestLock.current = false; setBusy(false); setStage(""); }
  }
  async function apply(row: Update, acknowledge = false) {
    lifecycle.current?.signal.throwIfAborted(); setStage("Updating reports…");
    const applied = await applyInputUpdate(row, acknowledge);
    setDeletedRows([]);
    setUpdate(applied); setSaved(true); setReview(null);
    const channel = new BroadcastChannel("nodebi-source-updates"); channel.postMessage({ type: "source-applied", projectId }); channel.close();
    const source = applied.file_exchange?.source_id;
    if (source) {
      try { await open(await begin(source, crypto.randomUUID())); }
      catch { setError(new Error("Changes were saved, but the next editing session could not be opened. Reload to continue.")); }
    }
    else { setUpdate(applied); setReview(null); }
  }
  async function confirm() {
    if (!review || requestLock.current) return;
    requestLock.current = true; setBusy(true);
    try { await apply(review, true); } finally { requestLock.current = false; setBusy(false); setStage(""); }
  }
  const saveAction = useRef(save);
  async function discard() {
    if (!update?.file_exchange || !session || requestLock.current || !window.confirm(t("Discard all browser edits? The source data will not change."))) return;
    requestLock.current = true; setBusy(true); setStage("Opening table…");
    try {
      await Promise.all(pending.current.values());
      await apiRequest<Update>(`/api/v1/updates/${update.id}/cancel`, { method: "POST", body: JSON.stringify({ expected_revision: session.revision }) });
      await open(await begin(update.file_exchange.source_id, crypto.randomUUID(), false));
      setDeletedRows([]);
      setSaved(false); saveRequest.current = null; rowRequest.current = null; prepareRequest.current = null;
    } finally { requestLock.current = false; setBusy(false); setStage(""); }
  }
  useEffect(() => { saveAction.current = save; });
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const value = event.key.toLowerCase();
      // Univer focuses a hidden contenteditable even when no cell is being edited.
      // Keep native text shortcuts during real editing, otherwise operate on the range.
      const target = event.target as Element;
      const textEditing = !!target?.closest("input,textarea") || (!!target?.closest("[contenteditable=true]") && !!canvas.current?.editing());
      if (["c", "x", "v"].includes(value) && !textEditing && canvas.current) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (!requestLock.current) void run(value === "v" ? () => paste(event.shiftKey) : () => copy(value === "x"));
      }
      if ((value === "b" || value === "i") && !textEditing && session?.workspace.page.can_format && canvas.current) {
        event.preventDefault(); event.stopImmediatePropagation();
        const selected = canvas.current.selection(), appearance = session.cell(selected.sheet, selected.row, selected.column)?.appearance;
        if (!requestLock.current) void run(() => formatRange(value === "b" ? { bold: !appearance?.bold } : { italic: !appearance?.italic }));
      }
      if (value === "s") { event.preventDefault(); event.stopImmediatePropagation(); void run(() => saveAction.current()); }
      if (value === "f") { event.preventDefault(); event.stopImmediatePropagation(); setFind(true); setTimeout(() => findInput.current?.focus(), 0); }
      if ((value === "z" || value === "y") && !textEditing) { event.preventDefault(); event.stopImmediatePropagation(); void run(() => undo(value === "y" || event.shiftKey)); }
    };
    window.addEventListener("keydown", key, true); return () => window.removeEventListener("keydown", key, true);
    // Handler reads the current mutable session/history; remount when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, busy]);
  async function search() {
    if (!session || !query.trim()) return;
    await canvas.current?.finishEditing();
    const result = await apiRequest<{ cells: { row: number; column: number }[] }>(`${root}/find?resource=${encodeURIComponent(selection.sheet)}&text=${encodeURIComponent(query)}`);
    const local = [...session.changes.values()].filter(c => c.sheet === selection.sheet && c.value.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
    const shift = session.workspace.page.workbook ? 0 : 1;
    const found = [...new Map([...local, ...result.cells.map(c => ({ ...c, row: c.row + shift }))].map(c => [`${c.row}:${c.column}`, { row: c.row, column: c.column }])).values()].filter(c => { const cell = session.cell(selection.sheet, c.row, c.column); return !cell || cell.value.toLocaleLowerCase().includes(query.toLocaleLowerCase()); });
    setMatches(found); setMatchIndex(0); setSearchComplete(true);
    if (found[0]) { await load(selection.sheet, found[0].row, found[0].row); canvas.current?.show(selection.sheet, found[0].row, found[0].column); }
  }
  const button = (label: string, Icon: typeof Copy, action: () => void | Promise<void>, disabled = busy) => <button className="sheet-tool" disabled={disabled || !canvasReady} onClick={() => void run(action)} title={t(label)}><Icon size={19} aria-hidden="true" /><span>{t(label)}</span></button>;
  return <main className="spreadsheet-window" aria-label={t("Spreadsheet editor")}>
    <header className="sheet-titlebar"><FileSpreadsheet size={25} aria-hidden="true" /><div className="min-w-0 flex-1"><h1>{update?.file_exchange?.source_name ?? t("Spreadsheet editor")}</h1><p role="status">{busy ? t(stage || "Loading…") : loading ? t("Loading rows…") : saved ? t("Changes saved. Reports have been updated.") : t(session?.dirty || nativeEditing ? "Unsaved cell edits" : session?.pending ? "Saved browser draft" : "Current input")}</p></div>{session && <button className="sheet-save" disabled={busy || !session || (!session.dirty && !session.pending && !nativeEditing && !update?.items.length)} onPointerDown={event => event.preventDefault()} onClick={() => void run(save)}><Save size={18} />{t("Save changes")}</button>}<a href={`/projects/${projectId}/dashboard?mode=view`} target="_blank" rel="noopener noreferrer" className="sheet-back"><ArrowLeft size={16} />{t("Open report")}</a></header>
    {session && <><nav className="sheet-ribbon-tabs" aria-label={t("Editor toolbar")}><button aria-pressed={tab === "home"} onClick={() => setTab("home")}>{t("Home tab")}</button><button aria-pressed={tab === "view"} onClick={() => setTab("view")}>{t("View tab")}</button><span>{t("Changes apply to source data")}</span></nav>
    <div className="sheet-ribbon">{tab === "home" ? <><div className="sheet-tool-group">{button("Paste values", ClipboardPaste, () => paste(true))}{button("Copy", Copy, () => copy(), !session || busy)}{button("Cut", Scissors, () => copy(true))}</div>{session.workspace.page.can_format && <FormatToolbar current={formatDefaults(cell?.appearance)} disabled={busy || !canvasReady || !!cell?.formatReadonly} reason={cell?.formatReadonly ? session.workspace.page.workbook ? workbookEditing ? "This selection cannot be formatted." : "Enable Edit calculations to format protected cells." : "Select a data cell to change its formatting." : undefined} apply={patch => void run(() => formatRange(patch))} />}<div className="sheet-tool-group">{button("Undo", Undo2, () => undo(), busy || (!session?.history.length && !nativeEditing))}{button("Redo", Redo2, () => undo(true), busy || !session?.future.length)}{button("Clear values", Eraser, async () => { const edits = (await rangeCells()).map(c => ({ ...c, value: "" })); changed(edits); canvas.current?.repaint(edits); })}</div><div className="sheet-tool-group">{button("Find", Search, () => { setFind(!find); setTimeout(() => findInput.current?.focus(), 0); }, !session)}</div></> : <><div className="sheet-tool-group">{button("Freeze first row and column", Snowflake, () => { canvas.current?.freeze(!frozen); setFrozen(!frozen); }, !session)}{button("Full screen", Maximize2, () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(), false)}</div><p className="sheet-hint">{t("Select a range with the mouse or Shift. Ctrl+C / Ctrl+V — copy and paste, Ctrl+Z — undo, Ctrl+S — save.")}</p></>}</div>
    <div className="sheet-actions-strip">{session && <a href={spreadsheetUrl(projectId, {})}>{t("Choose another file")}</a>}{session?.workspace.page.workbook && <button aria-pressed={workbookEditing} disabled={busy || !canvasReady} onClick={() => void run(toggleWorkbookMode)}>{t("Edit calculations")}</button>}{session?.workspace.page.can_change_rows && <><button disabled={busy || !canvasReady} onClick={() => void run(() => rowsAction())}>{t("Add data row")}</button><button disabled={busy || !canvasReady || selection.row === 0} onClick={() => void run(() => rowsAction("delete"))}>{t("Delete selected rows")}</button>{deletedRows.length > 0 && <button disabled={busy || !canvasReady} onClick={() => void run(() => rowsAction("restore"))}>{t("Restore deleted rows")}</button>}</>}<button className="ml-auto" disabled={busy || !session || (!session.dirty && !session.pending && !nativeEditing && !update?.items.length)} onClick={() => void run(discard)}>{t("Discard changes")}</button></div>
    {workbookEditing && <div className="sheet-workbook-mode" role="status">{t("Calculation editing is enabled. Start formulas with =; use an apostrophe for literal text. Results are recalculated on save. Merged areas keep their structure.")}</div>}
    {find && <form className="sheet-find" onSubmit={event => { event.preventDefault(); void run(search); }}><Search size={16} /><input ref={findInput} aria-label={t("Find in worksheet")} value={query} onChange={event => { setQuery(event.target.value); setMatches([]); setSearchComplete(false); }} /><button disabled={!query.trim() || busy}>{t("Find")}</button><span>{matches.length ? `${matchIndex + 1} / ${matches.length}` : t(searchComplete ? "No matches" : "Enter text and press Enter")}</span><button type="button" disabled={!matches.length} onClick={() => void run(async () => { const i = (matchIndex + 1) % matches.length; setMatchIndex(i); await load(selection.sheet, matches[i].row, matches[i].row); canvas.current?.show(selection.sheet, matches[i].row, matches[i].column); })}>{t("Next")}</button><button type="button" onClick={() => setFind(false)}>{t("Close")}</button></form>}
    </>}
    {error != null && <div role="alert" className="sheet-notice sheet-error"><span>{errorText(error)}</span>{session?.workspace.page.workbook && !workbookEditing && <button disabled={busy} onClick={() => void run(toggleWorkbookMode)}>{t("Edit calculations")}</button>}{update && <a href={`/projects/${projectId}/reports?update=${update.id}`} target="_blank" rel="noopener noreferrer">{t("Open file replacement")}</a>}<button onClick={() => setError(null)}>{t("Dismiss")}</button></div>}
    {review && <section className="sheet-review" aria-label={t("Review changes")}><strong>{t(review.check?.issues?.some(i => i.severity === "error") ? "Fix the errors and save again" : "Review warnings before saving")}</strong><ul>{review.check?.issues?.map((issue, i) => <li key={i}>{t(issue.message)}</li>)}</ul>{!review.check?.issues?.some(i => i.severity === "error") && <><label><input type="checkbox" checked={ack} onChange={event => setAck(event.target.checked)} />{t("I reviewed the warnings")}</label><button className="sheet-save" disabled={!ack || busy || !!session?.dirty} onClick={() => void run(confirm)}>{t("Confirm and save")}</button></>}</section>}
    <div className="sheet-grid-frame" aria-busy={busy || (!!session && !canvasReady)}>{session && !canvasReady && <div className="sheet-grid-loading" role="progressbar" aria-label={t("Opening table…")}>{t("Opening table…")}</div>}{session ? <Canvas session={session} locale={locale} readonly={busy || update?.status === "applied"} load={load} changed={changed} selected={selected} ready={ready} failed={setError} editing={setNativeEditing} editingValue={setEditingValue} /> : <div role="status" className="sheet-opening">{busy ? t("Opening table…") : sources.length ? <><h2>{t("Choose a source file")}</h2><p>{t("Open a file below, edit cells and save to update the report.")}</p>{sources.map(source => <a key={source.id} className="sheet-source" href={spreadsheetUrl(projectId, { source: source.id })}><FileSpreadsheet size={22} aria-hidden="true" /><span><strong>{source.name}</strong><small>{t("Open file for editing")}</small></span></a>)}</> : <>{t("The source could not be opened.")}<button onClick={() => window.location.reload()}>{t("Retry")}</button></>}</div>}</div>
    <output className="sr-only" aria-label={t("Selected cell value or formula")} aria-live="polite">{editingValue ?? cell?.formula ?? cell?.value ?? ""}</output>
    <footer className="sheet-status"><span>{t(session ? "Ready" : "Choose a source file")}</span>{session && <span>{selection.sheet} · {address}</span>}{cell?.formula && <span>{t(cell.pendingFormula ? "Formula will be recalculated on save" : "Calculated cell")}</span>}{session?.workspace.page.external_cached_values && <span title={t("External linked values use the saved workbook cache. External files have not been refreshed.")}>{t("External links: saved values")}</span>}<span className="ml-auto">{t("Recalculation on save")}</span></footer>
  </main>;
}
