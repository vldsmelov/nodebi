import { expect, test } from "@playwright/test";
import { expectFormFits } from "./form-reflow";
import { activateByKeyboard, typeByKeyboard } from "./keyboard-navigation";
const api = process.env.NODEBI_E2E_API ?? "http://localhost:8000";

for (const enlarged of [false, true]) for (const corruption of ["json", "nested"]) test(`unreadable dashboard recovery is explicit (${corruption}, ${enlarged ? "large" : "normal"} text)`, async ({ page, request, context }) => {
  if (enlarged) await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => { document.documentElement.style.fontSize = "32px"; });
  });
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Dashboard recovery acceptance" } })).json();
  try {
    const board = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Saved report" } })).json();
    const key = `nodebi:dashboard-draft:${board.id}`;
    const raw = corruption === "json" ? "broken JSON" : JSON.stringify({ ...board, configuration: { parameters: [null] } });
    if (corruption === "nested") {
      await page.setViewportSize({ width: 420, height: 900 });
      await context.addCookies([{ name: "nodebi-theme", value: "dark", domain: "localhost", path: "/" }]);
    }
    await page.goto(`/projects/${project.id}`);
    await page.evaluate(([key, raw]) => sessionStorage.setItem(key, raw), [key, raw]);
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${board.id}`);
    const error = page.getByRole("alert", { name: "Dashboard draft could not be restored", exact: true });
    await expect(error).toBeVisible(); await expect(error).toBeFocused();
    await expectFormFits(page, page.locator("body"));
    expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBe(raw);
    page.once("dialog", dialog => dialog.dismiss());
    await activateByKeyboard(page, page.getByRole("button", { name: "Discard local draft", exact: true }));
    await expect(error).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await activateByKeyboard(page, page.getByRole("button", { name: "Continue with saved dashboard", exact: true }));
    await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Saved report");
    await expect(page.getByLabel("Dashboard name", { exact: true })).toBeFocused();
    expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBe(raw);
    const before = await (await request.get(`${api}/api/v1/dashboards/${board.id}`)).json();
    expect(before.revision).toBe(board.revision); expect(before.name).toBe("Saved report");
    await typeByKeyboard(page, page.getByLabel("Dashboard name", { exact: true }), "Explicit new edits");
    await expectFormFits(page, page.locator("body"));
    expect(JSON.parse((await page.evaluate(key => sessionStorage.getItem(key), key))!).name).toBe("Explicit new edits");
    const save = page.waitForResponse(r => r.url().endsWith(`/api/v1/dashboards/${board.id}`) && r.request().method() === "PUT");
    await activateByKeyboard(page, page.getByRole("button", { name: "Save dashboard", exact: true }));
    expect((await save).ok()).toBeTruthy();
    await expect(page.getByRole("button", { name: "Save dashboard", exact: true })).toBeDisabled();
    await page.reload();
    await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Explicit new edits");
    await expect(error).toHaveCount(0);
  } finally { expect((await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); }
});

for (const enlarged of [false, true]) test(`valid stale dashboard recovery retains CAS and cannot overwrite a newer saved report (${enlarged ? "large" : "normal"} text)`, async ({ page, request }) => {
  if (enlarged) {
    await page.setViewportSize({ width: 420, height: 900 });
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => { document.documentElement.style.fontSize = "32px"; });
    });
  }
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Dashboard recovery CAS" } })).json();
  try {
    const board = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Original" } })).json();
    const current = await request.put(`${api}/api/v1/dashboards/${board.id}`, { data: { name: "Newer server report", expected_revision: board.revision, widgets: [] } });
    expect(current.ok()).toBeTruthy();
    const key = `nodebi:dashboard-draft:${board.id}`;
    await page.goto(`/projects/${project.id}`);
    await page.evaluate(([key, raw]) => sessionStorage.setItem(key, raw), [key, JSON.stringify({ ...board, name: "Older local edits" })]);
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${board.id}`);
    await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Older local edits");
    const conflict = page.waitForResponse(r => r.url().endsWith(`/api/v1/dashboards/${board.id}`) && r.request().method() === "PUT");
    await activateByKeyboard(page, page.getByRole("button", { name: "Save dashboard", exact: true }));
    expect((await conflict).status()).toBe(409);
    await expect(page.getByRole("button", { name: "Discard draft and reload", exact: true })).toBeVisible();
    await expectFormFits(page, page.locator("body"));
    await page.screenshot({ path: test.info().outputPath("dashboard-conflict.png"), fullPage: true });
    expect((await (await request.get(`${api}/api/v1/dashboards/${board.id}`)).json()).name).toBe("Newer server report");
    expect(JSON.parse((await page.evaluate(key => sessionStorage.getItem(key), key))!).revision).toBe(board.revision);
    page.once("dialog", confirmation => confirmation.accept());
    await activateByKeyboard(page, page.getByRole("button", { name: "Discard draft and reload", exact: true }));
    await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Newer server report");
    expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBeNull();
    expect((await (await request.get(`${api}/api/v1/dashboards/${board.id}`)).json()).name).toBe("Newer server report");
  } finally { expect((await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); }
});
