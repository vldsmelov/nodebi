"use client";

import { useEffect, useRef } from "react";
import { createUniver, LocaleType, LifecycleStages, CellValueType, InterceptorEffectEnum, DateSystem } from "@univerjs/presets";
import { UniverSheetsCorePreset, UniverFormulaEnginePlugin, UniverSheetsPlugin, SetSelectionsOperation, CalculationMode, SheetInterceptorService, INTERCEPTOR_POINT, InterceptCellContentPriority, BEFORE_CELL_EDIT, ISheetClipboardService } from "@univerjs/preset-sheets-core";
import type { ICellData, IWorksheetData, IWorkbookData } from "@univerjs/presets";
import ru from "@univerjs/preset-sheets-core/locales/ru-RU";
import en from "@univerjs/preset-sheets-core/locales/en-US";
import "@univerjs/preset-sheets-core/lib/index.css";
import { parseAddress, type SpreadsheetSession, type CellChange } from "./session";
import { clipboardTable } from "@/features/report-cycle/clipboard-table";
import { useI18n } from "@/lib/i18n";
import { sourceCell, displayNumber } from "./source-presentation";

export type Selection = { sheet: string; row: number; column: number; endRow: number; endColumn: number };
export type CanvasHandle = {
  repaint: (changes?: CellChange[]) => void;
  show: (sheet: string, row: number, column: number) => void;
  selection: () => Selection;
  editing: () => boolean;
  finishEditing: () => Promise<void>;
  freeze: (enabled: boolean) => void;
  copy: () => Promise<void>;
  pasteInternal: () => Promise<boolean>;
};
type Props = {
  session: SpreadsheetSession; locale: string; readonly: boolean;
  load: (sheet: string, start: number, end: number) => Promise<boolean>;
  changed: (changes: CellChange[]) => void; selected: (selection: Selection) => void;
  ready: (handle: CanvasHandle | null) => void; failed: (error: unknown) => void;
  editing: (active: boolean) => void;
  editingValue: (value: string | null) => void;
};

/** Univer is the interaction/rendering surface. It never calculates or serializes the input file. */
export default function UniverCanvas(props: Props) {
  const { t } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  const views = useRef(new Map<string, { widths: Record<number, number>; heights: Record<number, number>; zoom: number; frozenRows: number; frozenColumns: number }>());
  useEffect(() => { latest.current = props; });
  useEffect(() => {
    if (!host.current) return;
    const root = host.current;
    let cancelled = false, release: (() => void) | undefined;
    // Dispose the previous SDK root before creating another one (including StrictMode).
    queueMicrotask(() => { if (!cancelled) release = initialize(); });
    function initialize() {
    const mount = document.createElement("div");
    mount.style.width = "100%"; mount.style.height = "100%";
    root.appendChild(mount);
    const { session } = props;
    let painting = false, disposed = false;
    let internalPaste = false;
    let nativeLiteral: { sheet: string; row: number; column: number; text: string } | null = null;
    let editingOwner: Selection | null = null;
    const preset = UniverSheetsCorePreset({ container: mount, header: true, toolbar: false,
      formulaBar: true, contextMenu: false, footer: { statisticBar: false, menus: false, addSheetButtonConfig: { show: false } },
      disableTextFormatAlert: true, disableTextFormatMark: true,
      sheets: { disableForceStringMark: true, disableForceStringAlert: true },
      formula: { initialFormulaComputing: CalculationMode.NO_CALCULATION },
    });
    // IPreset's documented plugin/config pairs allow disabling calculation before startup.
    const calculationPlugins = new Set<unknown>([UniverFormulaEnginePlugin, UniverSheetsPlugin]);
    preset.plugins = preset.plugins.map(plugin => {
      const target = Array.isArray(plugin) ? plugin[0] : plugin;
      return calculationPlugins.has(target) ? [target, { ...(Array.isArray(plugin) ? plugin[1] : {}), notExecuteFormula: true }] : plugin;
    });
    const { univer, univerAPI: api } = createUniver({ locale: props.locale === "en" ? LocaleType.EN_US : LocaleType.RU_RU,
      locales: { [LocaleType.RU_RU]: ru, [LocaleType.EN_US]: en }, presets: [preset] });
    const sheetIds = new Map(session.workspace.sheets.map((sheet, i) => [sheet.name, `input-${i}`]));
    const sheetNames = new Map([...sheetIds].map(([name, id]) => [id, name]));
    function rendered(sheet: string, row: number, column: number): ICellData {
      return sourceCell(session, sheet, row, column);
    }
    const sheets: Record<string, Partial<IWorksheetData>> = {};
    const paintedRows = new Map([...session.rows].map(([name, rows]) => [name, new Set(rows.keys())]));
    for (const meta of session.workspace.sheets) {
      const data: NonNullable<IWorksheetData["cellData"]> = {};
      for (const [row, record] of session.rows.get(meta.name) ?? []) {
        data[row] = Object.fromEntries(record.values.map((_, column) => [column, rendered(meta.name, row, column)]));
      }
      const id = sheetIds.get(meta.name)!;
      const view = views.current.get(meta.name);
      sheets[id] = { id, name: meta.name, rowCount: Math.max(1, meta.rows), columnCount: meta.columns,
        defaultColumnWidth: 120, defaultRowHeight: 24, cellData: data,
        columnData: Object.fromEntries(Object.entries({ ...meta.widths, ...view?.widths }).filter(([i]) => Number(i) < meta.columns).map(([i, w]) => [i, { w: Number(w) }])),
        rowData: Object.fromEntries(Object.entries({ ...meta.heights, ...view?.heights }).filter(([i]) => Number(i) < meta.rows).map(([i, h]) => [i, { h: Number(h), ah: Number(h) }])),
        zoomRatio: view?.zoom ?? 1,
        mergeData: (meta.merges ?? []).filter(([, , r, b]) => r <= meta.columns && b <= meta.rows)
          .map(([l, t, r, b]) => ({ startRow: t - 1, endRow: b - 1, startColumn: l - 1, endColumn: r - 1 })),
      };
    }
    const first = session.workspace.page.resource_id;
    const order = [sheetIds.get(first)!, ...[...sheetIds.values()].filter(id => id !== sheetIds.get(first))];
    const book = api.createWorkbook({ id: "source-input", name: "Node BI", appVersion: "1.2.0", locale: props.locale === "en" ? LocaleType.EN_US : LocaleType.RU_RU,
      dateSystem: session.workspace.page.date_1904 ? DateSystem.Date1904 : DateSystem.Date1900,
      sheetOrder: order, sheets } as Partial<IWorkbookData>);
    const interceptors = univer.__getInjector().get(SheetInterceptorService);
    const clipboard = univer.__getInjector().get(ISheetClipboardService);
    // View formatting may use numbers; edit controls always receive exact original strings.
    const presentation = interceptors.intercept(INTERCEPTOR_POINT.CELL_CONTENT, {
      effect: InterceptorEffectEnum.Value, priority: InterceptCellContentPriority.NUMFMT + 1,
      handler: (cell, location, next) => {
        const name = sheetNames.get(location.subUnitId);
        const numeric = name ? displayNumber(session.cell(name, location.row, location.col)?.numberValue) : undefined;
        return next(cell && numeric !== undefined ? { ...cell, v: numeric, t: CellValueType.NUMBER } : cell);
      },
    });
    const rawEditor = interceptors.writeCellInterceptor.intercept(BEFORE_CELL_EDIT, {
      priority: 1000, handler: (cell, location, next) => next(location.origin ? { ...location.origin } : cell),
    });
    const current = (): Selection => {
      const sheet = book.getActiveSheet(); const range = sheet.getActiveRange()?.getRange();
      const anchor = session.anchor(sheet.getSheetName(), range?.startRow ?? 0, range?.startColumn ?? 0);
      return { sheet: sheet.getSheetName(), ...anchor,
        endRow: range?.endRow ?? 0, endColumn: range?.endColumn ?? 0 };
    };
    function paintRows(name: string, rows: number[]) {
      const sheet = book.getSheetBySheetId(sheetIds.get(name)!)!;
      const painted = paintedRows.get(name) ?? new Set<number>();
      for (let i = 0; i < rows.length;) {
        const start = rows[i], block: ICellData[][] = [];
        while (i < rows.length && rows[i] === start + block.length && block.length < 100) {
          const row = rows[i++], record = session.rows.get(name)!.get(row)!;
          block.push(record.values.map((_, column) => rendered(name, row, column)));
        }
        sheet.getRange(start, 0, block.length, block[0].length).setValues(block);
        for (let row = start; row < start + block.length; row++) painted.add(row);
      }
      paintedRows.set(name, painted);
    }
    function paint(changes?: CellChange[]) {
      painting = true;
      try {
        if (changes) {
          for (const cell of changes) book.getSheetBySheetId(sheetIds.get(cell.sheet)!)?.getRange(cell.row, cell.column).setValue(rendered(cell.sheet, cell.row, cell.column));
        } else {
          const sheet = book.getActiveSheet(); const name = sheet.getSheetName();
          const rows = [...(session.rows.get(name)?.keys() ?? [])].sort((a, b) => a - b);
          paintRows(name, rows);
        }
      } finally { painting = false; }
    }
    async function visible() {
      if (disposed || api.getCurrentLifecycleStage() < LifecycleStages.Steady) return;
      const sheet = book.getActiveSheet(), range = sheet.getVisibleRange();
      try {
        const name = sheet.getSheetName();
        await latest.current.load(name, range?.startRow ?? 0, (range?.endRow ?? 30) + 10);
        const rows = [...(session.rows.get(name)?.keys() ?? [])].filter(row => !paintedRows.get(name)?.has(row)).sort((a, b) => a - b);
        if (!disposed && rows.length) { painting = true; try { paintRows(name, rows); } finally { painting = false; } }
      } catch (error) { if (!disposed) latest.current.failed(error); }
    }
    const subscriptions = [
      api.addEvent(api.Event.SheetEditStarted, event => { nativeLiteral = null; editingOwner = { sheet: event.worksheet.getSheetName(), row: event.row, column: event.column, endRow: event.row, endColumn: event.column }; latest.current.editing(true); }),
      api.addEvent(api.Event.SheetEditChanging, event => latest.current.editingValue(event.value.toPlainText().replace(/\r\n$/, ""))),
      api.addEvent(api.Event.BeforeSheetEditEnd, event => {
        const text = event.value.toPlainText().replace(/\r\n$/, "");
        nativeLiteral = event.isConfirm
          ? { sheet: event.worksheet.getSheetName(), row: event.row, column: event.column, text } : null;
      }),
      api.addEvent(api.Event.SheetEditEnded, () => { latest.current.editing(false); latest.current.editingValue(null); const input = nativeLiteral; setTimeout(() => { if (nativeLiteral === input) nativeLiteral = null; }, 0); }),
      api.addEvent(api.Event.Scroll, () => { void visible(); }),
      api.addEvent(api.Event.ActiveSheetChanged, () => { latest.current.selected(current()); void visible(); }),
      book.onSelectionChange(() => { latest.current.selected(current()); void visible(); }),
      api.addEvent(api.Event.BeforeClipboardChange, event => {
        const range = current();
        const count = (range.endRow - range.row + 1) * (range.endColumn - range.column + 1);
        if (count > 2000) { event.cancel = true; latest.current.failed(new Error("The pasted range is too large. Paste a smaller range.")); return; }
        for (let row = range.row; row <= range.endRow; row++) for (let column = range.column; column <= range.endColumn; column++) {
          if (!session.cell(range.sheet, row, column)) {
            event.cancel = true; latest.current.failed(new Error("Wait for the selected rows to load before editing."));
            void latest.current.load(range.sheet, range.row, range.endRow).catch(latest.current.failed);
            return;
          }
        }
      }),
      api.addEvent(api.Event.BeforeClipboardPaste, event => {
        if (internalPaste) return;
        event.cancel = true;
        const selection = current();
        void (async () => {
          try {
            if (latest.current.readonly) throw new Error("Wait for saving to finish before editing.");
            const matrix = clipboardTable(event.text ?? await navigator.clipboard.readText());
            await latest.current.load(selection.sheet, selection.row, selection.row + matrix.length - 1);
            const edits = matrix.flatMap((values, i) => values.map((value, j) => ({ sheet: selection.sheet, row: selection.row + i, column: selection.column + j, value })));
            latest.current.changed(edits); paint(edits);
          } catch (error) { latest.current.failed(error); }
        })();
      }),
      api.addEvent(api.Event.BeforeSheetEditStart, event => {
        const cell = session.cell(event.worksheet.getSheetName(), event.row, event.column);
        if (latest.current.readonly || !cell || cell.readonly) {
          event.cancel = true;
          latest.current.failed(new Error(!cell ? "Wait for the selected rows to load before editing." : session.workbookEditing ? "Edit the top-left cell of a merged area. Array and data-table formulas stay protected." : "Enable Edit calculations to change formulas or protected cell values."));
        }
      }),
      book.onCommandExecuted(command => {
        if (command.id === SetSelectionsOperation.id) {
          queueMicrotask(() => { if (!disposed && !book.isCellEditing()) { latest.current.selected(current()); void visible(); } });
        }
        if (painting || disposed || command.id !== "sheet.mutation.set-range-values") return;
        const params = command.params as { subUnitId: string; cellValue?: Record<string, Record<string, ICellData | null>> };
        const name = [...sheetIds].find(([, id]) => id === params.subUnitId)?.[0];
        if (!name || !params.cellValue) return;
        const edits: CellChange[] = [];
        for (const [row, columns] of Object.entries(params.cellValue)) for (const [column, value] of Object.entries(columns ?? {})) {
          let text = value?.f ?? value?.v ?? value?.p?.body?.dataStream?.replace(/\r\n$/, "") ?? "";
          let formula: boolean | undefined;
          if (internalPaste || value?.t === CellValueType.FORCE_STRING) formula = !!value?.f;
          if (nativeLiteral?.sheet === name && nativeLiteral.row === Number(row) && nativeLiteral.column === Number(column)) {
            const escaped = nativeLiteral.text.startsWith("'");
            text = escaped ? nativeLiteral.text.slice(1) : value?.f || nativeLiteral.text;
            if (escaped) formula = false;
            nativeLiteral = null;
          }
          edits.push({ sheet: name, row: Number(row), column: Number(column), value: String(text), formula });
        }
        try {
          if (latest.current.readonly) throw new Error("Wait for saving to finish before editing.");
          latest.current.changed(edits);
        } catch (error) { latest.current.failed(error); }
        paint(edits); // Strip transient formulas/number coercion and restore rejected edits.
      }),
    ];
    const handle: CanvasHandle = { repaint: paint, selection: current, editing: () => book.isCellEditing(),
      copy: async () => { if (!await clipboard.copy()) throw new Error("The clipboard could not be accessed. Check browser permissions and try again."); },
      pasteInternal: async () => {
        if (!session.workbookEditing || latest.current.readonly || !navigator.clipboard.read) return false;
        const target = clipboard.capturePasteTarget(), selected = current();
        let html = "";
        for (const item of await navigator.clipboard.read()) if (item.types.includes("text/html")) { html = await (await item.getType("text/html")).text(); break; }
        const id = /data-copy-id="([^\s"]+)"/.exec(html)?.[1];
        const cached = id ? clipboard.copyContentCache().get(id) : undefined;
        if (!id || !cached?.matrix || cached.copyType !== "COPY" || !target) return false;
        const height = Math.max(cached.range.rows.length, selected.endRow - selected.row + 1), width = Math.max(cached.range.cols.length, selected.endColumn - selected.column + 1);
        if (height * width > 2000) throw new Error("The pasted range is too large. Paste a smaller range.");
        await latest.current.load(selected.sheet, selected.row, selected.row + height - 1);
        for (let row = selected.row; row < selected.row + height; row++) for (let col = selected.column; col < selected.column + width; col++) {
          const cell = session.cell(selected.sheet, row, col);
          if (!cell) throw new Error("Choose a cell inside the current worksheet.");
          if (cell.readonly) throw new Error("Edit the top-left cell of a merged area. Array and data-table formulas stay protected.");
        }
        internalPaste = true;
        try { if (!await clipboard.pasteByCopyId(id, undefined, target)) throw new Error("The clipboard could not be accessed. Check browser permissions and try again."); }
        finally { internalPaste = false; }
        return true;
      },
      finishEditing: async () => {
        if (!book.isCellEditing()) return;
        const selected = editingOwner ?? current();
        if (!await book.endEditingAsync(true)) throw new Error("Finish editing the current cell before saving.");
        handle.show(selected.sheet, selected.row, selected.column);
      },
      show: (name, row, column) => {
        ({ row, column } = session.anchor(name, row, column));
        const sheet = book.getSheetBySheetId(sheetIds.get(name)!)!;
        const select = () => { if (disposed) return; sheet.setActiveSelection(sheet.getRange(row, column)); sheet.scrollToCell(row, column); latest.current.selected(current()); };
        if (book.getActiveSheet().getSheetId() !== sheet.getSheetId()) { sheet.activate(); requestAnimationFrame(select); }
        else select();
        void visible();
      },
      freeze: enabled => { const sheet = book.getActiveSheet(); sheet.setFrozenRows(enabled ? 1 : 0); sheet.setFrozenColumns(enabled ? 1 : 0); },
    };
    let announced = false;
    const routedInputs = new Set<HTMLInputElement>();
    function routeAddress(event: KeyboardEvent) {
      const input = event.currentTarget as HTMLInputElement, split = input.value.lastIndexOf("!");
      if (event.key !== "Enter" || split < 0 || book.isCellEditing()) return;
      const name = input.value.slice(0, split).replace(/^'|'$/g, "").replaceAll("''", "'");
      const target = parseAddress(input.value.slice(split + 1).replaceAll("$", ""));
      const sheet = session.workspace.sheets.find(s => s.name.toLocaleLowerCase() === name.toLocaleLowerCase());
      if (!target || !sheet || target.row >= sheet.rows || target.column >= sheet.columns) return;
      event.preventDefault(); event.stopImmediatePropagation();
      void latest.current.load(sheet.name, target.row, target.row).then(() => { if (!disposed) handle.show(sheet.name, target.row, target.column); }).catch(latest.current.failed);
    }
    function labelControls() {
      const name = mount.querySelector<HTMLInputElement>('[data-u-comp="defined-name"] input');
      if (name && name.getAttribute("aria-label") !== t("Cell address")) name.setAttribute("aria-label", t("Cell address"));
      if (name && !routedInputs.has(name)) { routedInputs.add(name); name.addEventListener("keydown", routeAddress, true); }
      const bar = mount.querySelector<HTMLElement>('[data-u-comp="formula-bar"]');
      if (bar && bar.getAttribute("aria-label") !== t("Formula bar")) { bar.setAttribute("role", "group"); bar.setAttribute("aria-label", t("Formula bar")); }
    }
    const labels = new MutationObserver(() => { if (announced && !disposed) labelControls(); });
    labels.observe(mount, { childList: true, subtree: true });
    const announce = () => { if (!disposed && !announced && api.getCurrentLifecycleStage() >= LifecycleStages.Steady) {
      announced = true;
      labelControls();
      for (const [name, view] of views.current) { const sheet = book.getSheetBySheetId(sheetIds.get(name)!); sheet?.setFrozenRows(view.frozenRows); sheet?.setFrozenColumns(view.frozenColumns); }
      latest.current.ready(handle); void visible();
    } };
    subscriptions.push(api.addEvent(api.Event.LifeCycleChanged, announce));
    announce();
    return () => {
      if (announced) for (const meta of session.workspace.sheets) {
        const sheet = book.getSheetBySheetId(sheetIds.get(meta.name)!)!;
        views.current.set(meta.name, {
          widths: Object.fromEntries(Array.from({ length: meta.columns }, (_, i) => [i, sheet.getColumnWidth(i)])),
          heights: Object.fromEntries([...(session.rows.get(meta.name)?.keys() ?? [])].map(i => [i, sheet.getRowHeight(i)])),
          zoom: sheet.getZoom(), frozenRows: sheet.getFrozenRows(), frozenColumns: sheet.getFrozenColumns(),
        });
      }
      disposed = true; labels.disconnect(); routedInputs.forEach(input => input.removeEventListener("keydown", routeAddress, true)); presentation.dispose(); rawEditor(); latest.current.editing(false); latest.current.editingValue(null); latest.current.ready(null); subscriptions.forEach(s => s.dispose()); mount.remove(); queueMicrotask(() => univer.dispose());
    };
    }
    return () => { cancelled = true; release?.(); };
    // A new session intentionally creates a fresh workbook after a successful source update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.session, props.locale]);
  return <div ref={host} className="spreadsheet-canvas" aria-label="Spreadsheet grid" />;
}
