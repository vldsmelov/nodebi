"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { ResolvedColumn } from "./types";
import type { PlannedStep } from "./unary-chain";
import { conversionTypes, preparationPlan, preparationRows, type PreparationRow } from "./preparation-plan";

export function PreparationDialog({ columns, apply, close }: { columns: ResolvedColumn[]; apply: (steps: PlannedStep[]) => boolean; close: () => void }) {
  const { t, nodeName } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState(() => preparationRows(columns)), [failed, setFailed] = useState(false);
  const changed = JSON.stringify(rows) !== JSON.stringify(preparationRows(columns));
  const steps = useMemo(() => preparationPlan(columns, rows), [columns, rows]);
  useEffect(() => { ref.current?.showModal(); }, []);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (changed) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [changed]);
  const cancel = () => { if (!changed || window.confirm(t("Discard unapplied preparation changes?"))) close(); };
  const update = (index: number, patch: Partial<PreparationRow>) => setRows(current => current.map((row, i) => i === index ? { ...row, ...patch } : row));
  const control = "w-full rounded border border-outline bg-control p-2 text-xs disabled:opacity-40";
  return <dialog ref={ref} aria-label={t("Prepare data table")} onKeyDown={event => event.stopPropagation()} onCancel={event => { event.preventDefault(); cancel(); }} className="m-auto max-h-[90vh] w-[min(1200px,96vw)] overflow-auto rounded-xl border border-outline bg-panel p-6 text-foreground backdrop:bg-black/60">
    <h2 className="text-lg">{t("Prepare data table")}</h2>
    <p className="my-3 text-sm text-muted">{t("Create a new branch from the selected output. Existing downstream connections stay unchanged. Review the ordinary nodes before applying.")}</p>
    <p className="my-3 text-xs text-muted">{t("Types are converted before missing-value handling. Invalid text fails by default; converting errors to null is an explicit choice. Empty text is not null.")}</p>
    <table className="w-full text-left text-xs"><thead><tr>{["Keep", "Source field", "Output field name", "Target type", "Conversion errors", "Missing values"].map(label => <th key={label} className="p-2">{t(label)}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => { const column = columns[index], type = row.target || column.logical_type; return <tr key={row.id} className="border-t border-outline">
        <td className="p-2"><input aria-label={t("Keep field {0}", { 0: index + 1 })} type="checkbox" checked={row.keep} onChange={event => update(index, { keep: event.target.checked })} /></td>
        <td className="max-w-52 break-words p-2" title={`${column.engine_name} · ${column.column_id}`}>{column.display_name}<p className="text-muted">{t(column.logical_type)}</p></td>
        <td className="p-2"><input aria-label={t("Prepared name {0}", { 0: index + 1 })} className={control} maxLength={255} value={row.name} disabled={!row.keep} onChange={event => update(index, { name: event.target.value })} /></td>
        <td className="p-2"><select aria-label={t("Prepared type {0}", { 0: index + 1 })} className={control} value={row.target} disabled={!row.keep} onChange={event => update(index, { target: event.target.value, nulls: "keep" })}><option value="">{t("Keep type")}</option>{conversionTypes.map(type => <option key={type} value={type}>{t(type)}</option>)}</select></td>
        <td className="p-2"><select aria-label={t("Prepared errors {0}", { 0: index + 1 })} className={control} value={row.onError} disabled={!row.keep || !row.target} onChange={event => update(index, { onError: event.target.value as "error" | "null" })}><option value="error">{t("Stop on error")}</option><option value="null">{t("Invalid value to null")}</option></select></td>
        <td className="p-2"><select aria-label={t("Prepared missing {0}", { 0: index + 1 })} className={control} value={row.nulls} disabled={!row.keep} onChange={event => update(index, { nulls: event.target.value as PreparationRow["nulls"] })}><option value="keep">{t("Keep nulls")}</option><option value="drop">{t("Drop rows with null")}</option>{["integer", "float"].includes(type) && <option value="zero">{t("Replace null with zero")}</option>}{type === "string" && <option value="empty">{t("Replace null with empty text")}</option>}</select></td>
      </tr>; })}</tbody></table>
    <h3 className="mt-5 font-medium">{t("Nodes to create")}</h3>
    {steps ? <ol className="my-3 list-inside list-decimal text-xs">{steps.map(step => <li key={step.id} className="py-1">{nodeName(step.type)} — {step.fields?.join(", ")}</li>)}</ol> : <p role="status" className="my-3 text-warning">{t("Keep at least one field, use unique output names and compatible missing-value policies. At most 20 fields can be filled per batch.")}</p>}
    <p className="my-3 text-xs text-muted">{t("Filled fields are new calculated columns with new identities. Integer filling preserves exact integers. Edit the generated steps on the canvas after applying.")}</p>
    {failed && <p role="alert">{t("The graph changed. Close the table and reopen it before applying.")}</p>}
    <div className="sticky -bottom-6 -mx-6 -mb-6 flex gap-4 border-t border-outline bg-panel p-4"><button className="rounded bg-primary p-2 text-on-primary disabled:opacity-40" disabled={!steps} onClick={() => { if (steps && apply(steps)) close(); else setFailed(true); }}>{t("Apply preparation")}</button><button onClick={cancel}>{t("Cancel")}</button></div>
  </dialog>;
}
