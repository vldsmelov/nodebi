"use client";

import { ArrowLeft, BarChart3, Database, GitBranch, History, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

const sections = [
  { label: "Overview", path: "", icon: LayoutDashboard },
  { label: "Data", path: "/data", icon: Database },
  { label: "Reports", path: "/dashboard", icon: BarChart3 },
  { label: "Calculations", path: "/workflow", icon: GitBranch },
  { label: "History", path: "/reports", icon: History },
] as const;

export function ProjectNavigation() {
  const { projectId } = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const { t } = useI18n();
  const root = `/projects/${projectId}`;
  return <div className="corporate-project-nav">
    <a href="#project-content" className="sr-only rounded bg-primary px-3 py-2 text-on-primary focus:not-sr-only">{t("Skip to project content")}</a>
    <nav aria-label={t("Project navigation")}>
      <Link href="/projects" className="project-home" aria-label={t("← All projects")}><ArrowLeft size={16} aria-hidden="true" />{t("Projects")}</Link>
      {sections.map(({ label, path, icon: Icon }) => {
        const active = path ? pathname === `${root}${path}` || pathname.startsWith(`${root}${path}/`)
          || (path === "/dashboard" && ["/visualizations", "/build", "/templates"].some(suffix => pathname === `${root}${suffix}`))
          : pathname === root;
        return <Link key={label} href={`${root}${path}${path === "/dashboard" ? "?mode=view" : ""}`} aria-current={active ? "page" : undefined}
          >
          <Icon size={17} aria-hidden="true" />{t(label)}
        </Link>;
      })}
    </nav>
  </div>;
}
