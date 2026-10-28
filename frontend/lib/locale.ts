import { translations } from "./translations";

export const locales = ["ru", "en", "tt"] as const;
export type Locale = typeof locales[number];
export const localeCookie = "nodebi-language";
export const localeNames: Record<Locale, string> = { ru: "Русский", en: "English", tt: "Татарча" };
export function parseLocale(value: unknown): Locale {
  return locales.includes(value as Locale) ? value as Locale : "ru";
}
export type Parameters = Record<string, string | number>;
export function translate(locale: Locale, key: string, parameters: Parameters = {}): string {
  const template = locale === "en" ? key : translations[key]?.[locale === "ru" ? 0 : 1] ?? key;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    parameters[name] === undefined ? placeholder : String(parameters[name]));
}
export const numberLocale: Record<Locale, string> = { ru: "ru-RU", en: "en-US", tt: "tt-RU" };
/** Excel timestamps have no timezone: preserve their wall-clock value as UTC for display. */
export function parseDataDate(value: string): Date {
  const naive = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value);
  return new Date(naive ? `${value.replace(" ", "T")}Z` : value);
}
export function formatCell(locale: Locale, value: unknown, type?: string): string {
  if (value == null) return "—";
  if (typeof value === "number") return new Intl.NumberFormat(numberLocale[locale], { maximumFractionDigits: 15 }).format(value);
  if (typeof value === "boolean") return translate(locale, String(value));
  if ((type === "date" || type === "datetime") && typeof value === "string") {
    const date = parseDataDate(value);
    if (!Number.isNaN(date.valueOf())) return new Intl.DateTimeFormat(numberLocale[locale], {
      dateStyle: "short", ...(type === "datetime" ? { timeStyle: "medium" as const } : {}), timeZone: "UTC",
    }).format(date);
  }
  return String(value);
}
export const nodeNames: Record<string, string> = {
  analytical_table: "Analytical table",
  heatmap_chart: "Heatmap",
  radar_chart: "Radar", waterfall_chart: "Waterfall", combo_chart: "Combination chart",
  bubble_chart: "Bubble chart",
  bullet_chart: "Bullet chart",
  pareto: "Pareto contributions",
  pareto_chart: "Pareto chart",
  funnel_steps: "Funnel stages",
  funnel_chart: "Funnel",
  treemap_chart: "Treemap",
  sunburst_chart: "Sunburst",
  dataset_source: "Prepared dataset",
  field_formula: "Field expression", field_scalar: "Single value",
  scalar_constant: "Constant", scalar_parameter: "Parameter", field_arithmetic: "Field arithmetic",
  field_compare: "Field comparison", field_logical: "Field logic", append_field: "Append field",
  field_filter: "Filter by field", field_sum: "Sum field",
  calendar: "Calendar",
  calendar_period: "Calendar Period", period_comparison: "Period Comparison",
  convert_types: "Convert Types", unpivot: "Unpivot", window: "Window",
  excel_periods: "Excel by period",
  excel_source: "Excel Source", select_columns: "Select Columns", rename_columns: "Rename Columns",
  filter: "Filter", sort: "Sort", limit: "Limit", calculated_column: "Calculated Column", group_by: "Group By",
  table_rollup: "Analytical table totals", waterfall_steps: "Waterfall steps", heatmap_stats: "Heatmap cells", histogram: "Histogram statistics", histogram_chart: "Histogram", box_plot: "Box plot", boxplot_stats: "Box-plot statistics", align_measures: "Align measures", join: "Join", union: "Union", pivot: "Pivot", table: "Table", kpi: "KPI", bar_chart: "Bar Chart",
  line_chart: "Line Chart", area_chart: "Area Chart", pie_chart: "Pie Chart", donut_chart: "Donut Chart", scatter_chart: "Scatter Chart",
};
