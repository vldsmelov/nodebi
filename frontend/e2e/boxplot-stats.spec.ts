import { test, expect, request as createRequest } from "@playwright/test";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("box-plot statistics expose summary and outliers and configure downstream fields by port", async ({ page, request }) => {
  test.setTimeout(120_000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Distribution acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "values.csv", mimeType: "text/csv", buffer: Buffer.from("group,value\nA,-100\nA,1\nA,2\nA,3\nA,4\nA,5\nA,6\nA,7\nA,8\nA,100\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Statistics", dimensions: [profile.fields[0].field_id], measures: [{ name: "Total", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    const upstream = graph.nodes.find((n: { type: string }) => n.type === "dataset_source");
    const stats = { id: crypto.randomUUID(), type: "boxplot_stats", version: 1, position: { x: 400, y: 300 }, config: { value_column_id: profile.fields[1].field_id, group_column_id: profile.fields[0].field_id } };
    const value = `box_${stats.id.replaceAll("-", "")}_value`;
    const filter = { id: crypto.randomUUID(), type: "filter", version: 1, position: { x: 800, y: 300 }, config: { conditions: [{ column_id: value, operator: "greater_than", value: 0 }] } };
    graph.nodes.push(stats, filter);
    for (const [from, port, to] of [[upstream.id, "dataset", stats.id], [stats.id, "outliers", filter.id]]) graph.edges.push({ id: crypto.randomUUID(), source_node_id: from, source_port: port, target_node_id: to, target_port: "input" });
    expect((await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/workflow?workflow=${ids.workflow_id}&node=${stats.id}`);
    await expect(page.getByLabel("Distribution value", { exact: true })).toHaveValue(profile.fields[1].field_id);
    await page.getByLabel("Distribution grouping", { exact: true }).selectOption("");
    await expect.poll(async () => (await (await request.get(url)).json()).nodes.find((n: { id: string }) => n.id === stats.id).config.group_column_id).toBeNull();
    await page.reload();
    await expect(page.getByLabel("Distribution grouping", { exact: true })).toHaveValue("");
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.getByRole("cell", { name: "2.25", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Show connections for Outliers", exact: true }).click();
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.getByRole("cell", { name: "-100", exact: true })).toBeVisible();
    await page.goto(`/projects/${project.id}/workflow?workflow=${ids.workflow_id}&node=${filter.id}`);
    await expect(page.locator(`select:has(option[value="${value}"])`)).toHaveValue(value);
    await expect(page.getByRole("option", { name: "Median", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.getByRole("cell", { name: "100", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "-100", exact: true })).toHaveCount(0);
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
