"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { ResolvedColumn } from "./types";

export function ConditionBuilder({ columns, onApply }: { columns: ResolvedColumn[]; onApply: (expression: string) => void }) {
  const { t } = useI18n();
  const [field, setField] = useState(""), [operator, setOperator] = useState("=="), [value, setValue] = useState("");
  const [yes, setYes] = useState(""), [no, setNo] = useState(""), [kind, setKind] = useState("string");
  const column = columns.find(item => item.column_id === field);
  const numeric = ["integer", "float"].includes(column?.logical_type ?? "");
  const number = (text: string) => text.trim() !== "" && Number.isFinite(Number(text));
  const valid = column && (operator === "is_null" || (!numeric || number(value))) && (kind === "string" || number(yes) && number(no));
  const control = "my-2 w-full rounded border border-outline bg-control p-2 text-xs";
  return <details className="my-3"><summary>{t("Build a condition")}</summary>
    <select aria-label={t("Condition field")} className={control} value={field} onChange={event => setField(event.target.value)}><option value="">{t("Select field")}</option>{columns.filter(item => ["string", "integer", "float"].includes(item.logical_type)).map(item => <option key={item.column_id} value={item.column_id}>{item.display_name}</option>)}</select>
    <select aria-label={t("Condition operator")} className={control} value={operator} onChange={event => setOperator(event.target.value)}>{["==", "!=", ">", ">=", "<", "<=", "is_null"].map(item => <option key={item}>{item}</option>)}</select>
    {operator !== "is_null" && <input aria-label={t("Condition value")} className={control} value={value} onChange={event => setValue(event.target.value)} />}
    <select aria-label={t("Result type")} className={control} value={kind} onChange={event => setKind(event.target.value)}><option value="string">{t("Text")}</option><option value="number">{t("Number")}</option></select>
    <input aria-label={t("When true")} placeholder={t("When true")} className={control} value={yes} onChange={event => setYes(event.target.value)} />
    <input aria-label={t("Otherwise")} placeholder={t("Otherwise")} className={control} value={no} onChange={event => setNo(event.target.value)} />
    <button disabled={!valid} onClick={() => {
      const condition = operator === "is_null" ? `is_null([${field}])` : `[${field}] ${operator} ${numeric ? Number(value) : JSON.stringify(value)}`;
      onApply(`if_else(${condition}, ${kind === "string" ? JSON.stringify(yes) : Number(yes)}, ${kind === "string" ? JSON.stringify(no) : Number(no)})`);
    }}>{t("Use condition")}</button>
  </details>;
}
