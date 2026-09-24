"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { VisualizationResultView } from "@/features/dashboard/VisualizationView";
import type { Dashboard, VisualizationResult, Widget } from "@/features/dashboard/api";
import type { Release } from "./api";

export function FrozenRelease({ release, close }: { release: Release; close: () => void }) {
  const { t, errorText } = useI18n();
  const boards = useQuery({ queryKey: ["release-boards", release.id], queryFn: () => apiRequest<Dashboard[]>(`/api/v1/releases/${release.id}/dashboards`) });
  return <section className="mt-6 border-t border-outline pt-5"><div className="flex justify-between"><h2 className="text-xl">{release.name} · {release.period}</h2><button onClick={close}>{t("Close")}</button></div><p className="my-3 text-sm text-muted">{t("Frozen release. Changes to the working project do not affect this report.")}</p>
    {boards.error ? <p role="alert" className="text-danger">{errorText(boards.error)}</p> : null}
    {boards.data?.map(board => <section key={board.id} className="my-6"><h3 className="mb-3 text-lg">{board.name}</h3><div className="grid grid-cols-12 gap-3">{board.widgets.map(widget => <div key={widget.id} style={{ gridColumn: `${widget.x + 1} / span ${Math.min(widget.width, 12 - widget.x)}`, gridRow: `${widget.y + 1} / span ${widget.height}`, minHeight: widget.height * 55 }} className="min-w-0 overflow-hidden rounded border border-outline bg-panel p-2"><FrozenWidget identity={release.id} widget={widget} /></div>)}</div></section>)}
  </section>;
}
function FrozenWidget({ identity, widget }: { identity: string; widget: Widget }) {
  const { t, errorText } = useI18n(); const [offset, setOffset] = useState(0);
  const result = useQuery({ queryKey: ["frozen-widget", identity, widget.id, offset], queryFn: () => apiRequest<VisualizationResult>(`/api/v1/releases/${identity}/widgets/${widget.id}/result?offset=${offset}`) });
  if (result.error) return <p role="alert" className="text-danger">{errorText(result.error)}</p>;
  if (!result.data) return <p>{t("Loading preview…")}</p>;
  return <VisualizationResultView result={result.data} offset={offset} setOffset={setOffset} titleOverride={widget.title ?? undefined} hideTitle={widget.config?.show_title === false} />;
}
