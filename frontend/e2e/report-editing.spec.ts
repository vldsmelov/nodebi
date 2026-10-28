import { test, expect, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("dashboard wizard editing preserves manual steps and handles a stale tab", async ({ page, request }) => {
  test.setTimeout(120_000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Report edit acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "sales.csv", mimeType: "text/csv", buffer: Buffer.from("category,amount\nA,0.10\nA,0.20\nB,0.50\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const create = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Revenue", dimensions: [profile.fields[0].field_id], measures: [{ name: "Revenue", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(create.ok()).toBeTruthy();
    const ids = await create.json();
    const workflowUrl = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const initial = await (await request.get(workflowUrl)).json();
    const sourceNode = initial.nodes.find((node: { type: string }) => node.type === "dataset_source");
    const manual = { id: crypto.randomUUID(), type: "sort", version: 1, position: { x: 300, y: 240 }, ui: { label: "Manual sort" }, config: { keys: [{ column_id: profile.fields[0].field_id, direction: "ascending" }] } };
    initial.nodes.push(manual);
    initial.edges[0].source_node_id = manual.id;
    initial.edges.push({ id: crypto.randomUUID(), source_node_id: sourceNode.id, source_port: "dataset", target_node_id: manual.id, target_port: "input" });
    const saved = await request.put(workflowUrl, { data: { name: initial.name, nodes: initial.nodes, edges: initial.edges, parameters: initial.parameters, presentation: initial.presentation, result_catalog: initial.result_catalog, format_version: 3, expected_revision: initial.revision } });
    expect(saved.ok()).toBeTruthy();
    const dashboardUrl = `${api}/api/v1/dashboards/${ids.dashboard_id}`;
    const dashboardBefore = await (await request.get(dashboardUrl)).json();
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${ids.dashboard_id}`);
    await page.getByLabel("Widget actions", { exact: true }).click();
    await page.getByRole("link", { name: "Edit in report wizard" }).click();
    await expect(page.getByLabel("Visualization name")).toHaveValue("Revenue");
    await page.getByRole("button", { name: "How it is calculated" }).click();
    await expect(page.getByText("Sort · Preserved step")).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("combobox", { name: "Aggregation", exact: true }).selectOption("average");
    await page.getByLabel("Decimal places for averages").fill("2");
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Preview calculation" }).click();
    await expect(page.getByRole("cell", { name: "0.15", exact: true })).toBeVisible();
    // Simulate another graph tab after preview. The editor must keep its local average.
    const elsewhere = await (await request.get(workflowUrl)).json();
    const moved = await request.put(workflowUrl, { data: { name: elsewhere.name, nodes: elsewhere.nodes.map((node: { id: string; position: { x: number; y: number } }) => node.id === manual.id ? { ...node, position: { x: 300, y: 260 } } : node), edges: elsewhere.edges, parameters: elsewhere.parameters, presentation: elsewhere.presentation, result_catalog: elsewhere.result_catalog, format_version: 3, expected_revision: elsewhere.revision } });
    expect(moved.ok()).toBeTruthy();
    await page.getByRole("button", { name: "Save report" }).click();
    await expect(page.getByText("The project changed. Reload the report before saving your changes.")).toBeVisible();
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Aggregation", exact: true })).toHaveValue("average");
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Reload saved report" }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Aggregation", exact: true })).toHaveValue("sum");
    await page.getByRole("combobox", { name: "Aggregation", exact: true }).selectOption("average");
    await page.getByLabel("Decimal places for averages").fill("2");
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Preview calculation" }).click();
    await expect(page.getByRole("cell", { name: "0.15", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save report" }).click();
    await expect(page.getByRole("heading", { name: "Report is ready" })).toBeVisible();
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page.getByRole("cell", { name: "0.15", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("cell", { name: "0.15", exact: true })).toBeVisible();
    expect(await (await request.get(dashboardUrl)).json()).toEqual(dashboardBefore);
    const final = await (await request.get(workflowUrl)).json();
    expect(final.nodes.find((node: { id: string }) => node.id === manual.id)).toEqual({ ...manual, position: { x: 300, y: 260 } });
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
