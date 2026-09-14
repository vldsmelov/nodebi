"use client";

import { useI18n } from "@/lib/i18n";

import { ArrowRight, BarChart3, GitBranch, Sheet } from "lucide-react";
import Link from "next/link";

const steps = [
  { icon: Sheet, label: "Import", detail: "Bring your Excel workbook" },
  { icon: GitBranch, label: "Transform", detail: "Shape data in a visual flow" },
  { icon: BarChart3, label: "Explain", detail: "Build charts and dashboards" },
];

export default function Home() {
  const { t } = useI18n();
  return (
    <main className="min-h-[calc(100vh-2.75rem)] overflow-hidden bg-page text-foreground">
      <div className="glow" />
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-10">
        <Link className="flex items-center gap-3 text-lg font-semibold tracking-tight" href="/">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-on-primary">
            <GitBranch size={19} strokeWidth={2.4} />
          </span>{t("Node BI")}</Link>
        <span className="rounded-full border border-outline bg-raised px-3 py-1.5 text-xs text-muted">{t("MVP workspace")}</span>
      </nav>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-16 px-6 pb-24 pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pt-28">
        <div>
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.28em] text-accent">{t("Visual analytics · no code required")}</p>
          <h1 className="max-w-3xl text-5xl font-medium leading-[0.98] tracking-[-0.055em] sm:text-7xl">{t("Turn spreadsheets into clear decisions.")}</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted">{t("Build repeatable data workflows, inspect every step, and compose dashboards without hiding the logic.")}</p>
          <Link
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover"
            href="/projects"
          >{t("Create your first project")}{" "}<ArrowRight size={17} />
          </Link>
        </div>

        <div className="relative rounded-[2rem] border border-outline bg-raised p-5 shadow-2xl shadow-shade/40 backdrop-blur">
          <div className="mb-5 flex items-center justify-between border-b border-outline pb-4">
            <span className="text-sm font-medium">{t("Your analysis, connected")}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{t("Live canvas")}</span>
          </div>
          <div className="space-y-3">
            {steps.map(({ icon: Icon, label, detail }, index) => (
              <div className="relative flex items-center gap-4 rounded-2xl border border-outline bg-surface p-4" key={label}>
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                  <Icon size={20} />
                </span>
                <div>
                  <p className="font-medium">{t(label)}</p>
                  <p className="mt-0.5 text-sm text-muted">{t(detail)}</p>
                </div>
                <span className="ml-auto font-mono text-xs text-muted">0{index + 1}</span>
                {index < steps.length - 1 ? <span className="node-line" /> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
