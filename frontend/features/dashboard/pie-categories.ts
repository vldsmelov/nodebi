import { translate, type Locale } from "@/lib/locale";
import type { VisualizationResult } from "./api";

export const pieCategoryName = (value: unknown, locale: Locale) => String(value ?? translate(locale, "(empty)"));

/** Legend labels define visual categories only; source rows are never grouped or reordered. */
export function pieCategories(result: VisualizationResult, locale: Locale) {
  return [...new Set(result.rows.map(row => pieCategoryName(row[result.category_field!], locale)))].sort();
}
