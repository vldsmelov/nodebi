"use client";
import { useId, useRef, useState } from "react";
import { originLabel, type ProvenanceMap } from "./field-provenance";
import { useI18n } from "@/lib/i18n";
import type { GraphIssue, ResolvedColumn } from "./types";
import { formulaFieldLabel, formulaParts, replaceFormulaSelection } from "./formula-presentation";

export function FormulaEditor({ expression, columns, onChange, provenance, issues = [], validationPending = false }: { provenance?: ProvenanceMap; issues?: GraphIssue[]; validationPending?: boolean; expression: string; columns: ResolvedColumn[] | null; onChange: (expression: string) => void }) {
  const { t, errorText } = useI18n();
  const diagnosticsId = useId();
  const currentIssues = validationPending ? [] : issues;
  const textarea = useRef<HTMLTextAreaElement>(null);
  const selection = useRef<{ expression: string; start: number; end: number } | null>(null);
  const [search, setSearch] = useState("");
  const control = "mt-2 w-full rounded-lg border border-outline bg-control px-2 py-2 text-xs";
  const remember = () => { const input = textarea.current; if (input) selection.current = { expression, start: input.selectionStart, end: input.selectionEnd }; };
  const select = (start: number, end: number) => {
    textarea.current?.focus(); textarea.current?.setSelectionRange(start, end);
    selection.current = { expression, start, end };
  };
  const insert = (value: string) => {
    const range = selection.current?.expression === expression ? selection.current : { start: expression.length, end: expression.length };
    const next = replaceFormulaSelection(expression, value, range.start, range.end);
    onChange(next.expression);
    selection.current = { expression: next.expression, start: next.cursor, end: next.cursor };
    requestAnimationFrame(() => { textarea.current?.focus(); textarea.current?.setSelectionRange(next.cursor, next.cursor); });
  };
  const parts = formulaParts(expression, columns);
  const provenanceText = (id: string) => provenance?.[id]?.origins.map(originLabel).join("; ") ?? "";
  const referenced = [...new Map(parts.filter(part => part.column).map(part => [part.column!.column_id, part.column!])).values()];
  const visible = columns?.filter(column => `${column.display_name} ${column.engine_name} ${column.column_id} ${provenanceText(column.column_id)}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())) ?? [];
  return <div className="mt-3">
    <p className="text-xs text-muted">{t("Readable formula")}</p>
    <div aria-label={t("Readable formula")} className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-outline p-3 font-mono text-xs">
      {parts.map(part => part.reference ? <button key={part.start} type="button" title={part.column ? `${provenanceText(part.column.column_id) || part.column.engine_name} · ${part.reference}` : part.reference}
        className={`mx-0.5 rounded border px-1 py-0.5 ${part.column ? "border-outline bg-control text-accent" : "border-danger text-danger"}`}
        onClick={() => select(part.start, part.end)}>{part.column ? formulaFieldLabel(part.column, columns ?? []) : t(columns === null ? "Field schema unavailable: {0}" : "Missing field: {0}", { 0: part.reference })}{part.column ? ` · ${t(part.column.logical_type)}` : ""}</button> : <span key={part.start}>{part.text}</span>)}
      {!expression ? <span className="text-muted">{t("Select a field to start a formula.")}</span> : null}
    </div>
    <p className="mt-2 text-xs text-muted">{t("Click a field token, then choose another field to replace it. Edit operators and text below.")}</p>
    <label className="mt-3 block text-xs">{t("Expression")}<textarea ref={textarea} aria-label={t("Expression")} aria-describedby={diagnosticsId} className={control} rows={4} value={expression}
      onSelect={remember} onBlur={remember} onChange={event => { selection.current = { expression: event.target.value, start: event.target.selectionStart, end: event.target.selectionEnd }; onChange(event.target.value); }} placeholder={t("quantity * price")} /></label>
    <div id={diagnosticsId} aria-live="polite" className="mt-2 text-xs">
      {validationPending ? <p className="text-muted">{t("Formula checks update after saving.")}</p> : currentIssues.map((issue, index) => <p key={index} role="alert" className="text-danger">{errorText(issue)}</p>)}
    </div>
    <input aria-label={t("Find formula field")} className={control} value={search} onChange={event => setSearch(event.target.value)} placeholder={t("Find formula field")} />
    <select aria-label={t("Insert formula field")} className={control} value="" disabled={columns === null} onChange={event => { if (event.target.value) insert(`[${event.target.value}]`); }}>
      <option value="">{t("Select field")}</option>{visible.map(column => <option key={column.column_id} value={column.column_id}>{formulaFieldLabel(column, columns ?? [])} · {t(column.logical_type)}{provenanceText(column.column_id) ? ` / ${provenanceText(column.column_id)}` : ""}</option>)}
    </select>
    {provenance && referenced.length > 0 ? <details className="mt-3 text-xs" open><summary>{t("Field sources")}</summary>
      <dl className="mt-2 space-y-2">{referenced.map(column => { const item = provenance[column.column_id]; return <div key={column.column_id}>
        <dt className="font-medium">{formulaFieldLabel(column, columns ?? [])}</dt>
        {item?.origins.map((origin, index) => <dd key={index} className="break-words text-muted">{originLabel(origin)}</dd>)}
        {!item?.complete ? <dd className="text-muted">{t("Source details unavailable.")}</dd> : !item.origins.length ? <dd className="text-muted">{t("No source value fields.")}</dd> : null}
      </div>; })}</dl>
    </details> : null}
    <details className="mt-3 text-xs"><summary>{t("Formula function help")}</summary>
      <p className="mt-2">{t("Functions run on the server. Arguments must have compatible types.")}</p>
      <ul className="mt-2 space-y-2">{["if_else(condition, value, otherwise)", "is_null(value)", "contains(text, pattern)", "replace(text, old, new)", "extract(text, regex)", "to_number(text)", "to_date(text, format)", "year(date)", "month(date)", "round(value, decimals)", "abs(value)", "minimum(a, b)", "maximum(a, b)", "trim(text)", "lower(text)", "coalesce(value, fallback)", "nullif(value, other)", "safe_divide(numerator, denominator, fallback)"].map(signature => <li key={signature}><code>{signature}</code></li>)}</ul>
    </details>
  </div>;
}
