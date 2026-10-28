"use client";
import { useId, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";

export function OverviewSection<T>({ title, query, action, children }: {
  title: string; query: UseQueryResult<T, Error>; action?: ReactNode; children: (data: T) => ReactNode;
}) {
  const { t, errorText } = useI18n(), id = useId();
  return <section aria-labelledby={id} className="min-w-0 rounded-2xl border border-outline bg-panel p-5 sm:p-6">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id={id} className="text-lg font-semibold">{t(title)}</h2>{action}</header>
    {query.isPending ? <p role="status" className="py-6 text-sm text-muted">{t("Loading overview section…")}</p>
      : query.isError ? <div role="alert" className="rounded-lg bg-danger-surface p-4 text-sm text-danger"><p>{t("This section could not be refreshed. Its current state is unknown.")}</p><p className="mt-2">{errorText(query.error)}</p><button className="mt-3 min-h-10 underline" disabled={query.isFetching} onClick={() => void query.refetch()}>{t("Retry")}</button></div>
        : <>{query.isFetching && <p role="status" className="mb-3 text-xs text-muted">{t("Refreshing saved overview…")}</p>}{children(query.data)}</>}
  </section>;
}
