import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("repair an empty Filter using localized field errors without losing the draft", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Configuration feedback" } })).json();
  try {
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Feedback" } })).json();
    const upload = await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } } });
    expect(upload.ok()).toBe(true); const source = await upload.json();
    const a = crypto.randomUUID(), b = crypto.randomUUID();
    const nodes = [
      { id: a, type: "excel_source", version: 1, position: { x: 0, y: 0 }, config: { source_id: source.id, sheet_name: source.workbook.sheets[0].name }, ui: {} },
      { id: b, type: "filter", version: 1, position: { x: 300, y: 0 }, config: { mode: "and", conditions: [] }, ui: {} },
    ];
    expect((await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: { name: workflow.name, nodes, edges: [{ id: crypto.randomUUID(), source_node_id: a, source_port: "dataset", target_node_id: b, target_port: "input" }], parameters: [], expected_revision: workflow.revision } })).ok()).toBe(true);
    const failed = await request.post(`${api}/api/v1/workflows/${workflow.id}/nodes/${b}/preview`, { data: { limit: 10 } });
    expect(failed.status()).toBe(422);
    expect((await failed.json()).detail.issues).toContainEqual(expect.objectContaining({ node_id: b, field: "config.conditions", message: "Add the required items to this list." }));
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByLabel("Edit workflow node").selectOption(b);
    await expect(page.getByText(/Add the required items to this list/)).toBeVisible();
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.locator("aside").getByRole("alert")).toContainText("Add the required items to this list.");
    await expect(page.locator("aside").getByRole("alert")).not.toContainText("pydantic");
    await page.getByLabel("Language", { exact: true }).selectOption("ru");
    await expect(page.locator("aside").getByRole("alert")).toContainText("Добавьте необходимые элементы");
    await page.getByLabel("Язык", { exact: true }).selectOption("tt");
    await expect(page.locator("aside").getByRole("alert")).toContainText("Исемлеккә кирәкле элементларны");
    await page.getByLabel("Тел", { exact: true }).selectOption("en");
    await page.getByRole("button", { name: "Add condition", exact: true }).click();
    await page.getByLabel("Filter operator 1").selectOption("is_not_null");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await expect(page.getByText(/Add the required items to this list/)).toHaveCount(0);
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.getByText(/Rows: /)).toBeVisible();
    await expect(page.locator("aside").getByRole("alert")).toHaveCount(0);
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
