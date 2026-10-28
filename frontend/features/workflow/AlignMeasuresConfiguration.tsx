"use client";

import { useI18n } from "@/lib/i18n";
import { JoinKeysConfiguration, type JoinKey } from "./JoinKeysConfiguration";
import type { ResolvedColumn } from "./types";

export function AlignMeasuresConfiguration({ config, inputColumns = {}, onChange }: {
  config: Record<string, unknown>; inputColumns?: Record<string, ResolvedColumn[] | null>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const { t } = useI18n();
  const keys = (config.keys as JoinKey[] | undefined) ?? [{ left_key: "", right_key: "" }];
  const choices = (side: string) => (inputColumns[side] ?? []).filter(c => ["string", "integer", "date", "boolean"].includes(c.logical_type));
  return <section className="mt-5 space-y-3"><h2>{t("Align measures")}</h2>
    <p className="text-sm text-muted">{t("Keep all keys from both prepared results. Each side must have one row per key. Missing values stay empty; presence flags distinguish a missing row from an empty measure.")}</p>
    <JoinKeysConfiguration keys={keys} left={choices("left")} right={choices("right")} relationship="one_to_one" maxKeys={8} onKeys={value => onChange({ ...config, keys: value })} />
    {(["left", "right"] as const).map(side => {
      const field = `${side}_value`, name = `${side}_name`;
      const value = String(config[field] ?? "");
      const numeric = (inputColumns[side] ?? []).filter(c => ["integer", "float", "decimal"].includes(c.logical_type));
      return <fieldset key={side} className="space-y-2"><legend>{t(side)}</legend>
        <label className="block">{t(side === "left" ? "Left measure" : "Right measure")}<select className="form-control" value={value} onChange={e => onChange({ ...config, [field]: e.target.value })}><option value="">{t("Select numeric field")}</option>{value && !numeric.some(c => c.column_id === value) && <option value={value}>{t("Unavailable")}</option>}{numeric.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}</select></label>
        <label className="block">{t(side === "left" ? "Left measure name" : "Right measure name")}<input className="form-control" value={String(config[name] ?? (side === "left" ? "Left measure" : "Right measure"))} onChange={e => onChange({ ...config, [name]: e.target.value })} /></label>
      </fieldset>;
    })}
    <label className="block">{t("Empty alignment keys")}<select className="form-control" value={String(config.null_keys ?? "reject")} onChange={e => onChange({ ...config, null_keys: e.target.value })}><option value="reject">{t("Reject empty keys")}</option><option value="match">{t("Match empty keys explicitly")}</option></select></label>
  </section>;
}
