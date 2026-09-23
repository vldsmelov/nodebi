"use client";
import { useI18n } from "@/lib/i18n";

export function NextStepPanel({ label, kind, pending, onJoin, onCalculate, onGroup, onPublish }: {
  label?: string; kind?: string; pending: boolean;
  onJoin: () => void; onCalculate: () => void; onGroup: () => void; onPublish: () => void;
}) {
  const { t } = useI18n();
  const table = kind === "dataset";
  const button = "mt-2 w-full rounded border border-outline p-2 text-left text-xs disabled:opacity-40";
  return <section aria-label={t("Next step")} className="my-3 rounded-xl border border-outline p-3">
    <h2 className="font-semibold">{t("Next step")}</h2>
    <p className="my-2 break-words text-xs text-muted">{label || t("Select a table or open a workbook sheet.")}</p>
    {pending && label && <p className="text-xs text-muted">{t("Updating fields")}</p>}
    <button className={button} disabled={pending || !table} onClick={onJoin}>{t("Join with…")}</button>
    <button className={button} disabled={pending || !table} onClick={onCalculate}>{t("Add calculated field")}</button>
    <button className={button} disabled={pending || !table} onClick={onGroup}>{t("Summarize data")}</button>
    <button className={button} disabled={pending || !["dataset", "scalar"].includes(kind ?? "")} onClick={onPublish}>{t("Publish this output")}</button>
  </section>;
}
