import { translate, type Locale } from "@/lib/locale";
import type { VisualizationResult } from "./api";
import { boundedPlainTextTooltip, plainTextTooltip } from "./chart-tooltip";

/** Read the matching source row, never a rounded ECharts drawing coordinate. */
export function basicTooltip(result: VisualizationResult, locale: Locale, formatValue: (value: unknown, type: string, columnId: string) => string) {
  return {
    ...boundedPlainTextTooltip(),
    formatter: (event: unknown) => {
      const { dataIndex, seriesIndex = 0 } = event as { dataIndex?: number; seriesIndex?: number };
      if (!Number.isInteger(dataIndex) || dataIndex! < 0 || !Number.isInteger(seriesIndex) || seriesIndex < 0) return "";
      const row = result.rows[dataIndex!];
      const extra = seriesIndex > 0 ? result.additional_series?.[seriesIndex - 1] : undefined;
      if (!row || seriesIndex > 0 && !extra) return "";
      const x = result.columns.find(field => field.engine_name === result.category_field);
      const y = result.columns.find(field => field.engine_name === (extra?.field ?? result.value_field));
      if (!x || !y) return "";
      const spec = result.spec;
      const series = spec && "y" in spec && Array.isArray(spec.y) ? spec.y.find(item => item.column_id === y.column_id) : undefined;
      const name = extra?.name || series?.name || y.display_name;
      const category = row[x.engine_name] == null ? translate(locale, "(empty)") : String(row[x.engine_name]);
      const value = formatValue(row[y.engine_name], y.logical_type, y.column_id);
      return plainTextTooltip(`${x.display_name}: ${category}\n${name}: ${value}`);
    },
  };
}
