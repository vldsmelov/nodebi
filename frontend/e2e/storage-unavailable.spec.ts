import { test, expect, request as createRequest } from "@playwright/test";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("visualization pending save survives denied storage and browser history without a duplicate", async ({ page, request }) => {
  test.setTimeout(60000); page.on("dialog", dialog => dialog.accept());
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Volatile visualization acceptance" } })).json();
  const root = `${api}/api/v1/projects/${project.id}`;
  try {
    const flow = await (await request.post(`${root}/workflows`, { data: { name: "Constant" } })).json();
    const node = crypto.randomUUID(), publication = crypto.randomUUID();
    expect((await request.put(`${api}/api/v1/workflows/${flow.id}`, { data: { name: flow.name, expected_revision: 1, format_version: 3, nodes: [{ id: node, type: "scalar_constant", version: 1, position: { x: 0, y: 0 }, config: { value: 42 } }], edges: [], result_catalog: { outputs: [{ id: publication, name: "Total", node_id: node, port: "value", kind: "scalar" }] } } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("link", { name: "Available visualizations", exact: true }).click();
    await page.getByRole("button", { name: "Create visualization", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Visualization name", { exact: true }).fill("Old title");
    await page.evaluate(() => {
      for (const method of ["getItem", "setItem", "removeItem"] as const) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (key: string, ...args: string[]) {
          if (key.startsWith("nodebi:visualization-draft:")) throw new DOMException("Blocked for acceptance", "SecurityError");
          return Reflect.apply(original, this, [key, ...args]);
        };
      }
    });
    await dialog.getByLabel("Visualization name", { exact: true }).fill("Latest KPI");
    const bodies: string[] = [];
    await page.route(`${root}/visualizations`, async route => {
      if (route.request().method() !== "POST") { await route.continue(); return; }
      bodies.push(route.request().postData()!);
      if (bodies.length === 1) { const response = await route.fetch(); expect(response.ok()).toBeTruthy(); await route.abort("connectionreset"); }
      else await route.continue();
    });
    await dialog.getByRole("button", { name: "Save visualization", exact: true }).click();
    await expect(dialog.getByText(/Save confirmation is pending/)).toBeVisible();
    await page.goBack(); await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
    await page.goForward(); await expect(page).toHaveURL(/visualizations$/);
    await page.getByRole("button", { name: "Create visualization", exact: true }).click();
    await dialog.getByRole("button", { name: "Restore local draft", exact: true }).click();
    await expect(dialog.getByLabel("Visualization name", { exact: true })).toHaveValue("Latest KPI");
    await expect(dialog.getByLabel("Visualization name", { exact: true })).toBeDisabled();
    await expect(dialog.getByText(/A temporary draft is kept in this open page/)).toBeVisible();
    await dialog.getByRole("button", { name: "Save visualization", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(bodies).toHaveLength(2); expect(bodies[1]).toBe(bodies[0]);
    expect((await (await request.get(`${root}/visualizations`)).json()).items).toHaveLength(1);
    await page.getByRole("button", { name: "Create visualization", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Restore local draft", exact: true })).toHaveCount(0);
    await expect(dialog.getByLabel("Visualization name", { exact: true })).toHaveValue("");
  } finally {
    try { await page.goto("about:blank"); } finally {
      const cleanup = await createRequest.newContext();
      expect((await cleanup.delete(`${root}?confirm=true`)).ok()).toBeTruthy(); await cleanup.dispose();
    }
  }
});

for (const pending of [false, true]) test(`analytical ${pending ? "pending request" : "unsent draft"} survives client history with unavailable storage`, async ({ page, request }) => {
  test.setTimeout(60000);
  page.on("dialog", dialog => dialog.accept());
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Unavailable storage acceptance" } })).json();
  const root = `${api}/api/v1/projects/${project.id}`;
  try {
    const source = await (await request.post(`${root}/imports`, { multipart: { connector: "csv", file: { name: "observations.csv", mimeType: "text/csv", buffer: Buffer.from("amount\n1.00\n2.00\n3.00\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    await page.goto(`/projects/${project.id}/build`);
    await page.getByRole("link", { name: "Create analytical report", exact: true }).click();
    await page.getByLabel("Report name", { exact: true }).fill("Old persisted title");
    await page.getByRole("combobox", { name: "Prepared dataset", exact: true }).selectOption(snapshot.id);
    await page.getByLabel("Distribution value", { exact: true }).selectOption(profile.fields[0].field_id);
    await page.evaluate((denyReads) => {
      for (const method of denyReads ? ["getItem", "setItem", "removeItem"] as const : ["setItem"] as const) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (key: string, ...args: string[]) {
          if (key.startsWith("nodebi:report-draft:")) throw new DOMException("Blocked for acceptance", "SecurityError");
          return Reflect.apply(original, this, [key, ...args]);
        };
      }
    }, pending);
    await page.getByLabel("Report name", { exact: true }).fill("Newest retained title");
    await expect(page.getByText(/Local report recovery is unavailable/)).toBeVisible();
    const bodies: string[] = [];
    if (pending) {
      await page.route(`${root}/statistical-reports/apply`, async route => {
        bodies.push(route.request().postData()!);
        if (bodies.length === 1) { const response = await route.fetch(); expect(response.ok()).toBeTruthy(); await route.abort("connectionreset"); }
        else await route.continue();
      });
      await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
      await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeEnabled();
      await page.getByRole("button", { name: "Save report", exact: true }).click();
      await expect(page.getByRole("button", { name: "Retry report save", exact: true })).toBeEnabled();
    }
    await page.goBack(); await expect(page).toHaveURL(new RegExp(`/projects/${project.id}/build$`));
    await page.goForward(); await expect(page).toHaveURL(/statistics=1/);
    await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
    await expect(page.getByText(/A temporary draft is kept in this open page/)).toBeVisible();
    if (pending) {
      await expect(page.getByRole("region", { name: "Pending report save", exact: true })).toContainText("Newest retained title");
      await page.getByRole("button", { name: "Retry report save", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Report is ready", exact: true })).toBeVisible();
      expect(bodies).toHaveLength(2); expect(bodies[1]).toBe(bodies[0]);
      expect((await (await request.get(`${root}/workflows`)).json()).items).toHaveLength(1);
      await page.goBack(); await page.goForward();
      await expect(page.getByRole("button", { name: "Restore local draft", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Retry report save", exact: true })).toHaveCount(0);
    } else {
      await expect(page.getByLabel("Report name", { exact: true })).toHaveValue("Newest retained title");
      await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeDisabled();
      expect((await (await request.get(`${root}/workflows`)).json()).items).toHaveLength(0);
      await page.getByRole("navigation", { name: "Project navigation", exact: true }).getByRole("link", { name: "Overview", exact: true }).click();
      await page.getByRole("button", { name: "Keep draft and continue", exact: true }).click();
      await expect(page).toHaveURL(/statistics=1/); // Never pretend a failed persistent write succeeded.
      await page.getByRole("button", { name: "Continue editing", exact: true }).click();
    }
  } finally {
    try { await page.goto("about:blank"); } finally {
      const cleanup = await createRequest.newContext();
      expect((await cleanup.delete(`${root}?confirm=true`)).ok()).toBeTruthy(); await cleanup.dispose();
    }
  }
});
