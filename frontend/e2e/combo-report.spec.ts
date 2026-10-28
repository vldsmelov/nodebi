import { test, expect, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("analyst creates plan-fact combo with chart preview and edits aggregation without manual wires", async ({ page, request }) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Guided plan fact" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "plan.csv", mimeType: "text/csv", buffer: Buffer.from("month,actual,plan\nJan,0.10,0.20\nJan,0.20,0.30\nFeb,0.70,0.60\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    await page.goto(`/projects/${project.id}/build`);
    await page.getByRole("combobox", { name: "Prepared dataset", exact: true }).selectOption(snapshot.id);
    await page.getByLabel("Report name", { exact: true }).fill("Plan and actual");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    for (const [index, name, field] of [[0, "Actual", "actual"], [1, "Plan", "plan"]] as const) {
      await page.getByRole("button", { name: "Add measure" }).click();
      await page.getByLabel("Measure name", { exact: true }).nth(index).fill(name);
      await page.getByRole("combobox", { name: "Field", exact: true }).nth(index).selectOption({ label: field });
    }
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("checkbox", { name: "month", exact: true }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("combobox", { name: "Presentation", exact: true }).selectOption("combo_chart");
    await page.getByRole("button", { name: "Check presentation fields", exact: true }).click();
    await expect(page.getByLabel("Combination field 1")).not.toHaveValue("");
    await page.getByLabel("Series name 1", { exact: true }).fill("Actual bars");
    await page.getByLabel("Series name 2", { exact: true }).fill("Plan line");
    await expect(page.getByLabel("Enable secondary axis")).not.toBeChecked();
    await page.reload();
    await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
    await expect(page.getByLabel("Series name 1", { exact: true })).toHaveValue("Actual bars");
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
    await expect(page.getByTestId("report-chart-preview").locator("canvas")).toBeVisible();
    await expect(page.getByRole("cell", { name: "0.30", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "0.50", exact: true })).toBeVisible();
    await expect(page.getByLabel("Combination field 1").locator("option:checked")).toHaveText("Actual");
    await expect(page.getByLabel("Combination field 2").locator("option:checked")).toHaveText("Plan");
    await page.screenshot({ path: test.info().outputPath("combo-wizard.png"), fullPage: true });
    await page.getByRole("button", { name: "Save report", exact: true }).click();
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${project.id}/dashboard`));
    await page.reload();
    await expect(page.locator("canvas")).toBeVisible();
    const visual = (await (await request.get(`${api}/api/v1/projects/${project.id}/visualizations`)).json()).items[0];
    expect(visual.config.spec.series.map((s: { name: string }) => s.name)).toEqual(["Actual bars", "Plan line"]);
    await page.getByLabel("Widget actions", { exact: true }).click();
    await page.getByRole("link", { name: "Edit in report wizard", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("combobox", { name: "Aggregation", exact: true }).nth(0).selectOption("average");
    await page.getByLabel("Decimal places for averages", { exact: true }).fill("2");
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByLabel("Series name 1", { exact: true })).toHaveValue("Actual bars");
    await expect(page.getByLabel("Series name 1", { exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
    await expect(page.getByRole("cell", { name: "0.15", exact: true })).toBeVisible();
    await expect(page.getByTestId("report-chart-preview").locator("canvas")).toBeVisible();
    await page.getByRole("button", { name: "Save report", exact: true }).click();
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${project.id}/dashboard`));
    await page.reload();
    const result = await (await request.post(`${api}/api/v1/visualizations/${visual.id}/result`, { data: {} })).json();
    expect(result.rows[0].Actual).toBe("0.15");
    expect(result.spec.series.map((s: { name: string }) => s.name)).toEqual(["Actual bars", "Plan line"]);
    await page.screenshot({ path: test.info().outputPath("combo-report.png"), fullPage: true });
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
