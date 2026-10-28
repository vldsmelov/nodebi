"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export type DataState = "empty" | "loading" | "incomplete" | "error" | "previous";
const stateLabels: Record<DataState, string> = {
  empty: "No data yet", loading: "Loading data", incomplete: "Finish configuration",
  error: "Calculation failed", previous: "Showing the previous result",
};

export function DataStatePanel({ state, children, action, title, focusOnMount = false }: { state: DataState; children?: ReactNode; action?: ReactNode; title?: string; focusOnMount?: boolean }) {
  const { t } = useI18n();
  const panel = useRef<HTMLElement>(null);
  const titleId = useId();
  useEffect(() => { if (focusOnMount) panel.current?.focus(); }, [focusOnMount]);
  return <section ref={panel} tabIndex={focusOnMount ? -1 : undefined} aria-labelledby={titleId} role={state === "error" ? "alert" : "status"} aria-busy={state === "loading"}
    className={`rounded-xl border border-outline p-5 ${state === "error" ? "bg-danger-surface text-danger" : "bg-panel text-foreground"}`}>
    <h2 id={titleId} className="font-semibold">{t(title ?? stateLabels[state])}</h2>
    {children && <div className="mt-2 text-sm">{children}</div>}
    {action && <div className="mt-4">{action}</div>}
  </section>;
}

export function WizardSteps({ labels, current }: { labels: readonly string[]; current: number }) {
  const { t } = useI18n();
  return <ol aria-label={t("Progress")} className="flex flex-wrap gap-3 text-sm">
    {labels.map((label, index) => <li key={label} aria-current={index === current ? "step" : undefined}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 ${index === current ? "bg-primary text-on-primary" : "bg-panel text-muted"}`}>
      <span aria-hidden="true">{index + 1}.</span>{t(label)}
    </li>)}
  </ol>;
}

/** A step transition starts reading/tab navigation at its content, not the old action row. */
export function WizardHeading({ stage, children, className }: { stage: string | number; children: ReactNode; className?: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [stage]);
  return <h2 ref={heading} tabIndex={-1} className={className}>{children}</h2>;
}

export function TableDensity({ value, onChange }: { value: "normal" | "compact"; onChange: (value: "normal" | "compact") => void }) {
  const { t } = useI18n();
  const id = useId();
  return <label htmlFor={id} className="flex items-center gap-2 text-sm">{t("Table density")}
    <select id={id} className="form-control max-w-40" value={value} onChange={event => onChange(event.target.value === "compact" ? "compact" : "normal")}>
      <option value="normal">{t("Comfortable")}</option><option value="compact">{t("Compact")}</option>
    </select>
  </label>;
}
