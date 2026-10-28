"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { ImportWorkspace } from "@/features/ingestion/ImportWorkspace";
import { DataStatePanel } from "@/components/ui/workspace";
import { useI18n } from "@/lib/i18n";

export default function ImportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useI18n();
  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6"><h1 className="text-3xl font-semibold">{t("Connect data")}</h1><Suspense fallback={<DataStatePanel state="loading" />}><ImportWorkspace projectId={projectId} /></Suspense></main>;
}
