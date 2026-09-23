import { expect, test } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
test("two books, Join, calculated field, result card and shared dashboard visualizations", async ({ page, request }) => {
  test.setTimeout(150000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Table authoring acceptance" } })).json();
  try {
    for (const name of ["join-orders", "join-prices"]) {
      const upload = await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: `${name}.xlsx`, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve(`../fixtures/excel/${name}.xlsx`)) } } });
      expect(upload.ok()).toBeTruthy();
    }
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByRole("button", { name: "New field workflow", exact: true }).click();
    const saved = async () => { await expect(page.getByText("Saved", { exact: true })).toBeVisible(); await expect(page.getByText("Updating fields", { exact: true })).toHaveCount(0); };
    for (const name of ["join-orders.xlsx", "join-prices.xlsx"]) {
      const book = page.getByRole("region", { name: "Workbook browser" }).locator("article").filter({ hasText: name });
      await book.getByRole("button", { name: new RegExp(name) }).click();
      await book.getByTitle("Add sheet to graph", { exact: true }).click(); await saved();
    }
    await page.locator(".react-flow__node").filter({ hasText: "Orders" }).first().click();
    await page.getByRole("button", { name: "Join with…", exact: true }).click();
    const step = page.getByRole("dialog");
    await step.getByLabel("Right table", { exact: true }).selectOption({ label: "join-prices.xlsx / Prices" });
    await step.getByLabel("Left key", { exact: true }).selectOption({ label: "Product" });
    await step.getByLabel("Right key", { exact: true }).selectOption({ label: "Product" });
    await step.getByRole("button", { name: "Add step", exact: true }).click(); await saved();
    await page.getByRole("button", { name: "Add calculated field", exact: true }).click();
    await step.getByLabel("Output field name", { exact: true }).fill("Revenue");
    await step.getByLabel("Left operand", { exact: true }).selectOption({ label: "Quantity" });
    await step.getByLabel("Right operand", { exact: true }).selectOption({ label: "Price" });
    await step.getByRole("button", { name: "Add step", exact: true }).click(); await saved();
    const workflowId = new URL(page.url()).searchParams.get("workflow");
    const path = `${api}/api/v1/workflows/${workflowId}`;
    expect((await (await request.get(path)).json()).nodes).toHaveLength(4);
    await page.getByRole("button", { name: "Undo", exact: true }).click(); await saved();
    expect((await (await request.get(path)).json()).nodes).toHaveLength(3);
    await page.getByRole("button", { name: "Redo", exact: true }).click(); await saved();
    await page.locator(".react-flow__node").filter({ hasText: "Calculated Column" }).first().click();
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.locator("table")).toContainText("20"); await expect(page.locator("table")).toContainText("60");
    page.once("dialog", dialog => dialog.accept("Revenue rows"));
    await page.getByRole("button", { name: "Publish this output", exact: true }).click(); await saved();
    const card = page.locator(".react-flow__node-resultNode");
    await expect(card).toHaveCount(1);
    const cardBox = await card.boundingBox();
    await page.mouse.move(cardBox!.x + 100, cardBox!.y + 15);
    await page.mouse.down(); await page.mouse.move(cardBox!.x + 170, cardBox!.y + 65, { steps: 8 }); await page.mouse.up(); await saved();
    const positioned = await (await request.get(path)).json();
    expect(positioned.presentation.results).toHaveLength(1);
    expect(positioned.nodes).toHaveLength(4); expect(positioned.edges).toHaveLength(3);
    for (const type of ["bar_chart", "table"]) {
      await card.getByRole("button", { name: "Create visualization", exact: true }).click();
      const visual = page.getByRole("dialog", { name: "Independent visualization", exact: true });
      await visual.getByLabel("Visualization name", { exact: true }).fill(type === "table" ? "Revenue table" : "Revenue chart");
      await visual.getByLabel("Visualization type", { exact: true }).selectOption(type);
      if (type === "bar_chart") {
        await visual.getByLabel("Chart category", { exact: true }).selectOption({ label: "Product" });
        await visual.getByLabel("Chart value", { exact: true }).selectOption({ label: "Revenue" });
      }
      await visual.getByRole("button", { name: "Save visualization", exact: true }).click();
      await expect(visual).toHaveCount(0);
    }
    const before = await (await request.get(path)).json();
    await page.reload(); await expect(page.locator(".react-flow__node-resultNode")).toHaveCount(1);
    expect(await (await request.get(path)).json()).toEqual(before);
    await page.getByText("Published results and filters", { exact: true }).click();
    await page.getByText("Revenue rows", { exact: true }).click();
    await page.getByRole("button", { name: "Remove publication", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Revenue chart" })).toBeVisible();
    expect(await (await request.get(path)).json()).toEqual(before);
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Create dashboard", exact: true }).click();
    for (const name of ["Revenue chart", "Revenue table"]) {
      await page.getByText(new RegExp(`^${name}`)).first().locator("..").getByRole("button", { name: "Add widget", exact: true }).click();
    }
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click(); await saved();
    await page.reload(); await expect(page.locator("[data-widget-id]")).toHaveCount(2);
    expect(await (await request.get(path)).json()).toEqual(before);
    if (process.env.NODEBI_KEEP_TABLE_DEMO === "1") writeFileSync(resolve("../.backups/table-authoring-demo.json"), JSON.stringify({ projectId: project.id, workflowId, graph: before, url: page.url() }));
  } finally { if (process.env.NODEBI_KEEP_TABLE_DEMO !== "1") await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
