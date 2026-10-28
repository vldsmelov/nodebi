import { test, expect, request as createRequest } from "@playwright/test";
import { configureFormLayout, expectFormFits, formLayouts } from "./form-reflow";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

for (const layout of formLayouts) test(`overview guides empty projects, opens reports, resumes imports and isolates unavailable checks (${layout})`, async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  await configureFormLayout(page, layout);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Financial overview" } })).json();
  try {
    await page.goto(`/projects/${project.id}`);
    await expect(page.getByText("Your first report starts with a table", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Rename project" }).click();
    await page.getByLabel("Project name", { exact: true }).fill("Management review");
    await expectFormFits(page);
    await page.getByLabel("Project name", { exact: true }).press("Enter");
    await expect(page.getByRole("heading", { name: "Management review", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Rename project" })).toBeFocused();
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "sales.csv", mimeType: "text/csv", buffer: Buffer.from("region,revenue\nNorth,120\nSouth,180\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Revenue by region", dimensions: [profile.fields[0].field_id], measures: [{ name: "Revenue", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json();
    for (let i = 0; i < 7; i++) expect((await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: `Budget ${i + 1}` } })).ok()).toBeTruthy();
    const draft = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "plan.csv", mimeType: "text/csv", buffer: Buffer.from("region,plan\nNorth,150\n") } } })).json();
    await page.reload();
    await expect(page.getByRole("region", { name: "Prepared datasets", exact: true })).toContainText("Rows: 2");
    const reports = page.getByRole("region", { name: "Saved reports", exact: true });
    await expect(reports.getByRole("article")).toHaveCount(6);
    await reports.getByRole("button", { name: "Next page", exact: true }).click();
    await expect(reports.getByRole("article")).toHaveCount(2);
    await page.getByRole("searchbox", { name: "Find a report", exact: true }).fill("Revenue");
    await page.getByRole("link", { name: "Open report Revenue by region", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`dashboard=${ids.dashboard_id}&mode=view`));
    await expect(page.locator("[data-widget-id] table")).toBeVisible();
    await page.getByRole("navigation", { name: "Project navigation" }).getByRole("link", { name: "Overview", exact: true }).click();
    await expect(page.getByRole("link", { name: "Resume import plan", exact: true })).toHaveAttribute("href", `/projects/${project.id}/data/import?source=${draft.id}`);
    await page.getByRole("searchbox", { name: "Find a report", exact: true }).fill("Revenue");
    await expectFormFits(page);
    await page.screenshot({ path: testInfo.outputPath("overview-light.png"), animations: "disabled", fullPage: true });
    await page.route(`**/projects/${project.id}/report-state`, route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: { code: "UNAVAILABLE", message: "Temporarily unavailable." } }) }));
    await page.reload();
    await expect(page.getByRole("region", { name: "Checks and updates", exact: true }).getByRole("alert")).toContainText("Its current state is unknown.", { timeout: 20000 });
    await expect(reports.getByRole("article")).toHaveCount(6);
    await expectFormFits(page);
    await page.unroute(`**/projects/${project.id}/report-state`);
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByText("Report has not been checked yet.", { exact: true })).toBeVisible();
    for (const [language, title] of [["ru", "Сохранённые отчёты"], ["tt", "Сакланган хисаплар"]]) {
      await page.context().addCookies([{ name: "nodebi-language", value: language, domain: new URL(page.url()).hostname, path: "/" }, { name: "nodebi-theme", value: "dark", domain: new URL(page.url()).hostname, path: "/" }]);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      expect(await page.locator("body *").evaluateAll(elements => elements.filter(element => {
        const bounds = element.getBoundingClientRect();
        return bounds.width > 0 && (bounds.left < -1 || bounds.right > innerWidth + 1);
      }).map(element => ({ tag: element.tagName, className: element.className, text: element.textContent?.slice(0, 80) })))).toEqual([]);
      await expectFormFits(page);
      await page.screenshot({ path: testInfo.outputPath(`overview-${language}-mobile.png`), animations: "disabled", fullPage: true });
    }
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
