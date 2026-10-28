import { test, expect, request as createRequest } from "@playwright/test";
import { expectTooltipContrast } from "./tooltip-contrast";
import { activateByKeyboard } from "./keyboard-navigation";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";
type MedianInkWindow = typeof globalThis & { medianInk?: { alpha: number; color: string }[] };

test("box plot authoring renders a real chart, preserves exact tables and pages outliers after reload", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const paint = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof paint>) {
      if (String(args[0]) === "305.50") {
        const ink = ((window as MedianInkWindow).medianInk ??= []);
        ink.push({ alpha: this.globalAlpha, color: String(this.fillStyle) });
        if (ink.length > 1000) ink.splice(0, 500);
      }
      return paint.apply(this, args);
    };
  });
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Box plot acceptance" } })).json();
  try {
    const csv = "group,value\n" + Array.from({ length: 500 }, (_, i) => `A,${i + 1}\n`).join("") + "A,1000\n".repeat(110) + "B,\n";
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "values.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Distribution", dimensions: [profile.fields[0].field_id], measures: [{ name: "Value", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    const upstream = graph.nodes.find((n: { type: string }) => n.type === "dataset_source");
    const stats = { id: crypto.randomUUID(), type: "boxplot_stats", version: 1, position: { x: 400, y: 300 }, config: { value_column_id: profile.fields[1].field_id, group_column_id: profile.fields[0].field_id } };
    graph.nodes.push(stats);
    graph.edges.push({ id: crypto.randomUUID(), source_node_id: upstream.id, source_port: "dataset", target_node_id: stats.id, target_port: "input" });
    graph.result_catalog.outputs[0].node_id = stats.id;
    expect((await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByRole("combobox", { name: "Visualization type", exact: true }).selectOption("box_plot");
    await page.getByRole("tab", { name: "Appearance", exact: true }).click();
    await page.getByLabel("Show labels", { exact: true }).check();
    await page.getByRole("button", { name: "Apply visualization", exact: true }).click();
    await expect(page.getByRole("img", { name: "Distribution", exact: true }).locator("canvas")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("box-plot.png"), animations: "disabled" });
    const boxCanvas = page.getByRole("img", { name: "Distribution", exact: true }).locator("canvas");
    for (const theme of ["light", "dark"]) {
      await page.locator("select").filter({ has: page.locator('option[value="dark"]') }).selectOption(theme);
      await expect.poll(() => page.evaluate(() => (window as MedianInkWindow).medianInk?.at(-1))).toEqual({ alpha: 1, color: theme === "dark" ? "#d7dfef" : "#34415b" });
      const boxBounds = (await boxCanvas.boundingBox())!;
      await page.mouse.move(boxBounds.x + 70 + (boxBounds.width - 100) / 4, boxBounds.y + 25 + (boxBounds.height - 90) * 0.6945);
      const tooltip = page.getByRole("tooltip");
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText("Missing values: 0");
      await expect(tooltip).toContainText("First quartile: 153.25");
      await expectTooltipContrast(tooltip);
      const bounds = (await tooltip.boundingBox())!;
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      await page.screenshot({ path: testInfo.outputPath(`box-plot-hover-${theme}.png`), animations: "disabled" });
      await page.mouse.move(0, 0);
    }
    await page.reload();
    await expect(page.getByRole("img", { name: "Distribution", exact: true }).locator("canvas")).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Showing 100 of 110 outliers" })).toBeVisible();
    await activateByKeyboard(page, page.getByRole("button", { name: "Outliers", exact: true }));
    await expect(page.getByRole("cell", { name: "1,000", exact: true })).toHaveCount(100);
    await activateByKeyboard(page, page.getByRole("button", { name: "Next page", exact: true }));
    await expect(page.getByRole("cell", { name: "1,000", exact: true })).toHaveCount(10);
    await expect(page.getByRole("button", { name: "Outliers", exact: true })).toHaveAttribute("aria-pressed", "true");
    await activateByKeyboard(page, page.getByRole("button", { name: "Distribution summary", exact: true }));
    await expect(page.getByRole("cell", { name: "610", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Median", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "153.25", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByRole("tab", { name: "Appearance", exact: true }).click();
    await page.getByLabel("Orientation", { exact: true }).selectOption("horizontal");
    await page.getByRole("button", { name: "Apply visualization", exact: true }).click();
    await page.reload();
    await expect(page.getByRole("img", { name: "Distribution", exact: true }).locator("canvas")).toBeVisible();
    const result = await (await request.post(`${api}/api/v1/visualizations/${ids.visualization_id}/result`, { data: {} })).json();
    expect(result.orientation).toBe("horizontal");
    expect(result.spec.version).toBe(1);
    expect(result.datasets.summary.rows[0].count).toBe(610);
    for (const theme of ["light", "dark"]) {
      await page.locator("select").filter({ has: page.locator('option[value="dark"]') }).selectOption(theme);
      await page.setViewportSize({ width: 420, height: 1000 });
      await activateByKeyboard(page, page.getByRole("button", { name: "Distribution summary", exact: true }));
      await expect(page.getByRole("table")).toHaveCSS("font-size", "14px");
      await expect(page.getByRole("columnheader", { name: "Median", exact: true })).toHaveCSS("text-align", "right");
      await expect(page.getByRole("cell", { name: "153.25", exact: true })).toHaveCSS("text-align", "right");
      await expect.poll(() => page.getByRole("table").evaluate(el => {
        const scroller = el.parentElement!;
        scroller.scrollLeft = scroller.scrollWidth;
        return scroller.scrollLeft > 0 && scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft <= 1;
      })).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`boxplot-table-${theme}.png`), animations: "disabled" });
    }
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
