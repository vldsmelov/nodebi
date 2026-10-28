import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { activateByKeyboard, chooseByKeyboard, typeByKeyboard } from "./keyboard-navigation";

const api = process.env.NODEBI_E2E_API ?? "http://localhost:8020";
for (const width of [1600, 420]) test(`keyboard creates and saves a dashboard table at ${width}px`, async ({ page, request }) => {
  await page.setViewportSize({ width, height: 1000 });
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Keyboard dashboard" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } } })).json();
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Prepared sales" } })).json();
    const node = crypto.randomUUID();
    const saved = await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: { name: workflow.name, expected_revision: workflow.revision, format_version: 3, nodes: [{ id: node, type: "excel_source", version: 1, position: { x: 0, y: 0 }, config: { source_id: source.id, sheet_name: "Sales" } }], edges: [], result_catalog: { outputs: [{ id: crypto.randomUUID(), name: "Sales records", node_id: node, port: "dataset", kind: "dataset" }] } } });
    expect(saved.ok()).toBeTruthy();
    const graph = await saved.json();
    const activate = (name: string) => activateByKeyboard(page, page.getByRole("button", { name, exact: true }));
    await page.goto(`/projects/${project.id}/dashboard`);
    await activate("Create dashboard");
    await typeByKeyboard(page, page.getByLabel("Dashboard name", { exact: true }), "Keyboard report");
    await activate("Add chart");
    await activate("Create visualization");
    const settings = page.getByRole("complementary", { name: "Visualization settings", exact: true });
    await typeByKeyboard(page, settings.getByLabel("Visualization name", { exact: true }), "Keyboard sales");
    await chooseByKeyboard(page, settings.getByLabel("Visualization type", { exact: true }), { value: "table" });
    await activateByKeyboard(page, settings.getByRole("button", { name: "Apply visualization", exact: true }));
    await expect(settings).toHaveCount(0);
    await expect(page.locator("[data-widget-id] table tbody tr")).toHaveCount(5);
    await activate("Save dashboard");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await activate("View dashboard");
    await expect(page.getByRole("heading", { name: "Keyboard report", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator("[data-widget-id] table tbody tr")).toHaveCount(5);
    await activate("Edit dashboard");
    await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Keyboard report");
    expect(await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json()).toEqual(graph);
  } finally { expect((await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); }
});
