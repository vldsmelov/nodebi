import { test, expect, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("radar wizard requires scales, recovers drafts and persists guarded axis edits", async ({ page, request }) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Guided profiles" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "profiles.csv", mimeType: "text/csv", buffer: Buffer.from("profile,actual,plan\nA,0.10,0.20\nA,0.20,0.30\nB,0.70,0.60\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const applied = await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } });
    expect(applied.ok()).toBeTruthy();
    const snapshot = await applied.json();
    await page.goto(`/projects/${project.id}/build`);
    await page.getByRole("combobox", { name: "Prepared dataset", exact: true }).selectOption(snapshot.id);
    await page.getByLabel("Report name", { exact: true }).fill("Performance profiles");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    for (const [index, name, field, operation] of [[0, "Actual", "actual", "sum"], [1, "Plan", "plan", "sum"], [2, "Average", "actual", "average"]] as const) {
      await page.getByRole("button", { name: "Add measure" }).click();
      await page.getByLabel("Measure name", { exact: true }).nth(index).fill(name);
      await page.getByRole("combobox", { name: "Field", exact: true }).nth(index).selectOption({ label: field });
      await page.getByRole("combobox", { name: "Aggregation", exact: true }).nth(index).selectOption(operation);
    }
    await page.getByLabel("Decimal places for averages", { exact: true }).fill("2");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("checkbox", { name: "profile", exact: true }).check();
    for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("combobox", { name: "Presentation", exact: true }).selectOption("radar_chart");
    await page.getByRole("button", { name: "Check presentation fields", exact: true }).click();
    await expect(page.getByLabel("Radar axis 1", { exact: true })).not.toHaveValue("");
    await expect(page.getByRole("button", { name: "Preview calculation", exact: true })).toBeDisabled();
    await page.getByLabel("Radar normalization", { exact: true }).selectOption("shared");
    await page.getByLabel("Radar minimum", { exact: true }).fill("0");
    await page.getByLabel("Radar maximum", { exact: true }).fill("0.1");
    await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
    await expect(page.getByRole("alert", { name: "Report check failed" })).toContainText("outside");
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeDisabled();
    await page.getByLabel("Radar maximum", { exact: true }).fill("1");
    await page.reload();
    await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
    await expect(page.getByLabel("Radar maximum", { exact: true })).toHaveValue("1");
    await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
    await expect(page.getByTestId("report-chart-preview").locator("canvas")).toBeVisible();
    await expect(page.getByLabel("Radar axis 1", { exact: true }).locator("option:checked")).toHaveText("Actual");
    await expect(page.getByRole("cell", { name: "0.15", exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("radar-wizard.png"), fullPage: true });
    await page.getByRole("button", { name: "Save report", exact: true }).click();
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${project.id}/dashboard`));
    await page.reload();
    await expect(page.locator("canvas")).toBeVisible();
    await expect.poll(async () => (await page.locator("canvas").boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(300);
    const visual = (await (await request.get(`${api}/api/v1/projects/${project.id}/visualizations`)).json()).items[0];
    await page.getByLabel("Widget actions", { exact: true }).click();
    await page.getByRole("link", { name: "Edit in report wizard", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("combobox", { name: "Aggregation", exact: true }).nth(0).selectOption("average");
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByLabel("Radar maximum", { exact: true })).toBeDisabled();
    await page.getByLabel("Update visualization field bindings", { exact: true }).check();
    await page.getByLabel("Move radar axis 1 down", { exact: true }).click();
    await page.getByLabel("Radar maximum", { exact: true }).fill("2");
    await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
    await expect(page.getByTestId("report-chart-preview").locator("canvas")).toBeVisible();
    await page.getByRole("button", { name: "Save report", exact: true }).click();
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${project.id}/dashboard`));
    await page.reload();
    await expect(page.locator("canvas")).toBeVisible();
    const result = await (await request.post(`${api}/api/v1/visualizations/${visual.id}/result`, { data: {} })).json();
    expect(result.rows[0].Actual).toBe("0.15");
    expect(result.spec.axes.map((a: { maximum: string }) => a.maximum)).toEqual(["2", "2", "2"]);
    expect(result.spec.axes[0].column_id).toBe(visual.config.spec.axes[1].column_id);
    await page.screenshot({ path: test.info().outputPath("radar-report.png"), fullPage: true });
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
