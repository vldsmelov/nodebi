import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("choose workbook sheets by name, drag to canvas and reopen without duplicates", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Workbook browser acceptance" } })).json();
  try {
    for (const name of ["first.xlsx", "second.xlsx"]) {
      const upload = await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } } });
      expect(upload.ok()).toBe(true);
    }
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByRole("button", { name: "New field workflow", exact: true }).click();
    const browser = page.getByRole("region", { name: "Workbook browser", exact: true });
    await browser.getByRole("button", { name: /first.xlsx/ }).click();
    await browser.getByTitle("Add sheet to graph").first().click();
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByLabel("Node label", { exact: true }).fill("Configured source");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const workflowId = new URL(page.url()).searchParams.get("workflow");
    const before = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    await browser.getByTitle("Open existing sheet node").click();
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    await browser.getByRole("button", { name: /first.xlsx/ }).click();
    await browser.getByRole("button", { name: /second.xlsx/ }).click();
    await browser.getByTitle("Add sheet to graph").first().dragTo(page.locator(".react-flow__pane"), { targetPosition: { x: 400, y: 300 } });
    await expect(page.locator(".react-flow__node")).toHaveCount(2);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const after = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    expect(after.nodes.find((node: { id: string }) => node.id === before.nodes[0].id)).toEqual(before.nodes[0]);
    expect(new Set(after.nodes.map((node: { config: { source_id: string } }) => node.config.source_id)).size).toBe(2);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(2);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator(".react-flow__node")).toHaveCount(2);
    await browser.getByRole("button", { name: /first.xlsx/ }).click();
    await browser.getByTitle("Open existing sheet node").click();
    await expect(page.getByLabel("Node label", { exact: true })).toHaveValue("Configured source");
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});

test("author typed Excel calculation using named fields, pin A/B and restore v2", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Field editor acceptance" } })).json();
  try {
    const uploaded = await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } } });
    expect(uploaded.ok()).toBe(true);
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByRole("button", { name: "New field workflow", exact: true }).click();
    await expect(page).toHaveURL(/mode=fields/);
    await page.getByTitle("Add Excel Source", { exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await expect(page.locator('.react-flow__node').getByText(/quantity/)).toBeVisible();
    await page.getByTitle("Add Field arithmetic", { exact: true }).click();
    await page.getByLabel("Node label", { exact: true }).fill("Revenue expression");
    const outputHandle = page.locator('.react-flow__node').filter({ hasText: "Excel Source" }).locator('.react-flow__handle[title="quantity"]');
    const inputHandle = page.locator('.react-flow__node').filter({ hasText: "Revenue expression" }).locator('.react-flow__handle[data-handleid="a"]');
    await outputHandle.dragTo(inputHandle);
    await expect(page.getByLabel("Input a", { exact: true })).not.toHaveValue("");
    await page.getByLabel("Input b", { exact: true }).selectOption({ label: "Excel Source / price" });
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Pin A", exact: true }).click();
    await page.getByTitle("Add Append field", { exact: true }).click();
    await page.getByLabel("Output field name", { exact: true }).fill("Revenue");
    await page.getByLabel("Input table", { exact: true }).selectOption({ label: "Excel Source / Dataset" });
    await page.getByLabel("Input value", { exact: true }).selectOption({ label: "Revenue expression / Value" });
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await expect(page.locator('.react-flow__node').getByText(/Revenue ·/)).toBeVisible();
    await page.getByTitle("Add Sum field", { exact: true }).click();
    await page.getByLabel("Input table", { exact: true }).selectOption({ label: "Append field / Table" });
    await page.getByLabel("Input value", { exact: true }).selectOption({ label: "Append field / Revenue" });
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Pin B", exact: true }).click();
    await page.getByRole("region", { name: "A", exact: true }).getByRole("button", { name: "Preview output" }).click();
    await page.getByRole("region", { name: "B", exact: true }).getByRole("button", { name: "Preview output" }).click();
    await expect(page.getByRole("region", { name: "A", exact: true }).getByRole("table")).toBeVisible();
    await expect(page.getByRole("region", { name: "B", exact: true }).getByRole("table")).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("field-editor-ab.png") });
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(4);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const workflowId = new URL(page.url()).searchParams.get("workflow");
    const saved = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    expect(saved.version).toBe(2);
    expect(saved.nodes).toHaveLength(4);
    expect(saved.edges.filter((edge: { source_column_id?: string }) => edge.source_column_id)).toHaveLength(3);
    const total = saved.nodes.find((node: { type: string }) => node.type === "field_sum");
    const result = await (await request.post(`${api}/api/v1/workflows/${workflowId}/nodes/${total.id}/preview`, { data: {} })).json();
    expect(result.value_kind).toBe("scalar");
    const field = saved.nodes.find((node: { type: string }) => node.type === "field_arithmetic");
    const rows = await (await request.post(`${api}/api/v1/workflows/${workflowId}/nodes/${field.id}/preview`, { data: {} })).json();
    expect(result.rows[0].value).toBeCloseTo(rows.rows.reduce((sum: number, row: { value: number | null }) => sum + (row.value ?? 0), 0));
    await page.reload();
    await expect(page.locator(".react-flow__node")).toHaveCount(4);
    expect(await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json()).toEqual(saved);
    for (const locale of ["ru", "tt", "en"]) {
      await page.locator("#interface-language").selectOption(locale);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator(".react-flow__node")).toHaveCount(4);
    }
    for (const theme of ["light", "dark"]) {
      await page.locator("#interface-theme").selectOption(theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator(".react-flow__node")).toHaveCount(4);
    }
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});

test("field editor keeps newer edits during a slow save and rejects a second tab", async ({ page, context, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Typed concurrency" } })).json();
  const created = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Main" } })).json();
  await request.put(`${api}/api/v1/workflows/${created.id}`, { data: { name: "Main", format_version: 2, expected_revision: 1, nodes: [], edges: [] } });
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const incoming = new Promise<void>(resolve => { started = resolve; });
  let first = true;
  const other = await context.newPage();
  try {
    const url = `/projects/${project.id}/workflow?workflow=${created.id}&mode=fields`;
    await page.route(`**/api/v1/workflows/${created.id}`, async route => {
      if (first && route.request().method() === "PUT") { first = false; started(); await gate; }
      await route.continue();
    });
    await page.goto(url); await other.goto(url);
    await expect(other.getByTitle("Add Constant", { exact: true })).toBeVisible();
    await page.getByTitle("Add Constant", { exact: true }).click();
    await incoming;
    await page.getByLabel("Node label", { exact: true }).fill("Latest label");
    release();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const before = await (await request.get(`${api}/api/v1/workflows/${created.id}`)).json();
    expect(before.nodes[0].ui.label).toBe("Latest label");
    await other.getByTitle("Add Constant", { exact: true }).click();
    await expect(other.getByRole("alert").filter({ hasText: "Reload" })).toBeVisible();
    expect(await (await request.get(`${api}/api/v1/workflows/${created.id}`)).json()).toEqual(before);
    await other.reload();
    await expect(other.getByRole("alert").filter({ hasText: "Reload" })).toBeVisible();
    await expect(other.locator(".react-flow__node")).toHaveCount(1);
  } finally { release(); await other.close(); await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
