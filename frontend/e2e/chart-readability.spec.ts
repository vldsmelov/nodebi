import { expect, test, request as createRequest } from "@playwright/test";
import { expectTooltipContrast } from "./tooltip-contrast";
import { activateByKeyboard } from "./keyboard-navigation";
const api = process.env.NODEBI_E2E_API ?? "http://localhost:8010";
type TextBox = { text: string; left: number; right: number; top: number; bottom: number };
type RecordedCanvas = HTMLCanvasElement & { axisText?: TextBox[] };

test("numeric labels stay separate after real resizes and raw chart rows remain available by keyboard", async ({ page, request }) => {
  test.setTimeout(120000);
  // Observe actual canvas text, not an application test hook or just option flags.
  await page.addInitScript(() => {
    const fill = CanvasRenderingContext2D.prototype.fillText, clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, width, height) {
      if (width >= this.canvas.width && height >= this.canvas.height) (this.canvas as RecordedCanvas).axisText = [];
      clear.call(this, x, y, width, height);
    };
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (maxWidth === undefined) fill.call(this, text, x, y); else fill.call(this, text, x, y, maxWidth);
      if (!this.canvas.closest('[role="img"]') || !/^[-−]?\d[\d., \u00a0\u202f]*[KMB]?$/.test(text)) return;
      const metrics = this.measureText(text), matrix = this.getTransform();
      const left = x - metrics.actualBoundingBoxLeft, right = x + metrics.actualBoundingBoxRight;
      const top = y - metrics.actualBoundingBoxAscent, bottom = y + metrics.actualBoundingBoxDescent;
      const corners = [[left, top], [right, top], [left, bottom], [right, bottom]].map(([cx, cy]) => new DOMPoint(cx, cy).matrixTransform(matrix));
      ((this.canvas as RecordedCanvas).axisText ??= []).push({ text, left: Math.min(...corners.map(p => p.x)), right: Math.max(...corners.map(p => p.x)), top: Math.min(...corners.map(p => p.y)), bottom: Math.max(...corners.map(p => p.y)) });
    };
  });
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Chart readability acceptance" } })).json();
  try {
    const longName = "A_very_long_business_unit_Regional_Manufacturing_Operations_001";
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "labels.csv", mimeType: "text/csv", buffer: Buffer.from(`region,amount\n${longName},50.123456\nVery long business unit two,150.123456\nVery long business unit three,310.123456\n`) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    profile.fields[1].logical_type = "decimal"; profile.fields[1].precision = 24; profile.fields[1].scale = 6;
    const imported = await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } });
    expect(imported.ok()).toBeTruthy(); const snapshot = await imported.json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Readable revenue", dimensions: [profile.fields[0].field_id], measures: [{ name: "Revenue", operation: "sum", column_id: profile.fields[1].field_id }], presentation: "bar_chart" } });
    expect(created.ok()).toBeTruthy(); const ids = await created.json();
    const graph = await (await request.get(`${api}/api/v1/workflows/${ids.workflow_id}`)).json();
    const chart = await (await request.get(`${api}/api/v1/visualizations/${ids.visualization_id}`)).json();
    expect((await request.put(`${api}/api/v1/visualizations/${chart.id}`, { data: { workflow_id: chart.workflow_id, publication_id: chart.publication_id, expected_workflow_revision: graph.revision, expected_revision: chart.revision, name: chart.name, type: chart.type, config: { ...chart.config, orientation: "horizontal", show_labels: false, decimals: 2 } } })).ok()).toBeTruthy();
    const board = await (await request.get(`${api}/api/v1/dashboards/${ids.dashboard_id}`)).json();
    expect((await request.put(`${api}/api/v1/dashboards/${board.id}`, { data: { name: board.name, expected_revision: board.revision, configuration: board.configuration, widgets: board.widgets.map((w: object) => ({ ...w, width: 6, height: 12 })) } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/dashboard`);
    const widget = page.locator("[data-widget-id]");
    const picture = widget.getByRole("img");
    const boxes = () => picture.locator("canvas").first().evaluate(canvas => (canvas as RecordedCanvas).axisText ?? []);
    let narrowCount = 0;
    for (const [width, locale, theme] of [[700, "en", "light"], [1600, "en", "light"], [700, "en", "light"], [1600, "ru", "dark"], [700, "tt", "light"]] as const) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator('select').filter({ has: page.locator('option[value="ru"]') }).selectOption(locale);
      await page.locator('select').filter({ has: page.locator('option[value="dark"]') }).selectOption(theme);
      await expect(picture.locator("canvas")).toBeVisible();
      await expect.poll(async () => (await boxes()).length).toBeGreaterThanOrEqual(2);
      if (width === 1600 && locale === "en") await expect.poll(async () => (await boxes()).length).toBeGreaterThan(narrowCount);
      if (width === 700 && locale === "en") {
        if (narrowCount) await expect.poll(async () => (await boxes()).length).toBeLessThanOrEqual(narrowCount);
        else narrowCount = (await boxes()).length;
      }
      await expect.poll(async () => {
        const labels = (await boxes()).sort((a, b) => a.left - b.left);
        return labels.every((label, i) => i === 0 || label.left >= labels[i - 1].right + 2);
      }).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`${width}-${locale}-${theme}.png`), fullPage: true });
    }
    await page.locator('select').filter({ has: page.locator('option[value="ru"]') }).selectOption("en");
    await activateByKeyboard(page, widget.getByRole("button", { name: "Data table", exact: true }));
    await expect(widget.getByRole("cell", { name: "50.123456", exact: true })).toBeVisible();
    await expect(widget.getByRole("cell", { name: "Very long business unit three", exact: true })).toBeVisible();
    await activateByKeyboard(page, widget.getByRole("button", { name: "Chart", exact: true }));
    await expect(picture.locator("canvas")).toBeVisible();
    await page.setViewportSize({ width: 420, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.getByLabel("Theme", { exact: true }).selectOption(theme);
      const canvas = picture.locator("canvas");
      await widget.scrollIntoViewIfNeeded();
      await expect(canvas).toBeVisible();
      await expect.poll(async () => {
        const bounds = (await canvas.boundingBox())!;
        return Math.abs(await canvas.evaluate(e => (e as HTMLCanvasElement).width / devicePixelRatio) - bounds.width);
      }).toBeLessThan(0.5);
      const box = (await canvas.boundingBox())!;
      const left = Math.min(150, Math.max(48, box.width * 0.3));
      const tooltip = page.getByRole("tooltip");
      await expect.poll(async () => {
        await page.mouse.move(0, 0);
        await page.mouse.move(box.x + left + 10, box.y + 25 + (box.height - 90) / 6);
        return tooltip.isVisible();
      }).toBe(true);
      await expect(tooltip).toContainText(longName);
      await expect(tooltip).toContainText("50.123456");
      await expectTooltipContrast(tooltip);
      const bounds = (await tooltip.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(420);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(1000);
      await page.screenshot({ path: test.info().outputPath(`basic-tooltip-${theme}.png`) });
      await page.mouse.move(0, 0);
    }
    expect(await (await request.get(`${api}/api/v1/workflows/${ids.workflow_id}`)).json()).toEqual(graph);
  } finally { const cleanup = await createRequest.newContext(); expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); await cleanup.dispose(); }
});
