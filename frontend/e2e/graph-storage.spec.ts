import { expect, request as createRequest, test } from "@playwright/test";
import { showAllOperations } from "./operation-catalog";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
for (const version of [1, 2]) {
  test(`workflow v${version} saves when the sessionStorage getter is denied`, async ({ page, request }) => {
    const created = await request.post(`${api}/api/v1/projects`, { data: { name: "Denied graph storage" } });
    expect(created.ok()).toBeTruthy();
    const project = await created.json();
    try {
      const response = await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Storage denied" } });
      expect(response.ok()).toBeTruthy();
      const workflow = await response.json();
      const configured = await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: { name: workflow.name, expected_revision: workflow.revision, format_version: version, nodes: [], edges: [] } });
      expect(configured.ok()).toBeTruthy();
      expect((await configured.json()).version).toBe(version);
      await page.addInitScript(() => {
        Object.defineProperty(window, "sessionStorage", { configurable: true, get() { throw new DOMException("Denied by browser policy", "SecurityError"); } });
      });
      const failures: string[] = [];
      page.on("pageerror", error => failures.push(error.message));
      await page.goto(`/projects/${project.id}/workflow?workflow=${workflow.id}${version === 2 ? "&mode=fields" : ""}`);
      await expect(page.getByRole("alert").filter({ hasText: "The local draft could not be restored." })).toBeVisible();
      page.on("dialog", dialog => dialog.accept());
      await page.getByRole("button", { name: "Discard draft and reload", exact: true }).click();
      await expect(page.getByRole("alert").filter({ hasText: "The local draft could not be removed. Nothing was discarded." })).toBeVisible();
      await page.getByTitle("Add Select Columns", { exact: true }).click();
      await expect.poll(async () => (await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json()).nodes.length).toBe(1);
      await expect(page.locator(".react-flow__node")).toHaveCount(1);
      expect(failures).toEqual([]);
    } finally {
      const cleanup = await createRequest.newContext();
      try { expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); }
      finally { await cleanup.dispose(); }
    }
  });
}

for (const version of [1, 2]) for (const denial of ["quota", "denied"]) {
  test(`workflow v${version} retains latest unsaved graph through history with ${denial} storage`, async ({ page, request }) => {
    const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Graph history recovery" } })).json();
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "History" } })).json();
    const configured = await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: { name: workflow.name, expected_revision: workflow.revision, format_version: version, nodes: [], edges: [] } });
    expect(configured.ok()).toBeTruthy();
    let offline = true;
    let failedSaves = 0;
    page.on("dialog", dialog => dialog.accept());
    try {
      await page.route(`**/api/v1/workflows/${workflow.id}`, async route => {
        if (offline && route.request().method() === "PUT") { failedSaves++; await route.abort("failed"); }
        else await route.continue();
      });
      await page.goto(`/projects/${project.id}/workflow?workflow=${workflow.id}${version === 2 ? "&mode=fields" : ""}`);
      await showAllOperations(page);
      await page.getByTitle("Add Select Columns", { exact: true }).click();
      await expect(page.getByRole("button", { name: "Retry save", exact: true })).toBeVisible();
      // An older on-disk draft exists before writes (or all storage) become unavailable.
      await page.evaluate(mode => {
        if (mode === "denied") {
          Object.defineProperty(window, "sessionStorage", { configurable: true, get() { throw new DOMException("Denied", "SecurityError"); } });
        } else {
          const original = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) {
            if (key.startsWith("nodebi:workflow-draft:")) throw new DOMException("Full", "QuotaExceededError");
            return original.call(this, key, value);
          };
        }
      }, denial);
      await showAllOperations(page);
      await page.getByTitle("Add Rename Columns", { exact: true }).click();
      await expect(page.locator(".react-flow__node")).toHaveCount(2);
      await page.getByRole("link", { name: "← Project", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
      await page.goBack();
      await expect(page.locator(".react-flow__node")).toHaveCount(2);
      await expect(page.getByText(/A temporary draft is kept in this open page/).first()).toBeVisible();
      await page.goForward();
      await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
      const beforeReturn = failedSaves;
      await page.goBack();
      await expect(page.locator(".react-flow__node")).toHaveCount(2);
      expect((await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json()).nodes).toHaveLength(0);
      // Remount schedules autosave. Wait for its actual failure before enabling the network,
      // otherwise it can succeed and remove the Retry button before the click.
      await expect.poll(() => failedSaves).toBeGreaterThan(beforeReturn);
      await expect(page.getByRole("alert").filter({ hasText: "Failed to fetch" })).toBeVisible();
      offline = false;
      await page.getByRole("button", { name: "Retry save", exact: true }).click();
      await expect.poll(async () => (await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json()).nodes.length).toBe(2);
      await page.getByRole("link", { name: "← Project", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
      await page.goBack();
      await expect(page.locator(".react-flow__node")).toHaveCount(2);
      await expect(page.getByText(/Recovered a local draft/)).toHaveCount(0);
    } finally {
      const cleanup = await createRequest.newContext();
      try { expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); }
      finally { await cleanup.dispose(); }
    }
  });
}
