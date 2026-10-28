"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { ResolvedColumn } from "./types";
import { type ConditionDraft, emptyCondition, loadConditionDraft, saveConditionDraft } from "./condition-draft";
import { removeDocumentDraft } from "@/features/workspace/document-drafts";

/** Only a numeric token, never an expression. Preserve digits; strip Python-invalid leading zeros. */
export function conditionNumber(value: string): string | null {
  const text = value.trim();
  if (text.length > 128 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) || !Number.isFinite(Number(text))) return null;
  return text.replace(/^([+-]?)0+(?=\d)/, "$1");
}

export function ConditionBuilder({ columns, onApply, onDirtyChange, exact = false, draftKey }: { columns: ResolvedColumn[]; onApply: (expression: string) => void; onDirtyChange?: (dirty: boolean) => void; exact?: boolean; draftKey?: string }) {
  const { t } = useI18n();
  const [initial] = useState(() => loadConditionDraft(draftKey, exact));
  const [values, setValues] = useState(initial.values), [baseline, setBaseline] = useState(initial.baseline);
  const [storageError, setStorageError] = useState(initial.error);
  const { field, operator, value, yes, no, kind } = values;
  const draft = JSON.stringify(values), appliedDraft = JSON.stringify(baseline);
  const update = (patch: Partial<ConditionDraft>) => {
    const next = { ...values, ...patch }; setValues(next);
    setStorageError(saveConditionDraft(draftKey, exact, next, baseline));
  };
  const setField = (field: string) => update({ field }), setOperator = (operator: string) => update({ operator }), setValue = (value: string) => update({ value });
  const setYes = (yes: string) => update({ yes }), setNo = (no: string) => update({ no }), setKind = (kind: string) => update({ kind });
  useEffect(() => { onDirtyChange?.(draft !== appliedDraft); }, [draft, appliedDraft, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const column = columns.find(item => item.column_id === field);
  const allowed = exact ? ["string", "integer", "decimal"] : ["string", "integer", "float"];
  const numeric = ["integer", "float", "decimal"].includes(column?.logical_type ?? "");
  const resultKind = exact ? "number" : kind;
  const valid = column && allowed.includes(column.logical_type) && (operator === "is_null" || (!numeric || conditionNumber(value) !== null)) && (resultKind === "string" || conditionNumber(yes) !== null && conditionNumber(no) !== null);
  const control = "my-2 w-full rounded border border-outline bg-control p-2 text-xs";
  return <details className="my-3"><summary>{t("Build a condition")}</summary>
    {draftKey && draft !== appliedDraft && <p role="status" className="my-2 text-sm text-muted">{t("This condition draft belongs to this node only. Review current fields before applying; it is not part of the saved formula yet.")}</p>}
    {storageError && <p role="alert" className="my-2 text-sm text-warning">{t(storageError)}</p>}
    <p className="my-2 text-xs text-muted">{t(exact ? "Condition results use this node's exact decimal precision and scale. Text fields can be compared, but results must be numbers." : "This legacy calculation uses approximate Float64 numbers. Choose Exact Calculated Column for exact monetary conditions and results.")}</p>
    <select aria-label={t("Condition field")} className={control} value={field} onChange={event => setField(event.target.value)}><option value="">{t("Select field")}</option>{columns.filter(item => allowed.includes(item.logical_type)).map(item => <option key={item.column_id} value={item.column_id}>{item.display_name}</option>)}</select>
    <select aria-label={t("Condition operator")} className={control} value={operator} onChange={event => setOperator(event.target.value)}>{["==", "!=", ">", ">=", "<", "<=", "is_null"].map(item => <option key={item}>{item}</option>)}</select>
    {operator !== "is_null" && <input aria-label={t("Condition value")} maxLength={4096} className={control} value={value} onChange={event => setValue(event.target.value)} />}
    <select aria-label={t("Result type")} className={control} value={resultKind} disabled={exact} onChange={event => setKind(event.target.value)}>{!exact && <option value="string">{t("Text")}</option>}<option value="number">{t("Number")}</option></select>
    <input aria-label={t("When true")} maxLength={4096} placeholder={t("When true")} className={control} value={yes} onChange={event => setYes(event.target.value)} />
    <input aria-label={t("Otherwise")} maxLength={4096} placeholder={t("Otherwise")} className={control} value={no} onChange={event => setNo(event.target.value)} />
    <button disabled={!valid} onClick={() => {
      if (!valid) return;
      const condition = operator === "is_null" ? `is_null([${field}])` : `[${field}] ${operator} ${numeric ? conditionNumber(value) : JSON.stringify(value)}`;
      onApply(`if_else(${condition}, ${resultKind === "string" ? JSON.stringify(yes) : conditionNumber(yes)}, ${resultKind === "string" ? JSON.stringify(no) : conditionNumber(no)})`);
      setBaseline(values);
      setStorageError(saveConditionDraft(draftKey, exact, values, values));
    }}>{t("Use condition")}</button>
    {draftKey && draft !== appliedDraft && <button className="ml-3" onClick={() => {
      try {
        removeDocumentDraft(draftKey);
        setValues(emptyCondition); setBaseline(emptyCondition); setStorageError(null);
      } catch { setStorageError("The local draft could not be removed. Nothing was discarded."); }
    }}>{t("Discard condition draft")}</button>}
  </details>;
}
