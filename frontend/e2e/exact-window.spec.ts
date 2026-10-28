import { test, expect, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("exact window configuration and cumulative results survive reload", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Exact windows acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "sales.csv", mimeType: "text/csv", buffer: Buffer.from("category,amount\nA,0.10\nA,0.20\nB,0.50\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Window totals", dimensions: [profile.fields[0].field_id], measures: [{ name: "Revenue", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json();
    const workflowUrl = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(workflowUrl)).json();
    const sourceNode = graph.nodes.find((node: { type: string }) => node.type === "dataset_source");
    const aggregate = graph.nodes.find((node: { type: string }) => node.type === "group_by");
    const calculation = { id: crypto.randomUUID(), type: "window", version: 3, position: { x: 300, y: 240 }, ui: {}, config: { name: "Running", operation: "sum", column_id: profile.fields[1].field_id, partitions: [profile.fields[0].field_id], order_by: [{ column_id: profile.fields[1].field_id, direction: "ascending" }] } };
    graph.nodes.push(calculation);
    graph.edges[0].source_node_id = calculation.id;
    graph.edges.push({ id: crypto.randomUUID(), source_node_id: sourceNode.id, source_port: "dataset", target_node_id: calculation.id, target_port: "input" });
    aggregate.config.aggregations[0].column_id = `window_${calculation.id.replaceAll("-", "")}`;
    expect((await request.put(workflowUrl, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/workflow?workflow=${ids.workflow_id}&node=${calculation.id}`);
    await expect(page.getByRole("heading", { name: "Exact Window", exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("Value field", { exact: true })).toHaveValue(profile.fields[1].field_id);
    await page.getByText("All operations", { exact: true }).click();
    await expect(page.getByTitle("Add Exact Window · v3", { exact: true })).toBeVisible();
    await expect(page.getByTitle("Add Window · v2", { exact: true })).toBeVisible();
    await page.getByRole("combobox", { name: "Operation", exact: true }).selectOption("cumulative_sum");
    await expect.poll(async () => (await (await request.get(workflowUrl)).json()).nodes.find((node: { id: string }) => node.id === calculation.id).config.operation).toBe("cumulative_sum");
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Operation", exact: true })).toHaveValue("cumulative_sum");
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${ids.dashboard_id}`);
    await expect(page.getByRole("cell", { name: "0.40", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "0.50", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("cell", { name: "0.40", exact: true })).toBeVisible();
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
