"use client";
import { useI18n } from "@/lib/i18n";
import type { components } from "@/lib/api-schema";

export function HeatmapAppearance({ config, onChange }: { config: Record<string, unknown>; onChange: (config: Record<string, unknown>) => void }) {
  const { t } = useI18n();
  const spec = config.spec as components["schemas"]["HeatmapSpec"] | undefined;
  const scale = spec?.color_scale ?? { mode: "extent" };
  if (!spec || spec.type !== "heatmap_chart") return null;
  const change = (color_scale: components["schemas"]["HeatmapColorScale"]) => onChange({ ...config, spec: { ...spec, color_scale } });
  return <fieldset className="mt-3 space-y-2 text-xs"><legend>{t("Colour scale")}</legend>
    <label className="block">{t("Colour range")}<select className="form-control" aria-label={t("Colour range")} value={scale.mode} onChange={event => change(event.target.value === "fixed" ? { mode: "fixed", minimum: "0", maximum: "1" } : { mode: event.target.value as "extent" | "zero_centered" })}>
      <option value="extent">{t("Data minimum to maximum")}</option><option value="zero_centered">{t("Symmetric around zero")}</option><option value="fixed">{t("Fixed colour bounds")}</option>
    </select></label>
    {scale.mode === "fixed" && (["minimum", "maximum"] as const).map(key => <label key={key} className="block">{t(key === "minimum" ? "Colour minimum" : "Colour maximum")}<input className="form-control" inputMode="decimal" aria-label={t(key === "minimum" ? "Colour minimum" : "Colour maximum")} value={scale[key] ?? ""} onChange={event => change({ ...scale, [key]: event.target.value })} /></label>)}
    <p>{t("Fixed bounds saturate colours outside the range, without filtering or changing values. Tables and tooltips retain exact values.")}</p>
  </fieldset>;
}
