"use client";
import { useI18n } from "@/lib/i18n";
import { useDynamicListFocus } from "@/components/ui/useDynamicListFocus";
import type { ResolvedColumn } from "./types";

type Measure = { output_id: string; name: string; operation: string; column_id?: string | null; denominator_column_id?: string | null; scale?: number };
const operations = [["sum", "Sum"], ["average", "Average"], ["min", "Minimum"], ["max", "Maximum"], ["count", "Count numeric values"], ["count_rows", "Count source rows"], ["ratio_of_sums", "Ratio of sums"]] as const;

export function TableRollupConfiguration({ config, columns, onChange, hierarchyOnly = false }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void; hierarchyOnly?: boolean }) {
  const { t } = useI18n();
  const dimensions = (config.dimensions ?? []) as string[], measures = (config.measures ?? []) as Measure[];
  const dimensionFocus = useDynamicListFocus<HTMLSelectElement>(dimensions.length);
  const measureFocus = useDynamicListFocus<HTMLInputElement>(measures.length);
  const categories = (columns ?? []).filter(c => ["string", "integer", "boolean", "date"].includes(c.logical_type));
  const numeric = (columns ?? []).filter(c => ["integer", "decimal", "float"].includes(c.logical_type));
  const update = (index: number, patch: Partial<Measure>) => onChange({ ...config, measures: measures.map((item, i) => i === index ? { ...item, ...patch } : item) });
  const reorder = (kind: "dimensions" | "measures", index: number, delta: number) => {
    const items = [...(kind === "dimensions" ? dimensions : measures)];
    [items[index], items[index + delta]] = [items[index + delta], items[index]];
    (kind === "dimensions" ? dimensionFocus : measureFocus).afterMove(index + delta);
    onChange({ ...config, [kind]: items });
  };
  const choices = (selected: string | null | undefined, fields: ResolvedColumn[]) => <><option value="">{t("Select field")}</option>{selected && !fields.some(c => c.column_id === selected) && <option value={selected}>{t("Unavailable field")}</option>}{fields.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}</>;
  return <section className="mt-5 space-y-3"><h2>{t(hierarchyOnly ? "Grouping hierarchy" : "Analytical table totals")}</h2>
    <p className="text-sm text-muted">{t(hierarchyOnly ? "Choose grouping levels and one sum or count; hierarchy requires all totals." : "Prepare hierarchy and totals from source observations. Averages use non-empty counts; ratios divide separate sums, never add percentages.")}</p>
    <p className="text-xs text-muted">{t("If the input already contains averages or percentages, return to the underlying amounts and counts before calculating totals.")}</p>
    <fieldset className="space-y-2"><legend>{t("Grouping hierarchy")}</legend>{dimensions.map((id, index) => <div key={index}>
      <select ref={element => dimensionFocus.registerInput(index, element)} className="form-control" aria-label={t("Rollup dimension {0}", { 0: index + 1 })} value={id} onChange={e => onChange({ ...config, dimensions: dimensions.map((item, i) => i === index ? e.target.value : item) })}>{choices(id, categories.filter(c => c.column_id === id || !dimensions.includes(c.column_id)))}</select>
      <div className="flex gap-3 text-xs"><button type="button" aria-label={t("Move rollup dimension {0} up", { 0: index + 1 })} disabled={index === 0} onClick={() => reorder("dimensions", index, -1)}>↑</button><button type="button" aria-label={t("Move rollup dimension {0} down", { 0: index + 1 })} disabled={index === dimensions.length - 1} onClick={() => reorder("dimensions", index, 1)}>↓</button><button type="button" aria-label={t("Remove rollup dimension {0}", { 0: index + 1 })} onClick={() => { dimensionFocus.afterRemove(index); onChange({ ...config, dimensions: dimensions.filter((_, i) => i !== index) }); }}>{t("Remove")}</button></div>
    </div>)}<button ref={element => dimensionFocus.registerAddButton(element)} type="button" disabled={dimensions.length >= 8} onClick={() => { dimensionFocus.afterAdd(); onChange({ ...config, dimensions: [...dimensions, ""] }); }}>{t("Add grouping level")}</button></fieldset>
    <label className="flex gap-2 text-xs"><input type="checkbox" disabled={hierarchyOnly} checked={config.subtotals !== false} onChange={e => onChange({ ...config, subtotals: e.target.checked })} />{t("Include intermediate totals")}</label>
    <label className="flex gap-2 text-xs"><input type="checkbox" disabled={hierarchyOnly} checked={config.grand_total !== false} onChange={e => onChange({ ...config, grand_total: e.target.checked })} />{t("Include grand total")}</label>
    {measures.map((measure, index) => <fieldset key={measure.output_id} className="space-y-2 rounded border border-outline p-2"><legend>{t("Rollup measure {0}", { 0: index + 1 })}</legend>
      <label className="block text-xs">{t("Rollup measure name {0}", { 0: index + 1 })}<input ref={element => measureFocus.registerInput(index, element)} className="form-control" aria-label={t("Rollup measure name {0}", { 0: index + 1 })} maxLength={200} value={measure.name} onChange={e => update(index, { name: e.target.value })} /></label>
      <label className="block text-xs">{t("Rollup operation {0}", { 0: index + 1 })}<select className="form-control" aria-label={t("Rollup operation {0}", { 0: index + 1 })} value={measure.operation} onChange={e => update(index, { operation: e.target.value, ...(e.target.value === "count_rows" ? { column_id: null } : {}), ...(e.target.value !== "ratio_of_sums" ? { denominator_column_id: null } : {}) })}><option value="">{t("Choose aggregation explicitly")}</option>{operations.filter(([value]) => !hierarchyOnly || ["sum", "count", "count_rows"].includes(value)).map(([value, label]) => <option value={value} key={value}>{t(label)}</option>)}</select></label>
      {measure.operation !== "count_rows" && <label className="block text-xs">{t("Rollup value {0}", { 0: index + 1 })}<select className="form-control" aria-label={t("Rollup value {0}", { 0: index + 1 })} value={measure.column_id ?? ""} onChange={e => update(index, { column_id: e.target.value })}>{choices(measure.column_id, numeric)}</select></label>}
      {measure.operation === "ratio_of_sums" && <label className="block text-xs">{t("Rollup denominator {0}", { 0: index + 1 })}<select className="form-control" aria-label={t("Rollup denominator {0}", { 0: index + 1 })} value={measure.denominator_column_id ?? ""} onChange={e => update(index, { denominator_column_id: e.target.value })}>{choices(measure.denominator_column_id, numeric)}</select></label>}
      {["average", "ratio_of_sums"].includes(measure.operation) && <label className="block text-xs">{t("Rollup decimal places {0}", { 0: index + 1 })}<input className="form-control" aria-label={t("Rollup decimal places {0}", { 0: index + 1 })} type="number" min={0} max={18} step={1} value={measure.scale ?? 6} onChange={e => update(index, { scale: Number(e.target.value) })} /></label>}
      <div className="flex gap-3 text-xs"><button type="button" aria-label={t("Move rollup measure {0} up", { 0: index + 1 })} disabled={index === 0} onClick={() => reorder("measures", index, -1)}>↑</button><button type="button" aria-label={t("Move rollup measure {0} down", { 0: index + 1 })} disabled={index === measures.length - 1} onClick={() => reorder("measures", index, 1)}>↓</button><button type="button" disabled={measures.length <= 1} onClick={() => { measureFocus.afterRemove(index); onChange({ ...config, measures: measures.filter((_, i) => i !== index) }); }}>{t("Remove")}</button></div>
    </fieldset>)}
    <button ref={element => measureFocus.registerAddButton(element)} type="button" disabled={measures.length >= (hierarchyOnly ? 1 : 16)} onClick={() => { measureFocus.afterAdd(); onChange({ ...config, measures: [...measures, { output_id: crypto.randomUUID(), name: "", operation: "", column_id: null, denominator_column_id: null, scale: 6 }] }); }}>{t("Add rollup measure")}</button>
    {!hierarchyOnly && <p className="text-xs text-muted">{t("Ratios use independent non-empty numerator and denominator sums; a zero or missing denominator stays empty. Exact averages and ratios use half-even rounding.")}</p>}
    <p className="text-xs text-muted">{t(hierarchyOnly ? "Hierarchy charts support up to 5000 complete nodes. Group or filter upstream." : "Groups follow first occurrence, with subtotals after their children and grand total last. Null groups differ from total rows. Up to 20000 output rows including totals.")}</p>
  </section>;
}
