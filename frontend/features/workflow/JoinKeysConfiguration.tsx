"use client";
import { useI18n } from "@/lib/i18n";
import type { ResolvedColumn } from "./types";

export type JoinKey = { left_key: string; right_key: string };
export function JoinKeysConfiguration({ keys, left, right, relationship, onKeys, onRelationship }: {
  keys: JoinKey[]; left: ResolvedColumn[]; right: ResolvedColumn[]; relationship: string;
  onKeys: (keys: JoinKey[]) => void; onRelationship: (value: string) => void;
}) {
  const { t } = useI18n();
  const control = "my-2 w-full rounded border border-outline bg-control p-2 text-xs";
  return <div>{keys.map((key, index) => <fieldset key={index} className="my-2 rounded border border-outline p-2">
    <legend>{t("Key pair {0}", { 0: index + 1 })}</legend>
    {(["left", "right"] as const).map(side => {
      const field = `${side}_key` as const, choices = side === "left" ? left : right;
      const label = index === 0 ? t(side === "left" ? "Left key" : "Right key") : t(side === "left" ? "Left key {0}" : "Right key {0}", { 0: index + 1 });
      return <label key={side}>{label}<select className={control} aria-label={label} value={key[field]} onChange={event => onKeys(keys.map((item, i) => i === index ? { ...item, [field]: event.target.value } : item))}>
        <option value="">{t("Select field")}</option>
        {key[field] && !choices.some(column => column.column_id === key[field]) && <option value={key[field]}>{t("Unavailable")}</option>}
        {choices.map(column => <option key={column.column_id} value={column.column_id} title={t(column.logical_type)}>{column.display_name}</option>)}
      </select></label>;
    })}
    {keys.length > 1 && <button onClick={() => onKeys(keys.filter((_, i) => i !== index))}>{t("Remove key pair")}</button>}
  </fieldset>)}
    <button disabled={keys.length >= 32} onClick={() => onKeys([...keys, { left_key: "", right_key: "" }])}>{t("Add key pair")}</button>
    <label className="mt-3 block">{t("Expected relationship")}<select aria-label={t("Expected relationship")} className={control} value={relationship} onChange={event => onRelationship(event.target.value)}>
      <option value="many_to_many">{t("Many to many — allow repeated keys")}</option>
      <option value="many_to_one">{t("Many to one — right keys must be unique")}</option>
      <option value="one_to_one">{t("One to one — both sides must be unique")}</option>
    </select></label>
  </div>;
}
