import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("open the exact widget calculation, restore its group and preserve dashboard drafts", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Calculation navigation" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } } })).json();
    await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Unrelated workflow" } });
    const flow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Widget calculation" } })).json();
    const sourceId = crypto.randomUUID(), chartId = crypto.randomUUID();
    const graph = await (await request.put(`${api}/api/v1/workflows/${flow.id}`, { data: {
      name: flow.name, expected_revision: flow.revision, parameters: [],
      nodes: [
        { id: sourceId, type: "excel_source", version: 1, position: { x: 0, y: 0 }, config: { source_id: source.id, sheet_name: source.workbook.sheets[0].name } },
        { id: chartId, type: "bar_chart", version: 1, position: { x: 360, y: 0 }, ui: { group: "Results", label: "Revenue chart" }, config: { title: "Revenue", category_column_id: "col_1", value_column_id: "col_6" } },
      ], edges: [{ id: crypto.randomUUID(), source_node_id: sourceId, source_port: "dataset", target_node_id: chartId, target_port: "input" }],
    } })).json();
    expect(graph.id).toBe(flow.id);
    const board = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Overview" } })).json();
    expect((await request.put(`${api}/api/v1/dashboards/${board.id}`, { data: { name: board.name, expected_revision: board.revision, configuration: board.configuration, widgets: [{ id: crypto.randomUUID(), visualization_id: chartId, x: 0, y: 0, width: 6, height: 8 }] } })).ok()).toBe(true);
    const boardUrl = `/projects/${project.id}/dashboard?dashboard=${board.id}`;
    await page.goto(boardUrl);
    await page.evaluate(id => sessionStorage.setItem(`nodebi:workflow-view:${id}`, JSON.stringify({ left: 272, right: 304, collapsed: ["Results"] })), flow.id);
    await page.getByLabel("Dashboard name", { exact: true }).fill("Recoverable title");
    page.once("dialog", dialog => dialog.dismiss());
    await page.getByRole("link", { name: "Open calculation", exact: true }).click();
    await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Recoverable title");
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("link", { name: "Open calculation", exact: true }).click();
    await expect(page.getByLabel("Workflow", { exact: true })).toHaveValue(flow.id);
    await expect(page.getByLabel("Edit workflow node")).toHaveValue(chartId);
    await expect(page.getByLabel("Show dependencies")).toHaveValue("ancestors");
    await expect(page.getByTestId("collapsed-group")).toHaveCount(0);
    await expect(page.locator(`.react-flow__node[data-id="${chartId}"]`)).toBeInViewport();
    await expect(page.getByLabel("Node label", { exact: true })).toHaveValue("Revenue chart");
    await page.screenshot({ path: "../.backups/ux-calculation-navigation.png" });
    await page.reload();
    await expect(page.getByLabel("Edit workflow node")).toHaveValue(chartId);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    expect((await (await request.get(`${api}/api/v1/workflows/${flow.id}`)).json()).revision).toBe(graph.revision);
    await page.goBack();
    await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Recoverable title");
    page.once("dialog", dialog => dialog.accept());
    await page.goto(`/projects/${project.id}/workflow?workflow=${flow.id}&node=${crypto.randomUUID()}`);
    await expect(page.getByRole("alert").filter({ hasText: "The linked node is unavailable." })).toBeVisible();
    await page.goto(`/projects/${project.id}/workflow?workflow=${crypto.randomUUID()}`);
    await expect(page.getByRole("alert").filter({ hasText: "The linked workflow is unavailable in this project." })).toBeVisible();
    await expect(page.getByLabel("Edit workflow node")).toHaveCount(0);
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
