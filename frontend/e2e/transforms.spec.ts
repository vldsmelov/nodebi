import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("build and restore filtered revenue aggregation entirely in the editor", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Sales Analysis M10" } })).json();
  try {
    const upload = await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, {
      multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } },
    });
    expect(upload.ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByRole("button", { name: "Create workflow", exact: true }).click();
    await page.getByTitle("Add Excel Source").click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByTitle("Add Filter").click();
    await page.getByLabel("Input input").selectOption({ index: 1 });
    await expect(page.getByRole("button", { name: "Add condition" })).toBeVisible();
    await page.getByRole("button", { name: "Add condition" }).click();
    await page.getByLabel("Filter column 1").selectOption({ label: "quantity · integer" });
    await page.getByLabel("Filter operator 1").selectOption("greater_than");
    await page.getByLabel("Filter value 1").fill("0");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByTitle("Add Calculated Column").click();
    const filterOption = page.getByLabel("Input input").locator("option").filter({ hasText: "Filter (" });
    await page.getByLabel("Input input").selectOption((await filterOption.getAttribute("value"))!);
    await page.getByLabel("Output field name").fill("revenue");
    await page.getByLabel("Expression", { exact: true }).fill("quantity * price");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByTitle("Add Group By").click();
    const calcOption = page.getByLabel("Input input").locator("option").filter({ hasText: "Calculated Column (" });
    await page.getByLabel("Input input").selectOption((await calcOption.getAttribute("value"))!);
    await page.getByRole("checkbox", { name: "category", exact: true }).check();
    await page.getByRole("button", { name: "Add aggregation" }).click();
    await page.getByLabel("Aggregate field 1").selectOption({ label: "revenue" });
    await page.getByLabel("Aggregation 1", { exact: true }).selectOption("sum");
    await page.getByLabel("Aggregate name 1").fill("total_revenue");
    await expect(page.getByRole("button", { name: "Preview output" })).toBeEnabled();
    await page.getByRole("button", { name: "Preview output" }).click();
    await expect(page.getByRole("columnheader", { name: "total_revenue", exact: true })).toBeVisible();
    const preview = await page.getByRole("table").innerText();
    const workflows = await (await request.get(`${api}/api/v1/projects/${project.id}/workflows`)).json();
    const saved = await (await request.get(`${api}/api/v1/workflows/${workflows.items[0].id}`)).json();
    const group = saved.nodes.find((node: { type: string }) => node.type === "group_by");
    expect(saved.edges).toHaveLength(3);
    await page.reload();
    await expect(page.locator(".react-flow__node")).toHaveCount(4);
    // Select the restored node through the canvas and compare execution results.
    await page.locator(`.react-flow__node[data-id="${group.id}"]`).click();
    await page.getByRole("button", { name: "Preview output" }).click();
    await expect(page.getByRole("table")).toHaveText(preview.replaceAll("\t", "").replaceAll("\n", ""));
  } finally {
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});
