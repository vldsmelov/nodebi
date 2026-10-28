import { test, expect, request as createRequest, type APIRequestContext, type Page } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";
async function activate(page: Page, name: string) {
  const button = page.getByRole("button", { name, exact: true });
  await expect(button).toBeEnabled(); await button.focus(); await page.keyboard.press("Enter");
}
async function seed(request: APIRequestContext, project: string) {
  const root = `${api}/api/v1/projects/${project}`;
  const source = await (await request.post(`${root}/imports`, { multipart: { connector: "csv", file: { name: "observations.csv", mimeType: "text/csv", buffer: Buffer.from("region,product,amount\nNorth,A,0.10\nNorth,B,0.20\nSouth,A,0.50\n") } } })).json();
  const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
  const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
  return { root, source, profile, snapshot };
}

test("analytical grouping, measures and filters retain keyboard context, recover a failed preview and save real totals", async ({ page, request }) => {
  test.setTimeout(120000);
  page.on("dialog", dialog => dialog.accept());
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Analytical focus acceptance" } })).json();
  try {
    const { root, profile, snapshot } = await seed(request, project.id);
    await page.setViewportSize({ width: 760, height: 1000 });
    await page.goto(`/projects/${project.id}/build?statistics=1`);
    await page.getByLabel("Report name", { exact: true }).fill("Regional totals");
    await page.getByRole("combobox", { name: "Prepared dataset", exact: true }).selectOption(snapshot.id);
    await page.getByRole("combobox", { name: "Analysis type", exact: true }).selectOption("table_rollup");
    for (let i = 0; i < 2; i++) {
      await activate(page, "Add grouping level");
      await expect(page.getByLabel(`Rollup dimension ${i + 1}`, { exact: true })).toBeFocused();
      await page.getByLabel(`Rollup dimension ${i + 1}`, { exact: true }).selectOption(profile.fields[i].field_id);
    }
    await activate(page, "Move rollup dimension 2 up");
    await expect(page.getByLabel("Rollup dimension 1", { exact: true })).toBeFocused();
    await expect(page.getByLabel("Rollup dimension 1", { exact: true })).toHaveValue(profile.fields[1].field_id);
    await activate(page, "Remove rollup dimension 1");
    await expect(page.getByLabel("Rollup dimension 1", { exact: true })).toBeFocused();
    await activate(page, "Add rollup measure");
    await expect(page.getByLabel("Rollup measure name 1", { exact: true })).toBeFocused();
    await page.keyboard.type("Revenue");
    await page.getByLabel("Rollup operation 1", { exact: true }).selectOption("sum");
    await page.getByLabel("Rollup value 1", { exact: true }).selectOption(profile.fields[2].field_id);
    await activate(page, "Add rollup measure");
    await expect(page.getByLabel("Rollup measure name 2", { exact: true })).toBeFocused();
    const remove = page.getByRole("group", { name: "Rollup measure 2", exact: true }).getByRole("button", { name: "Remove", exact: true });
    await remove.focus(); await page.keyboard.press("Enter");
    await expect(page.getByLabel("Rollup measure name 1", { exact: true })).toBeFocused();
    await page.getByText("Filters before statistics", { exact: false }).click();
    await activate(page, "Add filter");
    await expect(page.getByRole("combobox", { name: "Field", exact: true })).toBeFocused();
    await page.getByLabel("Value", { exact: true }).fill("North");
    await page.route("**/statistical-reports/preview?offset=0", route => route.abort("connectionreset"), { times: 1 });
    await activate(page, "Preview calculation");
    await expect(page.getByRole("alert", { name: "Report check failed" })).toBeFocused();
    await expect(page.getByLabel("Value", { exact: true })).toHaveValue("North");
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeDisabled();
    expect((await (await request.get(`${root}/workflows`)).json()).items).toHaveLength(0);
    await page.reload();
    await activate(page, "Restore local draft");
    await expect(page.getByLabel("Rollup measure name 1", { exact: true })).toHaveValue("Revenue");
    await activate(page, "Preview calculation");
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeEnabled();
    await expect(page.getByRole("alert", { name: "Report check failed" })).toHaveCount(0);
    const total = page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Grand total Source rows: 2", exact: true }) });
    await expect(total.getByRole("cell", { name: "0.30", exact: true })).toBeVisible();
    await page.getByLabel("Report name", { exact: true }).fill("Updated regional totals");
    await expect(page.getByText("Preview is out of date. Run the calculation again.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeDisabled();
    await activate(page, "Preview calculation");
    await expect(total.getByRole("cell", { name: "0.30", exact: true })).toBeVisible();
    await expect(page.getByText("Preview is out of date. Run the calculation again.", { exact: true })).toHaveCount(0);
    await activate(page, "Save report");
    await expect(page.getByRole("heading", { name: "Report is ready", exact: true })).toBeVisible();
    expect((await (await request.get(`${root}/workflows`)).json()).items).toHaveLength(1);
  } finally {
    try { await page.goto("about:blank"); } finally {
      const cleanup = await createRequest.newContext();
      expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
      await cleanup.dispose();
    }
  }
});

for (const mode of ["create", "edit"] as const) test(`alignment ${mode} retains keys and shows the latest check error, then recovers without graph changes`, async ({ page, request }) => {
  test.setTimeout(120000);
  page.on("dialog", dialog => dialog.accept());
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Alignment feedback acceptance" } })).json();
  try {
    const { root, source, profile, snapshot } = await seed(request, project.id);
    const response = await request.post(`${root}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Prepared", dimensions: [profile.fields[0].field_id], measures: [{ name: "Revenue", operation: "sum", column_id: profile.fields[2].field_id }] } });
    expect(response.ok()).toBeTruthy(); const saved = await response.json();
    const prepared = await (await request.get(`${root}/report-builder/inputs/${saved.workflow_id}/${saved.publication_id}`)).json();
    const value = prepared.columns.find((c: { logical_type: string }) => c.logical_type === "decimal").column_id;
    const alignment = { keys: [{ left_key: profile.fields[0].field_id, right_key: profile.fields[0].field_id }], left_value: value, right_value: value };
    let endpoint = `${root}/alignment-reports`;
    if (mode === "edit") {
      const created = await request.post(`${endpoint}/apply`, { data: { request_id: crypto.randomUUID(), workflow_id: saved.workflow_id, left_publication_id: saved.publication_id, right_publication_id: saved.publication_id, expected_token: prepared.expected_token, name: "Aligned", alignment } });
      expect(created.ok()).toBeTruthy(); const ids = await created.json();
      endpoint += `/${ids.visualization_id}`;
      await page.goto(`/projects/${project.id}/build?visualization=${ids.visualization_id}`);
      await page.getByRole("link", { name: "Edit aligned calculation", exact: true }).click();
    } else {
      await page.goto(`/projects/${project.id}/build?alignment=1`);
      await page.getByLabel("Calculation graph", { exact: true }).selectOption(saved.workflow_id);
      for (const side of ["Left", "Right"]) await page.getByLabel(`${side} prepared result`, { exact: true }).selectOption(saved.publication_id);
      for (const side of ["Left", "Right"]) {
        await page.getByLabel(`${side} key`, { exact: true }).selectOption(profile.fields[0].field_id);
        await page.getByRole("combobox", { name: `${side} measure`, exact: true }).selectOption(value);
      }
    }
    const graph = await (await request.get(`${api}/api/v1/workflows/${saved.workflow_id}`)).json();
    await page.getByLabel("Report name", { exact: true }).fill("Retained alignment");
    await activate(page, "Add key pair");
    await expect(page.getByLabel("Left key 2", { exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Remove key pair", exact: true }).last().focus(); await page.keyboard.press("Enter");
    await expect(page.getByLabel("Left key", { exact: true })).toBeFocused();
    await page.route(`${endpoint}/fields`, route => route.fulfill({ status: 422, json: { detail: { code: "REQUEST_FAILED", message: "First field check failed" } } }), { times: 1 });
    await activate(page, "Check formula fields");
    await expect(page.getByRole("alert", { name: "Report check failed" })).toBeFocused();
    await expect(page.getByRole("alert", { name: "Report check failed" })).toContainText("First field check failed");
    await page.route(`${endpoint}/preview`, route => route.fulfill({ status: 422, json: { detail: { code: "REQUEST_FAILED", message: "Latest preview failed" } } }), { times: 1 });
    await activate(page, "Preview calculation");
    await expect(page.getByRole("alert", { name: "Report check failed" })).toBeFocused();
    await expect(page.getByRole("alert", { name: "Report check failed" })).toContainText("Latest preview failed");
    await expect(page.getByText("First field check failed")).toHaveCount(0);
    let release!: () => void;
    const delayed = new Promise<void>(resolve => { release = resolve; });
    await page.route(`${endpoint}/preview`, async route => { await delayed; await route.continue(); }, { times: 1 });
    await activate(page, "Preview calculation");
    try {
      await expect(page.getByRole("status", { name: "Loading data", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeDisabled();
    } finally { release(); }
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeEnabled();
    await expect(page.getByRole("alert", { name: "Report check failed" })).toHaveCount(0);
    await expect(page.getByLabel("Report name", { exact: true })).toHaveValue("Retained alignment");
    await expect(page.getByLabel("Left key", { exact: true })).toHaveValue(profile.fields[0].field_id);
    expect(await (await request.get(`${api}/api/v1/workflows/${saved.workflow_id}`)).json()).toEqual(graph);
  } finally {
    try { await page.goto("about:blank"); } finally {
      const cleanup = await createRequest.newContext();
      expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
      await cleanup.dispose();
    }
  }
});
