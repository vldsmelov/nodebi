"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { ResolvedColumn } from "./types";
import { groupedUnpivotPlan, type GroupedUnpivotPlan, type UnpivotField, type UnpivotGroup } from "./grouped-unpivot";
export function GroupedUnpivotDialog({ columns, apply, close }: { columns: ResolvedColumn[]; apply: (plan: GroupedUnpivotPlan) => boolean; close: () => void }) {
  const { t, nodeName } = useI18n(); const ref = useRef<HTMLDialogElement>(null);
  const [groups, setGroups] = useState<UnpivotGroup[]>(() => [{ id: crypto.randomUUID(), name: "" }]);
  const [fields, setFields] = useState<UnpivotField[]>(() => columns.map(column => ({ id: column.column_id, label: column.display_name, identifier: false, group: "" })));
  const [groupField, setGroupField] = useState("group"), [dirty, setDirty] = useState(false), [failed, setFailed] = useState(false);
  const plan = useMemo(() => groupedUnpivotPlan(columns, groups, fields, groupField), [columns, groups, fields, groupField]);
  useEffect(() => { ref.current?.showModal(); }, []);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  const cancel = () => { if (!dirty || window.confirm(t("Discard unapplied preparation changes?"))) close(); };
  const update = (index: number, patch: Partial<UnpivotField>) => setFields(current => current.map((field, i) => i === index ? { ...field, ...patch } : field));
  const control = "w-full rounded border border-outline bg-control p-2 text-xs disabled:opacity-40";
  return <dialog ref={ref} aria-label={t("Grouped Unpivot")} onChange={() => setDirty(true)} onKeyDown={event => event.stopPropagation()} onCancel={event => { event.preventDefault(); cancel(); }} className="m-auto max-h-[90vh] w-[min(1100px,96vw)] overflow-auto rounded-xl border border-outline bg-panel p-6 text-foreground backdrop:bg-black/60">
    <h2 className="text-lg">{t("Grouped Unpivot")}</h2>
    <p className="my-3 text-sm text-muted">{t("Assign each value field to one group. Identifier fields repeat on every output row. Labels may repeat without merging records.")}</p>
    <label className="my-3 block text-xs">{t("Group output field")}<input className={control} aria-label={t("Group output field")} maxLength={255} value={groupField} onChange={event => setGroupField(event.target.value)} /></label>
    {groups.map((group, index) => <div key={group.id} className="my-2 flex gap-3"><input aria-label={t("Unpivot group {0}", { 0: index + 1 })} className={control} maxLength={255} value={group.name} onChange={event => setGroups(current => current.map(item => item.id === group.id ? { ...item, name: event.target.value } : item))} /><button onClick={() => { setDirty(true); setGroups(current => current.filter(item => item.id !== group.id)); setFields(current => current.map(field => field.group === group.id ? { ...field, group: "" } : field)); }}>{t("Remove")}</button></div>)}
    <button className="my-3 rounded border border-outline p-2 text-xs disabled:opacity-40" disabled={groups.length >= 10} onClick={() => { setDirty(true); setGroups(current => [...current, { id: crypto.randomUUID(), name: "" }]); }}>{t("Add Unpivot group")}</button>
    <table className="w-full text-left text-xs"><thead><tr>{["Source field", "Identifier", "Group", "Article label"].map(label => <th key={label} className="p-2">{t(label)}</th>)}</tr></thead><tbody>{fields.map((field, index) => <tr key={field.id} className="border-t border-outline">
      <td className="p-2" title={field.id}>{columns[index].display_name} · {t(columns[index].logical_type)}</td>
      <td className="p-2"><input aria-label={t("Unpivot identifier {0}", { 0: index + 1 })} type="checkbox" checked={field.identifier} onChange={event => update(index, { identifier: event.target.checked, group: "" })} /></td>
      <td className="p-2"><select aria-label={t("Field group {0}", { 0: index + 1 })} className={control} disabled={field.identifier} value={field.group} onChange={event => update(index, { group: event.target.value })}><option value="">{t("Skip field")}</option>{groups.map((group, i) => <option key={group.id} value={group.id}>{group.name || String(i + 1)}</option>)}</select></td>
      <td className="p-2"><input aria-label={t("Article label {0}", { 0: index + 1 })} className={control} maxLength={255} value={field.label} disabled={!field.group || field.identifier} onChange={event => update(index, { label: event.target.value })} /></td>
    </tr>)}</tbody></table>
    <p className="my-3 text-xs text-muted">{t("Value fields must have the same known type. Convert types upstream if needed. Identifier names must differ from field_id, field_name, value and the group field.")}</p>
    <h3>{t("Nodes to create")}</h3>
    {plan ? <ol className="my-3 list-inside list-decimal text-xs">{plan.branches.map((branch, index) => <li key={index}>{groups[index].name}: {branch.map(step => nodeName(step.type)).join(" → ")} ({branch[0].fields?.join(", ")})</li>)}{plan.unions.map(id => <li key={id}>{nodeName("union")}</li>)}</ol> : <p role="status" className="my-3 text-warning">{t("Name 1 to 10 nonempty groups, choose compatible fields and check output names. Each field can belong to only one group.")}</p>}
    <p className="my-3 text-xs text-muted">{t("Create a new branch from the selected output. Existing downstream connections stay unchanged. Review the ordinary nodes before applying.")}</p>
    {failed && <p role="alert">{t("The graph changed. Close the table and reopen it before applying.")}</p>}
    <div className="sticky -bottom-6 -mx-6 -mb-6 flex gap-4 border-t border-outline bg-panel p-4"><button className="rounded bg-primary p-2 text-on-primary disabled:opacity-40" disabled={!plan} onClick={() => { if (plan && apply(plan)) close(); else setFailed(true); }}>{t("Apply grouped Unpivot")}</button><button onClick={cancel}>{t("Cancel")}</button></div>
  </dialog>;
}
