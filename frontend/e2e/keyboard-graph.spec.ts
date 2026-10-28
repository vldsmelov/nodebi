import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { activateByKeyboard, chooseByKeyboard, typeByKeyboard } from "./keyboard-navigation";

const api = process.env.NODEBI_E2E_API ?? "http://localhost:8020";
for (const format of [1, 3]) test(`keyboard builds and reconnects an executable graph v${format}`, async ({ page, request }) => {
  test.setTimeout(120000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Keyboard graph" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } } })).json();
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Keyboard calculation" } })).json();
    const sourceId = crypto.randomUUID(), url = `${api}/api/v1/workflows/${workflow.id}`;
    expect((await request.put(url, { data: { name: workflow.name, expected_revision: workflow.revision, format_version: format, nodes: [{ id: sourceId, type: "excel_source", version: 1, ui: { label: "Sales" }, position: { x: 0, y: 0 }, config: { source_id: source.id, sheet_name: "Sales" } }], edges: [] } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/workflow?workflow=${workflow.id}`);
    if (format === 3) await activateByKeyboard(page, page.getByText("All operations", { exact: true }));
    await typeByKeyboard(page, page.getByRole("textbox", { name: "Search nodes", exact: true }), "Limit");
    await activateByKeyboard(page, page.getByTitle("Add Limit", { exact: true }));
    await typeByKeyboard(page, page.getByLabel("Node label", { exact: true }), "First two sales");
    const input = page.getByLabel("Input input", { exact: true });
    const sourceOption = input.locator("option").filter({ hasText: "Sales" }).first();
    await expect(sourceOption).toBeAttached();
    const label = (await sourceOption.textContent())!;
    await chooseByKeyboard(page, input, { label });
    await typeByKeyboard(page, page.getByLabel("Maximum rows", { exact: true }), "2");
    const saved = async () => { await expect(page.getByText("Saved", { exact: true })).toBeVisible(); };
    await saved();
    await activateByKeyboard(page, page.getByRole("button", { name: "Preview output", exact: true }));
    await expect(page.locator("table tbody tr")).toHaveCount(2);
    await chooseByKeyboard(page, input, { value: "" });
    await saved();
    expect((await (await request.get(url)).json()).edges).toHaveLength(0);
    await chooseByKeyboard(page, input, { label });
    await saved();
    const graph = await (await request.get(url)).json();
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].source_node_id).toBe(sourceId);
    expect(graph.nodes.find((node: { type: string }) => node.type === "limit").config.limit).toBe(2);
    await page.reload();
    await chooseByKeyboard(page, page.getByLabel("Edit workflow node", { exact: true }), { label: "First two sales · Limit" });
    await expect(page.getByLabel("Maximum rows", { exact: true })).toHaveValue("2");
    await activateByKeyboard(page, page.getByRole("button", { name: "Preview output", exact: true }));
    await expect(page.locator("table tbody tr")).toHaveCount(2);
    expect(await (await request.get(url)).json()).toEqual(graph);
  } finally { expect((await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); }
});
