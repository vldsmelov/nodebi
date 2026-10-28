import { expect, test } from "@playwright/test";
import { activateByKeyboard, typeByKeyboard } from "./keyboard-navigation";
const api = process.env.NODEBI_E2E_API ?? "http://localhost:8000";

test("release settings return through client navigation when tab storage writes are denied", async ({ page, request }) => {
  const created = await request.post(`${api}/api/v1/projects`, { data: { name: "Release recovery acceptance" } });
  expect(created.ok()).toBeTruthy();
  const project = await created.json();
  try {
    await page.addInitScript(() => {
      const write = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith("nodebi:release-draft:")) throw new DOMException("Quota", "QuotaExceededError");
        return write.call(this, key, value);
      };
    });
    await page.goto(`/projects/${project.id}/reports`);
    await typeByKeyboard(page, page.getByLabel("Release name", { exact: true }), "Keep in this document");
    await expect(page.getByText("Local draft storage is unavailable. Save before leaving this page.")).toBeVisible();
    await expect(page.getByText("A temporary draft is kept in this open page. Returning within the app can restore it; reloading or closing the tab can lose it.")).toBeVisible();
    page.once("dialog", dialog => dialog.dismiss());
    await activateByKeyboard(page, page.getByRole("navigation", { name: "Project navigation" }).getByRole("link", { name: "Data", exact: true }));
    await expect(page).toHaveURL(new RegExp(`/projects/${project.id}/reports$`));
    page.once("dialog", dialog => dialog.accept());
    await activateByKeyboard(page, page.getByRole("navigation", { name: "Project navigation" }).getByRole("link", { name: "Data", exact: true }));
    await expect(page).toHaveURL(new RegExp(`/projects/${project.id}/data$`));
    await activateByKeyboard(page, page.getByRole("navigation", { name: "Project navigation" }).getByRole("link", { name: "History", exact: true }));
    await activateByKeyboard(page, page.getByRole("button", { name: "Restore local draft", exact: true }));
    await expect(page.getByLabel("Release name", { exact: true })).toHaveValue("Keep in this document");
    expect(await (await request.get(`${api}/api/v1/projects/${project.id}/releases`)).json()).toEqual([]);
    await page.setViewportSize({ width: 420, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  } finally { expect((await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); }
});
