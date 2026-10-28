"use client";
import { useI18n } from "@/lib/i18n";
import { bulletDraft, type BulletDraft } from "@/features/dashboard/bullet-draft";
import type { ResolvedColumn } from "./types";

export function BulletConfiguration({ config, columns, onChange }: { config: Record<string, unknown>; columns: ResolvedColumn[] | null; onChange: (config: Record<string, unknown>) => void }) {
  const { t } = useI18n(), spec = bulletDraft(config);
  const change = (patch: Partial<BulletDraft>) => onChange({ ...config, orientation: "vertical", spec: { ...spec, ...patch } });
  const update = (index: number, patch: Partial<BulletDraft["bands"][number]>) => change({ bands: spec.bands.map((band, i) => i === index ? { ...band, ...patch } : band) });
  return <section className="space-y-3 text-xs">
    <p>{t("Compare prepared actual and target with explicit ranges. One row per category; aggregate or align upstream.")}</p>
    {([['category_column_id', 'Bullet category', false], ['actual_column_id', 'Actual field', true], ['target_column_id', 'Target field', true]] as const).map(([role, label, numeric]) => {
      const fields = (columns ?? []).filter(c => (numeric ? ["integer", "float", "decimal"] : ["integer", "string", "date", "boolean"]).includes(c.logical_type));
      return <label className="block" key={role}>{t(label)}<select className="form-control" aria-label={t(label)} value={spec[role]} onChange={event => change({ [role]: event.target.value })}><option value="">{t("Select field")}</option>{spec[role] && !fields.some(c => c.column_id === spec[role]) && <option value={spec[role]}>{t("Unavailable field")}</option>}{fields.map(c => <option key={c.column_id} value={c.column_id} disabled={numeric ? c.column_id === spec.category_column_id : [spec.actual_column_id, spec.target_column_id].includes(c.column_id)}>{c.display_name}</option>)}</select></label>;
    })}
    <p>{t("Actual, target and ranges share one scale and unit. Values outside the scale are rejected, not clipped.")}</p>
    <div className="grid grid-cols-2 gap-2"><label>{t("Scale minimum")}<input className="form-control" aria-label={t("Scale minimum")} maxLength={78} value={spec.minimum} onChange={e => change({ minimum: e.target.value })} /></label><label>{t("Scale maximum")}<input className="form-control" aria-label={t("Scale maximum")} maxLength={78} value={spec.maximum} onChange={e => change({ maximum: e.target.value, bands: spec.bands.map((band, i) => i === spec.bands.length - 1 ? { ...band, upper: e.target.value } : band) })} /></label></div>
    <p>{t("Include zero. Ranges include their lower bound and exclude the upper bound, except the final maximum. Colours are assigned by the author, not inferred from growth.")}</p>
    {spec.bands.map((band, index) => <fieldset key={index} className="space-y-2 rounded border border-outline p-2"><legend>{t("Bullet range {0}", { 0: index + 1 })}</legend>
      <label>{t("Range label")}<input className="form-control" aria-label={t("Range label {0}", { 0: index + 1 })} maxLength={80} value={band.label} onChange={e => update(index, { label: e.target.value })} /></label>
      <label>{t("Upper bound")}<input className="form-control" aria-label={t("Range upper bound {0}", { 0: index + 1 })} maxLength={78} readOnly={index === spec.bands.length - 1} value={band.upper} onChange={e => update(index, { upper: e.target.value })} /></label>
      <label>{t("Range tone")}<select className="form-control" aria-label={t("Range tone {0}", { 0: index + 1 })} value={band.tone} onChange={e => update(index, { tone: e.target.value as BulletDraft["bands"][number]["tone"] })}>{["neutral", "negative", "warning", "positive"].map(tone => <option key={tone} value={tone}>{t({ neutral: "Neutral", negative: "Negative", warning: "Warning", positive: "Positive" }[tone]!)}</option>)}</select></label>
      <button type="button" disabled={spec.bands.length === 1} onClick={() => change({ bands: spec.bands.filter((_, i) => i !== index).map((b, i, all) => i === all.length - 1 ? { ...b, upper: spec.maximum } : b) })}>{t("Remove")}</button>
    </fieldset>)}
    <button type="button" disabled={spec.bands.length === 5} onClick={() => change({ bands: [...spec.bands.slice(0, -1), { label: "", upper: "", tone: "neutral" }, spec.bands.at(-1)!] })}>{t("Add range")}</button>
  </section>;
}
