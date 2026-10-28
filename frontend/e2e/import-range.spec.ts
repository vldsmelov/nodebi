import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, request as createRequest, test } from "@playwright/test";
import { configureFormLayout, expectFormFits, formLayouts } from "./form-reflow";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";
const makeWorkbook = (moved = false) => execFileSync(process.env.NODEBI_PYTHON ?? resolve("../backend/.venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python"), ["-c", `
import sys
from io import BytesIO
from openpyxl import Workbook
w = Workbook()
s = w.active
for row in [["Report"], ["Outside", "Sales", None, "Outside"], ["Ignore", "Code", "Amount", "Ignore"], ["Ignore", "Note", "Note", "Ignore"], ["=1+1", "001", "0.10", "=1+1"], ["Ignore", "002", "0.20", "Ignore"], ["Ignore", "Total", "0.30", "Ignore"]]:
    s.append(row)
s.merge_cells("B2:C2")
if sys.argv[1] == "moved":
    s.unmerge_cells("B2:C2")
    s.delete_rows(1, 7)
    s["A1"] = "Report"
    s["D4"], s["E4"] = "New amount", "New code"
    s["D5"], s["E5"] = "Note", "Note"
    s["D6"], s["E6"] = "0.40", "001"
    s["D7"], s["E7"] = "0.50", "002"
    s["D8"], s["E8"] = "Total", "Total"
b = BytesIO()
w.save(b)
w.close()
sys.stdout.buffer.write(b.getvalue())
`, moved ? "moved" : "original"]);
const workbook = makeWorkbook();
const replacement = makeWorkbook(true);

for (const layout of formLayouts) test(`Excel range and row settings survive reload (${layout})`, async ({ page, request }) => {
  await configureFormLayout(page, layout);
  const narrow = layout === "narrow";
  const created = await request.post(`${api}/api/v1/projects`, { data: { name: "Range acceptance" } });
  expect(created.ok()).toBeTruthy();
  const project = await created.json();
  try {
    if (narrow) await page.setViewportSize({ width: 420, height: 900 });
    await page.goto(`/projects/${project.id}/data/import`);
    await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption(narrow ? "dark" : "light");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByLabel("File", { exact: true }).setInputFiles({ name: "range.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: workbook });
    await page.getByRole("button", { name: "Upload and continue" }).click();
    await page.getByLabel("Excel cell range (optional)", { exact: true }).fill("B2:C7");
    await expect(page.getByLabel("Header row", { exact: true })).toBeDisabled();
    const disclosure = page.locator("summary", { hasText: "Additional reading settings" });
    await disclosure.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Number of header rows")).toBeFocused();
    await page.getByLabel("Number of header rows").fill("2");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Skip rows after headers")).toBeFocused();
    await page.getByLabel("Skip rows after headers").fill("1");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Exclude rows at the end")).toBeFocused();
    await page.getByLabel("Exclude rows at the end").fill("1");
    await expectFormFits(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: test.info().outputPath("range-settings.png"), fullPage: true });
    await page.getByRole("button", { name: "Inspect fields" }).click();
    await expect(page.getByRole("heading", { name: "Fields", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Field name")).toHaveCount(2);
    await expect(page.getByLabel("Field name").first()).toHaveValue("Sales / Code");
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByLabel("Excel cell range (optional)", { exact: true })).toHaveValue("B2:C7");
    await disclosure.click();
    await expect(page.getByLabel("Number of header rows")).toHaveValue("2");
    await expect(page.getByLabel("Skip rows after headers")).toHaveValue("1");
    await expect(page.getByLabel("Exclude rows at the end")).toHaveValue("1");
    await page.getByRole("button", { name: "Inspect fields" }).click();
    await page.getByRole("group", { name: "Field: Sales / Amount", exact: true }).getByLabel("Data type").selectOption("decimal");
    await page.getByRole("button", { name: "Check all rows" }).click();
    await page.getByRole("button", { name: "Apply import", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Dataset is ready" })).toBeVisible();
    const datasets = await (await request.get(`${api}/api/v1/projects/${project.id}/datasets`)).json();
    expect(datasets).toHaveLength(1);
    expect(datasets[0].row_count).toBe(2);
    expect(datasets[0].profile.options).toMatchObject({ cell_range: "B2:C7", header_rows: 2, skip_data_rows: 1, drop_tail_rows: 1 });
    expect(datasets[0].profile.fields.map((field: { source_field: string }) => field.source_field)).toEqual(["col_2", "col_3"]);
    const dataset = datasets[0];
    const built = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: {
      request_id: crypto.randomUUID(), source_id: dataset.source_id, resource_id: dataset.resource_id,
      expected_snapshot_id: dataset.id, name: "Range report", presentation: "table",
      dimensions: [dataset.profile.fields[0].field_id],
      measures: [{ column_id: dataset.profile.fields[1].field_id, operation: "sum", name: "Revenue" }],
    } });
    expect(built.ok()).toBeTruthy();
    const report = await built.json();
    const result = async () => (await (await request.post(`${api}/api/v1/visualizations/${report.visualization_id}/result`, { data: {} })).json()).rows;
    expect((await result()).map((row: { Revenue: string }) => row.Revenue)).toEqual(["0.10", "0.20"]);
    await page.goto(`/projects/${project.id}/reports`);
    await page.getByRole("button", { name: "Update data", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Data update", exact: true })).toBeFocused();
    await expect(page).toHaveURL(/\?update=[a-f0-9-]+$/);
    await page.getByLabel("Replacement file for range").setInputFiles({ name: "relocated.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: replacement });
    await expect(page.getByRole("combobox", { name: "File version", exact: true })).not.toHaveValue("");
    const mapping = page.getByRole("group", { name: "range", exact: true });
    await mapping.getByLabel("Excel cell range (optional)").fill("D4:E999");
    const settings = mapping.locator("summary", { hasText: "Additional reading settings" });
    await settings.focus(); await page.keyboard.press("Enter"); await page.keyboard.press("Tab");
    await expect(mapping.getByLabel("Number of header rows")).toBeFocused();
    await mapping.getByLabel("Number of header rows").fill("1");
    await expect(mapping.getByLabel("Skip rows after headers")).toHaveValue("1");
    await expect(mapping.getByLabel("Exclude rows at the end")).toHaveValue("1");
    await expectFormFits(page);
    let interruptedSave = false;
    await page.route("**/api/v1/updates/*", async route => {
      if (route.request().method() === "PUT" && !interruptedSave) {
        interruptedSave = true;
        await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ detail: { code: "UPDATE_CONFLICT", message: "Report changed in another tab" } }) });
      } else await route.continue();
    });
    await page.getByRole("button", { name: "Save update draft" }).click();
    await expect(page.getByRole("alert", { name: "Data update failed" })).toBeFocused();
    await expect(mapping.getByLabel("Excel cell range (optional)")).toHaveValue("D4:E999");
    await page.getByRole("button", { name: "Save update draft" }).click();
    await page.getByRole("button", { name: "Check new data" }).click();
    await expect(page.getByText("Error: The selected range extends beyond the populated worksheet.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply data update" })).toBeDisabled();
    expect((await result()).map((row: { Revenue: string }) => row.Revenue)).toEqual(["0.10", "0.20"]);
    await mapping.getByLabel("Excel cell range (optional)").fill("D4:E8");
    await page.getByRole("button", { name: "Save update draft" }).click();
    await page.getByRole("button", { name: "Check new data" }).click();
    await page.getByLabel("Incoming field for Sales / Code").selectOption("col_5");
    await page.getByLabel("Incoming field for Sales / Amount").selectOption("col_4");
    await page.getByRole("button", { name: "Save update draft" }).click();
    await expect(page.getByText("Unsaved update settings", { exact: true })).not.toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Data update", exact: true })).toBeFocused();
    await expect(page.getByLabel("Excel cell range (optional)")).toHaveValue("D4:E8");
    await page.getByRole("button", { name: "Check new data" }).click();
    await expect(page.getByRole("button", { name: "Apply data update" })).toBeEnabled();
    await expect(page.getByLabel("Incoming field for Sales / Code")).toHaveValue("col_5");
    await expect(page.getByLabel("Incoming field for Sales / Amount")).toHaveValue("col_4");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: test.info().outputPath("relocated-mapping.png"), fullPage: true });
    await page.getByRole("button", { name: "Apply data update" }).click();
    await expect(page.getByRole("button", { name: "Prepare rollback" })).toBeVisible();
    expect((await result()).map((row: { Revenue: string }) => row.Revenue)).toEqual(["0.40", "0.50"]);
    await page.getByRole("button", { name: "Prepare rollback" }).click();
    await expect(page.getByRole("heading", { name: "Data update", exact: true })).toBeFocused();
    await expect(page.getByLabel("Update name")).toHaveValue("Restore previous data");
    await page.getByRole("button", { name: "Check new data" }).click();
    await page.getByRole("button", { name: "Apply data update" }).click();
    await expect.poll(async () => (await result()).map((row: { Revenue: string }) => row.Revenue)).toEqual(["0.10", "0.20"]);
  } finally {
    const cleanup = await createRequest.newContext();
    try { expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); }
    finally { await cleanup.dispose(); }
  }
});
