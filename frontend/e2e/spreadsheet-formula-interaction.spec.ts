import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { isolatedBrowserApi } from "./isolated-browser-api";
import { spreadsheetDriver } from "./spreadsheet-driver";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("native formula bar follows real cell clicks and supports coloured references and mouse range insertion", async ({ page, request, context }) => {
  test.setTimeout(120_000);
  await isolatedBrowserApi(page, api);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    const paints = new WeakMap<HTMLCanvasElement, string[]>();
    const probe = window as typeof window & { sheetPaints: WeakMap<HTMLCanvasElement, string[]>; sheetAllPaints: string[] };
    probe.sheetPaints = paints;
    probe.sheetAllPaints = [];
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, w, h) {
      if (w >= this.canvas.width / 2 && h >= this.canvas.height / 2) paints.set(this.canvas, []);
      clear.call(this, x, y, w, h);
    };
    const text = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (value, x, y, maxWidth) {
      const list = paints.get(this.canvas) ?? []; list.push(String(value)); paints.set(this.canvas, list.slice(-500));
      probe.sheetAllPaints.push(String(value));
      if (maxWidth === undefined) text.call(this, value, x, y); else text.call(this, value, x, y, maxWidth);
    };
  });
  const python = process.env.NODEBI_PYTHON ?? resolve(process.platform === "win32" ? "../backend/.venv/Scripts/python.exe" : "../backend/.venv/bin/python");
  const buffer = execFileSync(python, ["-c", [
    "import sys,io;sys.path.insert(0,'../backend')",
    "from datetime import datetime",
    "from openpyxl import load_workbook",
    "from tests.test_workbook_editor import sample",
    "from app.infrastructure.workbook_cells import WorkbookCells",
    "w=load_workbook(io.BytesIO(sample()));s=w['Sales'];s['B3']=5;s['C2']='=SUM(B2,B3)';s['D1']='Amount';s['D2']=1234.5;s['D2'].number_format='#,##0.00';s['B2'].number_format='0.00';s['D5']=datetime(2025,3,15);s['D5'].number_format='dd.mm.yyyy'",
    "b=io.BytesIO();w.save(b);p=WorkbookCells(b.getvalue())",
    "sys.stdout.buffer.write(p.patched({p.sheets['Sales'].path:{'C2':('n','7',True)},p.sheets['Notes'].path:{'D2':('n','8',True)}}))",
  ].join("\n")]);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Formula reference mouse acceptance" } })).json();
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "references.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer } } })).json();
    await page.goto(`/spreadsheet/${project.id}?source=${source.id}`);
    const { address, value, go, grid, enter, focus } = spreadsheetDriver(page);
    await go("C2", "=SUM(B2,B3)");
    const drawn = await page.evaluate(() => (window as typeof window & { sheetAllPaints: string[] }).sheetAllPaints);
    expect(drawn).toContain("2.00"); expect(drawn).toContain("1,234.50"); expect(drawn).toContain("15.03.2025");
    expect(drawn).not.toContain("NaN"); expect(drawn).not.toContain("0");
    let box = (await (await grid()).boundingBox())!;
    // Fixture uses the default 120px columns, 24px rows and native 46px/20px headers.
    const point = (row: number, column: number) => ({ x: box.x + 46 + 120 * (column + 0.5), y: box.y + 20 + 24 * (row + 0.5) });
    await page.mouse.click(point(1, 0).x, point(1, 0).y);
    await expect(address).toHaveValue("A2"); await expect(value).toHaveText("0001");
    await page.mouse.click(point(1, 1).x, point(1, 1).y);
    await expect(address).toHaveValue("B2"); await expect(value).toHaveText("2");
    const barText = () => page.locator('[data-u-comp="formula-bar"] canvas').evaluateAll(canvases => {
      const probe = window as typeof window & { sheetPaints: WeakMap<HTMLCanvasElement, string[]> };
      return canvases.flatMap(canvas => probe.sheetPaints.get(canvas as HTMLCanvasElement) ?? []).join("").trim();
    });
    await expect.poll(barText).toMatch(/^2+$/);
    await page.keyboard.press("ArrowRight"); await expect(address).toHaveValue("C2"); await expect(value).toHaveText("=SUM(B2,B3)");
    await page.getByRole("button", { name: "Edit calculations", exact: true }).click();
    await focus(); await page.keyboard.press("F2");
    const referencedPixels = () => grid().then(canvas => canvas.evaluate(element => {
      const canvas = element as HTMLCanvasElement, rect = canvas.getBoundingClientRect(), scale = canvas.width / rect.width;
      const data = canvas.getContext("2d")!.getImageData(Math.floor(164 * scale), Math.floor(42 * scale), Math.ceil(124 * scale), Math.ceil(27 * scale)).data;
      let count = 0; for (let i = 0; i < data.length; i += 4) if (data[i] > data[i + 1] + 8 && data[i + 2] > data[i + 1] + 25 && data[i + 2] > 210) count++;
      return count;
    }));
    await expect.poll(referencedPixels).toBeGreaterThan(20);
    await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeDisabled();
    await enter("=SUM(");
    box = (await (await grid()).boundingBox())!;
    const a = point(1, 1), b = point(2, 1);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 5 }); await page.mouse.up();
    await expect(value).toContainText("B2:B3");
    await page.keyboard.insertText(")"); await page.keyboard.press("Enter");
    await go("C2", "=SUM(B2:B3)");
    await page.keyboard.press("Control+s");
    await expect(page.getByRole("status").first()).toHaveText("Changes saved. Reports have been updated.", { timeout: 30_000 });
    await expect(value).toHaveText("=SUM(B2:B3)");
    const result = await (await request.get(`${api}/api/v1/sources/${source.id}/sheets/Sales/preview`)).json();
    expect(result.rows[0].col_3).toBe(7);
    await focus(); await page.keyboard.press("Control+c");
    await go("C3", ""); await focus(); await page.keyboard.press("Control+v");
    await expect(value).toHaveText("=SUM(B3:B4)");
    await page.keyboard.press("Control+s");
    await expect(page.getByRole("status").first()).toHaveText("Changes saved. Reports have been updated.", { timeout: 30_000 });
    const copied = await (await request.get(`${api}/api/v1/sources/${source.id}/sheets/Sales/preview`)).json();
    expect(copied.rows[1].col_3).toBe(5); expect(errors).toEqual([]);
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
