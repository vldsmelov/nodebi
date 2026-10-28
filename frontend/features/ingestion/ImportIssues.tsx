"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import type { ImportPreview, ImportProfile } from "./api";

export type ImportCorrection = { fieldId: string; control: "type" | "key" };

export function ImportIssues({ preview, profile, onReview }: {
  preview: ImportPreview; profile: ImportProfile; onReview: (target: ImportCorrection) => void;
}) {
  const { t, cell, errorText } = useI18n();
  const fields = profile.fields.filter(field => preview.issues.some(issue => issue.field_id === field.field_id));
  const keyField = profile.fields.find(field => profile.key_fields?.includes(field.field_id));
  return <div className="space-y-3">
    <div role="alert"><p>{t("Issues found: {0}", { 0: cell(preview.issue_count) })}</p>
      {preview.issue_count > preview.issues.length && <p>{t("Showing {0} of {1} issues.", { 0: cell(preview.issues.length), 1: cell(preview.issue_count) })}</p>}
      <ul className="mt-2 list-disc pl-5">{preview.issues.map((issue, index) => {
        const location = [profile.fields.find(field => field.field_id === issue.field_id)?.name, issue.row ? t("Row {0}", { 0: cell(issue.row) }) : ""].filter(Boolean).join(" · ");
        return <li key={index}>{location && `${location}: `}{errorText({ message: issue.message, code: issue.code })}</li>;
      })}</ul>
    </div>
    <div className="flex flex-wrap gap-2">
      {fields.map(field => <Button key={field.field_id} variant="outline" onClick={() => onReview({ fieldId: field.field_id, control: "type" })}>{t("Review field: {0}", { 0: field.name })}</Button>)}
      {keyField && preview.issues.some(issue => issue.code === "INVALID_KEY") && <Button variant="outline" onClick={() => onReview({ fieldId: keyField.field_id, control: "key" })}>{t("Review row key")}</Button>}
    </div>
  </div>;
}
