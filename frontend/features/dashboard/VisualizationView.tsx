"use client";

import { useQuery } from "@tanstack/react-query";
import type { EChartsOption } from "echarts";
import { useEffect, useRef, useState } from "react";
import { getVisualizationResult, type VisualizationResult } from "./api";

function format(value: unknown, result: VisualizationResult): string {
  if (value === null || value === undefined) return "—";
  if (typeof value !== "number") return String(value);
  try {
    return new Intl.NumberFormat(undefined, {
      style: result.number_format === "number" ? "decimal" : result.number_format,
      currency: result.currency, minimumFractionDigits: result.decimals,
      maximumFractionDigits: result.decimals,
    }).format(value);
  } catch { return value.toFixed(result.decimals); }
}

export function chartOptions(result: VisualizationResult): EChartsOption {
  const x = result.category_field!;
  const y = result.value_field!;
  const base: EChartsOption = {
    backgroundColor: "transparent", aria: { enabled: true, label: { description: result.title || result.type } },
    tooltip: { trigger: "item", renderMode: "richText" },
    legend: { show: result.show_legend, bottom: 0, type: "scroll" },
  };
  if (["pie_chart", "donut_chart"].includes(result.type)) return {
    ...base, series: [{ type: "pie", radius: result.type === "donut_chart" ? ["40%", "65%"] : "65%",
      label: { show: result.show_labels },
      data: result.rows.map(row => ({ name: String(row[x] ?? "(empty)"), value: Number(row[y] ?? 0) })),
    }],
  };
  const xType = result.columns.find(c => c.engine_name === x)?.logical_type;
  const scatter = result.type === "scatter_chart";
  const line = ["line_chart", "area_chart"].includes(result.type);
  const temporal = line && ["date", "datetime"].includes(xType ?? "");
  const numeric = scatter || (line && ["integer", "float"].includes(xType ?? ""));
  const points = result.rows.map(row => temporal || numeric ? [row[x], row[y]] : row[y]);
  return {
    ...base, grid: { left: 70, right: 20, bottom: 65, top: 25 },
    xAxis: { type: temporal ? "time" : numeric ? "value" : "category",
      data: temporal || numeric ? undefined : result.rows.map(row => String(row[x] ?? "(empty)")),
      axisLabel: { rotate: temporal || numeric ? 0 : 20 },
    },
    yAxis: { type: "value", axisLabel: { formatter: value => format(value, result) } },
    series: [{ type: scatter ? "scatter" : line ? "line" : "bar", name: y,
      data: points, itemStyle: { color: "#b7ff5a" },
      label: { show: result.show_labels, position: "top" },
      ...(result.type === "area_chart" ? { areaStyle: { opacity: 0.3 } } : {}),
    }],
  } as EChartsOption;
}

function Chart({ result }: { result: VisualizationResult }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import("echarts").then(echarts => {
      if (disposed || !ref.current) return;
      const chart = echarts.init(ref.current, "dark");
      const observer = new ResizeObserver(() => chart.resize());
      cleanup = () => { observer.disconnect(); chart.dispose(); };
      chart.setOption(chartOptions(result));
      observer.observe(ref.current);
    }).catch(() => { if (!disposed) setError("The chart could not be rendered. Reload to retry."); });
    return () => { disposed = true; cleanup?.(); };
  }, [result]);
  if (error) return <p role="alert" className="p-5 text-red-200">{error}</p>;
  return <div ref={ref} role="img" aria-label={result.title || result.type} className="h-full min-h-40 w-full" />;
}

function VisualizationPanel({ id, revision, titleOverride, hideTitle }: { id: string; revision?: number; titleOverride?: string; hideTitle?: boolean }) {
  const [offset, setOffset] = useState(0);
  const query = useQuery({ queryKey: ["visualization-result", id, revision, offset], queryFn: () => getVisualizationResult(id, offset), retry: false });
  if (query.isPending) return <p className="p-5 text-sm text-white/40">Loading visualization…</p>;
  if (query.error) return <div className="p-5 text-sm text-red-200" role="alert">{query.error.message}<button onClick={() => void query.refetch()} className="mt-3 block underline">Retry visualization</button></div>;
  const result = query.data;
  return <div className="flex h-full min-h-0 flex-col">{!hideTitle ? <h3 className="px-4 pt-2 text-sm text-white/70">{titleOverride ?? result.title}</h3> : null}
    {result.type === "table" ? <>
      <div className="min-h-0 flex-1 overflow-auto p-3"><table className="min-w-full text-xs"><thead><tr>{result.columns.map(column => <th key={column.column_id} className="border-b border-white/15 px-3 py-2 text-left">{column.display_name}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index}>{result.columns.map(column => <td key={column.column_id} className="border-b border-white/5 px-3 py-2 whitespace-nowrap">{format(row[column.engine_name], result)}</td>)}</tr>)}</tbody></table>{!result.rows.length ? <p className="mt-3 text-white/40">No rows on this page.</p> : null}</div>
      <div className="flex items-center justify-between gap-3 p-3 text-xs"><button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 100))} className="disabled:opacity-30">Previous page</button><span>{result.total_rows} total rows · page {Math.floor(offset / 100) + 1}</span><button disabled={!result.truncated} onClick={() => setOffset(offset + 100)} className="disabled:opacity-30">Next page</button></div>
    </> : result.type === "kpi" ? <div className="grid flex-1 place-items-center p-5 text-4xl font-semibold text-[#b7ff5a]" data-testid="kpi-value">{result.rows[0]?.[result.value_field!] == null ? "No value" : format(result.rows[0][result.value_field!], result)}</div> : result.rows.length ? <div className="min-h-0 flex-1"><Chart result={result} /></div> : <p className="p-5 text-white/40">No rows to visualize.</p>}
  </div>;
}

export function VisualizationView(props: { id: string; revision?: number; titleOverride?: string; hideTitle?: boolean }) {
  return <VisualizationPanel key={`${props.id}:${props.revision}`} {...props} />;
}
