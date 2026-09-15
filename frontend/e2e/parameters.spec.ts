import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("author parameters and switch slices without saving the workflow", async ({ page, request }) => {
  test.setTimeout(120000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Parameter acceptance" } })).json();
  try {
    await page.goto(`/projects/${project.id}/data`);
    await page.locator('input[type="file"]').setInputFiles(resolve("../fixtures/excel/sales.xlsx"));
    await expect(page.getByLabel("Worksheet")).toBeVisible();
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByRole("button", { name: "Create workflow", exact: true }).click();
    await page.getByText("Workflow parameters", { exact: true }).click();
    await page.getByRole("button", { name: "Add parameter", exact: true }).click();
    await page.getByLabel("Parameter name 1").fill("country");
    await page.getByLabel("Parameter label 1").fill("Country selection");
    await page.getByLabel("Parameter default 1").fill("Korea");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByTitle("Add Excel Source").click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByTitle("Add Filter").click();
    await page.getByLabel("Input input").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Add condition", exact: true }).click();
    await page.getByLabel("Filter column 1").selectOption({ label: "country · string" });
    await page.getByLabel("Filter value source 1").selectOption("country");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const workflows = await (await request.get(`${api}/api/v1/projects/${project.id}/workflows`)).json();
    const workflowId = workflows.items[0].id;
    const saved = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    const filtered = saved.nodes.find((node: { type: string }) => node.type === "filter");
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.getByRole("table")).toContainText("Korea");
    await page.getByLabel("Parameter preview 1").fill("No matching country");
    await expect(page.getByRole("table")).toHaveCount(0);
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.getByText("The result is empty.")).toBeVisible();
    await page.getByLabel("Parameter preview 1").fill("");
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Filter parameter 'country' is required.");
    expect((await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json()).revision).toBe(saved.revision);
    await page.reload();
    await expect(page.locator(".react-flow__node")).toHaveCount(2);
    await page.getByText("Workflow parameters", { exact: true }).click();
    await expect(page.getByLabel("Parameter default 1")).toHaveValue("Korea");
    await page.locator(`.react-flow__node[data-id="${filtered.id}"]`).click();
    await expect(page.getByLabel("Filter value source 1")).toHaveValue("country");
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.getByRole("table")).toContainText("Korea");
  } finally {
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});
