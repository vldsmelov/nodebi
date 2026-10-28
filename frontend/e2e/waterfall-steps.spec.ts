import { test, expect, request as createRequest } from "@playwright/test";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("waterfall config maps source row types and preserves explicit totals after reload", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Waterfall preparation acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "steps.csv", mimeType: "text/csv", buffer: Buffer.from("step,value,kind\nOpening,100,Start\nSales,20,Movement\nCost,-150,Movement\nSubtotal,,Check\nRecovery,40,Movement\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Balance bridge", dimensions: [profile.fields[0].field_id], measures: [{ name: "Amount", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    const upstream = graph.nodes.find((n: { type: string }) => n.type === "dataset_source");
    const steps = { id: crypto.randomUUID(), type: "waterfall_steps", version: 1, position: { x: 400, y: 300 }, config: {} };
    graph.nodes.push(steps);
    graph.edges.push({ id: crypto.randomUUID(), source_node_id: upstream.id, source_port: "dataset", target_node_id: steps.id, target_port: "input" });
    expect((await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/workflow?workflow=${ids.workflow_id}&node=${steps.id}`);
    await expect(page.getByLabel("Append a final total", { exact: true })).not.toBeChecked();
    await expect(page.getByLabel("Waterfall row type", { exact: true })).toHaveValue("");
    await page.getByLabel("Waterfall step label", { exact: true }).selectOption(profile.fields[0].field_id);
    await page.getByLabel("Waterfall value", { exact: true }).selectOption(profile.fields[1].field_id);
    await page.getByLabel("Waterfall row type", { exact: true }).selectOption(profile.fields[2].field_id);
    await page.getByLabel("Initial balance marker", { exact: true }).fill("Start");
    await page.getByLabel("Contribution marker", { exact: true }).fill("Movement");
    await page.getByLabel("Subtotal marker", { exact: true }).fill("Check");
    await page.getByLabel("Append a final total", { exact: true }).check();
    await page.getByLabel("Final total label", { exact: true }).fill("Closing");
    const expected = { category_column_id: profile.fields[0].field_id, value_column_id: profile.fields[1].field_id, kind_column_id: profile.fields[2].field_id, initial_marker: "Start", change_marker: "Movement", subtotal_marker: "Check", append_total: true, total_label: "Closing" };
    await expect.poll(async () => (await (await request.get(url)).json()).nodes.find((n: { id: string }) => n.id === steps.id).config).toEqual(expected);
    await page.reload();
    await expect(page.getByLabel("Contribution marker", { exact: true })).toHaveValue("Movement");
    await expect(page.getByLabel("Final total label", { exact: true })).toHaveValue("Closing");
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.getByRole("cell", { name: "Closing", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "-30", exact: true }).first()).toBeVisible();
    const result = await (await request.post(`${url}/nodes/${steps.id}/preview`, { data: { limit: 10 } })).json();
    expect(result.rows.map((row: { balance: string }) => row.balance)).toEqual(["100", "120", "-30", "-30", "10", "10"]);
    expect(result.rows[3]).toMatchObject({ kind: "subtotal", start: "0", end: "-30", value: "-30" });
    expect(result.rows[5]).toMatchObject({ kind: "total", value: "10", generated: true });
    await page.screenshot({ path: testInfo.outputPath("waterfall-settings.png"), animations: "disabled" });
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
