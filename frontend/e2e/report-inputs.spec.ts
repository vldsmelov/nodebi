import { test, expect, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("wizard reuses a prepared graph output, rejects stale input and preserves both reports", async ({ page, request }) => {
  test.setTimeout(120_000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Prepared input acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "sales.csv", mimeType: "text/csv", buffer: Buffer.from("category,amount\nA,0.10\nA,0.20\nB,0.50\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Prepared revenue", dimensions: [profile.fields[0].field_id], measures: [{ name: "Revenue", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json();
    const workflowUrl = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const before = await (await request.get(workflowUrl)).json();
    await page.goto(`/projects/${project.id}/build`);
    await page.getByRole("combobox", { name: "Report data source" }).selectOption("publication");
    await page.getByRole("combobox", { name: "Prepared calculation result", exact: true }).selectOption(`${ids.workflow_id}/${ids.publication_id}`);
    await expect(page.getByRole("link", { name: "Open source calculation" })).toBeVisible();
    await expect(page.getByLabel("Report name", { exact: true })).toBeEnabled();
    await page.getByLabel("Report name", { exact: true }).fill("Grand total");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Add measure" }).click();
    await page.getByLabel("Measure name").fill("Overall revenue");
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Preview calculation" }).click();
    await expect(page.getByRole("cell", { name: "0.80", exact: true })).toBeVisible();
    // Simulate another tab changing shared preparation after the preview.
    const changed = await request.put(workflowUrl, { data: { name: "Renamed shared calculation", nodes: before.nodes, edges: before.edges, parameters: before.parameters, presentation: before.presentation, result_catalog: before.result_catalog, format_version: 3, expected_revision: before.revision } });
    expect(changed.ok()).toBeTruthy();
    await page.getByRole("button", { name: "Save report" }).click();
    await expect(page.getByText("Prepared data changed. Reload input fields and preview again.", { exact: true })).toBeVisible();
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByLabel("Report name")).toHaveValue("Grand total");
    const refreshed = page.waitForResponse(response => response.url().includes(`/inputs/${ids.workflow_id}/${ids.publication_id}`) && response.request().method() === "GET");
    await page.getByRole("button", { name: "Reload input fields" }).click();
    expect((await refreshed).ok()).toBeTruthy();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByLabel("Measure name")).toHaveValue("Overall revenue");
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save report" })).toBeDisabled();
    await page.getByRole("button", { name: "Preview calculation" }).click();
    await expect(page.getByRole("button", { name: "Save report" })).toBeEnabled();
    await page.getByRole("button", { name: "Save report" }).click();
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${project.id}/dashboard`));
    await page.reload();
    await expect(page.getByRole("cell", { name: "0.80", exact: true })).toBeVisible();
    const after = await (await request.get(workflowUrl)).json();
    expect(after.name).toBe("Renamed shared calculation");
    expect(after.nodes).toHaveLength(before.nodes.length + 1);
    expect(after.result_catalog.outputs).toHaveLength(2);
    for (const node of before.nodes) expect(after.nodes.find((item: { id: string }) => item.id === node.id)).toEqual(node);
    const originalResult = await request.post(`${api}/api/v1/visualizations/${ids.visualization_id}/result`, { data: {} });
    expect(originalResult.ok()).toBeTruthy();
    expect((await originalResult.json()).rows.map((row: { Revenue: string }) => row.Revenue)).toEqual(["0.30", "0.50"]);
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
