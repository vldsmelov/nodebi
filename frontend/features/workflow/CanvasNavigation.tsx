"use client";
import { ControlButton, Controls, useReactFlow, type Viewport } from "@xyflow/react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const directions = [
  { label: "View left", x: 200, y: 0, Icon: ArrowLeft },
  { label: "View right", x: -200, y: 0, Icon: ArrowRight },
  { label: "View up", x: 0, y: 200, Icon: ArrowUp },
  { label: "View down", x: 0, y: -200, Icon: ArrowDown },
] as const;
export function panViewport(viewport: Viewport, x: number, y: number): Viewport {
  return { ...viewport, x: viewport.x + x, y: viewport.y + y };
}

/** View-only navigation: no node-position mutations, graph saves or layout history entries. */
export function CanvasNavigation() {
  const { t } = useI18n();
  const flow = useReactFlow();
  return <Controls>{directions.map(({ label, x, y, Icon }) => <ControlButton key={label} aria-label={t(label)} title={t(label)} onClick={() => {
    void flow.setViewport(panViewport(flow.getViewport(), x, y), { duration: 0 });
  }}><Icon aria-hidden="true" /></ControlButton>)}</Controls>;
}
