import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("switch view mode and preview, cancel, undo and persist dashboard layout templates", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Guided transitions" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } } })).json();
    const flow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Orders" } })).json();
    const sourceId = crypto.randomUUID(), chartId = crypto.randomUUID(), barId = crypto.randomUUID(), groupId = crypto.randomUUID(), kpiId = crypto.randomUUID();
    const graph = await (await request.put(`${api}/api/v1/workflows/${flow.id}`, { data: { name: flow.name, expected_revision: flow.revision, nodes: [
      { id: sourceId, type: "excel_source", version: 1, position: { x: 0, y: 0 }, config: { source_id: source.id, sheet_name: source.workbook.sheets[0].name } },
      { id: chartId, type: "table", version: 1, position: { x: 360, y: 0 }, config: { title: "Orders", column_ids: ["col_1", "col_3"] } },
      { id: barId, type: "bar_chart", version: 1, position: { x: 360, y: 200 }, config: { title: "Quantities", category_column_id: "col_3", value_column_id: "col_6" } },
      { id: groupId, type: "group_by", version: 1, position: { x: 360, y: 400 }, config: { dimensions: [], aggregations: [{ column_id: "col_6", operation: "sum", name: "Quantity" }] } },
      { id: kpiId, type: "kpi", version: 1, position: { x: 720, y: 400 }, config: { title: "Total quantity", value_column_id: `agg_${groupId.replaceAll("-", "")}_0` } },
    ], edges: [{ id: crypto.randomUUID(), source_node_id: sourceId, source_port: "dataset", target_node_id: chartId, target_port: "input" }, ...[[sourceId, barId], [sourceId, groupId], [groupId, kpiId]].map(([source_node_id, target_node_id]) => ({ id: crypto.randomUUID(), source_node_id, target_node_id, source_port: "dataset", target_port: "input" }))] } })).json();
    expect(graph.id).toBe(flow.id);
    const board = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Overview" } })).json();
    const detail = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Country detail" } })).json();
    expect((await request.put(`${api}/api/v1/dashboards/${detail.id}`, { data: { name: detail.name, expected_revision: detail.revision, widgets: [], configuration: { parameters: [{ name: "country", label: "Country", logical_type: "string", required: true }] } } })).ok()).toBe(true);
    const widgetId = crypto.randomUUID();
    expect((await request.put(`${api}/api/v1/dashboards/${board.id}`, { data: { name: board.name, expected_revision: board.revision, widgets: [{ id: widgetId, visualization_id: chartId, x: 0, y: 0, width: 8, height: 10, config: { action: { dashboard_id: detail.id, values: { country: { source: "field", name: "col_3" } } } } }, { id: crypto.randomUUID(), visualization_id: barId, x: 0, y: 12, width: 6, height: 10 }, { id: crypto.randomUUID(), visualization_id: kpiId, x: 6, y: 12, width: 6, height: 8 }] } })).ok()).toBe(true);
    const readBoard = async () => (await request.get(`${api}/api/v1/dashboards/${board.id}`)).json();
    const original = await readBoard();
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${board.id}`);
    const openTemplate = async () => { await page.getByRole("button", { name: "Layout templates", exact: true }).click(); return page.getByRole("dialog", { name: "Layout templates", exact: true }); };
    let dialog = await openTemplate();
    await expect(dialog.getByLabel("Layout preview")).toContainText("Total quantity");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    dialog = await openTemplate(); await dialog.getByRole("button", { name: "Apply layout template", exact: true }).click();
    const table = page.locator(`[data-widget-id="${widgetId}"]`);
    await table.getByLabel("Widget title", { exact: true }).fill("Preserved draft title");
    await page.getByRole("button", { name: "View dashboard", exact: true }).click();
    await expect(page.getByRole("button", { name: "Edit dashboard", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save dashboard", exact: true })).toHaveCount(0);
    await expect(page.getByText("Viewing unsaved changes. Return to editing to save them.")).toBeVisible();
    await expect(page.getByText("Dashboard settings", { exact: true })).toBeHidden();
    await expect(page.getByLabel("Move widget")).toHaveCount(0);
    await expect(page.locator(".react-resizable-handle").first()).toBeHidden();
    expect(await readBoard()).toEqual(original);
    await page.getByRole("button", { name: "Edit dashboard", exact: true }).click();
    await page.getByRole("button", { name: "Undo layout template", exact: true }).click();
    await expect(table.getByLabel("Widget title", { exact: true })).toHaveValue("Preserved draft title");
    const draft = await page.evaluate(id => JSON.parse(sessionStorage.getItem(`nodebi:dashboard-draft:${id}`)!), board.id);
    const positions = (items: { id: string; x: number; y: number; width: number; height: number }[]) => items.map(({ id, x, y, width, height }) => ({ id, x, y, width, height }));
    expect(positions(draft.widgets)).toEqual(positions(original.widgets));
    dialog = await openTemplate(); await dialog.getByRole("button", { name: "Apply layout template", exact: true }).click();
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const saved = await readBoard();
    expect(saved.widgets.find((item: { visualization_id: string }) => item.visualization_id === kpiId).width).toBe(3);
    expect(saved.widgets.find((item: { visualization_id: string }) => item.visualization_id === barId).width).toBe(6);
    expect(saved.widgets.find((item: { visualization_id: string }) => item.visualization_id === chartId).width).toBe(12);
    await page.getByRole("button", { name: "View dashboard", exact: true }).click();
    await expect(page).toHaveURL(/mode=view/);
    await page.reload();
    await expect(page.getByRole("button", { name: "Edit dashboard", exact: true })).toBeVisible();
    await page.screenshot({ path: "../.backups/ux-dashboard-view.png", fullPage: true });
    expect(await readBoard()).toEqual(saved);
    await table.getByRole("cell", { name: "Korea", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Country detail", exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get("mode")).toBe("view");
    await expect(page.getByLabel("Dashboard selection country")).toHaveValue("Korea");
    await page.getByLabel("Dashboard selection country").fill("Japan");
    await page.getByRole("button", { name: "Apply selections", exact: true }).click();
    await expect.poll(() => JSON.parse(new URL(page.url()).searchParams.get("parameters")!)).toEqual({ country: "Japan" });
    expect(new URL(page.url()).searchParams.get("mode")).toBe("view");
    await page.goBack(); await expect(page.getByLabel("Dashboard selection country")).toHaveValue("Korea");
    expect((await (await request.get(`${api}/api/v1/workflows/${flow.id}`)).json()).revision).toBe(graph.revision);
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
