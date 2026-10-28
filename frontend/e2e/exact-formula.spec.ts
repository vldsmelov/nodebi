import { test, expect, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("exact formula settings survive reload and feed a graph-backed report", async ({ page, request }) => {
  test.setTimeout(120_000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Exact formula acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "sales.csv", mimeType: "text/csv", buffer: Buffer.from("category,amount\nA,0.10\nA,0.20\nB,0.50\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Exact revenue", dimensions: [profile.fields[0].field_id], measures: [{ name: "Revenue", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json();
    const workflowUrl = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(workflowUrl)).json();
    const sourceNode = graph.nodes.find((node: { type: string }) => node.type === "dataset_source");
    const aggregate = graph.nodes.find((node: { type: string }) => node.type === "group_by");
    const calculation = { id: crypto.randomUUID(), type: "calculated_column", version: 2, position: { x: 300, y: 240 }, ui: { label: "Exact amount" }, config: { name: "Exact", expression: `if_else([${profile.fields[0].field_id}] == "A", [${profile.fields[1].field_id}] + 0.005, [${profile.fields[1].field_id}])`, precision: 38, scale: 2 } };
    graph.nodes.push(calculation);
    graph.edges[0].source_node_id = calculation.id;
    graph.edges.push({ id: crypto.randomUUID(), source_node_id: sourceNode.id, source_port: "dataset", target_node_id: calculation.id, target_port: "input" });
    aggregate.config.aggregations[0].column_id = `calc_${calculation.id.replaceAll("-", "")}`;
    expect((await request.put(workflowUrl, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/workflow?workflow=${ids.workflow_id}&node=${calculation.id}`);
    await expect(page.getByRole("heading", { name: "Exact Calculated Column" })).toBeVisible();
    await expect(page.getByLabel("Decimal places", { exact: true })).toHaveValue("2");
    await expect(page.getByRole("button", { name: "Edit calculation", exact: true })).toHaveCount(0);
    await page.getByText("All operations", { exact: true }).click();
    await expect(page.getByTitle("Add Exact Calculated Column · v2", { exact: true })).toBeVisible();
    await expect(page.getByTitle("Add Calculated Column · v1", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Insert formula field").locator(`option[value="${profile.fields[0].field_id}"]`)).toBeEnabled();
    await page.getByLabel("Decimal places", { exact: true }).fill("3");
    await expect.poll(async () => (await (await request.get(workflowUrl)).json()).nodes.find((node: { id: string }) => node.id === calculation.id).config.scale).toBe(3);
    await page.reload();
    await expect(page.getByLabel("Decimal places", { exact: true })).toHaveValue("3");
    await expect(page.getByLabel("Expression", { exact: true })).toHaveValue(calculation.config.expression);
    await page.getByText("Build a condition", { exact: true }).click();
    await page.getByLabel("Condition field", { exact: true }).selectOption(profile.fields[1].field_id);
    await page.getByLabel("Condition value", { exact: true }).fill("0.20");
    await page.getByLabel("When true", { exact: true }).fill("9007199254740993.11");
    await page.getByLabel("Otherwise", { exact: true }).fill("-9007199254740993.12");
    await page.getByRole("button", { name: "Use condition", exact: true }).click();
    const condition = `if_else([${profile.fields[1].field_id}] == 0.20, 9007199254740993.11, -9007199254740993.12)`;
    await expect(page.getByLabel("Expression", { exact: true })).toHaveValue(condition);
    await expect.poll(async () => (await (await request.get(workflowUrl)).json()).nodes.find((node: { id: string }) => node.id === calculation.id).config.expression).toBe(condition);
    const checked = await request.post(`${workflowUrl}/nodes/${calculation.id}/preview`, { data: {} });
    expect(checked.ok()).toBeTruthy();
    expect((await checked.json()).rows.map((row: { Exact: string }) => row.Exact)).toEqual([
      "-9007199254740993.120", "9007199254740993.110", "-9007199254740993.120",
    ]);
    await page.reload();
    await expect(page.getByLabel("Expression", { exact: true })).toHaveValue(condition);
    await page.getByLabel("Expression", { exact: true }).fill("1 / 0");
    await expect.poll(async () => (await (await request.get(workflowUrl)).json()).nodes.find((node: { id: string }) => node.id === calculation.id).config.expression).toBe("1 / 0");
    await page.getByRole("button", { name: "Pin A", exact: true }).click();
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.getByText(/Exact formula division by zero/).first()).toBeVisible();
    await page.getByLabel("Expression", { exact: true }).fill(calculation.config.expression);
    await expect.poll(async () => (await (await request.get(workflowUrl)).json()).nodes.find((node: { id: string }) => node.id === calculation.id).config.expression).toBe(calculation.config.expression);
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${ids.dashboard_id}`);
    await expect(page.getByRole("cell", { name: "0.310", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "0.500", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("cell", { name: "0.310", exact: true })).toBeVisible();
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
