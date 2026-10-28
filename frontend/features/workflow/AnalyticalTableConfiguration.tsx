"use client";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import { TableColumns } from "./TableColumns";
import type { ResolvedColumn } from "./types";

type Spec = components["schemas"]["AnalyticalTableSpec"];
type Rule = components["schemas"]["TableFormatRule"];
export function AnalyticalTableConfiguration({ config, columns, onChange }: {
  config: Record<string, unknown>; columns: ResolvedColumn[] | null;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const { t } = useI18n(), spec = config.spec as Spec | undefined;
  if (!spec || spec.type !== "analytical_table") return <p>{t("Select the dataset publication of an Analytical table totals node.")}</p>;
  const measures = columns?.filter(c => spec.measures.includes(c.column_id)) ?? [];
  const selected = spec.visible_measures ?? spec.measures;
  const update = (patch: Partial<Spec>) => onChange({ ...config, spec: { ...spec, ...patch } });
  const rules = spec.rules ?? [];
  const patchRule = (index: number, patch: Partial<Rule>) => update({ rules: rules.map((r, i) => i === index ? { ...r, ...patch } : r) });
  const control = "mt-1 w-full rounded border border-outline bg-control p-2 text-xs";
  return <fieldset className="mt-4 space-y-3"><legend>{t("Analytical table")}</legend>
    <p className="text-xs text-muted">{t("Totals use all selected observations, not this page. Change grouping and calculations in Analytical table totals. The first matching rule wins; empty values are not zero.")}</p>
    <TableColumns columns={measures} selected={selected} onChange={visible_measures => update({ visible_measures, pinned_columns: Math.min(spec.pinned_columns ?? 0, spec.dimensions.length + visible_measures.length) })} />
    <label className="block text-xs">{t("Pinned data columns")}<select aria-label={t("Pinned data columns")} className={control} value={spec.pinned_columns ?? 0} onChange={e => update({ pinned_columns: Number(e.target.value) })}>{Array.from({ length: Math.min(4, spec.dimensions.length + selected.length) + 1 }, (_, i) => <option key={i} value={i}>{i}</option>)}</select></label>
    <label className="block text-xs">{t("Table density")}<select aria-label={t("Table density")} className={control} value={spec.density ?? "normal"} onChange={e => update({ density: e.target.value as Spec["density"] })}><option value="normal">{t("Normal")}</option><option value="compact">{t("Compact")}</option></select></label>
    <h3 className="text-sm">{t("Conditional formatting")}</h3>
    {rules.map((rule, index) => <fieldset key={rule.id} className="space-y-2 rounded border border-outline p-3"><legend>{t("Formatting rule {0}", { 0: index + 1 })}</legend>
      <label className="block text-xs">{t("Rule label")}<input className={control} maxLength={80} value={rule.label} onChange={e => patchRule(index, { label: e.target.value })} /></label>
      <label className="block text-xs">{t("Measure")}<select aria-label={t("Measure")} className={control} value={rule.column_id} onChange={e => patchRule(index, { column_id: e.target.value })}>{measures.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}</select></label>
      <label className="block text-xs">{t("Condition")}<select aria-label={t("Condition")} className={control} value={rule.operator} onChange={e => patchRule(index, { operator: e.target.value as Rule["operator"], threshold: e.target.value === "is_empty" ? null : rule.threshold ?? "0", upper: e.target.value === "between" ? rule.threshold ?? "0" : null })}>{["lt", "lte", "eq", "gte", "gt", "between", "is_empty"].map((op, i) => <option key={op} value={op}>{["<", "≤", "=", "≥", ">", t("Between inclusive"), t("Is empty")][i]}</option>)}</select></label>
      {rule.operator !== "is_empty" && <label className="block text-xs">{t("Exact threshold")}<input className={control} inputMode="decimal" maxLength={78} value={rule.threshold ?? ""} onChange={e => patchRule(index, { threshold: e.target.value })} /></label>}
      {rule.operator === "between" && <label className="block text-xs">{t("Upper threshold")}<input className={control} inputMode="decimal" maxLength={78} value={rule.upper ?? ""} onChange={e => patchRule(index, { upper: e.target.value })} /></label>}
      <label className="block text-xs">{t("Apply rule to")}<select aria-label={t("Apply rule to")} className={control} value={rule.scope ?? "all"} onChange={e => patchRule(index, { scope: e.target.value as Rule["scope"] })}>{["all", "details", "totals"].map((scope, i) => <option key={scope} value={scope}>{t(["All rows", "Detail rows", "Total rows"][i])}</option>)}</select></label>
      <label className="block text-xs">{t("Rule tone")}<select aria-label={t("Rule tone")} className={control} value={rule.tone ?? "neutral"} onChange={e => patchRule(index, { tone: e.target.value as Rule["tone"] })}>{["neutral", "positive", "warning", "negative"].map((tone, i) => <option key={tone} value={tone}>{t(["Neutral", "Positive", "Warning", "Negative"][i])}</option>)}</select></label>
      <div className="flex gap-3">{[-1, 1].map(direction => <button key={direction} aria-label={t(direction < 0 ? "Move rule up" : "Move rule down")} disabled={index + direction < 0 || index + direction >= rules.length} onClick={() => { const next = [...rules]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; update({ rules: next }); }}>{direction < 0 ? "↑" : "↓"}</button>)}<button onClick={() => update({ rules: rules.filter(r => r.id !== rule.id) })}>{t("Remove")}</button></div>
    </fieldset>)}
    <button disabled={rules.length >= 20 || !measures.length} onClick={() => update({ rules: [...rules, { id: crypto.randomUUID(), column_id: measures[0].column_id, label: t("Attention"), operator: "lt", threshold: "0", upper: null, scope: "all", tone: "warning" }] })}>{t("Add formatting rule")}</button>
  </fieldset>;
}
