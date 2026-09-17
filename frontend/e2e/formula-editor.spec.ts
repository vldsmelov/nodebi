import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("insert and replace named formula fields and retain references after upstream rename", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Formula authoring" } })).json();
  try {
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Formula" } })).json();
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } } })).json();
    const [a, b, c] = Array.from({ length: 3 }, () => crypto.randomUUID());
    const nodes = [
      { id: a, type: "excel_source", config: { source_id: source.id, sheet_name: source.workbook.sheets[0].name } },
      { id: b, type: "rename_columns", config: { renames: [{ column_id: "col_6", new_name: "Units" }] } },
      { id: c, type: "calculated_column", config: { name: "Computed", expression: "2 * [col_6] + 5" } },
    ].map((node, index) => ({ ...node, version: 1, position: { x: index * 300, y: 0 }, ui: {} }));
    const edges = [[a, b], [b, c]].map(([source, target]) => ({ id: crypto.randomUUID(), source_node_id: source, source_port: "dataset", target_node_id: target, target_port: "input" }));
    expect((await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: { name: workflow.name, expected_revision: workflow.revision, nodes, edges, parameters: [] } })).ok()).toBe(true);
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByLabel("Edit workflow node").selectOption(c);
    const formula = page.getByLabel("Readable formula", { exact: true });
    await expect(formula.getByRole("button", { name: "Units · integer" })).toBeVisible();
    await formula.getByRole("button", { name: "Units · integer" }).click();
    await page.getByLabel("Find formula field").fill("price");
    await page.getByLabel("Insert formula field").selectOption("col_7");
    await expect(page.getByLabel("Expression", { exact: true })).toHaveValue("2 * [col_7] + 5");
    await page.getByLabel("Find formula field").fill("");
    await formula.getByRole("button", { name: /^price/ }).click();
    await page.getByLabel("Insert formula field").selectOption("col_6");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByLabel("Edit workflow node").selectOption(b);
    await page.getByLabel("New name 1").fill("Renamed units");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByLabel("Edit workflow node").selectOption(c);
    await expect(formula.getByRole("button", { name: "Renamed units · integer" })).toBeVisible();
    await expect(page.getByLabel("Expression", { exact: true })).toHaveValue("2 * [col_6] + 5");
    const sources = page.locator("details").filter({ has: page.getByText("Field sources", { exact: true }) });
    await expect(sources).toContainText("sales.xlsx");
    await expect(sources).toContainText(" / F / quantity");
    await page.getByLabel("Find formula field").fill("sales.xlsx");
    await expect(page.getByLabel("Insert formula field").locator('option[value="col_6"]')).toContainText("sales.xlsx");
    await page.getByLabel("Find formula field").fill("");
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.getByRole("columnheader", { name: "Computed", exact: true })).toBeVisible();
    await expect(page.getByRole("table").getByRole("row").nth(1).getByRole("cell").last()).toHaveText("9");
    await page.screenshot({ path: "../.backups/ux-formula.png" });
    await page.reload(); await page.getByLabel("Edit workflow node").selectOption(c);
    await expect(formula.getByRole("button", { name: "Renamed units · integer" })).toBeVisible();
    const expression = page.getByLabel("Expression", { exact: true });
    await expression.fill("[col_6] +");
    const diagnostics = page.locator('[id="' + await expression.getAttribute("aria-describedby") + '"]');
    await expect(diagnostics).toContainText("Invalid arithmetic expression.");
    await expression.fill("2 * [col_6] + 5");
    await expect(diagnostics).not.toContainText("Invalid arithmetic expression.");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const saved = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    expect(saved.nodes.find((node: { id: string }) => node.id === c).config.expression).toBe("2 * [col_6] + 5");
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
