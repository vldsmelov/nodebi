"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { translateKnownMessage } from "@/lib/localized-errors";
import type { Check } from "./api";

export function CheckResults({ value, projectId }: { value?: Check | null; projectId: string }) {
  const { t, cell, locale } = useI18n();
  if (!value) return null;
  return <section aria-label={t("Report checks")} className="my-4 space-y-3">
    {!!value.affected_reports?.length && <p>{t("Affected reports")}: {value.affected_reports.join(", ")}</p>}
    {!!value.metrics?.length && <table className="w-full text-sm"><thead><tr>{["Control value", "Previous", "Current"].map(label => <th key={label} className="p-2 text-left">{t(label)}</th>)}</tr></thead><tbody>{value.metrics.map(metric => <tr key={`${metric.workflow_id}/${metric.node_id}/${metric.port}`}><td className="p-2">{metric.name}</td><td className="p-2">{cell(metric.previous)}</td><td className="p-2">{cell(metric.value)}</td></tr>)}</tbody></table>}
    {!value.issues?.length && <p role="status" className="text-accent">{t("No report errors found.")}</p>}
    {value.issues?.map((issue, index) => <div key={index} className={`rounded border p-3 ${issue.severity === "error" ? "border-danger text-danger" : "border-outline"}`}>
      <p>{t(issue.severity === "error" ? "Error" : "Warning")}: {translateKnownMessage(locale, issue.message) ?? issue.message} {issue.count != null && `(${cell(issue.count)})`}</p>
      {issue.node_id && <Link className="text-sm underline" href={`/projects/${projectId}/workflow?mode=fields&workflow=${issue.workflow_id}&node=${issue.node_id}`}>{t("Open calculation")}</Link>}
      {!!issue.examples?.length && <details><summary>{t("Example records")}</summary><div className="max-h-64 overflow-auto"><table className="text-sm"><thead><tr>{Object.keys(issue.examples[0]).map(key => <th key={key} className="p-2">{t(key)}</th>)}</tr></thead><tbody>{issue.examples.map((row, i) => <tr key={i}>{Object.entries(row).map(([key, value]) => <td key={key} className="p-2">{cell(value)}</td>)}</tr>)}</tbody></table></div></details>}
    </div>)}
    {!!value.affected_visualizations?.length && <p className="text-sm text-muted">{t("Affected visualizations: {0}", { 0: value.affected_visualizations.length })}</p>}
  </section>;
}
