"use client";
import { useI18n } from "@/lib/i18n";
import { ParameterChoices } from "@/features/dashboard/ParameterOptions";
import type { Dashboard } from "@/features/dashboard/api";
import type { ParameterValues } from "@/features/workflow/types";

export function ReleaseContext({ boards, values, onChange }: { boards: Dashboard[]; values: Record<string, ParameterValues>; onChange: (values: Record<string, ParameterValues>) => void }) {
  const { t } = useI18n();
  return <div className="sm:col-span-2">{boards.filter(board => board.configuration?.parameters?.length).map(board => <fieldset key={board.id} className="my-3 rounded border border-outline p-3"><legend>{board.name}</legend>{board.configuration?.parameters?.map(parameter => {
    const current = values[board.id] ?? {};
    const value = current[parameter.name] ?? parameter.default ?? null;
    const change = (value: string | number | boolean | null) => onChange({ ...values, [board.id]: { ...current, [parameter.name]: value } });
    return <label key={parameter.name} className="my-2 block">{parameter.label || parameter.name}{parameter.required ? " *" : ""}
      {parameter.options ? <ParameterChoices definition={parameter} parameters={current} value={value} onChange={change} /> : parameter.logical_type === "boolean" ? <select className="ml-3 rounded border border-outline bg-control p-2" value={value === null ? "" : String(value)} onChange={e => change(e.target.value === "" ? null : e.target.value === "true")}><option value="">{t("Select field")}</option><option value="true">{t("true")}</option><option value="false">{t("false")}</option></select> : <input className="ml-3 rounded border border-outline bg-control p-2" type={["integer", "float"].includes(parameter.logical_type) ? "number" : parameter.logical_type === "date" ? "date" : "text"} value={String(value ?? "")} onChange={e => change(e.target.value === "" ? null : ["integer", "float"].includes(parameter.logical_type) ? Number(e.target.value) : e.target.value)} />}
    </label>;
  })}</fieldset>)}</div>;
}
