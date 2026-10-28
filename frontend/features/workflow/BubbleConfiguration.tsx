"use client";
import { useI18n } from "@/lib/i18n";
import { bubbleDraft, type BubbleDraft } from "@/features/dashboard/bubble-draft";
import type { ResolvedColumn } from "./types";

export function BubbleConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const { t } = useI18n(), spec = bubbleDraft(config);
  const roles: { key: keyof Pick<BubbleDraft, "key_column_id" | "x_column_id" | "y_column_id" | "size_column_id" | "label_column_id" | "group_column_id">; label: string; numeric?: boolean; optional?: boolean }[] = [
    { key: "key_column_id", label: "Observation key" },
    { key: "x_column_id", label: "X measure", numeric: true },
    { key: "y_column_id", label: "Y measure", numeric: true },
    { key: "size_column_id", label: "Bubble area", numeric: true },
    { key: "label_column_id", label: "Observation label", optional: true },
    { key: "group_column_id", label: "Colour group", optional: true },
  ];
  return <section className="space-y-3 text-xs">
    <p>{t("Compare X and Y with a third measure encoded as area. Prepare one row per unique key upstream.")}</p>
    {roles.map(role => {
      const choices = (columns ?? []).filter(c => (role.numeric ? ["integer", "decimal", "float"] : ["string", "integer", "boolean", "date"]).includes(c.logical_type));
      return <label key={role.key} className="block">{t(role.label)}<select className="form-control" aria-label={t(role.label)} value={spec[role.key] ?? ""} onChange={event => onChange({ ...config, orientation: "vertical", spec: { ...spec, [role.key]: event.target.value || (role.optional ? null : "") } })}>
        <option value="">{t(role.optional ? "Not specified" : "Select field")}</option>
        {spec[role.key] && !choices.some(c => c.column_id === spec[role.key]) && <option value={spec[role.key]!}>{t("Unavailable field")}</option>}
        {choices.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}
      </select></label>;
    })}
    <p className="text-muted">{t("Area is proportional to a non-negative measure. Zero and missing observations stay in the exact table; scales use all selected rows.")}</p>
  </section>;
}
