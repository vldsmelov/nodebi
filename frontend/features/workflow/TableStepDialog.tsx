"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { JoinKeysConfiguration, type JoinKey } from "./JoinKeysConfiguration";
import { FormulaEditor } from "./FormulaEditor";
import type { DataSource } from "@/features/data-sources/api";
import type { GraphDraft } from "./autosave";
import type { WorkflowSchemaResult } from "./types";
import { emptyCalculation, parseSimpleCalculation } from "./simple-calculation";

export type TableEndpoint = { nodeId: string; port: string };
export function TableStepDialog({ mode, source, graph, schema, sources = [], editNodeId, close, apply }: {
  mode: "join" | "calculate"; source: TableEndpoint; graph: GraphDraft; schema: WorkflowSchemaResult;
  editNodeId?: string; sources?: DataSource[]; close: () => void; apply: (graph: GraphDraft, id: string) => void;
}) {
  const { t, nodeName } = useI18n(); const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const columns = schema.nodes.find(node => node.node_id === source.nodeId)?.outputs?.[source.port]?.columns ?? [];
  const [right, setRight] = useState(""), [how, setHow] = useState("inner");
  const [keys, setKeys] = useState<JoinKey[]>([{ left_key: "", right_key: "" }]);
  const [relationship, setRelationship] = useState("many_to_many");
  const existing = graph.nodes.find(node => node.id === editNodeId);
  const originalExpression = String(existing?.config?.expression ?? "");
  const parsed = parseSimpleCalculation(originalExpression);
  const initial = parsed ?? emptyCalculation;
  const [name, setName] = useState(String(existing?.config?.name ?? "")), [advanced, setAdvanced] = useState(Boolean(originalExpression && !parsed)), [formula, setFormula] = useState(originalExpression);
  const [a, setA] = useState(initial.a), [b, setB] = useState(initial.b), [ac, setAc] = useState(initial.ac), [bc, setBc] = useState(initial.bc), [operation, setOperation] = useState(initial.operation), [zero, setZero] = useState(initial.zero);
  const [modeError, setModeError] = useState(false);
  const tables = schema.nodes.flatMap(node => Object.entries(node.outputs ?? {}).filter(([, output]) => output.kind === "dataset").map(([port, output]) => {
    const actual = graph.nodes.find(item => item.id === node.node_id)!;
    const book = sources.find(item => item.id === actual.config?.source_id);
    return { key: JSON.stringify([node.node_id, port]), nodeId: node.node_id, port, columns: output.columns ?? [], label: [book?.original_filename, String(actual.ui?.label || actual.config?.sheet_name || nodeName(actual.type))].filter(Boolean).join(" / ") };
  }));
  const target = tables.find(table => table.key === right);
  const mismatch = keys.some(key => {
    const l = columns.find(column => column.column_id === key.left_key)?.logical_type;
    const r = target?.columns.find(column => column.column_id === key.right_key)?.logical_type;
    return l && r && l !== r && l !== "unknown" && r !== "unknown";
  });
  const validKeys = keys.every(key => columns.some(column => column.column_id === key.left_key) && target?.columns.some(column => column.column_id === key.right_key)) && ["left_key", "right_key"].every(side => new Set(keys.map(key => key[side as keyof JoinKey])).size === keys.length);
  const operand = (field: string, constant: string) => field === "constant" ? `(${constant})` : `[${field}]`;
  const expression = advanced ? formula : operation === "/" && zero === "null" ? `(${operand(a, ac)}) / nullif(${operand(b, bc)}, 0)` : `${operand(a, ac)} ${operation} ${operand(b, bc)}`;
  const validNumber = (value: string) => /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) && Number.isFinite(Number(value));
  const valid = mode === "join" ? target && validKeys && !mismatch : name.trim() && !columns.some(column => column.engine_name === name.trim()) && (advanced ? formula.trim() : a && b && (a !== "constant" || validNumber(ac)) && (b !== "constant" || validNumber(bc)) && (operation !== "/" || zero));
  const submit = () => {
    if (!valid) return;
    if (existing) {
      apply({ ...graph, nodes: graph.nodes.map(node => node.id === existing.id ? { ...node, config: { ...node.config, name: name.trim(), expression } } : node) }, existing.id);
      return;
    }
    const id = crypto.randomUUID(), parent = graph.nodes.find(node => node.id === source.nodeId)!;
    const rightPosition = mode === "join" ? graph.nodes.find(node => node.id === target?.nodeId)?.position : undefined;
    const connect = (endpoint: TableEndpoint, port: string) => ({ id: crypto.randomUUID(), source_node_id: endpoint.nodeId, source_port: endpoint.port, target_node_id: id, target_port: port });
    apply({ ...graph, nodes: [...graph.nodes, { id, type: mode === "join" ? "join" : "calculated_column", version: mode === "join" ? 2 : 1, position: { x: Math.max(parent.position.x, rightPosition?.x ?? parent.position.x) + 360, y: parent.position.y + 120 }, config: mode === "join" ? { keys, relationship, how } : { name: name.trim(), expression }, ui: {} }], edges: [...graph.edges, ...(mode === "join" ? [connect(source, "left"), connect(target!, "right")] : [connect(source, "input")])] }, id);
  };
  const control = "my-2 w-full rounded border border-outline bg-control p-2";
  const selectOperand = (label: string, value: string, change: (value: string) => void, constant: string, changeConstant: (value: string) => void) => <label>{t(label)}<select aria-label={t(label)} className={control} value={value} onChange={e => change(e.target.value)}><option value="">{t("Select field")}</option><option value="constant">{t("Constant")}</option>{columns.filter(column => ["integer", "float", "unknown"].includes(column.logical_type)).map(column => <option key={column.column_id} value={column.column_id}>{column.display_name}</option>)}</select>{value === "constant" && <input aria-label={t(`${label} constant`)} className={control} value={constant} onChange={e => changeConstant(e.target.value)} />}</label>;
  return <dialog ref={dialog} onCancel={close} className="max-h-[85vh] w-[560px] max-w-[95vw] overflow-auto rounded-xl border border-outline bg-panel p-6 text-main">
    <h2>{t(mode === "join" ? "Join with…" : existing ? "Edit calculation" : "Add calculated field")}</h2>
    <p className="my-2 text-sm">{tables.find(table => table.nodeId === source.nodeId && table.port === source.port)?.label}</p>
    {mode === "join" ? <>
      <label>{t("Right table")}<select aria-label={t("Right table")} className={control} value={right} onChange={e => { setRight(e.target.value); setKeys(current => current.map(key => ({ ...key, right_key: "" }))); }}><option value="">{t("Select output")}</option>{tables.map(table => <option key={table.key} value={table.key}>{table.label}</option>)}</select></label>
      <JoinKeysConfiguration keys={keys} left={columns} right={target?.columns ?? []} relationship={relationship} onKeys={setKeys} onRelationship={setRelationship} />
      <label>{t("Join type")}<select aria-label={t("Join type")} className={control} value={how} onChange={e => setHow(e.target.value)}><option value="inner">{t("Inner — matching rows")}</option><option value="left">{t("Left — retain all left rows")}</option></select></label>
      <p>{t("Repeated keys can produce multiple rows. No duplicates are removed.")}</p>
      {mismatch && <p role="alert" className="text-danger">{t("Fields must have matching logical types. Convert them explicitly upstream.")}</p>}
    </> : <>
      <label>{t("Output field name")}<input aria-label={t("Output field name")} maxLength={255} className={control} value={name} onChange={e => setName(e.target.value)} /></label>
      <label><input type="checkbox" checked={advanced} onChange={e => {
        setModeError(false);
        if (e.target.checked) { if (a && b) setFormula(expression); setAdvanced(true); return; }
        const next = parseSimpleCalculation(formula);
        if (formula.trim() && !next) { setModeError(true); return; }
        if (next) { setA(next.a); setB(next.b); setAc(next.ac); setBc(next.bc); setOperation(next.operation); setZero(next.zero); }
        setAdvanced(false);
      }} /> {t("Formula")}</label>
      {modeError && <p role="alert">{t("This expression needs formula mode. It has not been changed.")}</p>}
      {advanced ? <FormulaEditor expression={formula} columns={columns} onChange={setFormula} /> : <>
        {selectOperand("Left operand", a, setA, ac, setAc)}
        <label>{t("Operation")}<select aria-label={t("Operation")} className={control} value={operation} onChange={e => setOperation(e.target.value)}>{["+", "-", "*", "/"].map(value => <option key={value}>{value}</option>)}</select></label>
        {selectOperand("Right operand", b, setB, bc, setBc)}
        {operation === "/" && <label>{t("Division by zero")}<select aria-label={t("Division by zero")} className={control} value={zero} onChange={e => setZero(e.target.value)}><option value="">{t("Select behavior")}</option><option value="error">{t("Error")}</option><option value="null">{t("Return null")}</option></select></label>}
        <p>{t("Missing values remain empty.")}</p>
      </>}
    </>}
    <div className="mt-4 flex gap-4"><button onClick={close}>{t("Cancel")}</button><button disabled={!valid} className="disabled:opacity-40" onClick={submit}>{t(existing ? "Save calculation" : "Add step")}</button></div>
  </dialog>;
}
