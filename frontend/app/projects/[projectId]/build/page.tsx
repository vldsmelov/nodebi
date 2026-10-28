"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { ReportBuilderWorkspace } from "@/features/report-builder/ReportBuilderWorkspace";
import { DataStatePanel } from "@/components/ui/workspace";

export default function ReportBuilderPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <main className="mx-auto max-w-[100rem] space-y-6 px-4 py-8 sm:px-6"><Suspense fallback={<DataStatePanel state="loading" />}><ReportBuilderWorkspace projectId={projectId} /></Suspense></main>;
}
