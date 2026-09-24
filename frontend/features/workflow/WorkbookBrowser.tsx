import { isExcelSourceType } from "./source-types";
import { useState } from "react";
import type { DataSource } from "@/features/data-sources/api";
import { useI18n } from "@/lib/i18n";
import type { WorkflowNode } from "./types";
import { sheetDragType, type SheetSelection } from "./workbook-navigation";

export function WorkbookBrowser({ sources, nodes, onOpen }: { sources: DataSource[]; nodes: WorkflowNode[]; onOpen: (selection: SheetSelection) => void }) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const query = search.trim().toLocaleLowerCase();
  return <section aria-label={t("Workbook browser")} className="mb-4">
    <h2 className="mb-2 text-sm font-semibold">{t("Workbook browser")}</h2>
    <input aria-label={t("Search books and sheets")} placeholder={t("Search books and sheets")} className="w-full rounded border border-outline bg-control p-2 text-xs" value={search} onChange={event => setSearch(event.target.value)} />
    {!sources.length && <p className="mt-2 text-xs text-muted">{t("Upload a workbook on the Sources page first.")}</p>}
    {sources.map(source => {
      const bookMatches = `${source.name} ${source.original_filename}`.toLocaleLowerCase().includes(query);
      const sheets = [...new Set([...source.workbook.sheets.map(sheet => sheet.name), ...(source.logical_sheets ?? [])])].map(name => ({ name })).filter(sheet => bookMatches || sheet.name.toLocaleLowerCase().includes(query));
      if (query && !sheets.length && !bookMatches) return null;
      const open = expanded.has(source.id) || Boolean(query);
      return <article key={source.id} className="mt-2 rounded border border-outline bg-control p-2">
        <button className="w-full text-left text-xs font-semibold" aria-expanded={open} onClick={() => setExpanded(current => { const next = new Set(current); if (next.has(source.id)) next.delete(source.id); else next.add(source.id); return next; })}>{open ? "▾" : "▸"} {source.original_filename}</button>
        {open && <><p className="my-2 text-xs text-muted">{t("Open a sheet or drag it onto the canvas.")}</p>{sheets.slice(0, 50).map(sheet => {
          const instances = nodes.filter(node => isExcelSourceType(node.type) && node.config?.source_id === source.id && node.config?.sheet_name === sheet.name);
          const choices = instances.length ? instances.map(node => ({ nodeId: node.id, label: String(node.ui?.label || sheet.name) })) : [{ nodeId: undefined, label: sheet.name }];
          return <div key={sheet.name} className="my-1 border-t border-outline pt-1">{choices.map((choice, index) => {
            const selection = { sourceId: source.id, sheetName: sheet.name, nodeId: choice.nodeId };
            return <button key={choice.nodeId ?? sheet.name} draggable onDragStart={event => { event.dataTransfer.setData(sheetDragType, JSON.stringify(selection)); event.dataTransfer.effectAllowed = "copy"; }} onClick={() => onOpen(selection)} title={t(choice.nodeId ? "Open existing sheet node" : "Add sheet to graph")} className="block w-full rounded p-1 text-left text-xs hover:bg-panel">{choice.nodeId ? "↗" : "+"} {choice.label}{instances.length > 1 ? ` (${index + 1})` : ""}</button>;
          })}</div>;
        })}{sheets.length > 50 && <p className="text-xs text-muted">{t("Search to show more sheets.")}</p>}</>}
      </article>;
    })}
  </section>;
}
