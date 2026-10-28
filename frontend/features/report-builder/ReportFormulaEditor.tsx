"use client";

import { Button } from "@/components/ui/button";
import { useDynamicListFocus } from "@/components/ui/useDynamicListFocus";
import { FormulaEditor } from "@/features/workflow/FormulaEditor";
import type { ResolvedColumn } from "@/features/workflow/types";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";

export type ReportFormula = components["schemas"]["ReportFormula"];
export const formulaFieldId = (formula: ReportFormula) => `calc_${formula.node_id.replaceAll("-", "")}`;

export function ReportFormulaEditor({ scope, formulas, columns, rowOutputs, onChange, disabled = false }: {
  scope: "row" | "summary" | "alignment"; formulas: ReportFormula[]; columns: ResolvedColumn[] | null;
  rowOutputs?: Record<string, ResolvedColumn[]>; onChange: (value: ReportFormula[]) => void; disabled?: boolean;
}) {
  const { t } = useI18n();
  const focus = useDynamicListFocus<HTMLInputElement>(formulas.length);
  const update = (index: number, value: Partial<ReportFormula>) => onChange(formulas.map((f, i) => i === index ? { ...f, ...value } : f));
  return <fieldset disabled={disabled} className="space-y-3 border-t border-outline pt-3">
    <legend className="font-semibold">{t(scope === "alignment" ? "Formulas after alignment" : scope === "row" ? "Formulas for each row" : "Formulas after totals")}</legend>
    <p className="text-sm text-muted">{t(scope === "alignment" ? "Calculate once per aligned key, without aggregating prepared values. Missing values remain empty. Use nullif or safe_divide for zero denominators; confirm that measure units are meaningful for your formula." : scope === "row" ? "Calculate each row before filters and aggregation. Each formula rounds its output once." : "Use aggregated measures, for example actual / plan. This is a ratio of totals, not an average of row ratios.")}</p>
    {formulas.map((formula, index) => <section key={formula.node_id} aria-label={t("Formula {0}", { 0: index + 1 })} className="space-y-2 rounded border border-outline p-3">
      <label className="block">{t("Formula name")}<input ref={el => focus.registerInput(index, el)} className="form-control" value={formula.name} onChange={e => update(index, { name: e.target.value })} /></label>
      <FormulaEditor exact expression={formula.expression} columns={index > 0 ? rowOutputs?.[formulas[index - 1].node_id] ?? columns : columns} onChange={expression => update(index, { expression })} />
      <label className="block">{t("Total digits (precision)")}<input className="form-control" type="number" min={1} max={38} value={formula.precision ?? 38} onChange={e => update(index, { precision: Number(e.target.value) })} /></label>
      <label className="block">{t("Decimal places")}<input className="form-control" type="number" min={0} max={formula.precision ?? 38} value={formula.scale ?? 2} onChange={e => update(index, { scale: Number(e.target.value) })} /></label>
      <Button variant="outline" onClick={() => { focus.afterRemove(index); onChange(formulas.filter((_, i) => i !== index)); }}>{t("Remove formula")}</Button>
    </section>)}
    <Button ref={el => focus.registerAddButton(el)} variant="outline" disabled={formulas.length >= 16} onClick={() => { focus.afterAdd(); onChange([...formulas, { node_id: crypto.randomUUID(), name: "", expression: "", precision: 38, scale: 2, rounding: "half_even" }]); }}>{t(scope === "alignment" ? "Add aligned formula" : scope === "row" ? "Add row formula" : "Add after-total formula")}</Button>
    <p className="text-xs text-muted">{t("Exact formulas use decimal or integer fields. Float64 is not silently converted. Check fields after editing row formulas or measures.")}</p>
  </fieldset>;
}
