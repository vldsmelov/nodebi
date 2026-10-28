"use client";

import { ArrowRight, BarChart3, GitBranch, Sheet } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const steps = [
  { icon: Sheet, label: "Import", detail: "Bring your Excel workbook" },
  { icon: GitBranch, label: "Transform", detail: "Shape data in a visual flow" },
  { icon: BarChart3, label: "Explain", detail: "Build charts and dashboards" },
];

export default function Home() {
  const { t } = useI18n();
  return <>
    <main className="corporate-hero">
      <section className="corporate-hero-grid">
        <div>
          <span className="corporate-eyebrow">{t("Data. Insights. Decisions.")}</span>
          <h1>{t("Turn spreadsheets into clear decisions.")}</h1>
          <p className="corporate-hero-description">{t("Build repeatable data workflows, inspect every step, and compose dashboards without hiding the logic.")}</p>
          <div className="corporate-hero-actions">
            <Link className="af-btn af-btn--lg" href="/projects">{t("Open projects")}<ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
        <div className="corporate-hero-visual">
          <h2>{t("Your analysis, connected")}</h2>
          <div className="corporate-hero-chart" aria-hidden="true">
            {[42, 66, 50, 82, 72, 100].map((height, index) => <span key={index} style={{ height: height + "%" }} />)}
          </div>
          {steps.map(({ icon: Icon, label, detail }, index) => <div className="corporate-hero-step" key={label}>
            <span aria-hidden="true">0{index + 1}</span><Icon size={22} aria-hidden="true" />
            <div><strong>{t(label)}</strong><p>{t(detail)}</p></div>
          </div>)}
        </div>
      </section>
    </main>
    <footer className="corporate-footer"><span>{t("Alabuga · analytical workspace")}</span><span>{t("Visual analytics · no code required")}</span></footer>
  </>;
}
