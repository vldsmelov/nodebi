import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { NodeDefinition } from "./types";
import { definitionLabel, findNodeDefinition } from "./node-catalog";
import type { OperationChoice } from "./operation-drop";

export function OperationDropMenu({ choices, catalog, sourceLabel, pending, onChoose, onClose }: {
  choices: OperationChoice[]; catalog: NodeDefinition[]; sourceLabel: string; pending: boolean;
  onChoose: (choice: OperationChoice) => void; onClose: () => void;
}) {
  const { t, nodeName } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const matching = choices.filter(choice => nodeName(choice.type).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <dialog ref={dialog} aria-label={t("Add connected operation")} className="m-auto max-h-[90vh] w-96 max-w-[90vw] overflow-auto rounded-xl border border-outline bg-panel p-4 text-foreground shadow-xl backdrop:bg-black/40" onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => event.stopPropagation()}>
    <h2 className="font-semibold">{t("Add connected operation")}</h2>
    <p className="my-2 break-words text-sm">{sourceLabel}</p>
    <p className="mb-3 text-xs text-muted">{t("Choose an input. Finish the remaining settings in the inspector.")}</p>
    <p className="mb-3 text-xs text-muted">{t("For field-to-table operations, the exact source table is connected when known.")}</p>
    <input autoFocus aria-label={t("Search operations")} className="mb-3 w-full rounded border border-outline bg-control p-2 text-sm" value={search} onChange={event => setSearch(event.target.value)} />
    <div className="max-h-72 overflow-auto">
      {pending ? <p role="status">{t("Waiting for a current schema.")}</p> : !matching.length ? <p>{t("No compatible operations found.")}</p> : matching.slice(0, 80).map(choice => {
        const definition = findNodeDefinition(catalog, choice);
        const port = definition?.input_ports.find(item => item.id === choice.port);
        return <button key={`${choice.type}:${choice.version}:${choice.port}`} className="mb-1 block w-full rounded border border-outline p-2 text-left text-sm hover:bg-control" onClick={() => onChoose(choice)}>{definition ? definitionLabel(catalog, definition, nodeName(choice.type)) : nodeName(choice.type)} → {t(port?.display_name ?? choice.port)}</button>;
      })}
    </div>
    <button className="mt-3 rounded border border-outline px-3 py-1 text-sm" onClick={onClose}>{t("Cancel")}</button>
  </dialog>;
}
