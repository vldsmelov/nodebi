import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { spreadsheetDriver } from "./spreadsheet-driver";
import { isolatedBrowserApi } from "./isolated-browser-api";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

for (const saveMode of ["shortcut", "button"] as const) test(`spreadsheet range clipboard and ${saveMode} save commit the active cell without losing exact identifiers`, async ({ page, context, request }) => {
  test.setTimeout(90_000);
  await isolatedBrowserApi(page, api);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const projectResponse = await request.post(`${api}/api/v1/projects`, { data: { name: "Spreadsheet keyboard acceptance" } });
  expect(projectResponse.ok()).toBeTruthy();
  const project = await projectResponse.json();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    const python = process.env.NODEBI_PYTHON ?? resolve(process.platform === "win32" ? "../backend/.venv/Scripts/python.exe" : "../backend/.venv/bin/python");
    const buffer = execFileSync(python, ["-c", "import io,sys;from openpyxl import Workbook;w=Workbook();s=w.active;s.title='Inputs';s.append(['Code','Amount']);s.append(['0001',10]);b=io.BytesIO();w.save(b);sys.stdout.buffer.write(b.getvalue())"]);
    const sourceResponse = await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "inputs.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer } } });
    expect(sourceResponse.ok()).toBeTruthy();
    const source = await sourceResponse.json();
    await page.goto(`/spreadsheet/${project.id}?source=${source.id}`);
    const { address, value, go, focus: focusGrid } = spreadsheetDriver(page);
    await go("A2", "0001");
    const exact = "00009007199254740993";
    await page.evaluate(text => navigator.clipboard.writeText(text), exact);
    await focusGrid(); await page.keyboard.press("Control+v"); await expect(value).toHaveText(exact);
    await page.keyboard.press("Control+z"); await expect(value).toHaveText("0001");
    await page.keyboard.press("F2"); await page.keyboard.press("Control+a"); await page.keyboard.type(exact);
    await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeEnabled();
    if (saveMode === "shortcut") await page.keyboard.press("Control+s");
    else await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("status").first()).toHaveText("Changes saved. Reports have been updated.", { timeout: 30_000 });
    await expect(address).toBeEnabled(); await expect(address).toHaveValue("A2"); await expect(value).toHaveText(exact);
    await focusGrid(); await page.keyboard.press("Control+c");
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(exact);
    await page.reload(); await expect(address).toBeEnabled({ timeout: 30_000 });
    await address.fill("A2"); await address.press("Enter"); await expect(value).toHaveText(exact);
    expect(errors).toEqual([]);
  } finally {
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});
