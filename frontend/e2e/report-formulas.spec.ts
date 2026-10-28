import { test, expect, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

for (const layout of ["desktop", "narrow", "large-text"]) test(`wizard builds and edits row formulas and ratios of totals without manual wires (${layout})`, async ({ page, request }) => {
  test.setTimeout(120_000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Formula wizard acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "plans.csv", mimeType: "text/csv", buffer: Buffer.from("category,actual,plan\nA,1.00,1.00\nA,9.00,3.00\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    await page.goto(`/projects/${project.id}/build`);
    if (layout !== "desktop") await page.setViewportSize({ width: layout === "narrow" ? 420 : 1280, height: 1000 });
    if (layout === "large-text") await page.addStyleTag({ content: "html { font-size: 32px !important; }" });
    const verifyForm = async () => {
      const controls = page.locator("main input:visible, main select:visible, main textarea:visible, main button:visible");
      expect(await controls.count()).toBeGreaterThan(5);
      for (const control of await controls.all()) {
        await control.scrollIntoViewIfNeeded();
        const bounds = (await control.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    };
    await page.getByRole("combobox", { name: "Prepared dataset", exact: true }).selectOption(snapshot.id);
    await page.getByLabel("Report name", { exact: true }).fill("Ratios and totals");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    const rowScope = page.getByRole("group", { name: "Formulas for each row", exact: true });
    await rowScope.getByRole("button", { name: "Add row formula" }).click();
    await rowScope.getByLabel("Formula name", { exact: true }).fill("Row ratio");
    await rowScope.getByLabel("Expression", { exact: true }).fill(`[${profile.fields[1].field_id}] / [${profile.fields[2].field_id}]`);
    await rowScope.getByLabel("Decimal places", { exact: true }).fill("4");
    await page.getByRole("button", { name: "Check formula fields" }).click();
    await expect(page.getByRole("button", { name: "Add measure" })).toBeEnabled();
    for (const [index, name, field] of [[0, "Actual", "actual"], [1, "Plan", "plan"], [2, "Mean of ratios", "Row ratio"]] as const) {
      await page.getByRole("button", { name: "Add measure" }).click();
      await page.getByLabel("Measure name", { exact: true }).nth(index).fill(name);
      await page.getByRole("combobox", { name: "Field", exact: true }).nth(index).selectOption({ label: field });
    }
    await page.getByRole("combobox", { name: "Aggregation", exact: true }).nth(2).selectOption("average");
    await page.getByLabel("Decimal places for averages", { exact: true }).fill("4");
    await page.getByRole("button", { name: "Check formula fields" }).click();
    const summary = page.getByRole("group", { name: "Formulas after totals", exact: true });
    await summary.getByRole("button", { name: "Add after-total formula" }).click();
    await summary.getByLabel("Formula name", { exact: true }).fill("Ratio of totals");
    await summary.getByLabel("Insert formula field").selectOption({ label: "Actual · decimal" });
    const expression = summary.getByLabel("Expression", { exact: true });
    await expression.fill(`${await expression.inputValue()} / `);
    await summary.getByLabel("Insert formula field").selectOption({ label: "Plan · decimal" });
    await summary.getByLabel("Decimal places", { exact: true }).fill("4");
    await verifyForm();
    await page.screenshot({ path: test.info().outputPath("populated-report-formulas.png"), fullPage: true });
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("checkbox", { name: "category", exact: true }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Preview calculation" }).click();
    await expect(page.getByRole("cell", { name: "2.0000", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "2.5000", exact: true })).toBeVisible();
    await verifyForm();
    await page.getByRole("button", { name: "Save report" }).click();
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${project.id}/dashboard`));
    await page.reload();
    if (layout === "large-text") await page.addStyleTag({ content: "html { font-size: 32px !important; }" });
    await expect(page.getByRole("cell", { name: "2.5000", exact: true })).toBeVisible();
    await page.getByLabel("Widget actions", { exact: true }).click();
    await page.getByRole("link", { name: "Edit in report wizard" }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(summary.getByLabel("Formula name", { exact: true })).toHaveValue("Ratio of totals");
    await summary.getByLabel("Formula name", { exact: true }).fill("Difference");
    await expression.fill((await expression.inputValue()).replace("/", "-"));
    await verifyForm();
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Preview calculation" }).click();
    await expect(page.getByRole("cell", { name: "6.0000", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save report" }).click();
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page.getByRole("columnheader", { name: "Difference", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "6.0000", exact: true })).toBeVisible();
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
