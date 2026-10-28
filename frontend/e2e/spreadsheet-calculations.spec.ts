import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { spreadsheetDriver } from "./spreadsheet-driver";
import { isolatedBrowserApi } from "./isolated-browser-api";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("calculation mode edits protected values, formulas and merged anchors with server recalculation", async ({ page, request }) => {
  test.setTimeout(150_000);
  await isolatedBrowserApi(page, api);
  const python = process.env.NODEBI_PYTHON ?? resolve(process.platform === "win32" ? "../backend/.venv/Scripts/python.exe" : "../backend/.venv/bin/python");
  const buffer = execFileSync(python, ["-c", [
    "import sys,io;sys.path.insert(0,'../backend')",
    "from openpyxl import load_workbook",
    "from tests.test_workbook_editor import sample",
    "from app.infrastructure.workbook_cells import WorkbookCells",
    "w=load_workbook(io.BytesIO(sample()))",
    "for s in w: s.protection.sheet=True",
    "b=io.BytesIO();w.save(b);p=WorkbookCells(b.getvalue())",
    "sys.stdout.buffer.write(p.patched({p.sheets['Sales'].path:{'C2':('n','4',True)},p.sheets['Notes'].path:{'D2':('n','5',True)}}))",
  ].join("\n")]);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Calculation mode acceptance" } })).json();
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  try {
    const response = await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "calculations.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer } } });
    expect(response.ok()).toBeTruthy(); const source = await response.json();
    await page.goto(`/spreadsheet/${project.id}?source=${source.id}`);
    const { address, value, go, enter, focus: focusGrid } = spreadsheetDriver(page);
    const saved = async () => { await expect(page.getByRole("status").first()).toHaveText("Changes saved. Reports have been updated.", { timeout: 30_000 }); await expect(address).toBeEnabled(); };
    const result = async () => (await request.get(`${api}/api/v1/sources/${source.id}/sheets/Sales/preview`)).json();
    await go("Sales!C2", "=B2*2"); await focusGrid(); await page.keyboard.press("F2"); await expect(page.getByRole("main", { name: "Spreadsheet editor", exact: true }).getByRole("alert")).toContainText("Enable Edit calculations");
    await page.getByRole("button", { name: "Edit calculations", exact: true }).first().click();
    await enter("=СУММ(B2;5)"); await page.keyboard.press("Control+s"); await saved();
    await expect(value).toHaveText("=SUM(B2,5)"); expect((await result()).rows[0].col_3).toBe(7);
    // New formulas typed into the native grid retain their explicit formula kind.
    await go("Sales!B2", "2"); await focusGrid(); await page.keyboard.press("F2");
    await page.keyboard.press("Control+a"); await page.keyboard.insertText("=SUM(1,2)");
    await page.keyboard.press("Control+s"); await saved();
    expect((await result()).rows[0]).toEqual({ col_1: "0001", col_2: 3, col_3: 8 });
    // Selecting any position in a merge edits its anchor; a literal equals is never evaluated.
    await go("Notes!C1", "Keep this layout"); await expect(address).toHaveValue("A1");
    await focusGrid(); await page.keyboard.press("F2"); await page.keyboard.press("Control+a");
    await page.keyboard.insertText("'=literal"); await page.keyboard.press("Control+s"); await saved();
    await expect(value).toHaveText("=literal");
    // A safe but incorrect calculation stays a draft and leaves the active report untouched.
    await go("Sales!C2", "=SUM(B2,5)"); await enter("=1/0");
    await page.keyboard.press("Control+s");
    await expect(page.getByRole("main", { name: "Spreadsheet editor", exact: true }).getByRole("alert")).toContainText("Recalculation produced an error", { timeout: 30_000 });
    expect((await result()).rows[0].col_3).toBe(8);
    await enter("=SUM(B2,6)"); await page.keyboard.press("Control+s"); await saved();
    expect((await result()).rows[0].col_3).toBe(9);
    await page.reload(); await go("Sales!C2", "=SUM(B2,6)"); await focusGrid(); await page.keyboard.press("F2"); await expect(page.getByRole("main", { name: "Spreadsheet editor", exact: true }).getByRole("alert")).toContainText("Enable Edit calculations");
    expect(errors).toEqual([]);
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
