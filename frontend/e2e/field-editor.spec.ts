import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("drop a workbook field to create a connected operation atomically and cancel without saves", async ({ page, request }) => {
  const byId = <T extends { id: string }>(items: T[]) => [...items].sort((a, b) => a.id.localeCompare(b.id));
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Field operation menu" } })).json();
  try {
    const upload = await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } } });
    expect(upload.ok()).toBe(true);
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByRole("button", { name: "New field workflow", exact: true }).click();
    await page.getByTitle("Add Excel Source", { exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Group workbook sheets", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const book = page.locator(".react-flow__node-workbookNode");
    const handle = book.locator('.react-flow__handle[title="quantity"]');
    await expect(handle).toBeVisible();
    await handle.dragTo(page.locator(".react-flow__pane"), { targetPosition: { x: 40, y: 40 } });
    const menu = page.getByRole("dialog", { name: "Add connected operation" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("button", { name: /Filter by field/ })).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("operation-menu.png") });
    await menu.getByLabel("Search operations", { exact: true }).fill("Sum field");
    await menu.getByRole("button", { name: /Sum field/ }).click();
    await expect(menu).toHaveCount(0);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const workflowId = new URL(page.url()).searchParams.get("workflow");
    const getGraph = async () => (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    const saved = await getGraph();
    expect(saved.nodes).toHaveLength(2); expect(saved.edges).toHaveLength(2);
    const sum = saved.nodes.find((node: { type: string }) => node.type === "field_sum");
    const source = saved.nodes.find((node: { type: string }) => node.type === "excel_source");
    const preview = async (id: string) => { const response = await request.post(`${api}/api/v1/workflows/${workflowId}/nodes/${id}/preview`, { data: {} }); expect(response.ok()).toBe(true); return response.json(); };
    expect((await preview(sum.id)).rows[0].value).toBe((await preview(source.id)).rows.reduce((total: number, row: { quantity: number }) => total + row.quantity, 0));
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const undone = await getGraph(); expect(undone.nodes).toHaveLength(1); expect(undone.edges).toHaveLength(0);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const restored = await getGraph(); expect(byId(restored.nodes)).toEqual(byId(saved.nodes)); expect(byId(restored.edges)).toEqual(byId(saved.edges));
    await book.getByRole("button", { name: "Sales", exact: true }).click();
    await book.getByRole("button", { name: "Show connections for country", exact: true }).click();
    await page.getByRole("button", { name: "Add operation to output", exact: true }).click();
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("button", { name: /Field arithmetic|Sum field/ })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    const point = await handle.boundingBox(); expect(point).not.toBeNull();
    await page.mouse.move(point!.x + point!.width / 2, point!.y + point!.height / 2);
    await page.mouse.down(); await page.mouse.move(point!.x + 25, point!.y, { steps: 3 });
    await page.keyboard.press("Escape");
    await page.mouse.move(270, 180); await page.mouse.up();
    await expect(menu).toHaveCount(0);
    expect((await getGraph()).revision).toBe(restored.revision);
    await page.reload();
    await expect(page.locator(".react-flow__node")).toHaveCount(2);
    expect(byId((await getGraph()).edges)).toEqual(byId(saved.edges));
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});

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
    await browser.getByTitle("Add sheet to graph").first().dragTo(page.locator(".react-flow__pane"), { targetPosition: { x: 40, y: 40 } });
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

test("workbook cards retain typed wires through collapse, detach, undo and reload", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Workbook card acceptance" } })).json();
  try {
    const upload = await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } } });
    expect(upload.ok()).toBe(true);
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByRole("button", { name: "New field workflow", exact: true }).click();
    await page.getByTitle("Add Excel Source", { exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Group workbook sheets", exact: true }).click();
    const book = page.locator(".react-flow__node-workbookNode");
    await expect(book).toHaveCount(1);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByTitle("Add Field arithmetic", { exact: true }).click();
    const workflowId = new URL(page.url()).searchParams.get("workflow");
    const getGraph = async () => (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const draft = await getGraph();
    const sheetName = draft.nodes.find((node: { type: string }) => node.type === "excel_source").config.sheet_name;
    await book.getByRole("button", { name: sheetName, exact: true }).click();
    const arithmetic = page.locator(".react-flow__node-fieldNode");
    await book.locator('.react-flow__handle[title="quantity"]').dragTo(arithmetic.locator('.react-flow__handle[data-handleid="a"]'));
    await book.locator('.react-flow__handle[title="price"]').dragTo(arithmetic.locator('.react-flow__handle[data-handleid="b"]'));
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const original = await getGraph();
    expect(original.edges).toHaveLength(2);
    const calculation = original.nodes.find((node: { type: string }) => node.type === "field_arithmetic");
    const preview = async () => { const response = await request.post(`${api}/api/v1/workflows/${workflowId}/nodes/${calculation.id}/preview`, { data: {} }); expect(response.ok()).toBe(true); return (await response.json()).rows; };
    const values = await preview();
    await book.getByRole("button", { name: "Show connections for quantity", exact: true }).click();
    await expect(page.locator(".field-path-active")).toHaveCount(1);
    await expect(page.locator(".field-path-muted")).toHaveCount(1);
    expect((await getGraph()).revision).toBe(original.revision);
    await page.getByRole("button", { name: "Clear field path", exact: true }).click();
    await expect(page.locator(".field-path-muted")).toHaveCount(0);
    for (const [field, state] of [["country", "blocked"], ["quantity", "compatible"]]) {
      const handle = await book.locator(`.react-flow__handle[title="${field}"]`).boundingBox();
      expect(handle).not.toBeNull();
      await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
      await page.mouse.down();
      await page.mouse.move(handle!.x + 25, handle!.y, { steps: 3 });
      await expect(arithmetic.locator(`[data-compatibility="${state}"]`)).toHaveCount(2);
      await page.mouse.move(300, 180);
      await page.mouse.up();
      await expect(arithmetic.locator("[data-compatibility]")).toHaveCount(0);
      await page.getByRole("dialog", { name: "Add connected operation" }).getByRole("button", { name: "Cancel", exact: true }).click();
    }
    expect((await getGraph()).revision).toBe(original.revision);
    await book.getByRole("button", { name: "Collapse workbook", exact: true }).click();
    await expect(book.locator('.react-flow__handle[title="quantity"]')).toBeVisible();
    await expect(book.locator('.react-flow__handle[title="price"]')).toBeVisible();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await book.getByRole("button", { name: "Detach sheet", exact: true }).click();
    await expect(page.locator(".react-flow__node-fieldNode")).toHaveCount(2);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator(".react-flow__node-fieldNode")).toHaveCount(1);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(page.locator(".react-flow__node-fieldNode")).toHaveCount(2);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.reload();
    await expect(book.getByRole("button", { name: "Expand workbook", exact: true })).toBeVisible();
    await book.getByRole("button", { name: /Return sheet to workbook/ }).click();
    await expect(page.locator(".react-flow__node-fieldNode")).toHaveCount(1);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    expect((await getGraph()).edges).toEqual(original.edges);
    expect(await preview()).toEqual(values);
    await page.screenshot({ path: test.info().outputPath("workbook-card.png") });
    await book.getByRole("button", { name: sheetName, exact: true }).dragTo(page.locator(".react-flow__pane"), { targetPosition: { x: 40, y: 550 } });
    await expect(page.locator(".react-flow__node-fieldNode")).toHaveCount(2);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Fit graph", exact: true }).click();
    await book.getByRole("button", { name: /Return sheet to workbook/ }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await book.getByRole("button", { name: "Ungroup workbook", exact: true }).click();
    await expect(book).toHaveCount(0);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    expect((await getGraph()).edges).toEqual(original.edges);
    expect(await preview()).toEqual(values);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(book).toHaveCount(1);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await book.getByRole("button", { name: sheetName, exact: true }).click();
    await page.getByRole("button", { name: "Delete selected node", exact: true }).click();
    await expect(book).toHaveCount(0);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const deleted = await getGraph();
    expect(deleted.presentation.workbooks).toHaveLength(0);
    expect(deleted.edges).toHaveLength(0);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    expect((await getGraph()).edges).toEqual(original.edges);
    expect(await preview()).toEqual(values);
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
