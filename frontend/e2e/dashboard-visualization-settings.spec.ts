import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Dashboard } from "@/features/dashboard/api";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
test("edit shared visualization from dashboard, retain layout draft and recover revision conflict", async ({ page, request }) => {
  test.setTimeout(90000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Widget settings" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } } })).json();
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Shared chart workflow" } })).json();
    const sourceId = crypto.randomUUID(), chartId = crypto.randomUUID();
    expect((await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: { name: workflow.name, expected_revision: workflow.revision, parameters: [], nodes: [
      { id: sourceId, type: "excel_source", version: 1, position: { x: 0, y: 0 }, config: { source_id: source.id, sheet_name: source.workbook.sheets[0].name } },
      { id: chartId, type: "bar_chart", version: 1, position: { x: 400, y: 0 }, config: { title: "Original", category_column_id: "col_1", value_column_id: "col_6" } },
    ], edges: [{ id: crypto.randomUUID(), source_node_id: sourceId, source_port: "dataset", target_node_id: chartId, target_port: "input" }] } })).ok()).toBe(true);
    const dashboards: Dashboard[] = [];
    for (const name of ["Overview", "Shared use"]) {
      const dashboard = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name } })).json();
      const response = await request.put(`${api}/api/v1/dashboards/${dashboard.id}`, { data: { name, expected_revision: dashboard.revision, widgets: [{ id: crypto.randomUUID(), visualization_id: chartId, x: 0, y: 0, width: 6, height: 8 }] } });
      expect(response.ok()).toBe(true); dashboards.push(await response.json());
    }
    const read = async () => (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${dashboards[0].id}`);
    await page.getByLabel("Dashboard name", { exact: true }).fill("Local dashboard draft");
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Edit visualization", exact: true });
    await expect(dialog).toContainText("Shared use"); await expect(dialog).toContainText("Overview");
    await dialog.getByLabel("Chart title").fill("Updated from dashboard");
    await dialog.getByLabel("Orientation", { exact: true }).selectOption("horizontal");
    await expect(dialog.getByRole("button", { name: "Save visualization" })).toBeDisabled();
    await dialog.getByLabel("Apply these settings to all listed widgets").check();
    const before = await read();
    await dialog.getByRole("button", { name: "Save visualization" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Local dashboard draft");
    const after = await read(); expect(after.revision).toBe(before.revision + 1); expect(after.nodes.find((node: { id: string }) => node.id === chartId).config.orientation).toBe("horizontal"); expect(after.edges).toEqual(before.edges);
    expect(after.nodes.find((node: { id: string }) => node.id === sourceId)).toEqual(before.nodes.find((node: { id: string }) => node.id === sourceId));
    const savedDashboards = (await (await request.get(`${api}/api/v1/projects/${project.id}/dashboards`)).json()).items;
    expect(savedDashboards.find((dashboard: { id: string }) => dashboard.id === dashboards[0].id).revision).toBe(dashboards[0].revision);
    await expect(page.getByRole("img", { name: "Updated from dashboard", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click(); await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByLabel("Dashboard", { exact: true }).selectOption(dashboards[1].id);
    await expect(page.getByRole("img", { name: "Updated from dashboard", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await dialog.getByLabel("Chart title").fill("Conflicting draft"); await dialog.getByLabel("Apply these settings to all listed widgets").check();
    const concurrent = await read();
    expect((await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: { ...concurrent, expected_revision: concurrent.revision, name: "Concurrent workflow" } })).ok()).toBe(true);
    const conflictResponse = page.waitForResponse(response => response.request().method() === "PUT" && response.url().endsWith(`/workflows/${workflow.id}`));
    await dialog.getByRole("button", { name: "Save visualization" }).click();
    const conflict = await conflictResponse; expect(conflict.status()).toBe(409); expect((await conflict.json()).detail.code).toBe("WORKFLOW_CONFLICT");
    await expect(dialog.getByRole("alert")).toContainText("This workflow was changed elsewhere. Reload before saving.");
    await expect(dialog.getByLabel("Chart title")).toHaveValue("Conflicting draft"); expect((await read()).name).toBe("Concurrent workflow");
    await page.screenshot({ path: "../.backups/ux-dashboard-settings-conflict.png" });
    page.once("dialog", confirmation => confirmation.accept()); await dialog.getByRole("button", { name: "Reload settings" }).click();
    await expect(dialog.getByLabel("Chart title")).toHaveValue("Updated from dashboard");
    await dialog.getByLabel("Chart title").fill("Recovered"); await dialog.getByLabel("Apply these settings to all listed widgets").check();
    await dialog.getByRole("button", { name: "Save visualization" }).click(); await expect(dialog).not.toBeVisible();
    await page.reload(); await expect(page.getByRole("img", { name: "Recovered", exact: true })).toBeVisible();
    expect((await read()).name).toBe("Concurrent workflow");
    expect((await (await request.get(`${api}/api/v1/projects/${project.id}/dashboards`)).json()).items.find((dashboard: { id: string }) => dashboard.id === dashboards[1].id).widgets).toEqual(dashboards[1].widgets);
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
