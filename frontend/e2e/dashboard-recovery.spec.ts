import { expect, request as createRequest, test } from "@playwright/test";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
for (const denial of ["quota", "denied"]) {
  test(`dashboard latest draft survives ${denial} storage and does not bypass a competing revision`, async ({ page, request }) => {
    const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Dashboard recovery" } })).json();
    const board = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Original" } })).json();
    page.on("dialog", dialog => dialog.accept());
    try {
      await page.goto(`/projects/${project.id}/dashboard?dashboard=${board.id}`);
      await page.getByLabel("Dashboard name", { exact: true }).fill("Older disk draft");
      await page.evaluate(mode => {
        if (mode === "denied") Object.defineProperty(window, "sessionStorage", { configurable: true, get() { throw new DOMException("Denied", "SecurityError"); } });
        else {
          const original = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) {
            if (key.startsWith("nodebi:dashboard-draft:")) throw new DOMException("Full", "QuotaExceededError");
            return original.call(this, key, value);
          };
        }
      }, denial);
      await page.getByLabel("Dashboard name", { exact: true }).fill("Latest local draft");
      await page.getByRole("link", { name: "Overview", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
      await page.goBack();
      await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Latest local draft");
      await expect(page.getByText(/A temporary draft is kept in this open page/)).toBeVisible();
      await page.getByRole("button", { name: "Save dashboard", exact: true }).click();
      await expect(page.getByRole("button", { name: "Save dashboard", exact: true })).toBeDisabled();
      const endpoint = `${api}/api/v1/dashboards/${board.id}`;
      const saved = await (await request.get(endpoint)).json();
      expect(saved.name).toBe("Latest local draft");
      await page.getByRole("link", { name: "Overview", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
      await page.goBack();
      await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Latest local draft");
      await expect(page.getByRole("button", { name: "Save dashboard", exact: true })).toBeDisabled();
      await page.getByLabel("Dashboard name", { exact: true }).fill("Unsent conflicting draft");
      await page.getByRole("link", { name: "Overview", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
      const competing = await request.put(endpoint, { data: { name: "Other tab", expected_revision: saved.revision, widgets: saved.widgets, configuration: saved.configuration } });
      expect(competing.ok()).toBeTruthy();
      await page.goBack();
      await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Unsent conflicting draft");
      const rejected = page.waitForResponse(response => response.url() === endpoint && response.request().method() === "PUT");
      await page.getByRole("button", { name: "Save dashboard", exact: true }).click();
      expect((await rejected).status()).toBe(409);
      expect((await (await request.get(endpoint)).json()).name).toBe("Other tab");
      await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Unsent conflicting draft");
      if (denial === "denied") {
        await page.getByRole("button", { name: "Discard draft and reload", exact: true }).click();
        await expect(page.getByText("The local draft could not be removed. Nothing was discarded.", { exact: true })).toBeVisible();
        await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Unsent conflicting draft");
      }
      await page.getByRole("button", { name: "Delete dashboard", exact: true }).click();
      await expect(page.getByRole("button", { name: "Create dashboard", exact: true })).toBeVisible();
      expect((await request.get(endpoint)).status()).toBe(404);
    } finally {
      const cleanup = await createRequest.newContext();
      try { expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); }
      finally { await cleanup.dispose(); }
    }
  });
}
