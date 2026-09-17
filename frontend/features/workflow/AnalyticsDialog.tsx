"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { analyticsPlan, type AnalyticsOptions } from "./analytics-plan";
import type { ResolvedColumn, WorkflowNode, WorkflowParameter } from "./types";
import type { PlannedStep } from "./unary-chain";
export function AnalyticsDialog({ columns, parameters, filters, sourceLabel, apply, close }: {
  columns: ResolvedColumn[]; parameters: WorkflowParameter[]; filters: WorkflowNode[]; sourceLabel: string;
  apply: (steps: PlannedStep[]) => boolean; close: () => void;
}) {
  const { t, nodeName } = useI18n(); const dialog = useRef<HTMLDialogElement>(null);
  const [options, setOptions] = useState<AnalyticsOptions>({ mode: "share", value: "", partitions: [], name: "", denominatorName: "", zero: "null", tie: "", direction: "descending", filterField: "", parameter: "" });
  const [changed, setChanged] = useState(false), [failed, setFailed] = useState(false);
  const update = (patch: Partial<AnalyticsOptions>) => { setChanged(true); setOptions(current => ({ ...current, ...patch })); };
  const steps = useMemo(() => analyticsPlan(columns, options, parameters), [columns, options, parameters]);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (changed) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [changed]);
  const cancel = () => { if (!changed || window.confirm(t("Discard unapplied analytical operation?"))) close(); };
  const control = "mt-1 w-full rounded border border-outline bg-control p-2 text-sm";
  const fieldSelect = (label: string, value: string, choices: ResolvedColumn[], change: (id: string) => void) => <label className="block text-sm">{t(label)}<select aria-label={t(label)} className={control} value={value} onChange={event => change(event.target.value)}><option value="">{t("Select field")}</option>{choices.map(column => <option key={column.column_id} value={column.column_id}>{column.display_name}</option>)}</select></label>;
  return <dialog ref={dialog} aria-label={t("Share and rank")} onCancel={event => { event.preventDefault(); cancel(); }} onKeyDown={event => event.stopPropagation()} className="m-auto max-h-[90vh] w-[min(760px,94vw)] overflow-auto rounded-xl border border-outline bg-panel p-6 text-foreground backdrop:bg-black/60">
    <h2 className="text-lg">{t("Share and rank")}</h2><p className="my-2 text-sm">{t("Input")}: {sourceLabel}</p>
    <p className="my-2 text-sm text-muted">{t("All rows means this input, including its upstream filters. It does not mean the entire workbook.")}</p>
    {filters.length > 0 && <div className="my-3 rounded border border-outline p-3 text-xs"><p>{t("Upstream filters affect this calculation:")}</p><ul>{filters.map(filter => <li key={filter.id} className="break-words">{String(filter.ui?.label || filter.id)}: {Array.isArray(filter.config?.conditions) ? filter.config.conditions.map((condition: { parameter?: string; column_id?: string }, index: number) => <span key={index}> {condition.column_id} {condition.parameter ? `(${condition.parameter})` : `(${t("Literal value")})`}; </span>) : null}</li>)}</ul></div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label>{t("Operation")}<select aria-label={t("Operation")} className={control} value={options.mode} onChange={event => update({ mode: event.target.value as AnalyticsOptions["mode"] })}><option value="share">{t("Share")}</option><option value="rank">{t("Row rank")}</option></select></label>
      {fieldSelect("Value field", options.value, columns.filter(column => ["integer", "float"].includes(column.logical_type)), value => update({ value }))}
      <label>{t("Output field name")}<input aria-label={t("Output field name")} className={control} value={options.name} onChange={event => update({ name: event.target.value })}/></label>
      {options.mode === "share" ? <><label>{t("Denominator field name")}<input aria-label={t("Denominator field name")} className={control} value={options.denominatorName} onChange={event => update({ denominatorName: event.target.value })}/></label>
        <label>{t("Zero or missing denominator")}<select aria-label={t("Zero or missing denominator")} className={control} value={options.zero} onChange={event => update({ zero: event.target.value as AnalyticsOptions["zero"] })}><option value="null">{t("Keep nulls")}</option><option value="zero">{t("Return zero")}</option></select></label></> : <>
        {fieldSelect("Tie-break field", options.tie, columns.filter(column => column.column_id !== options.value && column.logical_type !== "unknown"), tie => update({ tie }))}
        <label>{t("Sort direction")}<select aria-label={t("Sort direction")} className={control} value={options.direction} onChange={event => update({ direction: event.target.value as AnalyticsOptions["direction"] })}><option value="descending">{t("Descending")}</option><option value="ascending">{t("Ascending")}</option></select></label></>}
    </div>
    <fieldset className="my-4"><legend>{t("Partition fields (none = all input rows)")}</legend><div className="flex flex-wrap gap-3">{columns.map(column => <label key={column.column_id} className="text-sm"><input type="checkbox" checked={options.partitions.includes(column.column_id)} onChange={event => update({ partitions: event.target.checked ? [...options.partitions, column.column_id] : options.partitions.filter(id => id !== column.column_id) })}/> {column.display_name}</label>)}</div></fieldset>
    <p className="my-2 text-xs text-muted">{t(options.mode === "share" ? "The denominator is the sum within the selected input or group. Shares remain ratios; use percent formatting in charts." : "Ranks are row positions. The tie-break field sorts ascending and should uniquely identify rows; remaining ties preserve input order.")}</p>
    <fieldset className="my-4 grid gap-3 sm:grid-cols-2"><legend className="mb-2">{t("Optional selection after calculation")}</legend>
      {fieldSelect("Selection field", options.filterField, columns, filterField => update({ filterField, parameter: "" }))}
      <label>{t("Parameter")}<select aria-label={t("Parameter")} className={control} value={options.parameter} onChange={event => update({ parameter: event.target.value })}><option value="">{t("No selection")}</option>{parameters.filter(parameter => { const type = columns.find(column => column.column_id === options.filterField)?.logical_type; return type === parameter.logical_type || type === "float" && parameter.logical_type === "integer"; }).map(parameter => <option key={parameter.name} value={parameter.name}>{parameter.label || parameter.name}</option>)}</select></label>
    </fieldset>
    <p className="my-2 text-sm">{t("Totals and ranks are calculated before this optional selection. Leave selection empty to keep all comparison rows.")}</p>
    <h3 className="mt-4 font-medium">{t("Nodes to create")}</h3>{steps ? <ol className="my-2 list-inside list-decimal text-sm">{steps.map(step => <li key={step.id}>{nodeName(step.type)} {step.fields?.join(", ")}</li>)}</ol> : <p role="status" className="my-2 text-warning">{t("Choose fields and unique output names. Complete both selection controls or leave both empty.")}</p>}
    {failed && <p role="alert">{t("The graph changed. Close the table and reopen it before applying.")}</p>}
    <div className="sticky -bottom-6 -mx-6 -mb-6 mt-4 flex gap-4 border-t border-outline bg-panel p-4"><button className="rounded bg-primary p-2 text-on-primary disabled:opacity-40" disabled={!steps} onClick={() => { if (steps && apply(steps)) close(); else setFailed(true); }}>{t("Apply analytical operation")}</button><button onClick={cancel}>{t("Cancel")}</button></div>
  </dialog>;
}
