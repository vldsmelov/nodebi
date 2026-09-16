"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { FormulaEditor } from "./FormulaEditor";
import { type CalculatedRow, rowColumns, validRows } from "./calculated-chain";
import type { ResolvedColumn } from "./types";

export function CalculatedFieldsDialog({ initial, columns, editing, apply, close }: {
  initial: CalculatedRow[]; columns: ResolvedColumn[]; editing: boolean;
  apply: (rows: CalculatedRow[]) => boolean; close: () => void;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState(initial), [failed, setFailed] = useState(false);
  const changed = JSON.stringify(rows) !== JSON.stringify(initial);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (changed) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [changed]);
  const cancel = () => { if (!changed || window.confirm(t("Discard unapplied calculated fields?"))) close(); };
  const update = (index: number, patch: Partial<CalculatedRow>) => setRows(current => current.map((row, i) => i === index ? { ...row, ...patch } : row));
  const move = (index: number, offset: number) => setRows(current => { const next = [...current]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next; });
  const valid = validRows(rows, columns);
  return <dialog ref={dialog} onKeyDown={event => event.stopPropagation()} aria-label={t("Calculated fields table")} onCancel={event => { event.preventDefault(); cancel(); }} className="m-auto max-h-[90vh] w-[min(1100px,94vw)] overflow-auto rounded-xl border border-outline bg-panel p-6 text-foreground backdrop:bg-black/60">
    <h2 className="text-lg">{t("Calculated fields table")}</h2>
    <p className="my-3 text-sm text-muted">{t("Rows become ordinary Calculated Column nodes in this order. Later rows can use earlier results. Nothing is applied until you confirm.")}</p>
    {editing && <p className="my-2 text-xs text-muted">{t("Editing the current chain: node IDs, order and connections are preserved. Change structure on the canvas.")}</p>}
    <table className="w-full table-fixed text-sm"><thead><tr><th className="w-1/4 text-left">{t("Output field name")}</th><th className="text-left">{t("Expression")}</th><th className="w-24">{t("Order")}</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.id} className="border-t border-outline align-top"><td className="p-2"><label className="text-xs">{index + 1}<input aria-label={t("Calculated field name {0}", { 0: index + 1 })} className="mt-2 w-full rounded border border-outline bg-control p-2" value={row.name} maxLength={255} onChange={event => update(index, { name: event.target.value })} /></label></td>
        <td className="p-2"><FormulaEditor expression={row.expression} columns={rowColumns(columns, rows.slice(0, index))} onChange={expression => update(index, { expression })} /></td>
        <td className="space-y-2 p-2">{!editing && <><button className="disabled:opacity-40" disabled={index === 0} onClick={() => move(index, -1)}>{t("Move up")}</button><button className="disabled:opacity-40" disabled={index === rows.length - 1} onClick={() => move(index, 1)}>{t("Move down")}</button><button onClick={() => setRows(current => current.filter(item => item.id !== row.id))}>{t("Remove")}</button></>}</td>
      </tr>)}</tbody></table>
    {!editing && <button className="my-3 rounded border border-outline p-2" disabled={rows.length >= 20} onClick={() => setRows(current => [...current, { id: crypto.randomUUID(), name: "", expression: "" }])}>{t("Add calculated field")}</button>}
    <p className="my-3 text-xs text-muted">{t("Previous results have unknown types until the server checks the saved chain. Review schema and preview after applying.")}</p>
    {!valid && <p role="status" className="my-3 text-xs text-warning">{t("Enter unique names and expressions. Field references must point to the input or earlier rows. Maximum 20 rows.")}</p>}
    {failed && <p role="alert">{t("The graph changed. Close the table and reopen it before applying.")}</p>}
    <div className="sticky -bottom-6 -mx-6 -mb-6 flex gap-4 border-t border-outline bg-panel p-4"><button className="rounded bg-primary p-2 text-on-primary disabled:opacity-40" disabled={!valid} onClick={() => { if (apply(rows)) close(); else setFailed(true); }}>{t("Apply calculated fields")}</button><button onClick={cancel}>{t("Cancel")}</button></div>
  </dialog>;
}
