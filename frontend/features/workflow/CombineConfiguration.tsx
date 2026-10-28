"use client";

import { useI18n } from "@/lib/i18n";

import { JoinKeysConfiguration, type JoinKey } from "./JoinKeysConfiguration";
import type { ResolvedColumn } from "./types";

type Props = {
  type: string;
  version?: number;
  config: Record<string, unknown>;
  columns: ResolvedColumn[] | null;
  inputColumns?: Record<string, ResolvedColumn[] | null>;
  onChange: (config: Record<string, unknown>) => void;
};
const control = "mt-2 w-full rounded-lg border border-outline bg-control px-2 py-2 text-xs";

export function CombineConfiguration({ type, version = 1, config, columns, inputColumns = {}, onChange }: Props) {
  const { t } = useI18n();
  if (type === "union") return <div className="mt-6"><h2>{t("Union")}</h2><p className="mt-3 text-xs leading-5 text-muted">{t("Connect both inputs. Fields match by name and logical type, in left input order. Rows from the right follow rows from the left. Convert incompatible types upstream.")}</p></div>;
  if (type === "join") return <div className="mt-6"><h2>{t("Join")}</h2>
    {version >= 2 ? <JoinKeysConfiguration keys={(config.keys as JoinKey[] | undefined) ?? [{ left_key: "", right_key: "" }]} left={inputColumns.left ?? []} right={inputColumns.right ?? []} relationship={String(config.relationship ?? "many_to_many")} onKeys={keys => onChange({ ...config, keys })} onRelationship={relationship => onChange({ ...config, relationship })} /> : (["left", "right"] as const).map(port => <label key={port} className="mt-3 block text-xs">{port === "left" ? t("Left key") : t("Right key")}<select aria-label={t("{0} join key", {"0": t(port)})} className={control} value={String(config[`${port}_key`] ?? "")} onChange={e => onChange({ ...config, [`${port}_key`]: e.target.value })}><option value="">{t("Select key")}</option>{inputColumns[port]?.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name} · {t(c.logical_type)}</option>)}</select></label>)}

    <label className="mt-3 block text-xs">{t("Join type")}<select aria-label={t("Join type")} className={control} value={String(config.how ?? "inner")} onChange={e => onChange({ ...config, how: e.target.value })}><option value="inner">{t("Inner — matching rows")}</option><option value="left">{t("Left — retain all left rows")}</option></select></label>
    <p className="mt-3 text-xs leading-5 text-muted">{t("Keys must have matching types. Empty keys never match. Duplicate keys produce all matching pairs. Conflicting right fields receive a __right suffix; both keys remain.")}</p>
  </div>;
  return <div className="mt-6"><h2>{t(version === 2 ? "Exact Pivot" : "Pivot")}</h2>{([
    ["index_column_id", "Index field"], ["pivot_column_id", "Pivot field"], ["value_column_id", "Pivot value field"],
  ] as const).map(([key, label]) => <label key={key} className="mt-3 block text-xs">{t(label)}<select aria-label={t(label)} className={control} value={String(config[key] ?? "")} onChange={e => onChange({ ...config, [key]: e.target.value })}><option value="">{t("Select field")}</option>{columns?.map(c => <option key={c.column_id} value={c.column_id} disabled={version === 2 && key === "value_column_id" && config.operation !== "count" && !["integer", "decimal", "unknown"].includes(c.logical_type)}>{c.display_name}</option>)}</select></label>)}
    <label className="mt-3 block text-xs">{t("Aggregation")}<select aria-label={t("Pivot aggregation")} className={control} value={String(config.operation ?? "sum")} onChange={e => onChange({ ...config, operation: e.target.value })}>{["sum", "count", "average", "min", "max"].map(operation => <option key={operation} value={operation}>{t(operation)}</option>)}</select></label>
    {version === 2 && config.operation === "average" && <label className="mt-3 block text-xs">{t("Average decimal places")}<input aria-label={t("Average decimal places")} className={control} type="number" min={0} max={38} step={1} value={String(config.average_scale ?? 6)} onChange={e => onChange({ ...config, average_scale: e.target.value === "" ? "" : Number(e.target.value) })} /></label>}
    {version === 2 && <p className="mt-3 text-xs leading-5 text-muted">{t("Exact Pivot preserves decimal and integer sums and extrema. Averages round once, ties to even. Float64 is not converted. Empty cells stay empty; count returns zero and excludes empty observations.")}</p>}
    <p className="mt-3 text-xs leading-5 text-muted">{t("Output fields depend on saved input values. Maximum 128 distinct pivot values. Count excludes empty values; missing sums stay empty.")}</p>
  </div>;
}
