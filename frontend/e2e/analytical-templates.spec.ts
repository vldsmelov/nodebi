import { test, expect, request as createRequest } from "@playwright/test";
import { configureFormLayout, expectFormFits, formLayouts } from "./form-reflow";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";
test.use({ actionTimeout: 15000 });

for (const layout of formLayouts) for (const kind of ["histogram", "treemap_chart"] as const) test(`reuse ${kind} template with renamed fields and recover a lost capture response (${layout})`, async ({ page, request }) => {
  test.setTimeout(120_000);
  await configureFormLayout(page, layout);
  page.on("dialog", dialog => dialog.accept());
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Template acceptance" } })).json();
  const root = `${api}/api/v1/projects/${project.id}`;
  const imported = async (name: string, content: string) => {
    const response = await request.post(`${root}/imports`, { multipart: { connector: "csv", file: { name: `${name}.csv`, mimeType: "text/csv", buffer: Buffer.from(content) } } });
    expect(response.ok()).toBeTruthy(); const source = await response.json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const applied = await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } });
    expect(applied.ok()).toBeTruthy();
    return { source, profile, snapshot: await applied.json() };
  };
  try {
    const first = await imported("Original", "group,value\nA,1.00\nA,2.00\nB,3.00\nB,4.00\n");
    const second = await imported("New data", "Amount,Department\n10.00,X\n20.00,X\n30.00,Y\n40.00,Y\n");
    const [group, value] = first.profile.fields.map((f: { field_id: string }) => f.field_id);
    const analysis = kind === "histogram" ? { type: kind, value_column_id: value, bin_count: 2 } : { type: kind, dimensions: [group], measures: [{ output_id: crypto.randomUUID(), name: "Amount", operation: "sum", column_id: value }] };
    const created = await request.post(`${root}/statistical-reports/apply`, { data: { request_id: crypto.randomUUID(), source_id: first.source.id, resource_id: "table", expected_snapshot_id: first.snapshot.id, name: "Original report", analysis } });
    expect(created.ok()).toBeTruthy(); const ids = await created.json();
    await page.goto(`/projects/${project.id}/build?statistics=1&visualization=${ids.visualization_id}`);
    await page.getByRole("button", { name: "Save calculation template", exact: true }).click();
    await page.getByLabel("Template name", { exact: true }).fill("Reusable amounts");
    await page.getByLabel("Expected row meaning", { exact: true }).fill("One observation with department and amount");
    await expectFormFits(page);
    const sent: string[] = [];
    await page.route("**/analytical-templates", async route => {
      if (route.request().method() !== "POST") return route.continue();
      sent.push(route.request().postData()!);
      if (sent.length === 1) { expect((await route.fetch()).ok()).toBeTruthy(); await route.abort("connectionreset"); }
      else await route.continue();
    });
    await page.getByRole("button", { name: "Save template", exact: true }).click();
    await expect(page.getByRole("button", { name: "Retry template save", exact: true })).toBeEnabled();
    await page.route(`**/statistical-reports/${ids.visualization_id}`, route => route.abort("connectionreset"));
    await page.reload();
    await page.getByRole("button", { name: "Save calculation template", exact: true }).click();
    await page.getByRole("button", { name: "Retry template save", exact: true }).click();
    await expect(page.getByText(/Template saved\./)).toBeVisible();
    expect(sent).toHaveLength(2); expect(sent[1]).toBe(sent[0]);
    await page.unroute(`**/statistical-reports/${ids.visualization_id}`);
    const templates = (await (await request.get(`${root}/analytical-templates`)).json()).items;
    expect(templates).toHaveLength(1);
    await page.goto(`/projects/${project.id}/build?statistics=1`);
    await page.getByRole("combobox", { name: "Prepared dataset", exact: true }).selectOption(second.snapshot.id);
    await page.getByRole("button", { name: "Use analytical template", exact: true }).click();
    await page.getByRole("combobox", { name: "Analytical template", exact: true }).selectOption(templates[0].id);
    await expect(page.getByLabel("Map field value", { exact: true })).toHaveValue("");
    await page.getByLabel("Map field value", { exact: true }).selectOption(second.profile.fields[0].field_id);
    if (kind === "treemap_chart") await page.getByLabel("Map field group", { exact: true }).selectOption(second.profile.fields[1].field_id);
    await expect(page.getByRole("button", { name: "Load template settings", exact: true })).toBeDisabled();
    await page.getByLabel("The selected data has the expected row meaning and units", { exact: true }).check();
    await expectFormFits(page);
    await page.screenshot({ path: test.info().outputPath("analytical-template-mapping.png"), fullPage: true });
    await page.getByRole("button", { name: "Load template settings", exact: true }).click();
    await expect(page.getByLabel("Report name", { exact: true })).toHaveValue("Reusable amounts");
    await expect(page.getByRole("combobox", { name: "Analysis type", exact: true })).toHaveValue(kind);
    await page.reload();
    await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Save report", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Report is ready", exact: true })).toBeVisible();
    const visuals = (await (await request.get(`${root}/visualizations`)).json()).items;
    expect(visuals).toHaveLength(2);
    const reused = visuals.find((v: { id: string }) => v.id !== ids.visualization_id);
    const graph = await (await request.get(`${api}/api/v1/workflows/${reused.workflow_id}`)).json();
    expect(graph.nodes.map((n: { type: string }) => n.type)).toEqual(["dataset_source", kind === "histogram" ? "histogram" : "table_rollup"]);
    expect(graph.nodes[0].config.source_id).toBe(second.source.id);
    const result = await (await request.post(`${api}/api/v1/visualizations/${reused.id}/result`, { data: {} })).json();
    if (kind === "treemap_chart") expect(result.hierarchy.total).toBe("100.00");
    else expect(result.rows.reduce((sum: number, row: { count: number }) => sum + row.count, 0)).toBe(4);
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\?/);
    await page.reload();
    await expect(page.getByRole("img", { name: "Reusable amounts", exact: true }).locator("canvas").first()).toBeVisible();
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${root}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
