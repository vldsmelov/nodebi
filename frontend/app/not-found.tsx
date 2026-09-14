"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return <main className="grid min-h-[calc(100vh-2.75rem)] place-items-center bg-page p-6 text-foreground">
    <div className="text-center"><h1 className="text-3xl">{t("Page not found")}</h1>
      <Link href="/projects" className="mt-5 block text-accent">{t("← All projects")}</Link>
    </div>
  </main>;
}
