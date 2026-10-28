"use client";
import { useParams } from "next/navigation";
import { ReportCycle } from "@/features/report-cycle/ReportCycle";
export default function ReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <ReportCycle key={projectId} projectId={projectId} />;
}
