import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("atomically add missing navigation fields with conflict and lost-response recovery", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Guided transitions" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } } })).json();
    const flow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Orders" } })).json();
    const sourceId = crypto.randomUUID(), chartId = crypto.randomUUID();
    const graph = await (await request.put(`${api}/api/v1/workflows/${flow.id}`, { data: { name: flow.name, expected_revision: flow.revision, nodes: [
      { id: sourceId, type: "excel_source", version: 1, position: { x: 0, y: 0 }, config: { source_id: source.id, sheet_name: source.workbook.sheets[0].name } },
      { id: chartId, type: "table", version: 1, position: { x: 360, y: 0 }, config: { title: "Orders", column_ids: ["col_1"] } },
    ], edges: [{ id: crypto.randomUUID(), source_node_id: sourceId, source_port: "dataset", target_node_id: chartId, target_port: "input" }] } })).json();
    expect(graph.id).toBe(flow.id);
    const board = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Overview" } })).json();
    const detail = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Country detail" } })).json();
    expect((await request.put(`${api}/api/v1/dashboards/${detail.id}`, { data: { name: detail.name, expected_revision: detail.revision, widgets: [], configuration: { parameters: [{ name: "country", label: "Country", logical_type: "string", required: true }] } } })).ok()).toBe(true);
    const widgetId = crypto.randomUUID();
    expect((await request.put(`${api}/api/v1/dashboards/${board.id}`, { data: { name: board.name, expected_revision: board.revision, widgets: [{ id: widgetId, visualization_id: chartId, x: 0, y: 0, width: 8, height: 10 }] } })).ok()).toBe(true);
    const shared = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Shared use" } })).json();
    expect((await request.put(`${api}/api/v1/dashboards/${shared.id}`, { data: { name: shared.name, expected_revision: shared.revision, widgets: [{ id: crypto.randomUUID(), visualization_id: chartId, x: 0, y: 0, width: 8, height: 10 }] } })).ok()).toBe(true);
    const readGraph = async () => (await request.get(`${api}/api/v1/workflows/${flow.id}`)).json();
    const readBoard = async (id = board.id) => (await request.get(`${api}/api/v1/dashboards/${id}`)).json();
    const sharedBefore = await readBoard(shared.id);
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${board.id}`);
    const widget = page.locator(`[data-widget-id="${widgetId}"]`);
    const dialog = page.getByRole("dialog", { name: "Configure navigation", exact: true });
    const configure = async () => {
      const actions = widget.locator("details").filter({ has: page.getByLabel("Widget actions", { exact: true }) });
      if (await actions.getAttribute("open") === null) await widget.getByLabel("Widget actions", { exact: true }).click();
      await widget.getByRole("button", { name: "Configure navigation", exact: true }).click();
      await dialog.getByLabel("Destination dashboard").selectOption(detail.id);
      await dialog.getByRole("button", { name: "Suggest matching values" }).click();
      await expect(dialog.getByLabel("Navigation value for country")).toHaveValue("field:col_3");
      await expect(dialog.getByRole("region", { name: "Review added navigation fields" })).toContainText("country");
      await expect(dialog.getByRole("region", { name: "Review added navigation fields" })).toContainText("Shared use");
      await expect(dialog.getByRole("button", { name: "Save fields and transition" })).toBeDisabled();
      await dialog.getByLabel("I reviewed the added fields and transition").check();
    };
    await widget.getByRole("button", { name: "Edit visualization", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "Edit visualization", exact: true });
    await settings.getByLabel("Widget title", { exact: true }).fill("Keep this title");
    await settings.getByRole("button", { name: "Cancel", exact: true }).click();
    await configure();
    await expect(dialog.getByRole("button", { name: "Save fields and transition" })).toBeDisabled();
    await expect(dialog.getByText("Save dashboard changes before adding navigation fields.")).toBeVisible();
    page.once("dialog", confirmation => confirmation.accept());
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await configure();
    await expect(dialog.getByRole("button", { name: "Preview transition" })).toBeDisabled();
    await page.screenshot({ path: "../.backups/ux-navigation-context.png" });
    // Another editor changes the graph after this dialog's review snapshot.
    const previous = await readGraph();
    expect((await request.put(`${api}/api/v1/workflows/${flow.id}`, { data: { ...previous, name: "Changed elsewhere", expected_revision: previous.revision } })).ok()).toBe(true);
    await dialog.getByRole("button", { name: "Save fields and transition" }).click();
    await expect(dialog.getByRole("alert")).toContainText("changed elsewhere");
    expect((await readBoard()).widgets[0].config.action).toBeNull();
    await expect(dialog.getByLabel("Navigation value for country")).toHaveValue("field:col_3");
    page.on("dialog", confirmation => confirmation.accept());
    await dialog.getByRole("button", { name: "Reload dashboard" }).click();
    await expect(dialog).not.toBeVisible();
    await configure();
    const beforeSave = await readGraph();
    // The server commits, but the first response is lost; a retry must not duplicate writes.
    let drop = true;
    await page.route(`**/api/v1/dashboards/${board.id}/navigation`, async route => {
      if (!drop) return route.continue();
      drop = false;
      const result = await route.fetch(); expect(result.status()).toBe(200);
      await route.abort();
    });
    await dialog.getByRole("button", { name: "Save fields and transition" }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    const committed = await readBoard();
    expect(committed.widgets[0].title).toBe("Keep this title");
    expect(committed.widgets[0].config.action.values.country.name).toBe("col_3");
    await dialog.getByRole("button", { name: "Save fields and transition" }).click();
    await expect(dialog.getByRole("alert")).toContainText("changed elsewhere");
    const after = await readGraph();
    expect(after.revision).toBe(beforeSave.revision + 1);
    expect(after.nodes.find((node: { id: string }) => node.id === chartId).config.context_column_ids).toEqual(["col_3"]);
    expect(await readBoard()).toEqual(committed);
    expect(await readBoard(shared.id)).toEqual(sharedBefore);
    await page.unroute(`**/api/v1/dashboards/${board.id}/navigation`);
    await dialog.getByRole("button", { name: "Reload dashboard" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("table").getByRole("columnheader")).toHaveCount(1);
    await page.getByRole("table").locator("tbody tr").first().click();
    await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Country detail");
    expect(JSON.parse(new URL(page.url()).searchParams.get("parameters")!)).toEqual({ country: "Korea" });
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
