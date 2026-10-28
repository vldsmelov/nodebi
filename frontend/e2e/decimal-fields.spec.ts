import { test, expect, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("decimal field formulas retain exact report totals after reload", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Decimal field acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, {
      multipart: { connector: "csv", file: { name: "sales.csv", mimeType: "text/csv", buffer: Buffer.from("category,amount\nA,0.10000001\nA,0.20000001\nB,0.50000001\n") } },
    })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: {
      request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id,
      name: "Exact field report", dimensions: [profile.fields[0].field_id], measures: [{ name: "Revenue", operation: "sum", column_id: profile.fields[1].field_id }],
    } });
    expect(created.ok(), await created.text()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    const sourceNode = graph.nodes.find((n: { type: string }) => n.type === "dataset_source");
    const aggregate = graph.nodes.find((n: { type: string }) => n.type === "group_by");
    const formula = { id: crypto.randomUUID(), type: "field_formula", version: 1, position: { x: 200, y: 250 }, config: { expression: "coalesce(a, None)" } };
    const append = { id: crypto.randomUUID(), type: "append_field", version: 1, position: { x: 400, y: 250 }, config: { name: "Copy" } };
    graph.nodes.push(formula, append);
    graph.edges.find((e: { target_node_id: string }) => e.target_node_id === aggregate.id).source_node_id = append.id;
    graph.edges.push(
      { id: crypto.randomUUID(), source_node_id: sourceNode.id, source_port: "dataset", source_column_id: profile.fields[1].field_id, target_node_id: formula.id, target_port: "a" },
      { id: crypto.randomUUID(), source_node_id: sourceNode.id, source_port: "dataset", target_node_id: append.id, target_port: "table" },
      { id: crypto.randomUUID(), source_node_id: formula.id, source_port: "value", target_node_id: append.id, target_port: "value" },
    );
    aggregate.config.aggregations[0].column_id = `calc_${append.id.replaceAll("-", "")}`;
    const saved = await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } });
    expect(saved.ok(), await saved.text()).toBeTruthy();
    const preview = await request.post(`${url}/nodes/${formula.id}/preview`, { data: {} });
    expect(preview.ok(), await preview.text()).toBeTruthy();
    expect((await preview.json()).columns[0].metadata.scale).toBe(8);
    await page.goto(`/projects/${project.id}/workflow?workflow=${ids.workflow_id}&node=${formula.id}`);
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.getByRole("cell", { name: "0.10000001", exact: true })).toBeVisible();
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${ids.dashboard_id}`);
    await expect(page.getByRole("cell", { name: "0.30000002", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "0.50000001", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("cell", { name: "0.30000002", exact: true })).toBeVisible();
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
