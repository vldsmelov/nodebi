import { test, expect, request as createRequest } from "@playwright/test";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("analytical table totals configure a hierarchy and preserve weighted observation totals on reload", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Rollup acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "rows.csv", mimeType: "text/csv", buffer: Buffer.from("region,branch,amount,quantity\nNorth,A,10,2\nNorth,B,20,10\nNorth,B,30,3\nSouth,C,,0\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Hierarchical results", dimensions: [profile.fields[0].field_id], measures: [{ name: "Amount", operation: "sum", column_id: profile.fields[2].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    const upstream = graph.nodes.find((n: { type: string }) => n.type === "dataset_source");
    const rollup = { id: crypto.randomUUID(), type: "table_rollup", version: 1, position: { x: 400, y: 300 }, config: {} };
    graph.nodes.push(rollup);
    graph.edges.push({ id: crypto.randomUUID(), source_node_id: upstream.id, source_port: "dataset", target_node_id: rollup.id, target_port: "input" });
    expect((await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/workflow?workflow=${ids.workflow_id}&node=${rollup.id}`);
    for (let i = 0; i < 2; i++) {
      await page.getByRole("button", { name: "Add grouping level", exact: true }).click();
      await page.getByLabel(`Rollup dimension ${i + 1}`, { exact: true }).selectOption(profile.fields[i].field_id);
      await page.getByRole("button", { name: "Add rollup measure", exact: true }).click();
      await page.getByLabel(`Rollup measure name ${i + 1}`, { exact: true }).fill(i ? "Ratio" : "Mean");
      await page.getByLabel(`Rollup operation ${i + 1}`, { exact: true }).selectOption(i ? "ratio_of_sums" : "average");
      await page.getByLabel(`Rollup value ${i + 1}`, { exact: true }).selectOption(profile.fields[2].field_id);
    }
    await page.getByLabel("Rollup denominator 2", { exact: true }).selectOption(profile.fields[3].field_id);
    await expect.poll(async () => (await (await request.get(url)).json()).nodes.find((n: { id: string }) => n.id === rollup.id).config.measures?.[1]?.denominator_column_id).toBe(profile.fields[3].field_id);
    const before = (await (await request.get(url)).json()).nodes.find((n: { id: string }) => n.id === rollup.id).config;
    await page.reload();
    await expect(page.getByLabel("Rollup operation 2", { exact: true })).toHaveValue("ratio_of_sums");
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.getByRole("cell", { name: "grand_total", exact: true })).toBeVisible();
    const result = await (await request.post(`${url}/nodes/${rollup.id}/preview`, { data: { limit: 100 } })).json();
    expect(result.rows.map((row: { kind: string }) => row.kind)).toEqual(["detail", "detail", "subtotal", "detail", "subtotal", "grand_total"]);
    const field = (name: string) => result.columns.find((c: { display_name: string }) => c.display_name === name).engine_name;
    expect(result.rows[5][field("Mean")]).toBe("20.000000");
    expect(result.rows[5][field("Ratio")]).toBe("4.000000");
    expect((await (await request.get(url)).json()).nodes.find((n: { id: string }) => n.id === rollup.id).config).toEqual(before);
    await page.screenshot({ path: testInfo.outputPath("rollup-preparation.png"), animations: "disabled" });
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
