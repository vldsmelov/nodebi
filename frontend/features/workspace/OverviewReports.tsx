"use client";
import { useState } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import type { Dashboard } from "@/features/dashboard/api";
import { dashboardUrl } from "@/features/dashboard/view-state";
import { useI18n } from "@/lib/i18n";

export const overviewLink = "inline-flex min-h-10 items-center gap-2 py-2 text-sm text-accent underline";

export function OverviewReports({ items, projectId }: { items: Dashboard[]; projectId: string }) {
  const { t, cell, locale } = useI18n(), root = `/projects/${projectId}`;
  const [search, setSearch] = useState(""), [page, setPage] = useState(0);
  const matching = items.filter(item => item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .sort((a, b) => Number(!!b.widgets.length) - Number(!!a.widgets.length) || a.name.localeCompare(b.name, locale, { numeric: true }) || a.id.localeCompare(b.id));
  const safePage = Math.min(page, Math.max(0, Math.ceil(matching.length / 6) - 1));
  if (!items.length) return <div className="rounded-xl bg-page p-6"><BarChart3 className="mb-4 text-accent" aria-hidden="true" /><h3 className="font-medium">{t("Your first report starts with a table")}</h3><p className="mt-2 text-sm text-muted">{t("Connect Excel or CSV, then choose measures and dimensions in the report wizard. No manual node connections are needed.")}</p><Link className={overviewLink} href={`${root}/data/import`}>{t("Connect data")}</Link></div>;
  return <>
    <p className="mb-3 text-xs text-muted">{t("Saved layouts are not a guarantee of data quality. Project checks are shown separately.")}</p>
    <label className="text-sm">{t("Find a report")}<input type="search" className="form-control mt-2" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></label>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{matching.slice(safePage * 6, safePage * 6 + 6).map(report => <article key={report.id} className="min-w-0 rounded-xl border border-outline p-4">
      <div className="mb-4 flex items-center gap-2 text-muted"><BarChart3 size={18} aria-hidden="true" /><span className="text-xs">{t(report.widgets.length ? "Saved layout" : "Empty report layout")}</span></div>
      <h3 className="break-words font-semibold">{report.name}</h3><p className="mt-2 text-xs text-muted">{t("Report elements: {0}", { 0: cell(report.widgets.length) })}</p>
      <div className="mt-3 flex flex-wrap gap-x-4"><Link aria-label={t("Open report {0}", { 0: report.name })} className={overviewLink} href={dashboardUrl(projectId, report.id, {}, true)}>{t("Open report")}</Link><Link aria-label={t("Edit report {0}", { 0: report.name })} className={overviewLink} href={dashboardUrl(projectId, report.id)}>{t("Edit")}</Link></div>
    </article>)}</div>
    {!matching.length && <p role="status" className="py-5 text-sm">{t("No reports match this name.")} <button className="min-h-10 underline" onClick={() => setSearch("")}>{t("Clear search")}</button></p>}
    {matching.length > 6 && <nav aria-label={t("Report list pages")} className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm"><button className="min-h-10 disabled:opacity-40" disabled={!safePage} onClick={() => setPage(safePage - 1)}>{t("Previous page")}</button><span>{t("Page {0} of {1}", { 0: safePage + 1, 1: Math.ceil(matching.length / 6) })}</span><button className="min-h-10 disabled:opacity-40" disabled={(safePage + 1) * 6 >= matching.length} onClick={() => setPage(safePage + 1)}>{t("Next page")}</button></nav>}
  </>;
}
