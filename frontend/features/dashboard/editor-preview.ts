import type { VisualizationResult } from "./api";

const appearanceKeys = ["title", "number_format", "decimals", "currency", "show_legend", "show_labels", "orientation", "column_formats"] as const;
/** Only presentation is local. Field selection, context and title templates require the server. */
export function executionConfig(config: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(config).filter(([key]) =>
    !appearanceKeys.includes(key as typeof appearanceKeys[number]) || key === "title" && config.title_template === true));
}
export function appearancePreview(result: VisualizationResult, config: Record<string, unknown>): VisualizationResult {
  for (const settings of [config, ...Object.values(config.column_formats as Record<string, Record<string, unknown>> ?? {})]) {
    if (settings.decimals !== undefined && (!Number.isInteger(settings.decimals) || Number(settings.decimals) < 0 || Number(settings.decimals) > 8)) throw new Error("Select 0 to 8 decimal places.");
    if (settings.number_format === "currency" && settings.currency !== undefined && !/^[A-Z]{3}$/.test(String(settings.currency))) throw new Error("Enter a three-letter currency code.");
  }
  const patch = Object.fromEntries(appearanceKeys.filter(key => key in config && !(key === "title" && config.title_template === true)).map(key => [key, config[key]]));
  return { ...result, ...patch };
}
