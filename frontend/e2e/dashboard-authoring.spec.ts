import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
test.use({ actionTimeout: 15000 });
test("independently copy existing legacy dashboard charts atomically and recover a lost response", async ({ page, request }) => {
  test.setTimeout(90000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Dashboard authoring" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } } })).json();
    const flow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Inventory results" } })).json();
    const sourceId = crypto.randomUUID();
    expect((await request.put(`${api}/api/v1/workflows/${flow.id}`, { data: { name: flow.name, expected_revision: flow.revision, parameters: [], nodes: [{ id: sourceId, type: "excel_source", version: 1, position: { x: 0, y: 0 }, config: { source_id: source.id, sheet_name: source.workbook.sheets[0].name }, ui: { label: "Prepared inventory" } }], edges: [] } })).ok()).toBe(true);
    const board = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Overview" } })).json();
    const readGraph = async () => (await request.get(`${api}/api/v1/workflows/${flow.id}`)).json();
    const readBoard = async () => (await request.get(`${api}/api/v1/dashboards/${board.id}`)).json();
    const before = await readGraph();
    // The public compatibility API seeds a historical chart; new UI authoring uses publications.
    const seeded = await request.post(`${api}/api/v1/dashboards/${board.id}/visualizations`, { data: {
      node_id: crypto.randomUUID(), edge_id: crypto.randomUUID(), widget_id: crypto.randomUUID(),
      workflow_id: flow.id, expected_workflow_revision: before.revision, expected_dashboard_revision: board.revision,
      source_node_id: sourceId, type: "bar_chart", config: { title: "Original", category_column_id: "col_1", value_column_id: "col_6" }, replace_existing: false,
    } });
    expect(seeded.status()).toBe(201);
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${board.id}`);
    await expect(page.getByRole("img", { name: "Original", exact: true })).toBeVisible();
    const created = await readBoard(), graph = await readGraph(), original = created.widgets[0].visualization_id;
    expect(graph.nodes).toHaveLength(2); expect(graph.edges).toHaveLength(1); expect(graph.revision).toBe(before.revision + 1); expect(created.revision).toBe(board.revision + 1);
    const other = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Other use" } })).json();
    expect((await request.put(`${api}/api/v1/dashboards/${other.id}`, { data: { name: other.name, expected_revision: other.revision, widgets: [{ ...created.widgets[0], id: crypto.randomUUID() }] } })).ok()).toBe(true);
    await page.getByLabel("Dashboard name", { exact: true }).fill("Unsaved");
    await page.getByLabel("Widget actions", { exact: true }).click();
    await expect(page.getByRole("button", { name: "Independent visualization copy", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click(); await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Independent visualization copy", exact: true }).click();
    let dialog = page.getByRole("dialog", { name: "Independent visualization copy", exact: true });
    await expect(dialog.getByLabel("Chart title")).toHaveValue("Original"); await dialog.getByLabel("Chart title").fill("Independent");
    await dialog.getByRole("button", { name: "Create independent copy", exact: true }).click(); await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("img", { name: "Independent", exact: true })).toBeVisible();
    const copied = await readBoard(); expect(copied.widgets[0].id).toBe(created.widgets[0].id); expect(copied.widgets[0].visualization_id).not.toBe(original);
    expect((await (await request.get(`${api}/api/v1/dashboards/${other.id}`)).json()).widgets[0].visualization_id).toBe(original);
    expect((await (await request.get(`${api}/api/v1/visualizations/${original}/result`)).json()).title).toBe("Original");
    expect((await readGraph()).nodes).toHaveLength(3);
    expect(await page.evaluate(id => sessionStorage.getItem(`nodebi:dashboard-draft:${id}`), board.id)).toBeNull();
    // Commit succeeds, but the response is lost: retry cannot create a second node/widget.
    const endpoint = `**/dashboards/${board.id}/visualizations`; let lost = false;
    await page.route(endpoint, async route => { if (route.request().method() !== "POST") { await route.continue(); return; } if (!lost) { lost = true; const response = await route.fetch(); expect(response.status()).toBe(201); await route.abort(); } else await route.continue(); });
    // Reverting a local edit must remove its draft, so reload can show a committed copy.
    await page.getByLabel("Dashboard name", { exact: true }).fill("Temporary draft");
    await page.getByLabel("Dashboard name", { exact: true }).fill("Unsaved");
    expect(await page.evaluate(id => sessionStorage.getItem(`nodebi:dashboard-draft:${id}`), board.id)).toBeNull();
    const actions = page.getByLabel("Widget actions", { exact: true });
    if (await actions.locator("..").getAttribute("open") === null) await actions.click();
    await page.getByRole("button", { name: "Independent visualization copy", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Independent visualization copy", exact: true });
    await expect(dialog.getByLabel("Widget input dataset").locator("option:checked")).toContainText("Prepared inventory");
    await dialog.getByLabel("Chart title").fill("Recovered operation");
    await dialog.getByRole("button", { name: "Create independent copy", exact: true }).click(); await expect(dialog.getByRole("alert")).toBeVisible();
    expect((await readGraph()).nodes).toHaveLength(4); expect((await readBoard()).widgets).toHaveLength(1);
    await dialog.getByRole("button", { name: "Create independent copy", exact: true }).click(); await expect(dialog.getByRole("alert")).toContainText("Dashboard changed elsewhere");
    expect((await readGraph()).nodes).toHaveLength(4); expect((await readBoard()).widgets).toHaveLength(1);
    await page.unroute(endpoint);
    // The explicit reload also triggers the normal unsaved-form beforeunload guard.
    page.on("dialog", confirmation => confirmation.accept());
    await dialog.getByRole("button", { name: "Reload dashboard", exact: true }).click();
    await expect(page.getByRole("img", { name: "Recovered operation", exact: true })).toBeVisible();
    expect((await (await request.get(`${api}/api/v1/visualizations/${copied.widgets[0].visualization_id}/result`)).json()).title).toBe("Independent");
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
