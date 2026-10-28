import { showAllOperations } from "./operation-catalog";
import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
test.use({ actionTimeout: 15000 });

for (const formLayout of ["desktop", "narrow", "large-text"]) test(`build and restore filtered revenue aggregation (${formLayout}) in an existing legacy workflow`, async ({ page, request }) => {
  test.setTimeout(120000);
  await page.goto("/projects");
  await page.getByLabel("Project name", { exact: true }).fill("Sales Analysis");
  const created = page.waitForResponse(response => response.url().endsWith("/api/v1/projects") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  const project = await (await created).json();
  try {
    await page.locator(`a[href="/projects/${project.id}"]`).click();
    await page.getByRole("link", { name: "Data", exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles(resolve("../fixtures/excel/sales.xlsx"));
    await page.getByLabel("Worksheet").selectOption("Sales");
    await expect(page.getByRole("columnheader", { name: "quantity", exact: true })).toBeVisible();
    // New workflows use published results. Keep this regression on the supported v1 editor;
    // report-first creation has separate wizard/workspace acceptance, not legacy chart nodes.
    const legacy = await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Legacy sales" } });
    expect(legacy.ok()).toBe(true);
    const legacyWorkflow = await legacy.json();
    expect(legacyWorkflow.version).toBe(1);
    await page.goto(`/projects/${project.id}/workflow?workflow=${legacyWorkflow.id}`);
    if (formLayout !== "desktop") await page.setViewportSize({ width: formLayout === "narrow" ? 420 : 1280, height: 1000 });
    if (formLayout === "large-text") await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
    const verifySettings = async (labels: string[]) => {
      for (const label of labels) {
        const control = page.getByLabel(label, { exact: true });
        await control.scrollIntoViewIfNeeded();
        const bounds = (await control.boundingBox())!;
        const viewport = page.viewportSize()!;
        expect(bounds.x, label).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width, label).toBeLessThanOrEqual(viewport.width);
        expect(bounds.y, label).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height, label).toBeLessThanOrEqual(viewport.height);
        const panelBounds = await control.evaluate(element => {
          const panel = element.closest("aside")!.getBoundingClientRect();
          return { left: panel.left, right: panel.right };
        });
        expect(bounds.x, `${label} inside panel`).toBeGreaterThanOrEqual(panelBounds.left);
        expect(bounds.x + bounds.width, `${label} inside panel`).toBeLessThanOrEqual(panelBounds.right);
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    };
    await page.getByText("Workflow parameters", { exact: true }).click();
    await page.getByRole("button", { name: "Add parameter", exact: true }).click();
    await page.getByLabel("Parameter name 1", { exact: true }).fill("target");
    await page.getByLabel("Parameter label 1", { exact: true }).fill("Monthly target");
    await page.getByLabel("Parameter type 1", { exact: true }).selectOption("decimal");
    await page.getByLabel("Parameter default 1", { exact: true }).fill("9007199254740993.11");
    await verifySettings(["Parameter name 1", "Parameter label 1", "Parameter type 1", "Decimal precision · Monthly target", "Decimal scale · Monthly target", "Parameter default 1", "Parameter preview 1"]);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const parameterGraph = await (await request.get(`${api}/api/v1/workflows/${legacyWorkflow.id}`)).json();
    expect(parameterGraph.parameters[0]).toMatchObject({ name: "target", logical_type: "decimal", default: "9007199254740993.11", precision: 38, scale: 2 });
    await page.getByLabel("Parameter preview 1", { exact: true }).fill("9007199254740993.12");
    expect(await (await request.get(`${api}/api/v1/workflows/${legacyWorkflow.id}`)).json()).toEqual(parameterGraph);
    await page.getByText("Workflow parameters", { exact: true }).click();
    await showAllOperations(page); await page.getByTitle("Add Excel Source").click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await showAllOperations(page); await page.getByTitle("Add Filter", { exact: true }).click();
    await page.getByLabel("Input input").selectOption({ index: 1 });
    await expect(page.getByRole("button", { name: "Add condition" })).toBeVisible();
    await page.getByRole("button", { name: "Add condition" }).click();
    await page.getByLabel("Filter column 1").selectOption({ label: "country · string" });
    await page.getByLabel("Filter operator 1").selectOption("equals");
    await page.getByLabel("Filter value 1").fill("Korea");
    await verifySettings(["Filter column 1", "Filter operator 1", "Filter value source 1", "Filter value 1", "Remove condition 1"]);
    await page.getByLabel("Filter column 1", { exact: true }).focus();
    for (const label of ["Filter operator 1", "Filter value source 1", "Filter value 1", "Remove condition 1"]) {
      await page.keyboard.press("Tab");
      await expect(page.getByLabel(label, { exact: true })).toBeFocused();
    }
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await showAllOperations(page); await page.getByTitle("Add Calculated Column · v1", { exact: true }).click();
    const filterOption = page.getByLabel("Input input").locator("option").filter({ hasText: "Filter (" });
    await page.getByLabel("Input input").selectOption((await filterOption.getAttribute("value"))!);
    await page.getByLabel("Output field name").fill("revenue");
    await page.getByLabel("Expression", { exact: true }).fill("quantity * price");
    await verifySettings(["Output field name", "Expression"]);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await showAllOperations(page); await page.getByTitle("Add Group By · v1", { exact: true }).click();
    const calcOption = page.getByLabel("Input input").locator("option").filter({ hasText: "Calculated Column (" });
    await page.getByLabel("Input input").selectOption((await calcOption.getAttribute("value"))!);
    await page.getByRole("checkbox", { name: "category", exact: true }).check();
    await page.getByRole("button", { name: "Add aggregation" }).click();
    await page.getByLabel("Aggregate field 1").selectOption({ label: "revenue" });
    await page.getByLabel("Aggregation 1", { exact: true }).selectOption("sum");
    await page.getByLabel("Aggregate name 1").fill("total_revenue");
    await verifySettings(["Aggregate field 1", "Aggregation 1", "Aggregate name 1"]);
    await expect(page.getByRole("button", { name: "Preview output" })).toBeEnabled();
    await page.getByRole("button", { name: "Preview output" }).click();
    await expect(page.getByRole("columnheader", { name: "total_revenue float", exact: true })).toBeVisible();
    const preview = await page.getByRole("table").innerText();
    await page.screenshot({ path: test.info().outputPath("populated-settings.png"), fullPage: true });
    const workflows = await (await request.get(`${api}/api/v1/projects/${project.id}/workflows`)).json();
    const saved = await (await request.get(`${api}/api/v1/workflows/${workflows.items[0].id}`)).json();
    const group = saved.nodes.find((node: { type: string }) => node.type === "group_by");
    expect(saved.edges).toHaveLength(3);
    await page.reload();
    if (formLayout === "large-text") await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
    await expect(page.locator(".react-flow__node")).toHaveCount(4);
    // Select the restored node through its named control and compare execution results.
    await page.getByLabel("Edit workflow node", { exact: true }).selectOption(group.id);
    await page.getByRole("button", { name: "Preview output" }).click();
    await expect(page.getByRole("table")).toHaveText(preview.replaceAll("\t", "").replaceAll("\n", ""));
    // This matrix targets populated calculation forms. Existing chart/dashboard gestures below
    // retain their original desktop acceptance; they do not claim narrow-dashboard coverage.
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    await showAllOperations(page); await page.getByTitle("Add Bar Chart").click();
    const groupOption = page.getByLabel("Input input").locator("option").filter({ hasText: "Group By (" });
    await page.getByLabel("Input input").selectOption((await groupOption.getAttribute("value"))!);
    await page.getByLabel("Chart title").fill("Revenue by category");
    await page.getByLabel("Chart category").selectOption({ label: "category" });
    await page.getByLabel("Chart value").selectOption({ label: "total_revenue" });
    await expect(page.getByRole("img", { name: "Revenue by category", exact: true })).toBeVisible();
    await showAllOperations(page); await page.getByTitle("Add Group By · v1", { exact: true }).click();
    const calculation = page.getByLabel("Input input").locator("option").filter({ hasText: "Calculated Column (" });
    await page.getByLabel("Input input").selectOption((await calculation.getAttribute("value"))!);
    await page.getByRole("button", { name: "Add aggregation" }).click();
    await page.getByLabel("Aggregate field 1").selectOption({ label: "revenue" });
    await page.getByLabel("Aggregation 1", { exact: true }).selectOption("sum");
    await page.getByLabel("Aggregate name 1").fill("grand_total");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const beforeKpi = await (await request.get(`${api}/api/v1/workflows/${saved.id}`)).json();
    const globalGroup = beforeKpi.nodes.find((node: { type: string; config: { aggregations?: { name: string }[] } }) => node.type === "group_by" && node.config.aggregations?.[0]?.name === "grand_total");
    await showAllOperations(page); await page.getByTitle("Add KPI").click();
    await page.getByLabel("Input input").selectOption(`${globalGroup.id}:dataset`);
    await page.getByLabel("Chart title").fill("Total revenue");
    await page.getByLabel("Chart value").selectOption({ label: "grand_total" });
    await expect(page.getByTestId("kpi-value")).toBeVisible();
    const total = await page.getByTestId("kpi-value").innerText();
    expect(Number(total.replaceAll(",", ""))).toBe(500);
    const expectedWorkflow = await (await request.get(`${api}/api/v1/workflows/${saved.id}`)).json();
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Create dashboard" }).click();
    for (const title of ["Revenue by category · Bar Chart", "Total revenue · KPI"]) {
      await page.getByRole("button", { name: "Add chart", exact: true }).click();
      await page.getByText(title, { exact: true }).locator("..").getByRole("button", { name: "Add widget", exact: true }).click();
    }
    await expect(page.getByTestId("kpi-value")).toHaveText(total);
    const widgets = page.locator("[data-widget-id]");
    await expect(widgets).toHaveCount(2);
    const barWidget = widgets.filter({ has: page.getByRole("img", { name: "Revenue by category", exact: true }) });
    const kpiWidget = widgets.filter({ has: page.getByTestId("kpi-value") });
    await barWidget.locator(".widget-handle").hover();
    const handle = await barWidget.locator(".widget-handle").boundingBox();
    if (!handle) throw new Error("Missing widget drag handle");
    await page.mouse.move(handle.x + 30, handle.y + 10);
    await page.mouse.down();
    await page.mouse.move(handle.x + 180, handle.y + 90, { steps: 12 });
    await page.mouse.up();
    await barWidget.locator(".react-resizable-handle").hover();
    const beforeResize = await barWidget.boundingBox();
    const resize = await barWidget.locator(".react-resizable-handle").boundingBox();
    if (!resize) throw new Error("Missing widget resize handle");
    await page.mouse.move(resize.x + 5, resize.y + 5);
    await page.mouse.down();
    await page.mouse.move(resize.x + 130, resize.y + 65, { steps: 12 });
    await page.mouse.up();
    await expect.poll(async () => {
      const bounds = await barWidget.boundingBox();
      return !!bounds && !!beforeResize && (bounds.width > beforeResize.width + 40 || bounds.height > beforeResize.height + 20);
    }).toBeTruthy();
    await kpiWidget.locator(".widget-handle").hover();
    const kpiHandle = await kpiWidget.locator(".widget-handle").boundingBox();
    if (!kpiHandle) throw new Error("Missing KPI drag handle");
    await page.mouse.move(kpiHandle.x + 30, kpiHandle.y + 10);
    await page.mouse.down();
    await page.mouse.move(kpiHandle.x - 130, kpiHandle.y + 95, { steps: 12 });
    await page.mouse.up();
    await page.getByRole("button", { name: "Save dashboard" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const dashboards = await (await request.get(`${api}/api/v1/projects/${project.id}/dashboards`)).json();
    const layout = dashboards.items[0];
    expect(layout.widgets.some((widget: { x: number; width: number; height: number }) => widget.x > 0 && (widget.width !== 6 || widget.height !== 8))).toBeTruthy();
    if (process.env.NODEBI_E2E_RESTART === "1") {
      const compose = process.env.NODEBI_E2E_COMPOSE_FILE ? ["-f", process.env.NODEBI_E2E_COMPOSE_FILE] : [];
      const projectArgs = process.env.NODEBI_E2E_COMPOSE_PROJECT ? ["-p", process.env.NODEBI_E2E_COMPOSE_PROJECT] : [];
      execFileSync("docker", ["compose", ...compose, ...projectArgs, "restart", "backend", "postgres", "frontend"], { cwd: resolve(".."), timeout: 45000, windowsHide: true });
      await expect.poll(async () => { try { return (await request.get(`${api}/ready`)).ok(); } catch { return false; } }, { timeout: 30000 }).toBeTruthy();
    }
    const dashboardStarted = Date.now();
    await page.reload();
    await expect(page.getByTestId("kpi-value")).toHaveText(total);
    await expect(page.getByRole("img", { name: "Revenue by category", exact: true }).locator("canvas")).toBeVisible();
    console.log(`Restored dashboard render: ${Date.now() - dashboardStarted} ms`);
    expect(await (await request.get(`${api}/api/v1/workflows/${saved.id}`)).json()).toEqual(expectedWorkflow);
    expect((await (await request.get(`${api}/api/v1/projects/${project.id}`)).json()).name).toBe("Sales Analysis");
    const restored = await (await request.get(`${api}/api/v1/dashboards/${layout.id}`)).json();
    expect(restored.widgets).toEqual(layout.widgets);
    // A failed chart request must not hide the other widget.
    const barId = beforeKpi.nodes.find((node: { type: string }) => node.type === "bar_chart").id;
    await page.route(`**/api/v1/visualizations/${barId}/result*`, route => route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ detail: { code: "TEST_WIDGET_ERROR", message: "Widget test error" } }) }));
    await page.reload();
    await expect(page.getByRole("alert").filter({ hasText: "Widget test error" })).toBeVisible();
    await expect(page.getByTestId("kpi-value")).toHaveText(total);
  } finally {
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});
