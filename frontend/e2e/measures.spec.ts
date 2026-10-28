import { test, expect, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

for (const combined of [false, true]) {
test(`named ratio ${combined ? "with actual" : "alone"} is reused without aggregation and survives catalog removal`, async ({ page, request }) => {
  test.setTimeout(120_000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Measure acceptance" } })).json();
  const root = `${api}/api/v1/projects/${project.id}`;
  page.on("dialog", dialog => dialog.accept());
  try {
    const source = await (await request.post(`${root}/imports`, { multipart: { connector: "csv", file: { name: "sales.csv", mimeType: "text/csv", buffer: Buffer.from("category,actual,plan\nA,1.00,1.00\nA,9.00,3.00\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const [category, actual, plan] = profile.fields.map((field: { field_id: string }) => field.field_id);
    const actualId = crypto.randomUUID(), planId = crypto.randomUUID(), ratioId = crypto.randomUUID();
    const created = await request.post(`${root}/report-builder/apply`, { data: {
      request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Prepared attainment", dimensions: [category],
      measures: [{ output_id: actualId, name: "Actual", operation: "sum", column_id: actual }, { output_id: planId, name: "Plan", operation: "sum", column_id: plan }],
      summary_formulas: [{ node_id: ratioId, name: "Ratio of totals", expression: `[measure_${actualId.replaceAll("-", "")}] / [measure_${planId.replaceAll("-", "")}]`, scale: 4 }],
    } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json();
    const before = await (await request.get(`${api}/api/v1/workflows/${ids.workflow_id}`)).json();
    await page.goto(`/projects/${project.id}/data`);
    await page.getByRole("button", { name: "Define reusable measure" }).click();
    await page.getByRole("combobox", { name: "Prepared calculation result", exact: true }).selectOption(`${ids.workflow_id}/${ids.publication_id}`);
    await expect(page.getByLabel("Calculated value field")).toBeEnabled();
    await page.getByLabel("Measure name", { exact: true }).fill("Plan attainment");
    await page.getByLabel("Measure description").fill("Ratio of totals; reuse without averaging");
    await page.getByLabel("Calculated value field").selectOption(`calc_${ratioId.replaceAll("-", "")}`);
    await page.getByRole("checkbox", { name: "category", exact: true }).check();
    await page.getByRole("button", { name: "Check and save measure" }).click();
    await expect(page.getByText("Measure definition saved. Calculations were not copied.")).toBeVisible();
    if (combined) {
      const catalog = await (await request.get(`${root}/measures`)).json();
      const registered = await request.put(`${root}/measures/${ids.workflow_id}/${ids.publication_id}`, { data: { expected_token: catalog.expected_token, definition: { id: crypto.randomUUID(), name: "Shared actual", column_id: `measure_${actualId.replaceAll("-", "")}`, grain_column_ids: [category], description: "Prepared actual total" } } });
      expect(registered.ok()).toBeTruthy();
    }
    await page.getByRole("link", { name: "Create report from measure" }).click();
    await expect(page.getByLabel("Report name")).toBeEnabled();
    await page.getByLabel("Report name").fill("Shared attainment report");
    if (combined) await page.getByRole("checkbox", { name: "Shared actual", exact: true }).check();
    await page.getByRole("button", { name: "Preview calculation" }).click();
    await expect(page.getByRole("cell", { name: "2.5000", exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
    await expect(page.getByLabel("Report name")).toHaveValue("Shared attainment report");
    if (combined) await expect(page.getByRole("checkbox", { name: "Shared actual", exact: true })).toBeChecked();
    await expect(page.getByRole("button", { name: "Save report" })).toBeDisabled();
    await page.getByRole("button", { name: "Preview calculation" }).click();
    await expect(page.getByRole("cell", { name: "2.5000", exact: true })).toBeVisible();
    const applyRequests: unknown[] = [];
    if (combined) await page.route(`${root}/measure-reports/apply`, async route => {
      applyRequests.push(route.request().postDataJSON());
      if (applyRequests.length === 1) {
        const response = await route.fetch(); expect(response.ok()).toBeTruthy();
        await route.abort("connectionreset");
      } else await route.continue();
    });
    await page.getByRole("button", { name: "Save report" }).click();
    if (combined) {
      await expect(page.getByRole("button", { name: "Retry report save" })).toBeEnabled();
      const committedGraph = await (await request.get(`${api}/api/v1/workflows/${ids.workflow_id}`)).json();
      await page.route(`${root}/measures`, route => route.abort("failed"));
      await page.route(`${root}/report-builder/inputs/**`, route => route.abort("failed"));
      await page.reload();
      await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Pending report save", exact: true })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Retry report save" })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("heading", { name: "Report is ready", exact: true })).toBeFocused();
      expect(applyRequests).toHaveLength(2); expect(applyRequests[0]).toEqual(applyRequests[1]);
      expect(await (await request.get(`${api}/api/v1/workflows/${ids.workflow_id}`)).json()).toEqual(committedGraph);
      await page.unroute(`${root}/measures`); await page.unroute(`${root}/report-builder/inputs/**`);
    }
    await expect(page.getByRole("heading", { name: "Report is ready", exact: true })).toBeVisible();
    expect((await (await request.get(`${root}/visualizations`)).json()).items).toHaveLength(2);
    expect((await (await request.get(`${root}/dashboards`)).json()).items).toHaveLength(2);
    expect(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith("nodebi:report-draft:")))).toEqual([]);
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${project.id}/dashboard`));
    await expect(page.getByRole("cell", { name: "2.5000", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("cell", { name: "2.5000", exact: true })).toBeVisible();
    if (combined) await expect(page.getByRole("cell", { name: "10.00", exact: true })).toBeVisible();
    const after = await (await request.get(`${api}/api/v1/workflows/${ids.workflow_id}`)).json();
    expect(after.nodes).toEqual(before.nodes);
    expect(after.edges).toEqual(before.edges);
    expect(after.result_catalog.outputs).toHaveLength(before.result_catalog.outputs.length);
    const catalog = await (await request.get(`${root}/measures`)).json();
    const entry = combined ? catalog.items.find((item: { definition: { name: string } }) => item.definition.name === "Shared actual") : catalog.items[0];
    expect((await request.delete(`${root}/measures/${ids.workflow_id}/${ids.publication_id}/${entry.definition.id}?expected_token=${catalog.expected_token}`)).ok()).toBeTruthy();
    await page.reload();
    await expect(page.getByRole("cell", { name: "2.5000", exact: true })).toBeVisible();
    if (combined) await expect(page.getByRole("cell", { name: "10.00", exact: true })).toBeVisible();
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${root}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
}
