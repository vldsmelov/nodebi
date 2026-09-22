"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { components } from "@/lib/api-schema";
import type { Visualization } from "./api";

export function PeriodCoverage({ visualizations }: { visualizations: Visualization[] }) {
  const { t, errorText } = useI18n(); const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ["period-coverage", visualizations.map(item => [item.id, item.revision])], enabled: open, queryFn: () => Promise.all(visualizations.map(async item => {
    if (!item.publication_id) return { id: item.id, name: item.name, connected: false, error: null };
    try { const schema = await apiRequest<components["schemas"]["PublicationSchema"]>(`/api/v1/workflows/${item.workflow_id}/publications/${item.publication_id}/schema`); return { id: item.id, name: item.name, connected: schema.period_supported, error: null }; }
    catch (error) { return { id: item.id, name: item.name, connected: false, error }; }
  })) });
  return <details className="my-3 text-sm" onToggle={event => setOpen(event.currentTarget.open)}><summary>{t("Period coverage")}</summary>{query.isLoading ? <p>{t("Loading…")}</p> : <ul>{query.data?.map(item => <li key={item.id}>{item.name}: {item.error ? errorText(item.error) : t(item.connected ? "Connected" : "No date binding on this calculation branch.")}</li>)}</ul>}</details>;
}
