"use client";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
const SpreadsheetWorkspace = dynamic(() => import("@/features/spreadsheet/SpreadsheetWorkspace"), { ssr: false });

export default function SpreadsheetPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const query = useSearchParams();
  return <SpreadsheetWorkspace projectId={projectId} sourceId={query.get("source")} updateId={query.get("update")} />;
}
