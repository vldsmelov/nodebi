"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { FormulaEditor } from "./FormulaEditor";
import type { DataSource } from "@/features/data-sources/api";
import type { GraphDraft } from "./autosave";
import type { WorkflowSchemaResult } from "./types";

export type TableEndpoint = { nodeId: string; port: string };
export function TableStepDialog({ mode, source, graph, schema, sources = [], close, apply }: {
  mode: "join" | "calculate"; source: TableEndpoint; graph: GraphDraft; schema: WorkflowSchemaResult;
  sources?: DataSource[]; close: () => void; apply: (graph: GraphDraft, id: string) => void;
}) {
  const { t, nodeName } = useI18n(); const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const columns = schema.nodes.find(node => node.node_id === source.nodeId)?.outputs?.[source.port]?.columns ?? [];
  const [right, setRight] = useState(""), [leftKey, setLeftKey] = useState(""), [rightKey, setRightKey] = useState(""), [how, setHow] = useState("inner");
  const [name, setName] = useState(""), [advanced, setAdvanced] = useState(false), [formula, setFormula] = useState("");
  const [a, setA] = useState(""), [b, setB] = useState(""), [ac, setAc] = useState("0"), [bc, setBc] = useState("0"), [operation, setOperation] = useState("*"), [zero, setZero] = useState("");
  const tables = schema.nodes.flatMap(node => Object.entries(node.outputs ?? {}).filter(([, output]) => output.kind === "dataset").map(([port, output]) => {
    const actual = graph.nodes.find(item => item.id === node.node_id)!;
    const book = sources.find(item => item.id === actual.config?.source_id);
    return { key: JSON.stringify([node.node_id, port]), nodeId: node.node_id, port, columns: output.columns ?? [], label: [book?.original_filename, String(actual.ui?.label || actual.config?.sheet_name || nodeName(actual.type))].filter(Boolean).join(" / ") };
  }));
  const target = tables.find(table => table.key === right);
  const leftType = columns.find(column => column.column_id === leftKey)?.logical_type;
  const rightType = target?.columns.find(column => column.column_id === rightKey)?.logical_type;
  const mismatch = leftType && rightType && leftType !== rightType && leftType !== "unknown" && rightType !== "unknown";
  const operand = (field: string, constant: string) => field === "constant" ? `(${constant})` : `[${field}]`;
  const expression = advanced ? formula : operation === "/" && zero === "null" ? `(${operand(a, ac)}) / nullif(${operand(b, bc)}, 0)` : `${operand(a, ac)} ${operation} ${operand(b, bc)}`;
  const validNumber = (value: string) => /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) && Number.isFinite(Number(value));
  const valid = mode === "join" ? target && leftKey && rightKey && !mismatch : name.trim() && !columns.some(column => column.engine_name === name.trim()) && (advanced ? formula.trim() : a && b && (a !== "constant" || validNumber(ac)) && (b !== "constant" || validNumber(bc)) && (operation !== "/" || zero));
  const submit = () => {
    if (!valid) return;
    const id = crypto.randomUUID(), parent = graph.nodes.find(node => node.id === source.nodeId)!;
    const rightPosition = mode === "join" ? graph.nodes.find(node => node.id === target?.nodeId)?.position : undefined;
    const connect = (endpoint: TableEndpoint, port: string) => ({ id: crypto.randomUUID(), source_node_id: endpoint.nodeId, source_port: endpoint.port, target_node_id: id, target_port: port });
    apply({ ...graph, nodes: [...graph.nodes, { id, type: mode === "join" ? "join" : "calculated_column", version: 1, position: { x: Math.max(parent.position.x, rightPosition?.x ?? parent.position.x) + 360, y: parent.position.y + 120 }, config: mode === "join" ? { left_key: leftKey, right_key: rightKey, how } : { name: name.trim(), expression }, ui: {} }], edges: [...graph.edges, ...(mode === "join" ? [connect(source, "left"), connect(target!, "right")] : [connect(source, "input")])] }, id);
  };
  const control = "my-2 w-full rounded border border-outline bg-control p-2";
  const selectOperand = (label: string, value: string, change: (value: string) => void, constant: string, changeConstant: (value: string) => void) => <label>{t(label)}<select aria-label={t(label)} className={control} value={value} onChange={e => change(e.target.value)}><option value="">{t("Select field")}</option><option value="constant">{t("Constant")}</option>{columns.filter(column => ["integer", "float", "unknown"].includes(column.logical_type)).map(column => <option key={column.column_id} value={column.column_id}>{column.display_name}</option>)}</select>{value === "constant" && <input aria-label={t(`${label} constant`)} className={control} value={constant} onChange={e => changeConstant(e.target.value)} />}</label>;
  return <dialog ref={dialog} onCancel={close} className="w-[560px] max-w-[95vw] rounded-xl border border-outline bg-panel p-6 text-main">
    <h2>{t(mode === "join" ? "Join with…" : "Add calculated field")}</h2>
    <p className="my-2 text-sm">{tables.find(table => table.nodeId === source.nodeId && table.port === source.port)?.label}</p>
    {mode === "join" ? <>
      <label>{t("Right table")}<select aria-label={t("Right table")} className={control} value={right} onChange={e => { setRight(e.target.value); setRightKey(""); }}><option value="">{t("Select output")}</option>{tables.map(table => <option key={table.key} value={table.key}>{table.label}</option>)}</select></label>
      <label>{t("Left key")}<select aria-label={t("Left key")} className={control} value={leftKey} onChange={e => setLeftKey(e.target.value)}><option value="">{t("Select field")}</option>{columns.map(column => <option key={column.column_id} value={column.column_id}>{column.display_name}</option>)}</select></label>
      <label>{t("Right key")}<select aria-label={t("Right key")} className={control} value={rightKey} onChange={e => setRightKey(e.target.value)}><option value="">{t("Select field")}</option>{target?.columns.map(column => <option key={column.column_id} value={column.column_id}>{column.display_name}</option>)}</select></label>
      <label>{t("Join type")}<select aria-label={t("Join type")} className={control} value={how} onChange={e => setHow(e.target.value)}><option value="inner">{t("Inner — matching rows")}</option><option value="left">{t("Left — retain all left rows")}</option></select></label>
      <p>{t("Repeated keys can produce multiple rows. No duplicates are removed.")}</p>
      {mismatch && <p role="alert" className="text-danger">{t("Fields must have matching logical types. Convert them explicitly upstream.")}</p>}
    </> : <>
      <label>{t("Output field name")}<input aria-label={t("Output field name")} maxLength={255} className={control} value={name} onChange={e => setName(e.target.value)} /></label>
      <label><input type="checkbox" checked={advanced} onChange={e => { if (e.target.checked && a && b) setFormula(expression); setAdvanced(e.target.checked); }} /> {t("Formula")}</label>
      {advanced ? <FormulaEditor expression={formula} columns={columns} onChange={setFormula} /> : <>
        {selectOperand("Left operand", a, setA, ac, setAc)}
        <label>{t("Operation")}<select aria-label={t("Operation")} className={control} value={operation} onChange={e => setOperation(e.target.value)}>{["+", "-", "*", "/"].map(value => <option key={value}>{value}</option>)}</select></label>
        {selectOperand("Right operand", b, setB, bc, setBc)}
        {operation === "/" && <label>{t("Division by zero")}<select aria-label={t("Division by zero")} className={control} value={zero} onChange={e => setZero(e.target.value)}><option value="">{t("Select behavior")}</option><option value="error">{t("Error")}</option><option value="null">{t("Return null")}</option></select></label>}
        <p>{t("Missing values remain empty.")}</p>
      </>}
    </>}
    <div className="mt-4 flex gap-4"><button onClick={close}>{t("Cancel")}</button><button disabled={!valid} className="disabled:opacity-40" onClick={submit}>{t("Add step")}</button></div>
  </dialog>;
}
