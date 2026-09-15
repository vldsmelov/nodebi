import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("configure multirow Excel headers and general preparation nodes in the editor", async ({ page, request }) => {
  test.setTimeout(120000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Preparation acceptance" } })).json();
  const workbook = execFileSync(resolve("../backend/.venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python"), ["-c", [
    "import sys; from io import BytesIO; from openpyxl import Workbook",
    "w=Workbook(); s=w.active; s['A3']='Group'; s['B3']='Values'; s.merge_cells('B3:C3')",
    "s['A4']='Team'; s['B4']='Amount'; s['C4']='Units'; s.append(['A','10',1]); s.append(['B','20',2]); s.append(['A','30',3])",
    "s.cell(97,16375).number_format='0.00'; b=BytesIO(); w.save(b); sys.stdout.buffer.write(b.getvalue())",
  ].join("; ")]);
  try {
    await page.goto(`/projects/${project.id}/data`);
    await page.locator('input[type="file"]').setInputFiles({ name: "preparation.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: workbook });
    await expect(page.getByLabel("Worksheet")).toBeVisible();
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByRole("button", { name: "Create workflow", exact: true }).click();
    await page.getByTitle("Add Excel Source").click();
    await page.getByLabel("First header row").fill("3");
    await page.getByLabel("Header row count").fill("2");
    await page.getByLabel("Include source row number").check();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByTitle("Add Convert Types").click();
    await page.getByLabel("Input input").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Add conversion" }).click();
    await page.getByLabel("Conversion field").selectOption("col_2");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByTitle("Add Window").click();
    const convert = page.getByLabel("Input input").locator("option").filter({ hasText: "Convert Types (" });
    await page.getByLabel("Input input").selectOption((await convert.getAttribute("value"))!);
    await page.getByLabel("Output field name").fill("team_total");
    await page.getByLabel("Value field").selectOption("col_2");
    await page.getByRole("checkbox", { name: "Group / Team", exact: true }).check();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Preview output" }).click();
    await expect(page.getByRole("columnheader", { name: "team_total", exact: true })).toBeVisible();
    const table = page.getByRole("table");
    await expect(table.getByRole("row")).toHaveCount(4);
    expect(await table.innerText()).toContain("40");
    await page.getByTitle("Add Unpivot").click();
    const upstream = page.getByLabel("Input input").locator("option").filter({ hasText: "Convert Types (" });
    await page.getByLabel("Input input").selectOption((await upstream.getAttribute("value"))!);
    await page.getByRole("group", { name: "Identifier fields" }).getByLabel("__source_row__").check();
    await page.getByRole("group", { name: "Fields to turn into rows" }).getByLabel("Values / Amount").check();
    await page.getByRole("group", { name: "Fields to turn into rows" }).getByLabel("Values / Units").check();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Preview output" }).click();
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(7);
    await page.getByRole("group", { name: "Fields to turn into rows" }).getByLabel("Values / Units").uncheck();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Preview output" }).click();
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(4);
    await page.getByRole("group", { name: "Fields to turn into rows" }).getByLabel("Values / Units").check();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Preview output" }).click();
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(7);
    await page.reload();
    await expect(page.locator(".react-flow__node")).toHaveCount(4);
  } finally {
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});
