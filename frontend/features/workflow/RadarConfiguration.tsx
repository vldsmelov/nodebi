"use client";
import { useI18n } from "@/lib/i18n";
import { emptyRadarAxis, radarDraft, type RadarDraft, type RadarAxisDraft } from "@/features/dashboard/radar-draft";
import type { ResolvedColumn } from "./types";

export function RadarConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const { t } = useI18n();
  const spec = radarDraft(config);
  const numeric = (columns ?? []).filter(c => ["integer", "decimal", "float"].includes(c.logical_type));
  const categories = (columns ?? []).filter(c => ["string", "integer", "boolean", "date"].includes(c.logical_type));
  const change = (patch: Partial<RadarDraft>) => onChange({ ...config, spec: { ...spec, ...patch } });
  const updateAxis = (index: number, patch: Partial<RadarAxisDraft>) => change({ axes: spec.axes.map((axis, i) => i === index ? { ...axis, ...patch } : axis) });
  const swap = (index: number, step: number) => { const axes = [...spec.axes]; [axes[index], axes[index + step]] = [axes[index + step], axes[index]]; change({ axes }); };
  const control = "form-control";
  return <section className="space-y-3 text-xs">
    <p>{t("Radar compares one prepared row per profile on 3–8 axes. Aggregate duplicates upstream; up to 20 profiles are supported.")}</p>
    <label className="block">{t("Radar profile")}<select className={control} aria-label={t("Radar profile")} value={spec.profile_column_id} onChange={event => change({ profile_column_id: event.target.value })}>
      <option value="">{t("Select field")}</option>{spec.profile_column_id && !categories.some(c => c.column_id === spec.profile_column_id) && <option value={spec.profile_column_id}>{t("Unavailable field")}</option>}{categories.map(c => <option key={c.column_id} value={c.column_id} disabled={spec.axes.some(axis => axis.column_id === c.column_id)}>{c.display_name}</option>)}
    </select></label>
    <label className="block">{t("Radar normalization")}<select className={control} aria-label={t("Radar normalization")} value={spec.normalization} onChange={event => change({ normalization: event.target.value, ...(event.target.value === "shared" ? { axes: spec.axes.map(axis => ({ ...axis, minimum: spec.axes[0].minimum, maximum: spec.axes[0].maximum })) } : {}) })}>
      <option value="">{t("Choose scales explicitly")}</option><option value="shared">{t("Same units, one common scale")}</option><option value="min_max">{t("Normalize each axis by its bounds")}</option>
    </select></label>
    <p className="text-muted">{t("Different units require normalization. Bounds are explicit, not inferred from visible profiles. Missing values never become zero; out-of-range values must be corrected.")}</p>
    {spec.normalization === "shared" && <div className="grid grid-cols-2 gap-2">{(["minimum", "maximum"] as const).map(key => <label key={key}>{t(key === "minimum" ? "Radar minimum" : "Radar maximum")}<input className={control} inputMode="decimal" aria-label={t(key === "minimum" ? "Radar minimum" : "Radar maximum")} value={spec.axes[0]?.[key] ?? ""} onChange={event => change({ axes: spec.axes.map(axis => ({ ...axis, [key]: event.target.value })) })} /></label>)}</div>}
    {spec.axes.map((axis, index) => <fieldset className="rounded border border-outline p-2" key={index}><legend>{t("Radar axis {0}", { 0: index + 1 })}</legend>
      <select className={control} aria-label={t("Radar axis {0}", { 0: index + 1 })} value={axis.column_id} onChange={event => updateAxis(index, { column_id: event.target.value })}>
        <option value="">{t("Select numeric field")}</option>{axis.column_id && !numeric.some(c => c.column_id === axis.column_id) && <option value={axis.column_id}>{t("Unavailable field")}</option>}{numeric.map(c => <option key={c.column_id} value={c.column_id} disabled={c.column_id === spec.profile_column_id || spec.axes.some((other, i) => i !== index && other.column_id === c.column_id)}>{c.display_name}</option>)}
      </select>
      {spec.normalization === "min_max" && <div className="grid grid-cols-2 gap-2">{(["minimum", "maximum"] as const).map(key => <label key={key}>{t(key === "minimum" ? "Minimum" : "Maximum")}<input className={control} inputMode="decimal" aria-label={t(key === "minimum" ? "Axis {0} minimum" : "Axis {0} maximum", { 0: index + 1 })} value={axis[key]} onChange={event => updateAxis(index, { [key]: event.target.value })} /></label>)}</div>}
      <div className="mt-2 flex gap-3"><button type="button" aria-label={t("Move radar axis {0} up", { 0: index + 1 })} disabled={index === 0} onClick={() => swap(index, -1)}>↑</button><button type="button" aria-label={t("Move radar axis {0} down", { 0: index + 1 })} disabled={index === spec.axes.length - 1} onClick={() => swap(index, 1)}>↓</button><button type="button" disabled={spec.axes.length <= 3} onClick={() => change({ axes: spec.axes.filter((_, i) => i !== index) })}>{t("Remove")}</button></div>
    </fieldset>)}
    <button type="button" disabled={spec.axes.length >= 8} onClick={() => change({ axes: [...spec.axes, { ...emptyRadarAxis(), ...(spec.normalization === "shared" ? { minimum: spec.axes[0].minimum, maximum: spec.axes[0].maximum } : {}) }] })}>{t("Add radar axis")}</button>
  </section>;
}
