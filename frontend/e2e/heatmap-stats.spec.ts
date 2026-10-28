import { test, expect, request as createRequest } from "@playwright/test";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("heatmap cell settings persist and preview distinguishes absence, empty values and zero", async ({ page, request }) => {
  test.setTimeout(120_000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Heatmap preparation acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "cells.csv", mimeType: "text/csv", buffer: Buffer.from("branch,value,month\nA,2,Jan\nA,4,Jan\nA,,Jan\nB,0,Jan\nB,,Feb\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Cells", dimensions: [profile.fields[0].field_id], measures: [{ name: "Total", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    const upstream = graph.nodes.find((n: { type: string }) => n.type === "dataset_source");
    // An unconfigured node is a valid editable graph draft; the form must not invent sum.
    const stats = { id: crypto.randomUUID(), type: "heatmap_stats", version: 1, position: { x: 400, y: 300 }, config: {} };
    graph.nodes.push(stats);
    graph.edges.push({ id: crypto.randomUUID(), source_node_id: upstream.id, source_port: "dataset", target_node_id: stats.id, target_port: "input" });
    expect((await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/workflow?workflow=${ids.workflow_id}&node=${stats.id}`);
    await expect(page.getByLabel("Cell aggregation", { exact: true })).toHaveValue("");
    await page.getByLabel("Heatmap X dimension", { exact: true }).selectOption(profile.fields[0].field_id);
    await page.getByLabel("Heatmap Y dimension", { exact: true }).selectOption(profile.fields[2].field_id);
    await page.getByLabel("Heatmap value", { exact: true }).selectOption(profile.fields[1].field_id);
    await page.getByLabel("Cell aggregation", { exact: true }).selectOption("average");
    await page.getByLabel("Exact average decimal places", { exact: true }).fill("2");
    const expected = { x_column_id: profile.fields[0].field_id, y_column_id: profile.fields[2].field_id, value_column_id: profile.fields[1].field_id, aggregation: "average", average_scale: 2 };
    await expect.poll(async () => (await (await request.get(url)).json()).nodes.find((n: { id: string }) => n.id === stats.id).config).toEqual(expected);
    await page.reload();
    await expect(page.getByLabel("Cell aggregation", { exact: true })).toHaveValue("average");
    await expect(page.getByLabel("Exact average decimal places", { exact: true })).toHaveValue("2");
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.getByRole("cell", { name: "3.00", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "0.00", exact: true })).toBeVisible();
    const result = await (await request.post(`${url}/nodes/${stats.id}/preview`, { data: { limit: 10 } })).json();
    const rows = result.rows as { x: string; y: string; present: boolean; value: string | null; row_count: number; missing_count: number }[];
    expect(rows).toHaveLength(4);
    expect(rows.find(row => row.x === "A" && row.y === "Feb")).toMatchObject({ present: false, value: null, row_count: 0, missing_count: 0 });
    expect(rows.find(row => row.x === "B" && row.y === "Feb")).toMatchObject({ present: true, value: null, row_count: 1, missing_count: 1 });
    expect(rows.find(row => row.x === "A" && row.y === "Jan")).toMatchObject({ value: "3.00", row_count: 3, missing_count: 1 });
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
