import { showAllOperations } from "./operation-catalog";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("configure two-input transforms and propagate Pivot fields to Select Columns", async ({ page, request }) => {
  test.setTimeout(60000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Combine acceptance" } })).json();
  try {
    await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, {
      multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } },
    });
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByRole("button", { name: "Create workflow", exact: true }).click();
    await showAllOperations(page); await page.getByTitle("Add Excel Source").click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const source = `${await page.locator(".react-flow__node").last().getAttribute("data-id")}:dataset`;
    await showAllOperations(page); await page.getByTitle("Add Join").click();
    await page.getByLabel("Input left").selectOption({ index: 1 });
    await page.getByLabel("Input right").selectOption({ index: 1 });
    await page.getByLabel("left join key").selectOption("col_1");
    await page.getByLabel("right join key").selectOption("col_1");
    await page.getByLabel("Join type").selectOption("left");
    await expect(page.getByRole("button", { name: "Preview output" })).toBeEnabled();
    await page.getByRole("button", { name: "Preview output" }).click();
    await expect(page.getByRole("columnheader", { name: "order_id__right", exact: true })).toBeVisible();
    await showAllOperations(page); await page.getByTitle("Add Union").click();
    await page.getByLabel("Input left").selectOption(source!);
    await page.getByLabel("Input right").selectOption(source!);
    await expect(page.getByRole("button", { name: "Preview output" })).toBeEnabled();
    await page.getByRole("button", { name: "Preview output" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await showAllOperations(page); await page.getByTitle("Add Pivot").click();
    await page.getByLabel("Input input").selectOption(source!);
    await page.getByLabel("Index field", { exact: true }).selectOption({ label: "country" });
    await page.getByLabel("Pivot field", { exact: true }).selectOption({ label: "category" });
    await page.getByLabel("Pivot value field", { exact: true }).selectOption({ label: "quantity" });
    await expect(page.getByRole("button", { name: "Preview output" })).toBeEnabled();
    await page.getByRole("button", { name: "Preview output" }).click();
    await expect(page.getByRole("columnheader", { name: "pivot_Hardware", exact: true })).toBeVisible();
    await showAllOperations(page); await page.getByTitle("Add Select Columns").click();
    const pivot = await page.getByLabel("Input input").locator("option").filter({ hasText: "Pivot (" }).getAttribute("value");
    await page.getByLabel("Input input").selectOption(pivot!);
    await page.getByRole("checkbox", { name: /pivot_Hardware/ }).check();
    await expect(page.getByRole("button", { name: "Preview output" })).toBeEnabled();
    await page.getByRole("button", { name: "Preview output" }).click();
    await expect(page.getByRole("columnheader")).toHaveCount(1);
    await expect(page.getByRole("columnheader", { name: "pivot_Hardware", exact: true })).toBeVisible();
  } finally {
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});
