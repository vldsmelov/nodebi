import { readDocumentDraft } from "@/features/workspace/document-drafts";
import type { components } from "@/lib/api-schema";
import type { Analysis } from "./StatisticalAnalysisConfiguration";

type Build = components["schemas"]["ReportBuildRequest"];
export type ReportInputDraft = { kind: "import" | "publication"; selected: string; source?: Pick<Build, "source_id" | "resource_id" | "expected_snapshot_id" | "published_input"> | null };
export type ReportFormDraft = {
  kind: "report"; requestId: string; input: ReportInputDraft;
  settings: components["schemas"]["ReportEditSettings"];
  expectedToken?: string; step: number; showSteps: boolean;
};
export type AlignmentFormDraft = {
  kind: "alignment"; requestId: string; workflow: string; leftId: string; rightId: string;
  name: string; alignment: Record<string, unknown>; expectedToken?: string;
  formulas?: components["schemas"]["ReportFormula"][];
};
export type AlignmentEditDraft = {
  kind: "alignment-edit"; requestId: string; visualizationId: string; expectedToken: string;
  settings: components["schemas"]["AlignmentSettings"]; rebindFields: boolean; acknowledgeShared: boolean;
};
export type MeasureFormDraft = {
  kind: "measure"; requestId: string; workflowId: string; publicationId: string; measureId: string;
  name: string; presentation: components["schemas"]["MeasureReportRequest"]["presentation"];
  additional: string[]; expectedToken?: string;
};
export type StatisticalFormDraft = {
  kind: "statistics"; requestId: string; name: string; input: ReportInputDraft;
  analysis: Analysis;
  filters: NonNullable<components["schemas"]["StatisticalReportRequest"]["filters"]>;
  edit?: { visualizationId: string; expectedToken: string; rebindFields: boolean; acknowledgeShared: boolean };
};
export type ReportDraftState = ReportFormDraft | AlignmentFormDraft | AlignmentEditDraft | MeasureFormDraft | StatisticalFormDraft;
export const reportDraftName = (state: ReportDraftState) => state.kind === "report" || state.kind === "alignment-edit" ? state.settings.name : state.name;
export type ReportDraft = { version: 1; scope: string; state: ReportDraftState; pending?: string };
export type ReportDraftMode = "create" | "edit" | "alignment" | "alignment-edit" | "measure" | "statistics" | "statistics-edit";
export const reportDraftKey = (project: string, mode: ReportDraftMode, target?: string) => `nodebi:report-draft:${project}:${mode}:${target ?? "new"}`;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
const optionalText = (value: unknown) => value == null || text(value);
const uuid = (value: unknown) => text(value) && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const array = (value: unknown, max: number, valid: (item: unknown) => boolean) => Array.isArray(value) && value.length <= max && value.every(valid);
const formulas = (value: unknown) => value === undefined || array(value, 16, item => object(item) && text(item.node_id) && text(item.name) && text(item.expression) && [item.scale, item.precision].every(n => n === undefined || typeof n === "number" && Number.isFinite(n)));
const validInput = (input: unknown) => object(input) && ["import", "publication"].includes(String(input.kind)) && text(input.selected)
  && (input.source == null || object(input.source) && [input.source.source_id, input.source.resource_id, input.source.expected_snapshot_id].every(optionalText)
    && (input.source.published_input == null || object(input.source.published_input) && [input.source.published_input.workflow_id, input.source.published_input.publication_id, input.source.published_input.expected_token].every(text)));
const validFilters = (value: unknown) => array(value, 32, f => object(f) && text(f.column_id) && text(f.operator) && (f.value == null || ["string", "number", "boolean"].includes(typeof f.value)));
// Drafts may have empty bindings; the server validates completed analytical settings.
const validCombo = (value: unknown) => value == null || object(value)
  && value.type === "combo_chart" && value.version === 1 && text(value.category_column_id)
  && (value.secondary_axis === undefined || typeof value.secondary_axis === "boolean")
  && array(value.series, 8, s => object(s) && text(s.column_id) && optionalText(s.name)
    && ["bar", "line"].includes(String(s.kind)) && (s.axis === undefined || ["primary", "secondary"].includes(String(s.axis))));
const validRadar = (value: unknown) => value == null || object(value)
  && value.type === "radar_chart" && value.version === 1 && text(value.profile_column_id)
  && ["", "shared", "min_max"].includes(String(value.normalization))
  && Array.isArray(value.axes) && value.axes.length >= 3
  && array(value.axes, 8, axis => object(axis) && [axis.column_id, axis.minimum, axis.maximum].every(text));
function validState(value: unknown, mode: ReportDraftMode): value is ReportDraftState {
  if (!object(value) || !uuid(value.requestId) || !optionalText(value.expectedToken)) return false;
  if (mode === "alignment-edit") return value.kind === mode && uuid(value.visualizationId) && text(value.expectedToken) && /^[0-9a-f]{64}$/.test(value.expectedToken)
    && typeof value.rebindFields === "boolean" && typeof value.acknowledgeShared === "boolean" && object(value.settings) && text(value.settings.name) && object(value.settings.alignment)
    && array(value.settings.alignment.keys, 8, k => object(k) && text(k.left_key) && text(k.right_key)) && formulas(value.settings.formulas);
  if (mode === "statistics" || mode === "statistics-edit") {
    if (mode === "statistics-edit" ? !(object(value.edit) && uuid(value.edit.visualizationId) && text(value.edit.expectedToken) && /^[0-9a-f]{64}$/.test(value.edit.expectedToken) && typeof value.edit.rebindFields === "boolean" && typeof value.edit.acknowledgeShared === "boolean") : value.edit !== undefined) return false;
    const a = value.analysis;
    if (!(value.kind === "statistics" && text(value.name) && validInput(value.input) && validFilters(value.filters) && object(a))) return false;
    const number = (n: unknown) => n === undefined || typeof n === "number" && Number.isFinite(n);
    if (["table_rollup", "treemap_chart", "sunburst_chart"].includes(String(a.type))) return array(a.dimensions, 8, text) && array(a.measures, 16, m => object(m) && uuid(m.output_id) && text(m.name) && text(m.operation) && optionalText(m.column_id) && optionalText(m.denominator_column_id) && number(m.scale))
      && [a.subtotals, a.grand_total].every(v => v === undefined || typeof v === "boolean");
    if (!optionalText(a.value_column_id)) return false;
    if (a.type === "heatmap_stats") return text(a.x_column_id) && text(a.y_column_id) && text(a.aggregation) && number(a.average_scale);
    if (a.type === "pareto") return text(a.category_column_id);
    if (a.type === "funnel_steps") return text(a.stage_column_id) && text(a.order_column_id);
    if (a.type === "waterfall_steps") return text(a.category_column_id) && optionalText(a.order_column_id) && optionalText(a.kind_column_id)
      && [a.initial_marker, a.change_marker, a.subtotal_marker, a.total_marker, a.total_label].every(optionalText)
      && (a.append_total === undefined || typeof a.append_total === "boolean");
    return a.type === "boxplot_stats" ? optionalText(a.group_column_id)
      : a.type === "histogram" && number(a.bin_count) && optionalText(a.range_min) && optionalText(a.range_max);
  }
  if (mode === "measure") return value.kind === "measure" && [value.workflowId, value.publicationId, value.measureId, value.name].every(text)
    && array(value.additional, 7, text) && ["table", "kpi", "bar_chart", "line_chart"].includes(String(value.presentation));
  if (mode === "alignment") return value.kind === "alignment" && [value.workflow, value.leftId, value.rightId, value.name].every(text)
    && formulas(value.formulas) && object(value.alignment) && (value.alignment.keys === undefined || array(value.alignment.keys, 8, k => object(k) && text(k.left_key) && text(k.right_key)));
  const s = value.settings, input = value.input;
  return value.kind === "report" && validInput(input)
    && Number.isInteger(value.step) && Number(value.step) >= 0 && Number(value.step) <= 4 && typeof value.showSteps === "boolean"
    && object(s) && text(s.name) && array(s.dimensions, 8, text)
    && array(s.measures, 16, m => object(m) && text(m.name) && ["sum", "count", "average", "min", "max", "distinct_count"].includes(String(m.operation)) && optionalText(m.column_id) && optionalText(m.output_id))
    && validFilters(s.filters)
    && ["table", "bar_chart", "line_chart", "kpi", "combo_chart", "radar_chart"].includes(String(s.presentation)) && validCombo(s.combo) && validRadar(s.radar)
    && typeof s.decimal_average_scale === "number" && Number.isFinite(s.decimal_average_scale)
    && formulas(s.row_formulas) && formulas(s.summary_formulas) && optionalText(s.value_field_id)
    && (s.rebind_fields === undefined || typeof s.rebind_fields === "boolean")
    && (s.comparison == null || object(s.comparison) && text(s.comparison.date_column_id) && text(s.comparison.value_column_id)
      && optionalText(s.comparison.name) && optionalText(s.comparison.unit) && optionalText(s.comparison.compare_to)
      && (s.comparison.ratio_scale === undefined || typeof s.comparison.ratio_scale === "number"));
}
export function readReportDraft(scope: string, mode: ReportDraftMode): ReportDraft | null {
  const raw = readDocumentDraft(scope);
  if (!raw) return null;
  if (raw.length > 1_000_000) throw new Error("Invalid report draft");
  const value: unknown = JSON.parse(raw);
  if (!object(value) || value.version !== 1 || value.scope !== scope || !validState(value.state, mode)) throw new Error("Invalid report draft");
  if (value.state.kind === "measure" && !scope.endsWith(`:measure:${value.state.workflowId}/${value.state.publicationId}/${value.state.measureId}`)) throw new Error("Invalid measure draft target");
  if (value.state.kind === "statistics" && value.state.edit && !scope.endsWith(`:statistics-edit:${value.state.edit.visualizationId}`)) throw new Error("Invalid report draft");
  if (value.state.kind === "alignment-edit" && !scope.endsWith(`:alignment-edit:${value.state.visualizationId}`)) throw new Error("Invalid report draft");
  if (value.pending !== undefined) {
    if (!text(value.pending)) throw new Error("Invalid pending report request");
    const request: unknown = JSON.parse(value.pending);
    if (!object(request) || request.request_id !== value.state.requestId || (mode === "edit" && (!object(request.settings) || !text(request.expected_token)))) throw new Error("Invalid pending report request");
    if (mode === "statistics-edit" && (!object(request.settings) || !text(request.expected_token))) throw new Error("Invalid pending report request");
    if (mode === "alignment-edit" && (!object(request.settings) || !text(request.expected_token))) throw new Error("Invalid pending report request");
    if (value.state.kind === "measure" && (request.workflow_id !== value.state.workflowId || request.publication_id !== value.state.publicationId || request.measure_id !== value.state.measureId)) throw new Error("Invalid pending measure target");
  }
  return value as ReportDraft;
}
