"use client";

import Image from "next/image";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { ThemeSwitcher } from "@/lib/theme-provider";

export function CorporateHeader() {
  const { t } = useI18n();
  return <header className="corporate-header">
    <Link href="/" className="corporate-brand" aria-label={`${t("Node BI")} · ${t("Home")}`}>
      <Image src="/brand/alabuga-logo.webp" width={154} height={32} alt="Алабуга" priority />
      <span className="corporate-product"><strong>Node BI</strong><span>{t("Business intelligence")}</span></span>
    </Link>
    <div className="corporate-tools">
      <Link href="/projects"><LayoutGrid size={16} aria-hidden="true" />{t("Projects")}</Link>
      <ThemeSwitcher /><LanguageSwitcher />
    </div>
  </header>;
}
