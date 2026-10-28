"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { choiceLabels } from "./choice-labels";

type Position = { x: number; y: number };
type Item = { id: string; label: string; position: Position };
const directions = [
  { label: "Move item left", x: -20, y: 0 },
  { label: "Move item right", x: 20, y: 0 },
  { label: "Move item up", x: 0, y: -20 },
  { label: "Move item down", x: 0, y: 20 },
] as const;

/** Presentation-only controls; the owning editor supplies its ordinary graph change path. */
export function CanvasPlacement({ items, move }: { items: Item[]; move: (id: string, position: Position) => void }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState("");
  const item = items.find(candidate => candidate.id === selected);
  return <details className="mb-4 rounded-lg border border-outline p-3">
    <summary className="cursor-pointer text-sm">{t("Move without dragging")}</summary>
    <p className="my-2 text-xs text-muted">{t("Choose a visible item and move it in steps of 20. Calculations do not change.")}</p>
    <select aria-label={t("Layout item")} className="mb-2 w-full min-w-0 rounded border border-outline bg-control p-2 text-sm" value={item?.id ?? ""} onChange={event => setSelected(event.target.value)}>
      <option value="">{t("Select node")}</option>
      {choiceLabels(items).map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.label} ({candidate.position.x}, {candidate.position.y})</option>)}
    </select>
    <div className="flex flex-wrap gap-2">
      {directions.map(direction => <button key={direction.label} type="button" disabled={!item} className="min-h-10 rounded border border-outline px-2 py-1 text-xs disabled:opacity-40" onClick={() => {
        if (item) move(item.id, { x: item.position.x + direction.x, y: item.position.y + direction.y });
      }}>{t(direction.label)}</button>)}
    </div>
    <p role="status" className="mt-2 text-xs tabular-nums">{item ? t("Position: {0}, {1}", { 0: item.position.x, 1: item.position.y }) : ""}</p>
  </details>;
}
