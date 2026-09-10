import type { ResolvedColumn } from "./types";

export function VisualizationConfiguration({ type, config, columns, onChange }: {
  type: string; config: Record<string, unknown>; columns: ResolvedColumn[] | null;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const control = "mt-2 w-full rounded-lg border border-white/10 bg-[#151b12] px-2 py-2 text-xs";
  return <div className="mt-6"><h2>{type === "kpi" ? "KPI" : "Bar Chart"}</h2>
    <label className="mt-3 block text-xs">Title<input aria-label="Chart title" className={control} value={String(config.title ?? "")} onChange={e => onChange({ ...config, title: e.target.value })} /></label>
    {type === "bar_chart" ? <label className="mt-3 block text-xs">Category<select aria-label="Chart category" className={control} value={String(config.category_column_id ?? "")} onChange={e => onChange({ ...config, category_column_id: e.target.value })}><option value="">Select field</option>{columns?.map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}</select></label> : <p className="mt-3 text-xs text-white/40">Connect a Group By with no dimensions to produce one total row.</p>}
    <label className="mt-3 block text-xs">Value<select aria-label="Chart value" className={control} value={String(config.value_column_id ?? "")} onChange={e => onChange({ ...config, value_column_id: e.target.value })}><option value="">Select numeric field</option>{columns?.filter(c => ["integer", "float", "unknown"].includes(c.logical_type)).map(c => <option key={c.column_id} value={c.column_id}>{c.display_name}</option>)}</select></label>
    <label className="mt-3 block text-xs">Number format<select aria-label="Number format" className={control} value={String(config.number_format ?? "number")} onChange={e => onChange({ ...config, number_format: e.target.value })}><option value="number">Number</option><option value="currency">Currency</option><option value="percent">Percent</option></select></label>
    <label className="mt-3 block text-xs">Decimal places<input aria-label="Decimal places" className={control} type="number" min={0} max={8} value={Number(config.decimals ?? 2)} onChange={e => onChange({ ...config, decimals: Number(e.target.value) })} /></label>
    {config.number_format === "currency" ? <label className="mt-3 block text-xs">Currency<input aria-label="Currency" className={control} maxLength={3} value={String(config.currency ?? "USD")} onChange={e => onChange({ ...config, currency: e.target.value.toUpperCase() })} /></label> : null}
  </div>;
}
