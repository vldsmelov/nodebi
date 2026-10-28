"use client";
import { useParams } from "next/navigation";
import { ProjectOverview } from "@/features/workspace/ProjectOverview";

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <ProjectOverview key={projectId} projectId={projectId} />;
}
