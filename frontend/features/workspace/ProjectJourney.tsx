"use client";

import Link from "@/features/spreadsheet/source-link";
import { ArrowRight, Check, Database, RefreshCw, ChartNoAxesCombined } from "lucide-react";
import type { Dashboard } from "@/features/dashboard/api";
import { defaultReport } from "@/features/dashboard/report-entry";
import { dashboardUrl } from "@/features/dashboard/view-state";
import { useI18n } from "@/lib/i18n";

export function ProjectJourney({ projectId, hasData, reports, checked }: {
  projectId: string; hasData: boolean; reports: Dashboard[]; checked: boolean;
}) {
  const { t } = useI18n(), root = `/projects/${projectId}`;
  const report = defaultReport(reports.filter(item => item.widgets.length > 0));
  const steps = [
    { icon: Database, title: "Connect your data", description: "Upload Excel or CSV and check the field types.", done: hasData, href: `${root}/data/import`, action: "Connect data" },
    { icon: ChartNoAxesCombined, title: "Answer a business question", description: "Choose a measure, a breakdown and a chart. The calculation is saved with the report.", done: !!report, href: report ? dashboardUrl(projectId, report.id, {}, true) : `${root}/build`, action: report ? "Open report" : "Create report" },
    { icon: RefreshCw, title: "Keep the report up to date", description: "Replace the source file and review checks before using the new results.", done: checked, href: `${root}/data/update`, action: "Update data from a file" },
  ];
  return <section className="mb-6 rounded-2xl border border-outline bg-panel p-5 sm:p-6" aria-label={t("Your next steps")}>
    <h2 className="text-lg">{t("From a file to a repeatable report")}</h2>
    <ol className="mt-4 grid gap-4 md:grid-cols-3">{steps.map(({ icon: Icon, title, description, done, href, action }, index) =>
      <li key={title} className="flex min-w-0 flex-col rounded-xl border border-outline p-4">
        <span className="mb-3 flex items-center gap-2 text-sm text-accent">{done ? <Check size={18} aria-hidden="true" /> : <Icon size={18} aria-hidden="true" />}<span>{index + 1}</span>{done && <span>{t("Ready")}</span>}</span>
        <h3 className="text-base">{t(title)}</h3><p className="my-3 flex-1 text-sm text-muted">{t(description)}</p>
        <Link href={href} className="inline-flex min-h-10 items-center gap-2 text-sm text-accent underline">{t(action)}<ArrowRight size={15} aria-hidden="true" /></Link>
      </li>)}
    </ol>
  </section>;
}
