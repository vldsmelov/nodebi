"use client";
import { useI18n } from "@/lib/i18n";
export function CalendarConfiguration({ config, onChange }: { config: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  const { t } = useI18n();
  return <div>{(["start", "end", "name"] as const).map(key => <label key={key} className="mt-3 block">{t(key === "start" ? "Start date" : key === "end" ? "End date" : "Output field name")}<input className="my-2 w-full rounded border border-outline bg-control p-2" type={key === "name" ? "text" : "date"} value={String(config[key] ?? (key === "name" ? "Date" : ""))} onChange={event => onChange({ ...config, [key]: event.target.value })} /></label>)}</div>;
}
