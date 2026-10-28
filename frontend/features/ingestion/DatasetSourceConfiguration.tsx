"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { listDatasets } from "./api";

export function DatasetSourceConfiguration({ config, onChange }: { config: Record<string, unknown>; onChange: (config: Record<string, unknown>) => void }) {
  const { projectId } = useParams<{ projectId: string }>();
  const { t, errorText } = useI18n();
  const datasets = useQuery({ queryKey: ["datasets", projectId], queryFn: () => listDatasets(projectId), enabled: !!projectId });
  const selected = datasets.data?.find(item => item.source_id === config.source_id && item.resource_id === config.resource_id);
  return <div className="space-y-3"><label className="block">{t("Prepared dataset")}<select className="form-control" value={selected?.id ?? ""} onChange={event => {
    const item = datasets.data?.find(value => value.id === event.target.value);
    if (item) onChange({ source_id: item.source_id, resource_id: item.resource_id });
  }}><option value="">{t("Select a dataset")}</option>{datasets.data?.map(item => <option key={item.id} value={item.id}>{item.profile.name}</option>)}</select></label>
    {datasets.error && <p role="alert" className="text-danger">{errorText(datasets.error)}</p>}
    {selected && <p className="text-sm text-muted">{selected.profile.grain}</p>}
  </div>;
}
