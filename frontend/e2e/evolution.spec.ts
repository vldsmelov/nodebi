import { test, expect, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

for (const layout of ["desktop", "narrow", "large-text"]) test(`CSV import and report wizard retain exact results through reload and graph access (${layout})`, async ({ page, request }) => {
  test.setTimeout(120_000);
  const created = await request.post(`${api}/api/v1/projects`, { data: { name: `Evolution acceptance ${Date.now()}` } });
  expect(created.ok()).toBeTruthy();
  const project = await created.json();
  if (layout !== "desktop") await page.setViewportSize({ width: layout === "narrow" ? 420 : 1280, height: 1000 });
  // Reapply enlargement on full document navigation, including recovery/reload.
  if (layout === "large-text") await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => { document.documentElement.style.fontSize = "32px"; });
  });
  const verifyForm = async () => {
    const controls = page.locator("main input:visible, main select:visible, main textarea:visible, main button:visible");
    expect(await controls.count()).toBeGreaterThan(0);
    for (const control of await controls.all()) {
      await control.scrollIntoViewIfNeeded();
      const bounds = (await control.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  };
  try {
    await page.goto(`/projects/${project.id}/data/import`);
    await page.getByRole("radio", { name: "CSV" }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByLabel("File", { exact: true }).setInputFiles({ name: "sales.csv", mimeType: "text/csv", buffer: Buffer.from("category,amount,code\nA,0.10,001\nA,0.20,002\nB,0.50,003\n") });
    await page.getByRole("button", { name: "Upload and continue" }).click();
    await expect(page).toHaveURL(/\/data\/import\?source=/);
    await page.reload();
    await page.getByRole("button", { name: "Inspect fields" }).click();
    await expect(page.getByLabel("Data type").nth(2)).toHaveValue("string");
    await page.getByLabel("Dataset name").fill("Exact sales");
    await page.getByLabel("What does one row represent?").fill("One sale");
    for (const details of await page.getByText("Field details", { exact: true }).all()) await details.click();
    await page.getByLabel("Currency code", { exact: true }).nth(1).fill("RUB");
    await page.getByLabel("Part of row key", { exact: true }).nth(2).check();
    await verifyForm();
    await page.screenshot({ path: test.info().outputPath("import-fields.png"), fullPage: true });
    await page.getByRole("button", { name: "Save import draft", exact: true }).click();
    await expect(page.getByText("Import draft saved", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Back to data", exact: true }).click();
    await page.getByRole("link", { name: "Resume import", exact: true }).click();
    await expect(page.getByLabel("Dataset name")).toHaveValue("Exact sales");
    await expect(page.getByLabel("What does one row represent?")).toHaveValue("One sale");
    for (const details of await page.getByText("Field details", { exact: true }).all()) await details.click();
    await expect(page.getByLabel("Currency code", { exact: true }).nth(1)).toHaveValue("RUB");
    await expect(page.getByLabel("Part of row key", { exact: true }).nth(2)).toBeChecked();
    await verifyForm();
    await expect(page.getByRole("table")).toHaveCount(0);
    await page.getByRole("button", { name: "Check all rows" }).click();
    await expect(page.getByText("Checked all 3 rows; showing 3.")).toBeVisible();
    await verifyForm();
    await page.getByRole("button", { name: "Apply import" }).click();
    await expect(page.getByRole("heading", { name: "Dataset is ready" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Dataset is ready" })).toBeVisible();
    await page.getByRole("link", { name: "Back to data" }).click();
    await page.getByRole("link", { name: "Create report", exact: true }).click();
    await page.getByRole("combobox", { name: "Prepared dataset", exact: true }).selectOption({ label: "Exact sales" });
    await page.getByLabel("Report name").fill("Revenue by category");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Add measure" }).click();
    await page.getByLabel("Measure name").fill("Revenue");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("checkbox", { name: "category", exact: true }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Preview calculation" }).click();
    await expect(page.getByRole("cell", { name: "0.30", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "How it is calculated" }).click();
    await expect(page.getByText("Group By", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save report" }).click();
    await expect(page.getByRole("heading", { name: "Report is ready" })).toBeVisible();
    const graph = await page.getByRole("link", { name: "How it is calculated" }).getAttribute("href");
    await page.getByRole("link", { name: "Open report" }).click();
    await expect(page.getByRole("cell", { name: "0.30", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("cell", { name: "0.30", exact: true })).toBeVisible();
    await page.goto(graph!);
    await expect(page.getByText("Revenue by category", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Unknown node type", { exact: false })).toHaveCount(0);
    // Refresh through the same history/check/apply flow as legacy Excel sources.
    await page.goto(`/projects/${project.id}/reports`);
    await page.getByRole("button", { name: "Update data", exact: true }).click();
    await page.getByLabel("Replacement file for sales").setInputFiles({ name: "updated.csv", mimeType: "text/csv", buffer: Buffer.from("code,amount,category\n001,0.30,A\n002,0.40,A\n003,0.50,B\n") });
    await expect(page.getByRole("combobox", { name: "File version", exact: true })).not.toHaveValue("");
    await page.getByRole("button", { name: "Save update draft" }).click();
    await page.reload();
    await page.getByRole("button", { name: /Data update · draft/ }).click();
    await page.getByRole("button", { name: "Check new data" }).click();
    await expect(page.getByRole("button", { name: "Apply data update" })).toBeEnabled();
    await expect(page.getByLabel("Incoming field for category")).toHaveValue("col_3");
    await verifyForm();
    await page.screenshot({ path: test.info().outputPath("update-fields.png"), fullPage: true });
    const renderValue = async () => {
      const visuals = await (await request.get(`${api}/api/v1/projects/${project.id}/visualizations`)).json();
      const result = await (await request.post(`${api}/api/v1/visualizations/${visuals.items[0].id}/result`, { data: {} })).json();
      return result.rows[0].Revenue;
    };
    expect(await renderValue()).toBe("0.30");
    await page.getByRole("button", { name: "Apply data update" }).click();
    await expect(page.getByRole("button", { name: "Prepare rollback" })).toBeVisible();
    expect(await renderValue()).toBe("0.70");
    await page.getByRole("button", { name: "Prepare rollback" }).click();
    await page.getByRole("button", { name: /Restore previous data · draft/ }).click();
    await page.getByRole("button", { name: "Check new data" }).click();
    await expect(page.getByRole("button", { name: "Apply data update" })).toBeEnabled();
    await page.getByRole("button", { name: "Apply data update" }).click();
    await expect(page.getByRole("button", { name: "Prepare rollback" })).toBeVisible();
    expect(await renderValue()).toBe("0.30");
  } finally {
    const cleanup = await createRequest.newContext();
    const removed = await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
    expect(removed.ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
