import { test, expect, request as createRequest } from "@playwright/test";
import { expectReadableTable } from "./table-readability";
import { activateByKeyboard, tabTo } from "./keyboard-navigation";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";
type RadarInkWindow = typeof globalThis & { radarInk?: { text: string; alpha: number; color: string }[] };

test("radar authors explicit scales, preserves incomplete profiles and reloads both themes", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const observed = window as RadarInkWindow;
    observed.radarInk = [];
    const paint = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof paint>) {
      if (["3", "8", "5"].includes(args[0])) {
        const records = observed.radarInk ??= [];
        records.push({ text: args[0], alpha: this.globalAlpha, color: String(this.fillStyle) });
        if (records.length > 1000) records.splice(0, 500);
      }
      return paint.apply(this, args);
    };
  });
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Radar acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "profiles.csv", mimeType: "text/csv", buffer: Buffer.from("branch,sales,quality,margin\nNorth_Regional_Manufacturing_Operations_Division_001,3,8,5\nSouth,7,4,9\nWest,,2,3\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Branch profiles", dimensions: [profile.fields[0].field_id], measures: [{ name: "Sales", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    // The source already has one prepared row per profile. No hidden chart aggregation.
    graph.result_catalog.outputs[0].node_id = graph.nodes.find((n: { type: string }) => n.type === "dataset_source").id;
    expect((await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByRole("combobox", { name: "Visualization type", exact: true }).selectOption("radar_chart");
    await page.getByLabel("Radar profile", { exact: true }).selectOption(profile.fields[0].field_id);
    for (let index = 1; index <= 3; index++) await page.getByRole("combobox", { name: `Radar axis ${index}`, exact: true }).selectOption(profile.fields[index].field_id);
    await page.getByLabel("Radar normalization", { exact: true }).selectOption("shared");
    await page.getByLabel("Radar minimum", { exact: true }).fill("0");
    await page.getByLabel("Radar maximum", { exact: true }).fill("10");
    await page.getByRole("tab", { name: "Appearance", exact: true }).click();
    await page.getByLabel("Show labels", { exact: true }).check();
    await page.getByRole("button", { name: "Apply visualization", exact: true }).click();
    const chart = page.getByRole("img", { name: "Branch profiles", exact: true });
    await expect(chart.locator("canvas").first()).toBeVisible();
    await expect(page.getByText("1 incomplete profiles are shown only in the table; missing axes are not zero.")).toBeVisible();
    const assertFitsWidget = async () => {
      await expect.poll(async () => {
        const canvasBox = await chart.boundingBox(), widgetBox = await page.locator(".react-grid-item").first().boundingBox();
        return !!canvasBox && !!widgetBox && canvasBox.y + canvasBox.height <= widgetBox.y + widgetBox.height + 1;
      }).toBe(true);
    };
    await assertFitsWidget();
    await page.screenshot({ path: testInfo.outputPath("radar-light.png"), animations: "disabled" });
    const radarBounds = (await chart.locator("canvas").first().boundingBox())!;
    await page.mouse.move(radarBounds.x + radarBounds.width / 2, radarBounds.y + radarBounds.height * 0.46 - Math.min(radarBounds.width, radarBounds.height) * 0.275 * 0.3);
    await page.screenshot({ path: testInfo.outputPath("radar-light-hover.png"), animations: "disabled" });
    await page.mouse.move(0, 0);
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    await activateByKeyboard(page, page.getByRole("button", { name: "Profile table", exact: true }));
    await expect(page.getByRole("rowheader", { name: "West", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Missing measure", exact: true })).toHaveCount(1);
    await activateByKeyboard(page, page.getByRole("button", { name: "Axis scales", exact: true }));
    await expect(page.getByRole("cell", { name: "10", exact: true })).toHaveCount(3);
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await expect(page.getByLabel("Radar normalization", { exact: true })).toHaveValue("shared");
    await page.getByLabel("Radar normalization", { exact: true }).selectOption("min_max");
    await page.getByLabel("Axis 2 maximum", { exact: true }).fill("20");
    await page.getByRole("button", { name: "Move radar axis 3 up", exact: true }).click();
    await page.getByRole("button", { name: "Apply visualization", exact: true }).click();
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    const result = await (await request.post(`${api}/api/v1/visualizations/${ids.visualization_id}/result`, { data: { limit: 1 } })).json();
    expect(result.rows).toHaveLength(3);
    expect(result.spec.normalization).toBe("min_max");
    expect(result.spec.axes.map((axis: { maximum: string }) => axis.maximum)).toEqual(["10", "10", "20"]);
    expect(result.radar.profiles[0].positions).toEqual([0.3, 0.5, 0.4]);
    await page.context().addCookies([{ name: "nodebi-theme", value: "dark", domain: new URL(page.url()).hostname, path: "/" }]);
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    await assertFitsWidget();
    await page.screenshot({ path: testInfo.outputPath("radar-dark.png"), animations: "disabled" });
    await page.route(`**/api/v1/visualizations/${ids.visualization_id}/result`, async route => {
      const response = await route.fetch();
      await route.fulfill({ response, json: { ...await response.json(), highlight_field: result.category_field, highlight_value: "South" } });
    });
    for (const theme of ["light", "dark"]) {
      await page.context().addCookies([{ name: "nodebi-theme", value: theme, domain: new URL(page.url()).hostname, path: "/" }]);
      await page.reload();
      await expect.poll(() => page.evaluate(() => ["3", "8", "5"].map(text => ((window as RadarInkWindow).radarInk ?? []).findLast(record => record.text === text)))).toEqual(["3", "8", "5"].map(text => ({ text, alpha: 1, color: theme === "dark" ? "#d7dfef" : "#34415b" })));
      await page.screenshot({ path: testInfo.outputPath(`radar-muted-labels-${theme}.png`), animations: "disabled" });
    }
    await page.unroute(`**/api/v1/visualizations/${ids.visualization_id}/result`);
    for (const theme of ["light", "dark"]) {
      await page.locator("select").filter({ has: page.locator('option[value="dark"]') }).selectOption(theme);
      await page.setViewportSize({ width: 420, height: 1000 });
      await activateByKeyboard(page, page.getByRole("button", { name: "Profile table", exact: true }));
      await expectReadableTable(page, page.getByRole("columnheader", { name: "sales", exact: true }), page.getByRole("cell", { name: "7", exact: true }));
      await expect.poll(() => page.getByRole("table").evaluate(table => table.parentElement!.scrollWidth > table.parentElement!.clientWidth)).toBe(true);
      const scrollRegion = page.getByRole("region", { name: "Branch profiles · Profile table", exact: true });
      await tabTo(page, page.getByRole("button", { name: "Axis scales", exact: true }));
      await page.keyboard.press("Tab");
      await expect(scrollRegion).toBeFocused();
      await expect(scrollRegion).toHaveCSS("outline-style", "solid");
      // Focusing the region may reveal its left edge. Start there explicitly and use native keys.
      await scrollRegion.evaluate(el => { el.scrollLeft = 0; });
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => scrollRegion.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
      await page.keyboard.press("End");
      const previousScroll = await scrollRegion.evaluate(el => el.scrollLeft);
      await page.keyboard.press("ArrowLeft");
      await expect.poll(() => scrollRegion.evaluate(el => el.scrollLeft)).toBeLessThan(previousScroll);
      await expect(page.getByRole("table", { name: "Branch profiles · Profile table", exact: true })).toBeVisible();
      await expect(page.getByRole("cell", { name: "Missing measure", exact: true })).toHaveCount(1);
      await activateByKeyboard(page, page.getByRole("button", { name: "Axis scales", exact: true }));
      await expectReadableTable(page, page.getByRole("columnheader", { name: "Maximum", exact: true }), page.getByRole("cell", { name: "20", exact: true }));
      await page.screenshot({ path: testInfo.outputPath(`radar-table-narrow-${theme}.png`), animations: "disabled" });
    }
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
