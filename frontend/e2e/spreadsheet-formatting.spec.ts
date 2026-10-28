import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { isolatedBrowserApi } from "./isolated-browser-api";
import { spreadsheetDriver } from "./spreadsheet-driver";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
const python = process.env.NODEBI_PYTHON ?? resolve(process.platform === "win32" ? "../backend/.venv/Scripts/python.exe" : "../backend/.venv/bin/python");

for (const physical of [false, true]) test(`XLSX ${physical ? "formula workbook" : "plain table"} formatting shares undo and persists in the actual source file`, async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  await isolatedBrowserApi(page, api);
  await page.addInitScript(() => {
    const probe = window as typeof window & { formatPaints: { color: string; font: string }[] };
    probe.formatPaints = [];
    const paint = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (value, x, y, width) {
      probe.formatPaints.push({ color: String(this.fillStyle).toLowerCase(), font: this.font });
      if (probe.formatPaints.length > 4000) probe.formatPaints.splice(0, 2000);
      if (width === undefined) paint.call(this, value, x, y); else paint.call(this, value, x, y, width);
    };
  });
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Persisted source formatting" } })).json();
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  try {
    const buffer = execFileSync(python, ["-c", [
      "import sys,io;sys.path.insert(0,'../backend');from tests.test_workbook_formatting import sample;from openpyxl import load_workbook;from app.infrastructure.workbook_cells import WorkbookCells",
      `w=load_workbook(io.BytesIO(sample(${physical ? "True" : "False"})));s=w['Inputs'];s['D1']='Exact ID';s['D2']=1;b=io.BytesIO();w.save(b);p=WorkbookCells(b.getvalue())`,
      `changes={'D2':('n','9007199254740993',False)};${physical ? "changes['C2']=('n','20.5',True);" : ""}sys.stdout.buffer.write(p.patched({p.sheets['Inputs'].path:changes}))`,
    ].join("\n")]);
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "formatting.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer } } })).json();
    await page.goto(`/spreadsheet/${project.id}?source=${source.id}`);
    const { go, value, enter, address, grid } = spreadsheetDriver(page);
    await go("B2", "10.25");
    await go("D2", "9007199254740993"); await go("B2", "10.25");
    if (!physical) {
      const before = (await (await grid()).boundingBox())!;
      await go("A1", "Code");
      await expect(page.getByText("Select a data cell to change its formatting.", { exact: true })).toBeVisible();
      expect((await (await grid()).boundingBox())!.y).toBe(before.y);
      await go("B2", "10.25");
      expect((await (await grid()).boundingBox())!.y).toBe(before.y);
    }
    await expect(page.getByRole("group", { name: "Cell formatting", exact: true })).toBeVisible();
    await address.fill("B2:C2"); await address.press("Enter");
    await page.getByRole("button", { name: "Bold", exact: true }).click();
    await expect(page.getByRole("button", { name: "Bold", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Control+b");
    await expect(page.getByRole("button", { name: "Bold", exact: true })).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Control+b");
    await expect(page.getByRole("button", { name: "Bold", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Italic", exact: true }).click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.getByRole("button", { name: "Italic", exact: true })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await page.getByRole("combobox", { name: "Font size", exact: true }).selectOption("16");
    await page.getByLabel("Fill color", { exact: true }).fill("#ffff00");
    await page.getByLabel("Text color", { exact: true }).fill("#008800");
    await page.getByRole("button", { name: "Align center", exact: true }).click();
    await page.getByRole("button", { name: "Wrap text", exact: true }).click();
    // Source sizes are points; the native canvas uses CSS pixels at 96/72 px per point.
    await expect.poll(() => page.evaluate(() => (window as typeof window & { formatPaints: { color: string; font: string }[] }).formatPaints.some(p => {
      const pixels = Number(p.font.match(/([\d.]+)px/)?.[1]);
      return p.color === "#008800" && Math.abs(pixels - 16 * 96 / 72) < 0.01 && /bold|700/.test(p.font) && /italic/.test(p.font);
    }))).toBe(true);
    await go("C2", physical ? "=B2*2" : "text");
    await go("A2", "0001"); await enter("00009007199254740993");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("status").first()).toHaveText("Changes saved. Reports have been updated.", { timeout: 45_000 });
    await page.reload(); await go("B2", "10.25");
    for (const label of ["Bold", "Italic", "Align center", "Wrap text"]) await expect(page.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("combobox", { name: "Font size", exact: true })).toHaveValue("16");
    await expect(page.getByLabel("Fill color", { exact: true })).toHaveValue("#ffff00");
    await expect(page.getByLabel("Text color", { exact: true })).toHaveValue("#008800");
    await go("C2", physical ? "=B2*2" : "text"); await expect(value).not.toHaveText("NaN");
    await page.screenshot({ path: testInfo.outputPath("formatting.png") });
    const update = await (await request.post(`${api}/api/v1/projects/${project.id}/file-updates`, { data: { source_id: source.id, request_id: crypto.randomUUID() } })).json();
    const output = await (await request.get(`${api}/api/v1/updates/${update.id}/files/current`)).body();
    const persisted = JSON.parse(execFileSync(python, ["-c", [
      "import io,sys,json;sys.path.insert(0,'../backend');from openpyxl import load_workbook;from app.infrastructure.workbook_cells import WorkbookCells,NS",
      "content=sys.stdin.buffer.read();w=load_workbook(io.BytesIO(content));s=w.active",
      "print(json.dumps({'code':s['A2'].value,'raw_id':WorkbookCells(content).sheets['Inputs'].cells['D2'].findtext(NS+'v'),'value':s['B2'].value,'formula':s['C2'].value,'styles':[{'bold':s[c].font.bold,'italic':s[c].font.italic,'size':s[c].font.sz,'color':s[c].font.color.rgb,'background':s[c].fill.fgColor.rgb,'wrap':s[c].alignment.wrap_text,'align':s[c].alignment.horizontal,'number':s[c].number_format,'border':s[c].border.bottom.color.rgb} for c in ['B2','C2']]}))",
    ].join("\n")], { input: output }).toString());
    expect(persisted.code).toBe("00009007199254740993"); expect(persisted.value).toBe(10.25); expect(persisted.formula).toBe(physical ? "=B2*2" : "text");
    expect(persisted.raw_id).toBe("9007199254740993");
    for (const style of persisted.styles) expect(style).toEqual({ bold: true, italic: true, size: 16, color: "FF008800", background: "FFFFFF00", wrap: true, align: "center", number: "#,##0.00", border: "FF654321" });
    expect(errors).toEqual([]);
  } finally {
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});
