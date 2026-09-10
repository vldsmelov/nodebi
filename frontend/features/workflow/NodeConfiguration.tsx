import { Trash2 } from "lucide-react";
import { VisualizationConfiguration } from "./VisualizationConfiguration";
import { CalculatedColumnConfiguration, GroupByConfiguration, LimitConfiguration, SortConfiguration } from "./ArithmeticConfiguration";
type FilterCondition = { column_id: string; operator: string; value?: unknown };
const comparisonOperators = ["equals", "not_equals", "greater_than", "greater_or_equal", "less_than", "less_or_equal"];
const stringOperators = ["equals", "not_equals", "contains", "does_not_contain", "starts_with", "ends_with"];
const nullOperators = ["is_null", "is_not_null"];
const operatorLabel = (operator: string) => operator.replaceAll("_", " ");

import type { ComponentType } from "react";
import type { DataSource } from "@/features/data-sources/api";
import type { ResolvedColumn } from "./types";

type Props = {
  type: string;
  config: Record<string, unknown>;
  columns: ResolvedColumn[] | null;
  sources: DataSource[];
  onChange: (config: Record<string, unknown>) => void;
};
const configurations: Record<string, ComponentType<Props>> = {
  excel_source: ExcelSourceConfiguration,
  select_columns: SelectColumnsConfiguration,
  rename_columns: RenameColumnsConfiguration,
  filter: FilterConfiguration,
  sort: SortConfiguration,
  limit: LimitConfiguration,
  calculated_column: CalculatedColumnConfiguration,
  group_by: GroupByConfiguration,
  bar_chart: VisualizationConfiguration,
  kpi: VisualizationConfiguration,
};
export function NodeConfiguration(props: Props) {
  const Configuration = configurations[props.type];
  return Configuration ? <Configuration {...props} /> : <p className="mt-5 text-sm">Configuration is unavailable.</p>;
}

function operatorsFor(type: string) {
  if (["integer", "float", "date", "datetime"].includes(type)) return [...comparisonOperators, ...nullOperators];
  if (type === "string") return [...stringOperators, ...nullOperators];
  if (type === "boolean") return ["equals", "not_equals", ...nullOperators];
  return nullOperators;
}

function FilterConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const conditions: FilterCondition[] = Array.isArray(config.conditions) ? config.conditions.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    return typeof value.column_id === "string" && typeof value.operator === "string" ? [{ column_id: value.column_id, operator: value.operator, value: value.value }] : [];
  }) : [];
  const commit = (next: FilterCondition[]) => onChange({ mode: "and", conditions: next });
  const update = (index: number, condition: FilterCondition) => commit(conditions.map((item, itemIndex) => itemIndex === index ? condition : item));
  const add = () => {
    const column = columns?.[0];
    if (column) commit([...conditions, { column_id: column.column_id, operator: operatorsFor(column.logical_type)[0], value: "" }]);
  };
  return <div className="mt-6"><h2 className="text-lg font-medium">Filter</h2><p className="mt-1 text-xs leading-5 text-white/35">Rows must match every configured condition.</p>{columns ? <><div className="mt-4 space-y-3">{conditions.map((condition, index) => { const column = columns.find((item) => item.column_id === condition.column_id) ?? columns[0]; const operators = operatorsFor(column.logical_type); const nullOperator = nullOperators.includes(condition.operator); return <div key={index} className="rounded-xl border border-white/10 p-3">{index > 0 ? <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b7ff5a]">And</p> : null}<select aria-label={`Filter column ${index + 1}`} value={condition.column_id} onChange={(event) => { const nextColumn = columns.find((item) => item.column_id === event.target.value) ?? columns[0]; const nextOperators = operatorsFor(nextColumn.logical_type); update(index, { column_id: nextColumn.column_id, operator: nextOperators.includes(condition.operator) ? condition.operator : nextOperators[0], value: condition.value }); }} className="w-full rounded-lg border border-white/10 bg-[#151b12] px-2 py-2 text-xs">{columns.map((item) => <option key={item.column_id} value={item.column_id}>{item.display_name} · {item.logical_type}</option>)}</select><select aria-label={`Filter operator ${index + 1}`} value={condition.operator} onChange={(event) => update(index, { ...condition, operator: event.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-[#151b12] px-2 py-2 text-xs">{operators.map((operator) => <option key={operator} value={operator}>{operatorLabel(operator)}</option>)}</select>{!nullOperator ? column.logical_type === "boolean" ? <select aria-label={`Filter value ${index + 1}`} value={String(condition.value ?? "true")} onChange={(event) => update(index, { ...condition, value: event.target.value === "true" })} className="mt-2 w-full rounded-lg border border-white/10 bg-[#151b12] px-2 py-2 text-xs"><option value="true">true</option><option value="false">false</option></select> : <input aria-label={`Filter value ${index + 1}`} type={["integer", "float"].includes(column.logical_type) ? "number" : column.logical_type === "date" ? "date" : column.logical_type === "datetime" ? "datetime-local" : "text"} value={String(condition.value ?? "")} onChange={(event) => update(index, { ...condition, value: event.target.value })} placeholder="Value" className="mt-2 w-full rounded-lg border border-white/10 bg-[#151b12] px-2 py-2 text-xs outline-none focus:border-[#b7ff5a]/50" /> : null}<button aria-label={`Remove condition ${index + 1}`} onClick={() => commit(conditions.filter((_, itemIndex) => itemIndex !== index))} className="mt-2 text-[11px] text-white/30 hover:text-red-300">Remove condition</button></div>; })}</div><button onClick={add} className="mt-3 w-full rounded-xl border border-white/10 px-3 py-2 text-xs hover:border-[#b7ff5a]/40">Add condition</button></> : <p className="mt-4 rounded-xl border border-dashed border-white/10 p-3 text-xs text-white/35">Connect an upstream dataset to configure conditions.</p>}</div>;
}

type RenameRule = { column_id: string; new_name: string };

function RenameColumnsConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const rules: RenameRule[] = Array.isArray(config.renames) ? config.renames.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    return typeof value.column_id === "string" && typeof value.new_name === "string" ? [{ column_id: value.column_id, new_name: value.new_name }] : [];
  }) : [];
  const update = (index: number, rule: RenameRule) => onChange({ renames: rules.map((item, itemIndex) => itemIndex === index ? rule : item) });
  const add = () => {
    const available = columns?.find((column) => !rules.some((rule) => rule.column_id === column.column_id));
    if (available) onChange({ renames: [...rules, { column_id: available.column_id, new_name: "" }] });
  };
  return <div className="mt-6"><h2 className="text-lg font-medium">Rename Columns</h2><p className="mt-1 text-xs leading-5 text-white/35">Rename fields without changing their stable identity.</p>{columns ? <><div className="mt-4 space-y-3">{rules.map((rule, index) => <div key={`${rule.column_id}:${index}`} className="rounded-xl border border-white/10 p-3"><select aria-label={`Column ${index + 1}`} value={rule.column_id} onChange={(event) => update(index, { ...rule, column_id: event.target.value })} className="w-full rounded-lg border border-white/10 bg-[#151b12] px-2 py-2 text-xs">{columns.map((column) => <option key={column.column_id} value={column.column_id}>{column.display_name}</option>)}</select><div className="mt-2 flex gap-2"><input aria-label={`New name ${index + 1}`} value={rule.new_name} onChange={(event) => update(index, { ...rule, new_name: event.target.value })} placeholder="New field name" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#151b12] px-2 py-2 text-xs outline-none focus:border-[#b7ff5a]/50" /><button aria-label={`Remove rename ${index + 1}`} onClick={() => onChange({ renames: rules.filter((_, itemIndex) => itemIndex !== index) })} className="px-2 text-white/30 hover:text-red-300"><Trash2 size={14} /></button></div></div>)}</div><button onClick={add} disabled={rules.length >= columns.length} className="mt-3 w-full rounded-xl border border-white/10 px-3 py-2 text-xs hover:border-[#b7ff5a]/40 disabled:opacity-30">Add rename</button></> : <p className="mt-4 rounded-xl border border-dashed border-white/10 p-3 text-xs text-white/35">Connect an upstream dataset to rename fields.</p>}</div>;
}

function SelectColumnsConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const selected = Array.isArray(config.column_ids) ? config.column_ids.filter((item): item is string => typeof item === "string") : [];
  const toggle = (columnId: string) => {
    const next = selected.includes(columnId) ? selected.filter((item) => item !== columnId) : [...selected, columnId];
    onChange({ column_ids: next });
  };
  return <div className="mt-6"><h2 className="text-lg font-medium">Select Columns</h2><p className="mt-1 text-xs leading-5 text-white/35">Choose fields in the order they should continue downstream.</p>{columns ? <div className="mt-4 space-y-2">{columns.map((column) => <label key={column.column_id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-sm"><input type="checkbox" checked={selected.includes(column.column_id)} onChange={() => toggle(column.column_id)} className="accent-[#b7ff5a]" /><span className="min-w-0 flex-1 truncate">{column.display_name}</span><span className="text-[11px] text-white/30">{column.logical_type}</span></label>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-white/10 p-3 text-xs text-white/35">Connect an upstream dataset to choose fields.</p>}</div>;
}

function ExcelSourceConfiguration({ config, sources, onChange }: { config: Record<string, unknown>; sources: DataSource[]; onChange: (config: Record<string, unknown>) => void }) {
  const sourceId = typeof config.source_id === "string" ? config.source_id : "";
  const selectedSource = sources.find((source) => source.id === sourceId);
  const sheetName = typeof config.sheet_name === "string" ? config.sheet_name : "";
  return (
    <div className="mt-6 space-y-5">
      <div><h2 className="text-lg font-medium">Excel Source</h2><p className="mt-1 text-xs leading-5 text-white/35">Choose the persisted workbook and worksheet read by this node.</p></div>
      <label className="block text-xs text-white/50">Workbook<select aria-label="Workbook" value={sourceId} onChange={(event) => { const source = sources.find((item) => item.id === event.target.value); onChange({ source_id: event.target.value, sheet_name: source?.workbook.sheets[0]?.name ?? "" }); }} className="mt-2 w-full rounded-xl border border-white/10 bg-[#151b12] px-3 py-2.5 text-sm text-white"><option value="">Select workbook</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select></label>
      <label className="block text-xs text-white/50">Worksheet<select aria-label="Worksheet" value={sheetName} disabled={!selectedSource} onChange={(event) => onChange({ ...config, sheet_name: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#151b12] px-3 py-2.5 text-sm text-white disabled:opacity-40"><option value="">Select worksheet</option>{selectedSource?.workbook.sheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{sheet.name}</option>)}</select></label>
    </div>
  );
}
