import { expect, test } from "@playwright/test";
import { isolatedBrowserApi } from "./isolated-browser-api";
import { spreadsheetDriver } from "./spreadsheet-driver";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("source picker accepts mouse clicks and both files update their dashboard after editing", async ({ page, request }) => {
  test.setTimeout(90_000);
  await isolatedBrowserApi(page, api);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Editable dashboard sources" } })).json();
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  try {
    const reports: string[] = [];
    for (const name of ["sales-input", "cost-input"]) {
      const upload = await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: {
        connector: "csv", file: { name: `${name}.csv`, mimeType: "text/csv", buffer: Buffer.from("Code,Amount\n0001,10\n") },
      } });
      expect(upload.ok()).toBeTruthy(); const source = await upload.json();
      const profile = (await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json()).profile;
      profile.fields[0].logical_type = "string";
      Object.assign(profile.fields[1], { logical_type: "decimal", precision: 38, scale: 2 });
      const applied = await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: source.revision, request_id: crypto.randomUUID() } });
      expect(applied.ok()).toBeTruthy(); const snapshot = await applied.json();
      const report = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: {
        source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, request_id: crypto.randomUUID(),
        name, presentation: "kpi", measures: [{ column_id: profile.fields[1].field_id, name: "Total", operation: "sum", output_id: crypto.randomUUID() }],
      } });
      expect(report.ok()).toBeTruthy(); reports.push((await report.json()).visualization_id);
    }
    await page.goto(`/spreadsheet/${project.id}`);
    await expect(page.getByRole("heading", { name: "Choose a source file" })).toBeVisible();
    await expect(page.locator(".sheet-grid-frame")).toHaveAttribute("aria-busy", "false");
    await expect(page.getByRole("button", { name: "Save changes", exact: true })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Editor toolbar", exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.setViewportSize({ width: 1600, height: 1000 });
    const { go, enter, value } = spreadsheetDriver(page);
    for (const [index, name] of ["sales-input", "cost-input"].entries()) {
      // A real click must reach the source link; force-click would hide the original regression.
      await page.getByRole("link", { name: `${name} Open file for editing`, exact: true }).click();
      await go("A2", "0001"); await go("B2", "10");
      if (index === 0) {
        await enter("15.50");
        await page.getByRole("button", { name: "Undo", exact: true }).click();
        await expect(value).toHaveText("10");
        await page.getByRole("button", { name: "Redo", exact: true }).click();
        await expect(value).toHaveText("15.50");
        await enter("19.50");
        await page.getByRole("button", { name: "Clear values", exact: true }).click();
        await expect(value).toHaveText("");
        await page.getByRole("button", { name: "Undo", exact: true }).click();
        await expect(value).toHaveText("19.50");
        await page.getByRole("button", { name: "Find", exact: true }).first().click();
        await expect(page.getByText("Enter text and press Enter", { exact: true })).toBeVisible();
        const query = page.getByRole("textbox", { name: "Find in worksheet", exact: true });
        await query.fill("0001"); await query.press("Enter");
        await expect(page.locator(".sheet-find")).toContainText("1 / 1");
        await expect(value).toHaveText("0001");
        await query.fill("does-not-exist");
        await expect(page.getByText("No matches", { exact: true })).toHaveCount(0);
        await query.press("Enter"); await expect(page.getByText("No matches", { exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Close", exact: true }).click();
        await go("B2", "19.50");
        await page.getByRole("button", { name: "Delete selected rows", exact: true }).click();
        await expect(page.getByRole("button", { name: "Restore deleted rows", exact: true })).toBeEnabled();
        await page.getByRole("button", { name: "Restore deleted rows", exact: true }).click();
        await go("A2", "0001"); await go("B2", "19.50");
        await page.getByRole("button", { name: "Add data row", exact: true }).click();
        await go("A3", ""); await enter("0002"); await page.keyboard.press("Enter");
        await go("B3", ""); await enter("5"); await page.keyboard.press("Enter");
        await go("B2", "19.50");
      }
      const amount = index === 0 ? "77.25" : "22.50";
      await enter(amount); await page.getByRole("button", { name: "Save changes", exact: true }).click();
      await expect(page.getByRole("status").first()).toHaveText("Changes saved. Reports have been updated.", { timeout: 30_000 });
      await expect(value).toHaveText(amount);
      const result = await request.post(`${api}/api/v1/visualizations/${reports[index]}/result`, { data: {} });
      expect(result.ok()).toBeTruthy(); expect((await result.json()).rows[0].Total).toBe(index === 0 ? "82.25" : amount);
      await page.reload(); await go("B2", amount);
      if (index === 0) { await go("A3", "0002"); await go("B3", "5"); }
      await page.getByRole("link", { name: "Choose another file", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Choose a source file" })).toBeVisible();
    }
    expect(errors).toEqual([]);
  } finally {
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});
