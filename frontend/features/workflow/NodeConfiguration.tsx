"use client";

import type { ProvenanceMap } from "./field-provenance";
import { useI18n } from "@/lib/i18n";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { VisualizationConfiguration } from "./VisualizationConfiguration";
import { ConvertTypesConfiguration, UnpivotConfiguration, WindowConfiguration } from "./PreparationConfiguration";
import { CalendarConfiguration } from "./CalendarConfiguration";
import { PeriodConfiguration } from "./PeriodConfiguration";
import { AlignMeasuresConfiguration } from "./AlignMeasuresConfiguration";
import { BoxPlotStatsConfiguration } from "./BoxPlotStatsConfiguration";
import { HistogramConfiguration } from "./HistogramConfiguration";
import { HeatmapConfiguration } from "./HeatmapConfiguration";
import { WaterfallConfiguration } from "./WaterfallConfiguration";
import { ParetoConfiguration } from "./ParetoConfiguration";
import { FunnelConfiguration } from "./FunnelConfiguration";
import { TableRollupConfiguration } from "./TableRollupConfiguration";
import { DatasetSourceConfiguration } from "@/features/ingestion/DatasetSourceConfiguration";
import { CombineConfiguration } from "./CombineConfiguration";
import { CalculatedColumnConfiguration, GroupByConfiguration, LimitConfiguration, SortConfiguration } from "./ArithmeticConfiguration";
type FilterCondition = { column_id: string; operator: string; value?: unknown; parameter?: string };
const comparisonOperators = ["equals", "not_equals", "greater_than", "greater_or_equal", "less_than", "less_or_equal"];
const stringOperators = ["equals", "not_equals", "contains", "does_not_contain", "starts_with", "ends_with"];
const nullOperators = ["is_null", "is_not_null"];
const operatorLabel = (operator: string) => operator.replaceAll("_", " ");

import type { ComponentType } from "react";
import type { DataSource } from "@/features/data-sources/api";
import type { GraphIssue, ResolvedColumn, WorkflowParameter } from "./types";

type Props = {
  nodeId?: string;
  version?: number;
  provenance?: ProvenanceMap;
  issues?: GraphIssue[];
  validationPending?: boolean;
  parameters?: WorkflowParameter[];
  type: string;
  config: Record<string, unknown>;
  columns: ResolvedColumn[] | null;
  inputColumns?: Record<string, ResolvedColumn[] | null>;
  sources: DataSource[];
  onChange: (config: Record<string, unknown>) => void;
};
const configurations: Record<string, ComponentType<Props>> = {
  pareto: ParetoConfiguration,
  funnel_steps: FunnelConfiguration,
  waterfall_steps: WaterfallConfiguration,
  table_rollup: TableRollupConfiguration,
  boxplot_stats: BoxPlotStatsConfiguration,
  histogram: HistogramConfiguration,
  heatmap_stats: HeatmapConfiguration,
  align_measures: AlignMeasuresConfiguration,
  calendar_period: PeriodConfiguration,
  period_comparison: PeriodConfiguration,
  dataset_source: DatasetSourceConfiguration,
  convert_types: ConvertTypesConfiguration,
  unpivot: UnpivotConfiguration,
  window: WindowConfiguration,
  excel_source: ExcelSourceConfiguration,
  excel_periods: ExcelSourceConfiguration,
  select_columns: SelectColumnsConfiguration,
  rename_columns: RenameColumnsConfiguration,
  filter: FilterConfiguration,
  sort: SortConfiguration,
  limit: LimitConfiguration,
  calculated_column: CalculatedColumnConfiguration,
  group_by: GroupByConfiguration,
  bar_chart: VisualizationConfiguration,
  table: VisualizationConfiguration,
  line_chart: VisualizationConfiguration,
  area_chart: VisualizationConfiguration,
  pie_chart: VisualizationConfiguration,
  donut_chart: VisualizationConfiguration,
  scatter_chart: VisualizationConfiguration,
  kpi: VisualizationConfiguration,
  calendar: CalendarConfiguration,
  join: CombineConfiguration,
  union: CombineConfiguration,
  pivot: CombineConfiguration,
};
export function NodeConfiguration(props: Props) {
  const { t } = useI18n();
  const Configuration = configurations[props.type];
  return Configuration ? <Configuration key={`${props.nodeId ?? props.type}:${props.version ?? 1}`} {...props} /> : <p className="mt-5 text-sm">{t("Configuration is unavailable.")}</p>;
}

function operatorsFor(type: string) {
  if (["integer", "float", "decimal", "date", "datetime"].includes(type)) return [...comparisonOperators, ...nullOperators];
  if (type === "string") return [...stringOperators, ...nullOperators];
  if (type === "boolean") return ["equals", "not_equals", ...nullOperators];
  return nullOperators;
}

function FilterConfiguration({ config, columns, onChange, parameters = [] }: Props) {
  const { t } = useI18n();
  const conditions: FilterCondition[] = Array.isArray(config.conditions) ? config.conditions.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    return typeof value.column_id === "string" && typeof value.operator === "string" ? [{ column_id: value.column_id, operator: value.operator, value: value.value, parameter: typeof value.parameter === "string" ? value.parameter : undefined }] : [];
  }) : [];
  const commit = (next: FilterCondition[]) => onChange({ mode: "and", conditions: next });
  const update = (index: number, condition: FilterCondition) => commit(conditions.map((item, itemIndex) => itemIndex === index ? condition : item));
  const add = () => {
    const column = columns?.[0];
    if (column) commit([...conditions, { column_id: column.column_id, operator: operatorsFor(column.logical_type)[0], value: "" }]);
  };
  return <div className="mt-6"><h2 className="text-lg font-medium">{t("Filter")}</h2><p className="mt-1 text-xs leading-5 text-muted">{t("Rows must match every configured condition.")}</p>{columns ? <><div className="mt-4 space-y-3">{conditions.map((condition, index) => { const column = columns.find((item) => item.column_id === condition.column_id) ?? columns[0]; if (!column) return <div key={index} className="mt-3 text-xs text-danger">{t("Selected field is unavailable.")}<button onClick={() => commit(conditions.filter((_, i) => i !== index))} className="ml-2 underline">{t("Remove condition")}</button></div>; const operators = operatorsFor(column.logical_type); const nullOperator = nullOperators.includes(condition.operator); return <div key={index} className="rounded-xl border border-outline p-3">{index > 0 ? <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">{t("And")}</p> : null}<select aria-label={t("Filter column {0}", {"0": index + 1})} value={condition.column_id} onChange={(event) => { const nextColumn = columns.find((item) => item.column_id === event.target.value) ?? columns[0]; const nextOperators = operatorsFor(nextColumn.logical_type); update(index, { column_id: nextColumn.column_id, operator: nextOperators.includes(condition.operator) ? condition.operator : nextOperators[0], value: condition.value }); }} className="w-full rounded-lg border border-outline bg-control px-2 py-2 text-xs">{columns.map((item) => <option key={item.column_id} value={item.column_id}>{item.display_name} · {t(item.logical_type)}</option>)}</select><select aria-label={t("Filter operator {0}", {"0": index + 1})} value={condition.operator} onChange={(event) => update(index, { ...condition, operator: event.target.value, parameter: nullOperators.includes(event.target.value) ? undefined : condition.parameter })} className="mt-2 w-full rounded-lg border border-outline bg-control px-2 py-2 text-xs">{operators.map((operator) => <option key={operator} value={operator}>{t(operatorLabel(operator))}</option>)}</select>{!nullOperator ? <select aria-label={t("Filter value source {0}", { 0: index + 1 })} className="mt-2 w-full rounded-lg border border-outline bg-control px-2 py-2 text-xs" value={condition.parameter ?? ""} onChange={event => update(index, { ...condition, parameter: event.target.value || undefined, value: event.target.value ? undefined : "" })}><option value="">{t("Literal value")}</option>{condition.parameter && !parameters.some(item => item.name === condition.parameter) ? <option value={condition.parameter}>{condition.parameter} ({t("Unavailable")})</option> : null}{parameters.filter(item => item.logical_type === column.logical_type || (item.logical_type === "integer" && column.logical_type === "float")).map(item => <option key={item.name} value={item.name}>{item.label || item.name}</option>)}</select> : null}{!nullOperator && !condition.parameter ? column.logical_type === "boolean" ? <select aria-label={t("Filter value {0}", {"0": index + 1})} value={String(condition.value ?? "true")} onChange={(event) => update(index, { ...condition, value: event.target.value === "true" })} className="mt-2 w-full rounded-lg border border-outline bg-control px-2 py-2 text-xs"><option value="true">{t("true")}</option><option value="false">{t("false")}</option></select> : <input aria-label={t("Filter value {0}", {"0": index + 1})} type={["integer", "float"].includes(column.logical_type) ? "number" : column.logical_type === "date" ? "date" : column.logical_type === "datetime" ? "datetime-local" : "text"} value={String(condition.value ?? "")} onChange={(event) => update(index, { ...condition, value: event.target.value })} placeholder={t("Value")} className="mt-2 w-full rounded-lg border border-outline bg-control px-2 py-2 text-xs outline-none focus:border-accent/50" /> : null}<button aria-label={t("Remove condition {0}", {"0": index + 1})} onClick={() => commit(conditions.filter((_, itemIndex) => itemIndex !== index))} className="mt-2 text-[11px] text-muted hover:text-danger">{t("Remove condition")}</button></div>; })}</div><button onClick={add} className="mt-3 w-full rounded-xl border border-outline px-3 py-2 text-xs hover:border-accent/40">{t("Add condition")}</button></> : <p className="mt-4 rounded-xl border border-dashed border-outline p-3 text-xs text-muted">{t("Connect an upstream dataset to configure conditions.")}</p>}</div>;
}

type RenameRule = { column_id: string; new_name: string };

function RenameColumnsConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const { t } = useI18n();
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
  return <div className="mt-6"><h2 className="text-lg font-medium">{t("Rename Columns")}</h2><p className="mt-1 text-xs leading-5 text-muted">{t("Rename fields without changing their stable identity.")}</p>{columns ? <><div className="mt-4 space-y-3">{rules.map((rule, index) => <div key={`${rule.column_id}:${index}`} className="rounded-xl border border-outline p-3"><select aria-label={t("Column {0}", {"0": index + 1})} value={rule.column_id} onChange={(event) => update(index, { ...rule, column_id: event.target.value })} className="w-full rounded-lg border border-outline bg-control px-2 py-2 text-xs">{columns.map((column) => <option key={column.column_id} value={column.column_id}>{column.display_name}</option>)}</select><div className="mt-2 flex gap-2"><input aria-label={t("New name {0}", {"0": index + 1})} value={rule.new_name} onChange={(event) => update(index, { ...rule, new_name: event.target.value })} placeholder={t("New field name")} className="min-w-0 flex-1 rounded-lg border border-outline bg-control px-2 py-2 text-xs outline-none focus:border-accent/50" /><button aria-label={t("Remove rename {0}", {"0": index + 1})} onClick={() => onChange({ renames: rules.filter((_, itemIndex) => itemIndex !== index) })} className="px-2 text-muted hover:text-danger"><Trash2 size={14} /></button></div></div>)}</div><button onClick={add} disabled={rules.length >= columns.length} className="mt-3 w-full rounded-xl border border-outline px-3 py-2 text-xs hover:border-accent/40 disabled:opacity-30">{t("Add rename")}</button></> : <p className="mt-4 rounded-xl border border-dashed border-outline p-3 text-xs text-muted">{t("Connect an upstream dataset to rename fields.")}</p>}</div>;
}

function SelectColumnsConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const { t } = useI18n();
  const selected = Array.isArray(config.column_ids) ? config.column_ids.filter((item): item is string => typeof item === "string") : [];
  const toggle = (columnId: string) => {
    const next = selected.includes(columnId) ? selected.filter((item) => item !== columnId) : [...selected, columnId];
    onChange({ column_ids: next });
  };
  return <div className="mt-6"><h2 className="text-lg font-medium">{t("Select Columns")}</h2><p className="mt-1 text-xs leading-5 text-muted">{t("Choose fields in the order they should continue downstream.")}</p>{columns ? <div className="mt-4 space-y-2">{columns.map((column) => <label key={column.column_id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-outline px-3 py-2.5 text-sm"><input type="checkbox" checked={selected.includes(column.column_id)} onChange={() => toggle(column.column_id)} className="accent-accent" /><span className="min-w-0 flex-1 truncate">{column.display_name}</span><span className="text-[11px] text-muted">{t(column.logical_type)}</span></label>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-outline p-3 text-xs text-muted">{t("Connect an upstream dataset to choose fields.")}</p>}</div>;
}

function ExcelSourceConfiguration({ config, sources, onChange }: { config: Record<string, unknown>; sources: DataSource[]; onChange: (config: Record<string, unknown>) => void }) {
  const { t } = useI18n();
  const sourceId = typeof config.source_id === "string" ? config.source_id : "";
  const selectedSource = sources.find((source) => source.id === sourceId);
  const sheetName = typeof config.sheet_name === "string" ? config.sheet_name : "";
  return (
    <div className="mt-6 space-y-5">
      <div><h2 className="text-lg font-medium">{t("Excel Source")}</h2><p className="mt-1 text-xs leading-5 text-muted">{t("Choose the persisted workbook and worksheet read by this node.")}</p></div>
      {!!selectedSource?.periods?.length && <div className="rounded border border-outline p-3"><h3>{t("Excel by period")}</h3><ul>{selectedSource.periods.map(period => <li key={period}>{period}</li>)}</ul><Link className="underline" href={`/projects/${selectedSource.project_id}/reports`}>{t("Update data")}</Link></div>}
      <label className="block text-xs text-muted">{t("Workbook")}<select aria-label={t("Workbook")} value={sourceId} onChange={(event) => { const source = sources.find((item) => item.id === event.target.value); onChange({ source_id: event.target.value, sheet_name: source?.workbook.sheets[0]?.name ?? "" }); }} className="mt-2 w-full rounded-xl border border-outline bg-control px-3 py-2.5 text-sm text-foreground"><option value="">{t("Select workbook")}</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select></label>
      <label className="block text-xs text-muted">{t("Worksheet")}<select aria-label={t("Worksheet")} value={sheetName} disabled={!selectedSource} onChange={(event) => onChange({ ...config, sheet_name: event.target.value })} className="mt-2 w-full rounded-xl border border-outline bg-control px-3 py-2.5 text-sm text-foreground disabled:opacity-40"><option value="">{t("Select worksheet")}</option>{[...new Set([...(selectedSource?.logical_sheets ?? []), ...(selectedSource?.workbook.sheets.map(sheet => sheet.name) ?? [])])].map(name => <option key={name} value={name}>{name}</option>)}</select></label>
      {([['header_row', 'First header row', 250000], ['header_rows', 'Header row count', 10]] as const).map(([key, label, max]) => <label key={key} className="block text-xs text-muted">{t(label)}<input aria-label={t(label)} type="number" min={1} max={max} value={Number(config[key] ?? 1)} onChange={event => onChange({ ...config, [key]: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-outline bg-control px-3 py-2 text-foreground" /></label>)}
      {([['skip_data_rows', 'Skip rows after headers'], ['drop_tail_rows', 'Exclude final rows']] as const).map(([key, label]) => <label key={key} className="block text-xs">{t(label)}<input type="number" min={0} max={250000} value={Number(config[key] ?? 0)} onChange={event => onChange({ ...config, [key]: Number(event.target.value) })} className="mt-2 w-full rounded border border-outline bg-control p-2" /></label>)}
      <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={config.include_row_number === true} onChange={event => onChange({ ...config, include_row_number: event.target.checked })} />{t("Include source row number")}</label>
    </div>
  );
}
