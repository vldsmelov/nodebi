"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { GraphDraft } from "./autosave";
import type { WorkflowSchemaResult } from "./types";
import type { components } from "@/lib/api-schema";

type Catalog = components["schemas"]["ResultCatalog"];
export function PublishedResults({ graph, schema, onChange }: { graph: GraphDraft; schema?: WorkflowSchemaResult; onChange: (graph: GraphDraft) => void }) {
  const { t, nodeName } = useI18n();
  const [name, setName] = useState(""), [endpoint, setEndpoint] = useState(""), [point, setPoint] = useState(""), [column, setColumn] = useState(""), [role, setRole] = useState("period"), [roleLabel, setRoleLabel] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const catalog: Catalog = graph.result_catalog ?? { outputs: [], contexts: [] };
  const outputs = schema?.nodes.flatMap(item => Object.entries(item.outputs ?? {}).filter(([, value]) => ["dataset", "scalar"].includes(value.kind)).map(([port, value]) => {
    const node = graph.nodes.find(node => node.id === item.node_id)!;
    return { value: JSON.stringify([item.node_id, port]), node_id: item.node_id, port, kind: value.kind as "dataset" | "scalar", columns: value.columns ?? [], label: `${String(node.ui?.label || node.config?.name || node.config?.sheet_name || nodeName(node.type))} / ${port}` };
  })) ?? [];
  const context = catalog.contexts?.[0];
  const selected = outputs.find(item => item.value === endpoint);
  const table = outputs.find(item => item.value === point);
  const control = "my-1 w-full rounded border border-outline bg-control p-2 text-xs";
  const update = (value: Catalog) => onChange({ ...graph, format_version: 3, result_catalog: value });
  const configure = () => {
    if (!table || !column || role === "new" && !roleLabel.trim()) return;
    const field = table.columns.find(item => item.column_id === column)!;
    const key = role === "period" ? "period" : role === "new" ? `selection_${crypto.randomUUID().replaceAll("-", "")}` : role;
    const id = context?.id ?? crypto.randomUUID();
    const roles = [...(context?.roles ?? [])];
    if (key !== "period" && !roles.some(item => item.name === key)) roles.push({ name: key, label: roleLabel.trim(), logical_type: field.logical_type as "string" | "integer" | "float" | "boolean" | "date" | "datetime", default: null });
    const next = { id, name: context?.name ?? t("Data context"), timezone: context?.timezone ?? "Europe/Moscow", roles, points: [...(context?.points ?? []).filter(item => !(item.node_id === table.node_id && item.port === table.port && item.role === key)), { node_id: table.node_id, port: table.port, column_id: column, role: key }] };
    update({ ...catalog, contexts: [next, ...(catalog.contexts ?? []).slice(1)], outputs: (catalog.outputs ?? []).map(item => ({ ...item, context_ids: [...new Set([...(item.context_ids ?? []), id])] })) });
  };
  return <details className="rounded border border-outline p-3 text-xs"><summary>{t("Published results and filters")}</summary>
    {(catalog.outputs ?? []).map(output => <details key={output.id} className="my-3 border-b border-outline pb-2" onToggle={event => { if (event.currentTarget.open) setExpanded(output.id); else setExpanded(current => current === output.id ? null : current); }}><summary>{output.name}</summary>{expanded === output.id && <><label>{t("Published result name")}<input aria-label={t("Published result name")} className={control} value={output.name} onChange={e => update({ ...catalog, outputs: catalog.outputs!.map(item => item.id === output.id ? { ...item, name: e.target.value } : item) })} /></label><span>{outputs.find(item => item.node_id === output.node_id && item.port === output.port)?.label ?? t("Unavailable connection")}</span>
      {(context?.roles ?? []).map(item => <div key={item.name}><label className="block"><input type="checkbox" checked={!(output.ignored_roles ?? []).includes(item.name)} onChange={e => update({ ...catalog, outputs: catalog.outputs!.map(candidate => candidate.id === output.id ? { ...candidate, ignored_roles: e.target.checked ? (candidate.ignored_roles ?? []).filter(key => key !== item.name) : [...(candidate.ignored_roles ?? []), item.name] } : candidate) })} /> {t("Apply selection")} · {item.label || item.name}</label><label>{t("Navigation field")}<select aria-label={`${t("Navigation field")} ${output.name} ${item.label || item.name}`} className={control} value={output.semantic_fields?.[item.name] ?? ""} onChange={e => update({ ...catalog, outputs: catalog.outputs!.map(candidate => candidate.id === output.id ? { ...candidate, semantic_fields: Object.fromEntries(Object.entries({ ...candidate.semantic_fields, [item.name]: e.target.value }).filter(([, value]) => value)) } : candidate) })}><option value="">{t("Not configured")}</option>{outputs.find(value => value.node_id === output.node_id && value.port === output.port)?.columns.map(field => <option key={field.column_id} value={field.column_id}>{field.display_name}</option>)}</select></label></div>)}
      <button className="text-danger" onClick={() => update({ ...catalog, outputs: catalog.outputs!.filter(item => item.id !== output.id) })}>{t("Remove publication")}</button></>}</details>)}
    <label>{t("Result name")}<input aria-label={t("Result name")} className={control} value={name} onChange={e => setName(e.target.value)} /></label>
    <label>{t("Result output")}<select aria-label={t("Result output")} className={control} value={endpoint} onChange={e => setEndpoint(e.target.value)}><option value="">{t("Select output")}</option>{outputs.map(item => <option key={item.value} value={item.value}>{item.label} · {t(item.kind)}</option>)}</select></label>
    <button className="my-2 rounded border border-outline p-2 disabled:opacity-40" disabled={!name.trim() || !selected} onClick={() => { if (selected) update({ ...catalog, outputs: [...(catalog.outputs ?? []), { id: crypto.randomUUID(), name: name.trim(), node_id: selected.node_id, port: selected.port, kind: selected.kind, context_ids: (catalog.contexts ?? []).map(item => item.id), ignored_roles: [], semantic_fields: {} }] }); setName(""); }}>{t("Publish result")}</button>
    <hr className="my-3" /><strong>{t("Shared data filters")}</strong><p className="my-2 text-muted">{t("Apply period before totals. Apply record selection after denominators and ranks.")}</p>
    <label>{t("Data timezone")}<input aria-label={t("Data timezone")} className={control} value={context?.timezone ?? "Europe/Moscow"} disabled={!context} onChange={e => update({ ...catalog, contexts: catalog.contexts!.map((item, i) => i === 0 ? { ...item, timezone: e.target.value } : item) })} /></label>
    {(context?.points ?? []).map((item, index) => <p key={index}>{item.role === "period" ? t("Period") : context?.roles?.find(role => role.name === item.role)?.label} · {outputs.find(value => value.node_id === item.node_id && value.port === item.port)?.label} · {outputs.find(value => value.node_id === item.node_id && value.port === item.port)?.columns.find(column => column.column_id === item.column_id)?.display_name}<button aria-label={t("Remove context point")} onClick={() => update({ ...catalog, contexts: catalog.contexts!.map((value, i) => i === 0 ? { ...value, points: value.points!.filter((_, j) => j !== index) } : value) })}> ×</button></p>)}
    <label>{t("Filter meaning")}<select aria-label={t("Filter meaning")} className={control} value={role} onChange={e => { setRole(e.target.value); setColumn(""); }}><option value="period">{t("Period")}</option>{context?.roles?.map(item => <option key={item.name} value={item.name}>{item.label || item.name}</option>)}<option value="new">{t("New selection")}</option></select></label>
    {role === "new" && <input aria-label={t("Selection name")} className={control} value={roleLabel} onChange={e => setRoleLabel(e.target.value)} />}
    <label>{t("Apply at table output")}<select aria-label={t("Apply at table output")} className={control} value={point} onChange={e => { setPoint(e.target.value); setColumn(""); }}><option value="">{t("Select output")}</option>{outputs.filter(item => item.kind === "dataset").map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    <label>{t("Filter field")}<select aria-label={t("Filter field")} className={control} value={column} onChange={e => setColumn(e.target.value)}><option value="">{t("Select field")}</option>{table?.columns.filter(item => role !== "period" || ["date", "datetime"].includes(item.logical_type)).map(item => <option key={item.column_id} value={item.column_id}>{item.display_name} · {t(item.logical_type)}</option>)}</select></label>
    <button className="my-2 rounded border border-outline p-2" disabled={!column} onClick={configure}>{t("Apply data binding")}</button>
  </details>;
}
