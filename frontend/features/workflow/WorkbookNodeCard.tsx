import { useEffect, useState } from "react";
import { useUpdateNodeInternals, type Node, type NodeProps } from "@xyflow/react";
import { useI18n } from "@/lib/i18n";
import { FieldNodeCard, type FieldCanvasNode } from "./FieldNodeCard";
import { bookHandle, type WorkbookContainer } from "./workbook-containers";
import { sheetDragType } from "./workbook-navigation";

export type WorkbookCanvasNode = Node<{
  book: WorkbookContainer; sheets: FieldCanvasNode[]; selectedSheet: string | null;
  onSelect: (id: string) => void; onToggle: () => void;
  onDetach: (id: string, detach: boolean) => void; onUngroup: () => void;
}, "workbookNode">;

export function WorkbookNodeCard({ id, data }: NodeProps<WorkbookCanvasNode>) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const refresh = useUpdateNodeInternals();
  const attached = data.sheets.filter(sheet => !data.book.detached_node_ids?.includes(sheet.id));
  const pinned = attached.filter(sheet => sheet.data.connected.length || sheet.id === data.selectedSheet);
  const others = data.book.collapsed ? [] : attached.filter(sheet => !pinned.includes(sheet) && String(sheet.data.node.config?.sheet_name).toLocaleLowerCase().includes(search.toLocaleLowerCase())).slice(0, 20);
  const shown = [...pinned, ...others];
  const layout = JSON.stringify([shown.map(sheet => [sheet.id, sheet.data.connected]), data.book.collapsed, data.selectedSheet]);
  useEffect(() => { refresh(id); }, [id, layout, refresh]);
  return <div className="w-80 rounded-xl border-2 border-outline bg-panel p-3 shadow-lg">
    <strong className="block truncate text-sm" title={data.book.label}>{data.book.label}</strong>
    <div className="nodrag nopan my-2 flex flex-wrap gap-3 text-xs">
      <button onClick={data.onToggle}>{t(data.book.collapsed ? "Expand workbook" : "Collapse workbook")}</button>
      <button onClick={data.onUngroup}>{t("Ungroup workbook")}</button>
    </div>
    {!data.book.collapsed && <input aria-label={t("Search sheets in workbook")} className="nodrag nopan mb-2 w-full rounded border border-outline bg-control p-1 text-xs" value={search} onChange={event => setSearch(event.target.value)} />}
    {shown.map(sheet => <section key={sheet.id} className="mb-3" aria-label={String(sheet.data.node.config?.sheet_name)}>
      <div className="nodrag nopan flex gap-2 py-1 text-xs">
        <button className="truncate" draggable onDragStart={event => { event.dataTransfer.setData(sheetDragType, JSON.stringify({ sourceId: data.book.source_id, sheetName: sheet.data.node.config?.sheet_name, nodeId: sheet.id })); event.dataTransfer.effectAllowed = "move"; }} onClick={event => { event.stopPropagation(); data.onSelect(sheet.id); }}>{String(sheet.data.node.config?.sheet_name)}</button>
        <button onClick={() => data.onDetach(sheet.id, true)}>{t("Detach sheet")}</button>
      </div>
      <FieldNodeCard id={id} data={sheet.data} selected={sheet.id === data.selectedSheet} compact={data.book.collapsed || sheet.id !== data.selectedSheet} handleFor={handle => bookHandle(sheet.id, handle)} />
    </section>)}
    {data.sheets.filter(sheet => data.book.detached_node_ids?.includes(sheet.id)).map(sheet => <button key={sheet.id} className="nodrag nopan block text-xs" onClick={() => data.onDetach(sheet.id, false)}>{t("Return sheet to workbook")}: {String(sheet.data.node.config?.sheet_name)}</button>)}
    {!data.book.collapsed && attached.length > shown.length && <p className="text-xs text-muted">{t("Search to show more sheets.")}</p>}
  </div>;
}
