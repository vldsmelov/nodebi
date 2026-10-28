"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { DataStatePanel } from "@/components/ui/workspace";

// Recovery is tab-local; do not read sessionStorage during server rendering/hydration.
const TemplateCatalog = dynamic(() => import("@/features/report-builder/TemplateCatalog").then(module => module.TemplateCatalog), { ssr: false, loading: () => <DataStatePanel state="loading" /> });

export default function TemplateCatalogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><TemplateCatalog key={projectId} projectId={projectId} /></main>;
}
