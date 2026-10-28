import { test, expect, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("exact pivot average settings and dynamic report fields survive reload", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Exact Pivot acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "sales.csv", mimeType: "text/csv", buffer: Buffer.from("category,month,amount\nA,Jan,1.00\nA,Jan,1.01\nA,Feb,5.00\nB,Jan,1.01\nB,Jan,1.02\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Pivot report", dimensions: [profile.fields[0].field_id], measures: [{ name: "Amount", operation: "sum", column_id: profile.fields[2].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    const pivot = graph.nodes.find((node: { type: string }) => node.type === "group_by");
    Object.assign(pivot, { type: "pivot", version: 2, config: { index_column_id: profile.fields[0].field_id, pivot_column_id: profile.fields[1].field_id, value_column_id: profile.fields[2].field_id, operation: "average", average_scale: 6 } });
    const saved = await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } });
    expect(saved.ok()).toBeTruthy();
    const preview = await request.post(`${url}/nodes/${pivot.id}/preview`, { data: {} });
    expect(preview.ok(), await preview.text()).toBeTruthy();
    const columns = (await preview.json()).columns;
    const visual = await (await request.get(`${api}/api/v1/visualizations/${ids.visualization_id}`)).json();
    expect((await request.put(`${api}/api/v1/visualizations/${visual.id}`, { data: { workflow_id: ids.workflow_id, publication_id: visual.publication_id, expected_workflow_revision: (await saved.json()).revision, expected_revision: visual.revision, name: "Pivot report", type: "table", config: { column_ids: columns.map((column: { column_id: string }) => column.column_id) } } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/workflow?workflow=${ids.workflow_id}&node=${pivot.id}`);
    await expect(page.getByRole("heading", { name: "Exact Pivot", exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("Pivot value field")).toHaveValue(profile.fields[2].field_id);
    await page.getByText("All operations", { exact: true }).click();
    await expect(page.getByTitle("Add Exact Pivot · v2", { exact: true })).toBeVisible();
    await expect(page.getByTitle("Add Pivot · v1", { exact: true })).toBeVisible();
    await page.getByLabel("Average decimal places").fill("2");
    await expect.poll(async () => (await (await request.get(url)).json()).nodes.find((node: { id: string }) => node.id === pivot.id).config.average_scale).toBe(2);
    await page.reload();
    await expect(page.getByLabel("Average decimal places")).toHaveValue("2");
    const checked = await (await request.post(`${url}/nodes/${pivot.id}/preview`, { data: {} })).json();
    expect(checked.columns.map((column: { column_id: string }) => column.column_id)).toEqual(columns.map((column: { column_id: string }) => column.column_id));
    expect(checked.rows[1].pivot_Feb).toBeNull();
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${ids.dashboard_id}`);
    await expect(page.getByRole("cell", { name: "1.00", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "1.02", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("cell", { name: "1.02", exact: true })).toBeVisible();
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
