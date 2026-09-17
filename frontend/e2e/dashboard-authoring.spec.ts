import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
test("create and independently copy dashboard charts atomically and recover a lost response", async ({ page, request }) => {
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
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${board.id}`);
    const openCreate = async (title: string) => {
      await page.getByRole("button", { name: "Create visualization widget", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Create visualization widget", exact: true });
      await dialog.getByLabel("Widget input dataset").selectOption(sourceId);
      await expect(dialog.getByLabel("Widget input dataset").locator("option:checked")).toContainText("Prepared inventory");
      await dialog.getByLabel("Chart title").fill(title);
      await dialog.getByLabel("Chart category").selectOption("col_1"); await dialog.getByLabel("Chart value").selectOption("col_6");
      return dialog;
    };
    // Reverting a local edit leaves a clean recovery snapshot; atomic save must clear it.
    await page.getByLabel("Dashboard name", { exact: true }).fill("Temporary draft");
    await page.getByLabel("Dashboard name", { exact: true }).fill("Overview");
    const before = await readGraph();
    let dialog = await openCreate("Original");
    await page.screenshot({ path: "../.backups/ux-create-widget.png" });
    await dialog.getByRole("button", { name: "Create widget", exact: true }).click(); await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("img", { name: "Original", exact: true })).toBeVisible();
    expect(await page.evaluate(id => sessionStorage.getItem(`nodebi:dashboard-draft:${id}`), board.id)).toBeNull();
    const created = await readBoard(), graph = await readGraph(), original = created.widgets[0].visualization_id;
    expect(graph.nodes).toHaveLength(2); expect(graph.edges).toHaveLength(1); expect(graph.revision).toBe(before.revision + 1); expect(created.revision).toBe(board.revision + 1);
    const other = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Other use" } })).json();
    expect((await request.put(`${api}/api/v1/dashboards/${other.id}`, { data: { name: other.name, expected_revision: other.revision, widgets: [{ ...created.widgets[0], id: crypto.randomUUID() }] } })).ok()).toBe(true);
    await page.getByLabel("Dashboard name", { exact: true }).fill("Unsaved");
    await expect(page.getByRole("button", { name: "Independent visualization copy", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click(); await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Independent visualization copy", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Independent visualization copy", exact: true });
    await expect(dialog.getByLabel("Chart title")).toHaveValue("Original"); await dialog.getByLabel("Chart title").fill("Independent");
    await dialog.getByRole("button", { name: "Create independent copy", exact: true }).click(); await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("img", { name: "Independent", exact: true })).toBeVisible();
    const copied = await readBoard(); expect(copied.widgets[0].id).toBe(created.widgets[0].id); expect(copied.widgets[0].visualization_id).not.toBe(original);
    expect((await (await request.get(`${api}/api/v1/dashboards/${other.id}`)).json()).widgets[0].visualization_id).toBe(original);
    expect((await (await request.get(`${api}/api/v1/visualizations/${original}/result`)).json()).title).toBe("Original");
    expect((await readGraph()).nodes).toHaveLength(3);
    // Commit succeeds, but the response is lost: retry cannot create a second node/widget.
    const endpoint = `**/dashboards/${board.id}/visualizations`; let lost = false;
    await page.route(endpoint, async route => { if (route.request().method() !== "POST") { await route.continue(); return; } if (!lost) { lost = true; const response = await route.fetch(); expect(response.status()).toBe(201); await route.abort(); } else await route.continue(); });
    dialog = await openCreate("Recovered operation");
    await dialog.getByRole("button", { name: "Create widget", exact: true }).click(); await expect(dialog.getByRole("alert")).toBeVisible();
    expect((await readGraph()).nodes).toHaveLength(4); expect((await readBoard()).widgets).toHaveLength(2);
    await dialog.getByRole("button", { name: "Create widget", exact: true }).click(); await expect(dialog.getByRole("alert")).toContainText("Dashboard changed elsewhere");
    expect((await readGraph()).nodes).toHaveLength(4); expect((await readBoard()).widgets).toHaveLength(2);
    await page.unroute(endpoint);
    // The explicit reload also triggers the normal unsaved-form beforeunload guard.
    page.on("dialog", confirmation => confirmation.accept());
    await dialog.getByRole("button", { name: "Reload dashboard", exact: true }).click();
    await expect(page.getByRole("img", { name: "Recovered operation", exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "Independent", exact: true })).toBeVisible();
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
