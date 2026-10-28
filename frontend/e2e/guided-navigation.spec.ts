import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("stage and preview a widget transition without losing other dashboard edits", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Guided transitions" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } } })).json();
    const flow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Orders" } })).json();
    const sourceId = crypto.randomUUID(), chartId = crypto.randomUUID();
    const graph = await (await request.put(`${api}/api/v1/workflows/${flow.id}`, { data: { name: flow.name, expected_revision: flow.revision, nodes: [
      { id: sourceId, type: "excel_source", version: 1, position: { x: 0, y: 0 }, config: { source_id: source.id, sheet_name: source.workbook.sheets[0].name } },
      { id: chartId, type: "table", version: 1, position: { x: 360, y: 0 }, config: { title: "Orders", column_ids: ["col_1", "col_3"] } },
    ], edges: [{ id: crypto.randomUUID(), source_node_id: sourceId, source_port: "dataset", target_node_id: chartId, target_port: "input" }] } })).json();
    expect(graph.id).toBe(flow.id);
    const board = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Overview" } })).json();
    const detail = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Country detail" } })).json();
    expect((await request.put(`${api}/api/v1/dashboards/${detail.id}`, { data: { name: detail.name, expected_revision: detail.revision, widgets: [], configuration: { parameters: [{ name: "country", label: "Country", logical_type: "string", required: true }] } } })).ok()).toBe(true);
    const widgetId = crypto.randomUUID();
    expect((await request.put(`${api}/api/v1/dashboards/${board.id}`, { data: { name: board.name, expected_revision: board.revision, widgets: [{ id: widgetId, visualization_id: chartId, x: 0, y: 0, width: 8, height: 10 }] } })).ok()).toBe(true);
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${board.id}`);
    const widget = page.locator(`[data-widget-id="${widgetId}"]`);
    const settings = page.getByRole("dialog", { name: "Edit visualization", exact: true });
    await widget.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await settings.getByLabel("Widget title", { exact: true }).fill("Unsaved title");
    await settings.getByRole("button", { name: "Cancel", exact: true }).click();
    const open = async () => {
      const actions = widget.locator("details").filter({ has: page.getByLabel("Widget actions", { exact: true }) });
      if (await actions.getAttribute("open") === null) await widget.getByLabel("Widget actions", { exact: true }).click();
      await widget.getByRole("button", { name: "Configure navigation", exact: true }).click();
    };
    await open();
    const dialog = page.getByRole("dialog", { name: "Configure navigation", exact: true });
    await dialog.getByLabel("Destination dashboard").selectOption(detail.id);
    await expect(dialog.getByRole("button", { name: "Apply navigation changes" })).toBeDisabled();
    await expect(dialog.getByRole("list", { name: "Navigation issues" })).toContainText("required");
    await dialog.getByRole("button", { name: "Suggest matching values" }).click();
    await expect(dialog.getByLabel("Navigation value for country")).toHaveValue("field:col_3");
    await expect(dialog.getByLabel("Navigation value for country").locator('option[value="field:col_1"]')).toHaveCount(0);
    await dialog.getByRole("button", { name: "Preview transition" }).click();
    await expect(dialog.getByLabel("Destination parameter preview")).toContainText("Korea");
    await page.screenshot({ path: "../.backups/ux-guided-navigation.png" });
    page.once("dialog", confirmation => confirmation.accept());
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await widget.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await expect(settings.getByLabel("Widget title", { exact: true })).toHaveValue("Unsaved title");
    await settings.getByRole("button", { name: "Cancel", exact: true }).click();
    await open();
    await expect(dialog.getByLabel("Destination dashboard")).toHaveValue("");
    await dialog.getByLabel("Destination dashboard").selectOption(detail.id);
    await dialog.getByRole("button", { name: "Suggest matching values" }).click();
    await dialog.getByRole("button", { name: "Apply navigation changes" }).click();
    await expect(dialog).not.toBeVisible();
    const unsaved = await (await request.get(`${api}/api/v1/dashboards/${board.id}`)).json();
    expect(unsaved.widgets[0].config.action).toBeNull();
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const saved = await (await request.get(`${api}/api/v1/dashboards/${board.id}`)).json();
    expect(saved.widgets[0].title).toBe("Unsaved title");
    expect(saved.widgets[0].config.action.values.country.name).toBe("col_3");
    expect((await (await request.get(`${api}/api/v1/workflows/${flow.id}`)).json()).revision).toBe(graph.revision);
    await page.reload();
    await page.getByRole("table").getByRole("cell", { name: "Korea", exact: true }).first().click();
    await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Country detail");
    expect(JSON.parse(new URL(page.url()).searchParams.get("parameters")!)).toEqual({ country: "Korea" });
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
