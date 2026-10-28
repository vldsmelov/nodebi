"use client";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import type { VisualizationResult } from "./api";
import { radarField, radarRow, radarUnit } from "./radar";

export function RadarView({ result, children, onSelect }: { result: VisualizationResult; children: ReactNode; onSelect?: (row: Record<string, unknown>) => void }) {
  const { t, cell } = useI18n();
  const [view, setView] = useState<"chart" | "profiles" | "scales">("chart");
  const spec = result.spec, radar = result.radar;
  if (spec?.type !== "radar_chart" || !radar) return <p role="alert">{t("The statistical field is unavailable. Reload the visualization.")}</p>;
  const axes = spec.axes.map(axis => radarField(result, axis.column_id)), profileField = radarField(result, spec.profile_column_id);
  const tableLabel = [result.title, t(view === "scales" ? "Axis scales" : "Profile table")].filter(Boolean).join(" · ");
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
    <div className="flex flex-wrap gap-2 px-4 py-1 text-xs">{([["chart", "Chart"], ["profiles", "Profile table"], ["scales", "Axis scales"]] as const).map(([key, label]) => <button className="rounded border border-outline px-2 py-1" aria-pressed={view === key} key={key} onClick={() => setView(key)}>{t(label)}</button>)}</div>
    <p className="px-4 text-xs text-muted">{t(spec.normalization === "min_max" ? "Each axis shows position within its configured range, not a common unit or a score." : "All axes share units and bounds. Distance from the centre starts at the configured minimum.")}</p>
    {radar.incomplete_count > 0 && <p className="px-4 text-xs" role="status">{t("{0} incomplete profiles are shown only in the table; missing axes are not zero.", { 0: radar.incomplete_count })}</p>}
    {view === "profiles" ? <div tabIndex={0} role="region" aria-label={tableLabel} className="min-h-0 min-w-0 flex-1 overflow-auto p-3"><table className="min-w-full text-sm"><caption className="sr-only">{tableLabel}</caption><thead><tr><th scope="col" className="p-2 text-left">{profileField.display_name}</th>{axes.map(column => <th scope="col" className="p-2 text-right" key={column.column_id}>{column.display_name}{radarUnit(column.metadata) && ` (${radarUnit(column.metadata)})`}</th>)}<th scope="col">{t("Status")}</th>{onSelect && <th scope="col">{t("Selection")}</th>}</tr></thead><tbody>{radar.profiles.map(profile => {
      const row = radarRow(result, profile.id)!;
      return <tr key={profile.id}><th scope="row" className="border-t border-outline p-2 text-left font-normal">{cell(profile.category, profileField.logical_type)}</th>{axes.map(column => <td className="border-t border-outline p-2 text-right tabular-nums" key={column.column_id}>{row[column.engine_name] == null ? "—" : String(row[column.engine_name])}</td>)}<td className="border-t border-outline p-2">{t(profile.complete ? "Complete profile" : "Missing measure")}</td>{onSelect && <td><button className="rounded border border-outline px-2 py-1" onClick={() => onSelect(Object.fromEntries(result.columns.map(column => [column.column_id, row[column.engine_name]])))}>{t("Select")}</button></td>}</tr>;
    })}</tbody></table>{!radar.profiles.length && <p>{t("No rows on this page.")}</p>}</div> : view === "scales" ? <div tabIndex={0} role="region" aria-label={tableLabel} className="min-h-0 min-w-0 flex-1 overflow-auto p-3"><table className="min-w-full text-sm"><caption className="sr-only">{tableLabel}</caption><thead><tr>{["Axis", "Minimum", "Maximum", "Unit"].map(label => <th scope="col" className={`p-2 ${label === "Minimum" || label === "Maximum" ? "text-right" : "text-left"}`} key={label}>{t(label)}</th>)}</tr></thead><tbody>{spec.axes.map((axis, index) => <tr key={axis.column_id}><th scope="row" className="p-2 text-left font-normal">{axes[index].display_name}</th><td className="p-2 text-right tabular-nums">{axis.minimum}</td><td className="p-2 text-right tabular-nums">{axis.maximum}</td><td className="p-2">{radarUnit(axes[index].metadata) || t("Not specified")}</td></tr>)}</tbody></table></div>
      : radar.profiles.some(profile => profile.complete) ? <div className="min-h-40 flex-1">{children}</div> : <p className="p-4">{t("No complete profiles to plot. Inspect the profile table.")}</p>}
  </div>;
}
