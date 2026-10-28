import { test, expect, request as createRequest } from "@playwright/test";
import { expectTooltipContrast } from "./tooltip-contrast";
import { activateByKeyboard } from "./keyboard-navigation";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";
type Ink = { text: string; color: string; alpha: number };
type ObservedWindow = typeof globalThis & { heatmapInk?: Ink[] };

test("heatmap chart distinguishes missing cells and persists colour scale with exact table", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const observed = window as ObservedWindow;
    observed.heatmapInk = [];
    const paint = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof paint>) {
      if (args[0] === "-3" || args[0] === "10") {
        const paints = observed.heatmapInk ??= [];
        paints.push({ text: args[0], color: String(this.fillStyle), alpha: this.globalAlpha });
        if (paints.length > 1000) paints.splice(0, 500);
      }
      return paint.apply(this, args);
    };
  });
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Heatmap acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "cells.csv", mimeType: "text/csv", buffer: Buffer.from("branch,value,month\nNorth,-3,Jan\nSouth,0,Jan\nWest,10,Jan\nNorth,,Feb\nSouth,4,Mar\nWest,2,Mar\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Branch performance", dimensions: [profile.fields[0].field_id], measures: [{ name: "Value", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    const upstream = graph.nodes.find((n: { type: string }) => n.type === "dataset_source");
    const stats = { id: crypto.randomUUID(), type: "heatmap_stats", version: 1, position: { x: 400, y: 300 }, config: { value_column_id: profile.fields[1].field_id, x_column_id: profile.fields[0].field_id, y_column_id: profile.fields[2].field_id, aggregation: "sum" } };
    graph.nodes.push(stats);
    graph.edges.push({ id: crypto.randomUUID(), source_node_id: upstream.id, source_port: "dataset", target_node_id: stats.id, target_port: "input" });
    graph.result_catalog.outputs[0].node_id = stats.id;
    expect((await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByRole("combobox", { name: "Visualization type", exact: true }).selectOption("heatmap_chart");
    await page.getByRole("tab", { name: "Appearance", exact: true }).click();
    await page.getByLabel("Colour range", { exact: true }).selectOption("zero_centered");
    await page.getByLabel("Show labels", { exact: true }).check();
    await page.getByRole("button", { name: "Apply visualization", exact: true }).click();
    const chart = page.getByRole("img", { name: "Branch performance", exact: true });
    await expect(chart.locator("canvas").first()).toBeVisible();
    const assertFitsWidget = async () => {
      await expect.poll(async () => {
        const canvasBox = await chart.boundingBox(), widgetBox = await page.locator(".react-grid-item").first().boundingBox();
        return !!canvasBox && !!widgetBox && canvasBox.y + canvasBox.height <= widgetBox.y + widgetBox.height + 1;
      }).toBe(true);
    };
    await assertFitsWidget();
    await expect(page.getByText("Symmetric around zero", { exact: true })).toBeVisible();
    await expect(page.getByText("× No source rows · — Missing measure · numeric zero is a measured value.")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("heatmap-light.png"), animations: "disabled" });
    const hoverCell = async (name: string, numeric = false) => {
      const canvas = chart.locator("canvas").first();
      const bounds = (await canvas.boundingBox())!;
      const sampleFill = () => canvas.evaluate((element, numeric) => {
        const surface = element as HTMLCanvasElement;
        const rect = surface.getBoundingClientRect();
        const x = Math.floor(120 * surface.width / rect.width);
        const y = Math.floor((8 + (rect.height - 38) * (numeric ? 3 : 1) / 6) * surface.height / rect.height);
        return Array.from(surface.getContext("2d")!.getImageData(x, y, 1, 1).data);
      }, numeric);
      const originalFill = await sampleFill();
      // Centre of the first cell in the known 3 x 3 fixture (grid left=100/top=8).
      await page.mouse.move(bounds.x + 100 + (bounds.width - 120) / 6, bounds.y + 8 + (bounds.height - 38) * (numeric ? 3 : 1) / 6);
      const tooltip = page.getByRole("tooltip");
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText(numeric ? "value: -3" : "Missing values: 1");
      await expect.poll(sampleFill, { message: "Hover must preserve the encoded cell fill" }).toEqual(originalFill);
      await expectTooltipContrast(tooltip);
      const tooltipBounds = (await tooltip.boundingBox())!;
      expect(tooltipBounds.y).toBeGreaterThanOrEqual(0);
      expect(tooltipBounds.y + tooltipBounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      await page.screenshot({ path: testInfo.outputPath(name), animations: "disabled" });
      await page.mouse.move(0, 0);
    };
    await hoverCell("heatmap-light-hover.png");
    await hoverCell("heatmap-light-numeric-hover.png", true);
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    await activateByKeyboard(page, page.getByRole("button", { name: "Cell table", exact: true }));
    await expect(page.getByRole("cell", { name: "No source rows", exact: true })).toHaveCount(3);
    await expect(page.getByRole("cell", { name: "Missing measure", exact: true })).toHaveCount(1);
    await expect(page.getByRole("cell", { name: "-3", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByRole("tab", { name: "Appearance", exact: true }).click();
    await expect(page.getByLabel("Colour range", { exact: true })).toHaveValue("zero_centered");
    await page.getByLabel("Colour range", { exact: true }).selectOption("fixed");
    await page.getByLabel("Colour minimum", { exact: true }).fill("-1");
    await page.getByLabel("Colour maximum", { exact: true }).fill("5");
    await page.getByRole("button", { name: "Apply visualization", exact: true }).click();
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    await expect(page.getByText("Saturated colours: 1 cells below and 1 above the fixed range. Values are unchanged.")).toBeVisible();
    const result = await (await request.post(`${api}/api/v1/visualizations/${ids.visualization_id}/result`, { data: { limit: 1 } })).json();
    expect(result.rows).toHaveLength(9);
    expect(result.spec.color_scale).toEqual({ mode: "fixed", minimum: "-1", maximum: "5" });
    expect(result.rows.find((row: { x: string; y: string }) => row.x === "South" && row.y === "Jan").value).toBe("0");
    await page.context().addCookies([{ name: "nodebi-theme", value: "dark", domain: new URL(page.url()).hostname, path: "/" }]);
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("heatmap-dark.png"), animations: "disabled" });
    await hoverCell("heatmap-dark-hover.png");
    await hoverCell("heatmap-dark-numeric-hover.png", true);
    // Inject only presentation highlighting; schema, rows and scale remain the real result.
    // This exercises the renderer, not the dashboard's parameter-selection wiring.
    await page.route(`**/api/v1/visualizations/${ids.visualization_id}/result`, async route => {
      const response = await route.fetch();
      await route.fulfill({ response, json: { ...await response.json(), highlight_field: "x", highlight_value: "South" } });
    });
    for (const theme of ["light", "dark"]) {
      await page.context().addCookies([{ name: "nodebi-theme", value: theme, domain: new URL(page.url()).hostname, path: "/" }]);
      await page.reload();
      await expect(chart.locator("canvas").first()).toBeVisible();
      await expect.poll(() => page.evaluate(() => {
        const paints = (window as ObservedWindow).heatmapInk ?? [];
        return ["-3", "10"].map(text => paints.findLast(paint => paint.text === text));
      })).toEqual([{ text: "-3", color: "#000000", alpha: 1 }, { text: "10", color: "#ffffff", alpha: 1 }]);
      await hoverCell(`heatmap-${theme}-muted-numeric-hover.png`, true);
    }
    await page.unroute(`**/api/v1/visualizations/${ids.visualization_id}/result`);
    await assertFitsWidget();
    await page.setViewportSize({ width: 420, height: 1000 });
    await activateByKeyboard(page, page.getByRole("button", { name: "Cell table", exact: true }));
    await expect(page.getByRole("cell", { name: "No source rows", exact: true })).toHaveCount(3);
    await expect(page.getByRole("cell", { name: "Missing measure", exact: true })).toHaveCount(1);
    const observedZero = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "South", exact: true }) }).filter({ has: page.getByRole("cell", { name: "Jan", exact: true }) });
    await expect(observedZero.getByRole("cell", { name: "Observed value", exact: true })).toBeVisible();
    await expect(observedZero.getByRole("cell").nth(2)).toHaveText("0");
    await activateByKeyboard(page, page.getByRole("button", { name: "Chart", exact: true }));
    await expect(chart.locator("canvas").first()).toBeVisible();
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
