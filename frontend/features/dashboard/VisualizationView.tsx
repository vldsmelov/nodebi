"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { getVisualizationResult, type VisualizationResult } from "./api";

function format(value: unknown, result: VisualizationResult): string {
  if (value === null || value === undefined) return "No value";
  if (typeof value !== "number") return String(value);
  try {
    return new Intl.NumberFormat(undefined, {
      style: result.number_format === "number" ? "decimal" : result.number_format,
      currency: result.currency, minimumFractionDigits: result.decimals,
      maximumFractionDigits: result.decimals,
    }).format(value);
  } catch { return value.toFixed(result.decimals); }
}

function BarChart({ result }: { result: VisualizationResult }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import("echarts").then(echarts => {
      if (disposed || !ref.current) return;
      const chart = echarts.init(ref.current, "dark");
      chart.setOption({
        backgroundColor: "transparent", aria: { enabled: true },
        tooltip: { trigger: "axis", renderMode: "richText" },
        grid: { left: 55, right: 20, bottom: 55, top: 20 },
        xAxis: { type: "category", data: result.rows.map(row => String(row[result.category_field!] ?? "(empty)")), axisLabel: { rotate: 20 } },
        yAxis: { type: "value" },
        series: [{ type: "bar", name: result.value_field, data: result.rows.map(row => row[result.value_field]), itemStyle: { color: "#b7ff5a" } }],
      });
      const observer = new ResizeObserver(() => chart.resize());
      observer.observe(ref.current);
      cleanup = () => { observer.disconnect(); chart.dispose(); };
    });
    return () => { disposed = true; cleanup?.(); };
  }, [result]);
  return <div ref={ref} role="img" aria-label={result.title || "Bar Chart"} className="h-full min-h-40 w-full" />;
}

export function VisualizationView({ id, revision }: { id: string; revision?: number }) {
  const query = useQuery({ queryKey: ["visualization-result", id, revision], queryFn: () => getVisualizationResult(id), retry: false });
  if (query.isPending) return <p className="p-5 text-sm text-white/40">Loading visualization…</p>;
  if (query.error) return <div className="p-5 text-sm text-red-200" role="alert">{query.error.message}<button onClick={() => void query.refetch()} className="mt-3 block underline">Retry visualization</button></div>;
  const result = query.data;
  return <div className="flex h-full min-h-0 flex-col"><h3 className="px-4 pt-2 text-sm text-white/70">{result.title}</h3>{result.type === "kpi" ? <div className="grid flex-1 place-items-center p-5 text-4xl font-semibold text-[#b7ff5a]" data-testid="kpi-value">{format(result.rows[0]?.[result.value_field], result)}</div> : <div className="min-h-0 flex-1"><BarChart result={result} /></div>}</div>;
}
