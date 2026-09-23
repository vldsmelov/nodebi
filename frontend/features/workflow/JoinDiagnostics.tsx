import { useI18n } from "@/lib/i18n";
import type { components } from "@/lib/api-schema";

export function JoinDiagnostics({ value }: { value: components["schemas"]["JoinDiagnostics"] }) {
  const { t, cell } = useI18n();
  const metrics = [
    ["Left input rows", value.left_rows], ["Right input rows", value.right_rows],
    ["Matched left rows", value.matched_left_rows], ["Unmatched left rows", value.unmatched_left_rows],
    ["Matched right rows", value.matched_right_rows], ["Unmatched right rows", value.unmatched_right_rows],
    ["Duplicate left keys", value.left_duplicate_keys], ["Duplicate right keys", value.right_duplicate_keys],
    ["Left rows with multiple matches", value.multiplied_left_rows], ["Additional rows from repeated keys", value.additional_rows],
    ["Excluded left rows", value.dropped_left_rows], ["Output rows", value.result_rows],
  ] as const;
  return <section aria-label={t("Join report")} className="mt-3 rounded-lg border border-outline p-3">
    <h3 className="font-semibold">{t("Join report")}</h3>
    <p className="my-2 text-xs text-muted">{t("Counts describe full inputs, not just the preview. Empty keys do not match.")}</p>
    <dl className="grid grid-cols-3 gap-4 text-sm">{[metrics[0], metrics[1], metrics[11]].map(([name, count]) => <div key={name}><dt className="text-muted">{t(name)}</dt><dd className="font-semibold">{cell(count)}</dd></div>)}</dl>
    <details className="mt-2"><summary className="cursor-pointer text-xs">{t("Detailed counts")}</summary><dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-xs lg:grid-cols-4">{metrics.slice(2, 11).map(([name, count]) => <div key={name}><dt className="text-muted">{t(name)}</dt><dd className="font-semibold">{cell(count)}</dd></div>)}</dl></details>
    {value.dropped_left_rows > 0 && <p className="mt-2 text-sm text-warning">{t("Inner join excluded unmatched left rows. Choose left join if they must be retained.")}</p>}
    {value.additional_rows > 0 && <p className="mt-2 text-sm text-warning">{t("Repeated right keys multiplied left rows. Check keys before summing amounts.")}</p>}
  </section>;
}
