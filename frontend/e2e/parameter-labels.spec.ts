import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("configure ID and label fields in the UI while URL selections remain typed IDs", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Named choices" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } } })).json();
    const flow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Orders" } })).json();
    const nodeId = crypto.randomUUID();
    expect((await request.put(`${api}/api/v1/workflows/${flow.id}`, { data: { name: flow.name, expected_revision: flow.revision, nodes: [{ id: nodeId, type: "excel_source", version: 1, position: { x: 0, y: 0 }, config: { source_id: source.id, sheet_name: source.workbook.sheets[0].name } }], edges: [] } })).ok()).toBe(true);
    const board = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Orders" } })).json();
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${board.id}`);
    await page.getByText("Dashboard settings", { exact: true }).click();
    await page.getByRole("button", { name: "Add dashboard parameter", exact: true }).click();
    await page.getByLabel("Dashboard parameter name 1").fill("order");
    await page.getByLabel("Dashboard parameter type 1").selectOption("integer");
    await page.getByLabel("Choices workflow for order").selectOption(flow.id);
    await page.getByLabel("Choices node for order").selectOption(nodeId);
    await page.getByLabel("Choices field for order").selectOption({ label: "order_id" });
    await page.getByLabel("Choices label field for order").selectOption({ label: "country" });
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const select = page.getByLabel("Dashboard selection order");
    await expect(select.getByRole("option", { name: "Korea (1)", exact: true })).toHaveCount(1);
    await expect(select.getByRole("option", { name: "Korea (2)", exact: true })).toHaveCount(1);
    await select.selectOption("2");
    await page.getByRole("button", { name: "Apply selections", exact: true }).click();
    await expect.poll(() => JSON.parse(new URL(page.url()).searchParams.get("parameters")!)).toEqual({ order: 2 });
    const saved = await (await request.get(`${api}/api/v1/dashboards/${board.id}`)).json();
    expect(saved.configuration.parameters[0].options.label_column_id).toBe("col_3");
    await page.getByLabel("Search choices for order").fill("Japan");
    await page.getByRole("button", { name: "Search choices", exact: true }).click();
    await expect(select.getByRole("option", { name: "Korea (1)", exact: true })).toHaveCount(0);
    await expect(select.locator("option:checked")).toHaveText("Korea (2)");
    await expect(select.getByRole("option", { name: "Japan (3)", exact: true })).toHaveCount(1);
    await page.screenshot({ path: "../.backups/ux-parameter-labels.png" });
    await page.reload();
    await expect(select.locator("option:checked")).toHaveText("Korea (2)");
    expect((await (await request.get(`${api}/api/v1/dashboards/${board.id}`)).json()).revision).toBe(saved.revision);
    await select.selectOption("1");
    await page.getByRole("button", { name: "Apply selections", exact: true }).click();
    await expect.poll(() => JSON.parse(new URL(page.url()).searchParams.get("parameters")!)).toEqual({ order: 1 });
    await page.goBack();
    await expect(select.locator("option:checked")).toHaveText("Korea (2)");
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
