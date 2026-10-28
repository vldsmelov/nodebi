import { expect, test } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8020";

for (const theme of ["light", "dark"]) test(`empty report preview is explicit and remains saveable in ${theme}`, async ({ page, request, context }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Empty preview" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "sales.csv", mimeType: "text/csv", buffer: Buffer.from("region,amount\nNorth,10\nSouth,20\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    await context.addCookies([{ name: "nodebi-theme", value: theme, domain: "localhost", path: "/" }]);
    await page.setViewportSize({ width: 420, height: 1000 });
    await page.goto(`/projects/${project.id}/build`);
    await page.getByRole("combobox", { name: "Prepared dataset", exact: true }).selectOption(snapshot.id);
    await page.getByLabel("Report name", { exact: true }).fill("Empty regional report");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Add measure", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("checkbox", { name: "region", exact: true }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Add filter", exact: true }).click();
    await page.getByRole("combobox", { name: "Field", exact: true }).selectOption(profile.fields[0].field_id);
    await page.getByLabel("Value", { exact: true }).fill("Absent");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
    const empty = page.getByRole("status").filter({ hasText: "Calculation completed with no rows. Check source data and filters." });
    await expect(empty).toBeVisible();
    await expect(empty).toContainText("The result is empty.");
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Save report", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Report is ready", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page.getByText("No rows on this page.", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("No rows on this page.", { exact: true })).toBeVisible();
  } finally {
    expect((await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
  }
});
