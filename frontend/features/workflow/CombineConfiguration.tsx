import type { ResolvedColumn } from "./types";

type Props = {
  type: string;
  config: Record<string, unknown>;
  columns: ResolvedColumn[] | null;
  inputColumns?: Record<string, ResolvedColumn[] | null>;
  onChange: (config: Record<string, unknown>) => void;
};
const control = "mt-2 w-full rounded-lg border border-white/10 bg-[#151b12] px-2 py-2 text-xs";

export function CombineConfiguration({ type, config, columns, inputColumns = {}, onChange }: Props) {
  if (type === "union") return <div className="mt-6"><h2>Union</h2><p className="mt-3 text-xs leading-5 text-white/40">Connect both inputs. Fields match by name and logical type, in left input order. Rows from the right follow rows from the left. Convert incompatible types upstream.</p></div>;
  if (type === "join") return <div className="mt-6"><h2>Join</h2>
    {(["left", "right"] as const).map(port => <label key={port} className="mt-3 block text-xs">{port === "left" ? "Left key" : "Right key"}<select aria-label={`${port} join key`} className={control} value={String(config[`${port}_key`] ?? "")} onChange={e => onChange({ ...config, [`${port}_key`]: e.target.value })}><option value="">Select key</option>{inputColumns[port]?.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name} · {c.logical_type}</option>)}</select></label>)}
    <label className="mt-3 block text-xs">Join type<select aria-label="Join type" className={control} value={String(config.how ?? "inner")} onChange={e => onChange({ ...config, how: e.target.value })}><option value="inner">Inner — matching rows</option><option value="left">Left — retain all left rows</option></select></label>
    <p className="mt-3 text-xs leading-5 text-white/40">Keys must have matching types. Empty keys never match. Duplicate keys produce all matching pairs. Conflicting right fields receive a __right suffix; both keys remain.</p>
  </div>;
  return <div className="mt-6"><h2>Pivot</h2>{([
    ["index_column_id", "Index field"], ["pivot_column_id", "Pivot field"], ["value_column_id", "Pivot value field"],
  ] as const).map(([key, label]) => <label key={key} className="mt-3 block text-xs">{label}<select aria-label={label} className={control} value={String(config[key] ?? "")} onChange={e => onChange({ ...config, [key]: e.target.value })}><option value="">Select field</option>{columns?.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}</select></label>)}
    <label className="mt-3 block text-xs">Aggregation<select aria-label="Pivot aggregation" className={control} value={String(config.operation ?? "sum")} onChange={e => onChange({ ...config, operation: e.target.value })}>{["sum", "count", "average", "min", "max"].map(operation => <option key={operation} value={operation}>{operation}</option>)}</select></label>
    <p className="mt-3 text-xs leading-5 text-white/40">Output fields depend on saved input values. Maximum 128 distinct pivot values. Count excludes empty values; missing sums stay empty.</p>
  </div>;
}
