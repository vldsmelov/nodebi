import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { test, expect, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";
const backend = resolve(process.cwd(), "../backend");

test("executive demo renders eight real widgets and refreshes all calculations without changing layout", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  const python = resolve(backend, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const demo = JSON.parse(execFileSync(python, ["-m", "scripts.executive_demo", "--api-url", api], { cwd: backend, encoding: "utf8", windowsHide: true, env: { ...process.env, PYTHONIOENCODING: "utf-8" }, timeout: 60_000 }));
  try {
    const dashboard = await (await request.get(`${api}/api/v1/dashboards/${demo.dashboard_id}`)).json();
    const widget = (key: string) => page.locator(`[data-widget-id="${dashboard.widgets.find((w: { visualization_id: string }) => w.visualization_id === demo.visualizations[key]).id}"]`);
    await page.goto(demo.dashboard_path);
    await expect(page.locator(".react-grid-item")).toHaveCount(8);
    await expect(widget("revenue")).toContainText("1,455,960.32");
    await expect(widget("profit")).toContainText("437,617.41");
    await expect(widget("margin")).toContainText("30.06%");
    for (const key of ["trend", "heatmap", "boxplot", "histogram"]) await expect(widget(key).locator("canvas").first()).toBeVisible();
    await widget("heatmap").getByRole("button", { name: "Cell table", exact: true }).click();
    await expect(widget("heatmap").getByRole("cell", { name: "No source rows", exact: true })).toHaveCount(1);
    await expect(widget("heatmap").getByRole("cell", { name: "0.00", exact: true })).toHaveCount(1);
    await widget("boxplot").getByRole("button", { name: "Outliers", exact: true }).click();
    await expect(widget("boxplot").getByRole("cell", { name: "24", exact: true })).toBeVisible();
    const total = widget("table").getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Grand total Source rows: 136", exact: true }) });
    await expect(total.getByRole("cell", { name: "1455960.32", exact: true })).toBeVisible();
    await page.reload();
    await expect(widget("revenue")).toContainText("1,455,960.32");
    for (const key of ["trend", "heatmap", "boxplot", "histogram"]) {
      await expect(widget(key).locator("canvas").first()).toBeVisible();
      const card = (await widget(key).boundingBox())!;
      const chart = (await widget(key).locator("canvas").first().boundingBox())!;
      expect(chart.x + chart.width).toBeLessThanOrEqual(card.x + card.width + 1);
      expect(chart.y + chart.height).toBeLessThanOrEqual(card.y + card.height + 1);
    }
    await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("ru");
    await expect(widget("heatmap")).toContainText("Агрегация ячеек: Сумма");
    await page.waitForTimeout(1100); // ECharts canvas entrance animation is not a CSS animation.
    await page.screenshot({ path: testInfo.outputPath("executive-light.png"), fullPage: true });
    await page.context().addCookies([{ name: "nodebi-theme", value: "dark", domain: new URL(page.url()).hostname, path: "/" }]);
    await page.setViewportSize({ width: 1100, height: 1000 }); await page.reload();
    await expect(page.locator(".react-grid-item")).toHaveCount(8);
    for (const key of ["trend", "heatmap", "boxplot", "histogram"]) await expect(widget(key).locator("canvas").first()).toBeVisible();
    await expect(widget("margin")).toContainText("30,06");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.waitForTimeout(1100);
    await page.screenshot({ path: testInfo.outputPath("executive-compact-dark.png"), fullPage: true });
    await page.context().addCookies([{ name: "nodebi-language", value: "en", domain: new URL(page.url()).hostname, path: "/" }]);
    await page.goto(`/projects/${demo.project_id}/reports`);
    await page.getByRole("button", { name: "Update data", exact: true }).click();
    await page.getByLabel("Replacement file for executive-orders", { exact: true }).setInputFiles(resolve(backend, "fixtures/executive/updated.csv"));
    await expect(page.getByRole("combobox", { name: "File version", exact: true })).not.toHaveValue("");
    await page.getByRole("button", { name: "Save update draft", exact: true }).click();
    await page.getByRole("button", { name: "Check new data", exact: true }).click();
    await expect(page.getByRole("button", { name: "Apply data update", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Apply data update", exact: true }).click();
    await expect(page.getByRole("button", { name: "Prepare rollback", exact: true })).toBeVisible();
    await page.goto(demo.dashboard_path); await page.reload();
    await expect(widget("revenue")).toContainText("1,485,960.32");
    await expect(widget("profit")).toContainText("456,817.41");
    await expect(widget("margin")).toContainText("30.74%");
    for (const key of ["trend", "heatmap", "boxplot", "histogram"]) await expect(widget(key).locator("canvas").first()).toBeVisible();
    expect(await (await request.get(`${api}/api/v1/dashboards/${demo.dashboard_id}`)).json()).toEqual(dashboard);
  } finally {
    await page.goto("about:blank"); // Stop readers before deleting their isolated test data.
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${demo.project_id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
