"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { DataStatePanel } from "@/components/ui/workspace";
import { useI18n } from "@/lib/i18n";
import { getImportSession } from "./api";
import { ImportWizard } from "./ImportWizard";

export function ImportWorkspace({ projectId }: { projectId: string }) {
  const sourceId = useSearchParams().get("source");
  const router = useRouter();
  const { t, errorText } = useI18n();
  const session = useQuery({
    queryKey: ["import-session", projectId, sourceId],
    queryFn: () => getImportSession(projectId, sourceId!), enabled: !!sourceId,
    refetchOnWindowFocus: false, refetchOnReconnect: false, refetchOnMount: "always", retry: false,
  });
  if (sourceId && session.isPending) return <DataStatePanel state="loading" />;
  if (sourceId && session.error) return <DataStatePanel state="error">{errorText(session.error)}<button className="ml-3 underline" onClick={() => void session.refetch()}>{t("Retry")}</button></DataStatePanel>;
  return <ImportWizard key={sourceId ? `${sourceId}:${session.dataUpdatedAt}` : "new"} projectId={projectId}
    initialSession={sourceId ? session.data : undefined}
    onUploaded={source => router.replace(`/projects/${projectId}/data/import?source=${encodeURIComponent(source.id)}`, { scroll: false })}
    onReload={() => { if (window.confirm(t("Discard unsaved changes?"))) void session.refetch(); }} />;
}
