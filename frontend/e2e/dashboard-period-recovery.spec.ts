import { expect, test } from "@playwright/test";
import { expectFormFits } from "./form-reflow";
const api = process.env.NODEBI_E2E_API ?? "http://localhost:8000";

for (const enlarged of [false, true]) for (const denied of [false, true]) test(`dashboard dates recover without changing URL filters (${denied ? "denied storage, narrow dark" : "reload, light"}, ${enlarged ? "large text" : "normal text"})`, async ({ page, request, context }) => {
  if (enlarged) await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => { document.documentElement.style.fontSize = "32px"; });
  });
  const response = await request.post(`${api}/api/v1/projects`, { data: { name: "Period recovery acceptance" } });
  expect(response.ok()).toBeTruthy();
  const project = await response.json();
  try {
    const boards: { id: string; revision: number }[] = [];
    for (const name of ["First report", "Second report"]) {
      const created = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name } })).json();
      const updated = await request.put(`${api}/api/v1/dashboards/${created.id}`, { data: { name, expected_revision: created.revision, widgets: [], configuration: { period_enabled: true, parameters: [], bindings: [], links: [] } } });
      expect(updated.ok()).toBeTruthy(); boards.push(await updated.json());
    }
    if (denied) {
      await page.setViewportSize({ width: 420, height: 900 });
      await context.addCookies([{ name: "nodebi-theme", value: "dark", domain: "localhost", path: "/" }]);
      await page.addInitScript(() => {
        const write = Storage.prototype.setItem;
        const read = Storage.prototype.getItem;
        Storage.prototype.getItem = function (key) {
          if (key.startsWith("nodebi:dashboard-period:")) throw new DOMException("Denied", "SecurityError");
          return read.call(this, key);
        };
        Storage.prototype.setItem = function (key, value) {
          if (key.startsWith("nodebi:dashboard-period:")) throw new DOMException("Quota", "QuotaExceededError");
          return write.call(this, key, value);
        };
      });
    }
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${boards[0].id}&mode=view`);
    if (denied) {
      await page.getByRole("button", { name: "Continue without recovery", exact: true }).click();
      await expect(page.getByLabel("Start date", { exact: true })).toBeFocused();
    }
    await page.getByLabel("Start date", { exact: true }).fill("2026-10-01");
    await expectFormFits(page, page.locator("body"));
    expect(new URL(page.url()).searchParams.get("period")).toBeNull();
    if (denied) await expect(page.getByText("Date recovery storage is unavailable. Keep this page open until you apply the period.")).toBeVisible();
    await page.getByRole("combobox", { name: "Dashboard", exact: true }).selectOption(boards[1].id);
    await expect(page.getByLabel("Start date", { exact: true })).toHaveValue("");
    await page.getByRole("combobox", { name: "Dashboard", exact: true }).selectOption(boards[0].id);
    await expectFormFits(page, page.locator("body"));
    await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
    await expect(page.getByLabel("Start date", { exact: true })).toBeFocused();
    await expect(page.getByLabel("Start date", { exact: true })).toHaveValue("2026-10-01");
    if (!denied) {
      page.once("dialog", dialog => dialog.accept()); await page.reload();
      await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
      await expect(page.getByLabel("Start date", { exact: true })).toHaveValue("2026-10-01");
    }
    expect(new URL(page.url()).searchParams.get("period")).toBeNull();
    await page.getByLabel("End date", { exact: true }).fill("2026-10-31");
    await expectFormFits(page, page.locator("body"));
    await page.getByRole("button", { name: "Apply period", exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("period")).toBe(JSON.stringify({ start: "2026-10-01", end: "2026-10-31" }));
    await expect(page.getByRole("button", { name: "Apply period", exact: true })).toBeFocused();
    await page.getByLabel("Start date", { exact: true }).fill("2026-11-01");
    await page.goBack();
    await expect(page.getByText("The applied period has changed. Restoring date inputs will not change the report.")).toBeVisible();
    await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
    await expect(page.getByLabel("Start date", { exact: true })).toHaveValue("2026-11-01");
    expect(new URL(page.url()).searchParams.get("period")).toBeNull();
    await page.getByRole("button", { name: "All time", exact: true }).click();
    await expect(page.getByLabel("Start date", { exact: true })).toHaveValue("");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: test.info().outputPath("dashboard-period.png"), fullPage: true });
    for (const board of boards) expect((await (await request.get(`${api}/api/v1/dashboards/${board.id}`)).json()).revision).toBe(board.revision);
  } finally { expect((await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); }
});
