"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataStatePanel } from "@/components/ui/workspace";
import { ApiError, apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import { useOutsideLinkGuard } from "@/features/workspace/useOutsideLinkGuard";
import { catalogRecoveryKey, readCatalogRecovery, type PendingCatalogEdit } from "./template-catalog-recovery";

type Entry = components["schemas"]["TemplateCatalogEntry"];
type Page = components["schemas"]["TemplateCatalogPage"];

export function TemplateCatalog({ projectId }: { projectId: string }) {
  const { t, errorText, nodeName } = useI18n();
  const client = useQueryClient();
  const [recovery] = useState(() => readCatalogRecovery(projectId));
  const [pending, setPending] = useState(recovery.pending);
  const [corrupt, setCorrupt] = useState(!!recovery.error);
  const [storageError, setStorageError] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState(""), [query, setQuery] = useState("");
  const [family, setFamily] = useState(""), [state, setState] = useState("active"), [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<Entry>(), [name, setName] = useState("");
  const sending = useRef(false), feedback = useRef<HTMLParagraphElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const leaveMessage = "Leave the template catalog? Unsubmitted name changes will be lost. Pending requests can be retried here.";
  useOutsideLinkGuard(workspace, !!pending || !!editing, action => { if (window.confirm(t(leaveMessage))) action(); });
  const root = `/api/v1/projects/${projectId}/template-catalog`;
  const params = new URLSearchParams({ q: query, state, offset: String(offset), limit: "20" });
  if (family) params.set("family", family);
  const list = useQuery({ queryKey: ["template-catalog", projectId, query, family, state, offset], queryFn: () => apiRequest<Page>(`${root}?${params}`), retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false });
  const locked = busy || !!pending || corrupt || !!error;
  useEffect(() => { if (notice) feedback.current?.focus(); }, [notice]);
  useEffect(() => {
    if (!pending && !editing) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending, editing]);
  const clearRecovery = () => {
    try { sessionStorage.removeItem(catalogRecoveryKey(projectId)); setStorageError(false); return true; }
    catch { setStorageError(true); return false; }
  };
  const refresh = async () => {
    setEditing(undefined); setError(undefined); setNotice("");
    await client.invalidateQueries({ queryKey: ["template-catalog", projectId] });
    for (const kind of ["analytical", "report"]) void client.invalidateQueries({ queryKey: [`${kind}-templates`, projectId] });
  };
  const send = async (operation: PendingCatalogEdit) => {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError(undefined); setNotice(""); setPending(operation);
    try { sessionStorage.setItem(catalogRecoveryKey(projectId), JSON.stringify(operation)); }
    catch { setStorageError(true); }
    try {
      await apiRequest<Entry>(`${root}/${operation.templateId}`, { method: "PATCH", body: JSON.stringify(operation.request) });
      clearRecovery(); setPending(undefined);
      await refresh();
      setNotice("Template catalog updated. Existing reports are unchanged.");
    } catch (caught) {
      setError(caught);
      if (caught instanceof ApiError && [400, 404, 409, 410, 422].includes(caught.status)) {
        clearRecovery(); setPending(undefined);
      }
    } finally { sending.current = false; setBusy(false); }
  };
  const change = (entry: Entry, patch: { name?: string; archived?: boolean }) => {
    if (locked) return;
    if (patch.archived && !window.confirm(t("Archive this template? Existing reports will not change. You can restore it later."))) return;
    void send({ templateId: entry.id, label: entry.name, request: { request_id: crypto.randomUUID(), expected_revision: entry.revision, ...patch } });
  };
  const leave = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if ((pending || editing) && !window.confirm(t(leaveMessage))) event.preventDefault();
  };
  return <div ref={workspace} className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-semibold">{t("Template catalog")}</h1><p className="mt-2 max-w-3xl text-sm text-muted">{t("Reuse a saved calculation with new data. Renaming or archiving never changes existing reports.")}</p></div>
      <Link className="rounded-lg border border-outline px-4 py-2 text-accent" onClick={leave} href={`/projects/${projectId}/build`}>{t("Create report")}</Link>
    </header>
    <p className="text-sm text-muted">{t("Archived templates remain recoverable and count toward the 200-template project limit.")}</p>
    {storageError && <p role="alert" className="text-warning">{t("Local template recovery is unavailable. Keep this page open until saving is confirmed.")}</p>}
    {corrupt && <DataStatePanel state="error" title="Template recovery unavailable" focusOnMount action={<Button onClick={() => { if (window.confirm(t("Discard invalid local catalog recovery? Check the catalog before submitting another change.")) && clearRecovery()) setCorrupt(false); }}>{t("Discard invalid recovery")}</Button>}>{t("The local catalog request could not be read. No request has been sent.")}</DataStatePanel>}
    {pending && <section className="space-y-2 rounded-xl border border-outline bg-panel p-4" aria-label={t("Pending catalog change")}><p>{t("A catalog change needs confirmation")}: <strong className="break-words">{pending.label}</strong></p>
      <p className="text-sm text-muted">{t("Retry sends exactly the same request, even if the template list is unavailable.")}</p>
      <Button disabled={busy} onClick={() => void send(pending)}>{t(busy ? "Saving…" : "Retry catalog change")}</Button></section>}
    {error ? <DataStatePanel state="error" title="Template change failed" focusOnMount action={!pending ? <Button disabled={busy} onClick={() => void refresh()}>{t("Reload template list")}</Button> : undefined}>{errorText(error)}</DataStatePanel> : null}
    {notice && <p ref={feedback} tabIndex={-1} role="status" className="rounded-lg bg-panel p-3">{t(notice)}</p>}
    <form onSubmit={event => { event.preventDefault(); setOffset(0); setQuery(search.trim()); }}>
      <fieldset disabled={locked || !!editing} className="grid gap-3 rounded-xl border border-outline bg-panel p-4 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]">
        <label className="min-w-0 text-sm">{t("Search templates")}<input className="form-control" maxLength={200} value={search} onChange={e => setSearch(e.target.value)} /></label>
        <label className="min-w-0 text-sm">{t("Template family")}<select className="form-control" value={family} onChange={e => { setFamily(e.target.value); setOffset(0); }}><option value="">{t("All template families")}</option><option value="report">{t("Report templates")}</option><option value="analytical">{t("Analytical templates")}</option></select></label>
        <label className="min-w-0 text-sm">{t("Catalog state")}<select className="form-control" value={state} onChange={e => { setState(e.target.value); setOffset(0); }}><option value="active">{t("Active templates")}</option><option value="archived">{t("Archived templates")}</option><option value="all">{t("All templates")}</option></select></label>
        <Button className="self-end" type="submit">{t("Search")}</Button>
      </fieldset>
    </form>
    {list.isFetching && <DataStatePanel state="loading" />}
    {list.error ? <DataStatePanel state="error" title="Template list unavailable" action={<Button onClick={() => void list.refetch()}>{t("Retry")}</Button>}>{errorText(list.error)}</DataStatePanel> : null}
    {!list.isFetching && !list.error && list.data && <>
      <p className="text-sm text-muted" role="status">{t("Templates found: {0}. Active: {1}; archived: {2}.", { 0: list.data.total, 1: list.data.active_count, 2: list.data.archived_count })}</p>
      {list.data.items.length === 0 && <DataStatePanel state="empty" title="No matching templates">{t("Change the filters, or save a calculation template from an existing report.")}</DataStatePanel>}
      <ul className="grid gap-4 lg:grid-cols-2">{list.data.items.map(entry => <li key={entry.id} className="min-w-0 space-y-3 rounded-xl border border-outline bg-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-2"><h2 className="min-w-0 break-words text-lg font-semibold">{entry.name}</h2><span className="rounded bg-raised px-2 py-1 text-xs text-muted">{t(entry.archived ? "Archived templates" : entry.family === "report" ? "Report template" : "Analytical template")}</span></div>
        <p className="text-sm text-muted">{nodeName(entry.presentation)}</p>
        <p className="break-words text-sm">{t("Expected row meaning")}: {entry.input_grain}</p>
        <details className="text-sm"><summary className="cursor-pointer text-accent">{t("Required input fields")}</summary><ul className="mt-2 space-y-1">{entry.fields.map(field => <li className="break-words" key={field.key}>{field.name} · {t(field.logical_type)}{field.unit ? ` · ${field.unit}` : ""}{field.currency ? ` · ${field.currency}` : ""}</li>)}</ul></details>
        {editing?.id === entry.id ? <form className="space-y-2" onSubmit={event => { event.preventDefault(); if (name.trim()) change(editing, { name: name.trim() }); }}>
          <label className="block text-sm">{t("Template name")}<input autoFocus className="form-control" maxLength={200} disabled={locked} value={name} onChange={e => setName(e.target.value)} /></label>
          <div className="flex flex-wrap gap-2"><Button type="submit" disabled={locked || !name.trim()}>{t("Save name")}</Button><Button type="button" variant="outline" disabled={busy || !!pending} onClick={() => { setEditing(undefined); setNotice("Name editing cancelled."); }}>{t("Cancel")}</Button></div>
        </form> : <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={locked || !!editing} onClick={() => { setEditing(entry); setName(entry.name); setNotice(""); }}>{t("Rename")}</Button><Button variant="outline" disabled={locked || !!editing} onClick={() => change(entry, { archived: !entry.archived })}>{t(entry.archived ? "Restore template" : "Archive template")}</Button></div>}
      </li>)}</ul>
      <nav aria-label={t("Template pages")} className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={locked || !!editing || offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>{t("Previous page")}</Button><span className="text-sm">{t("Catalog page {0}", { 0: offset / 20 + 1 })}</span><Button variant="outline" disabled={locked || !!editing || offset + 20 >= list.data.total} onClick={() => setOffset(offset + 20)}>{t("Next")}</Button></nav>
    </>}
  </div>;
}
