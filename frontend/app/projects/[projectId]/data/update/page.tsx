"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { FileUpdateStart } from "@/features/report-cycle/FileUpdateStart";
import { DataStatePanel } from "@/components/ui/workspace";

function Start() {
  const { projectId } = useParams<{ projectId: string }>();
  const source = useSearchParams().get("source");
  return <FileUpdateStart key={`${projectId}:${source}`} projectId={projectId} sourceId={source} />;
}
export default function FileUpdatePage() {
  return <main className="mx-auto max-w-4xl px-4 py-8"><Suspense fallback={<DataStatePanel state="loading" />}><Start /></Suspense></main>;
}
