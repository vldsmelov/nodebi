import { test, expect, request as createRequest } from "@playwright/test";
import { expectTooltipContrast } from "./tooltip-contrast";
import { activateByKeyboard } from "./keyboard-navigation";
import { observeChartLabels, expectOpaqueChartLabels } from "./chart-label-ink";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

for (const mode of ["basic", "wide", "multi"]) {
const wide = mode === "wide", multi = mode === "multi";
test(`combination chart ${multi ? "eight series" : wide ? "keyboard windows" : "one and two axes"} survives reload`, async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  if (!wide && !multi) await observeChartLabels(page, ["-40", "80"]);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Combination acceptance" } })).json();
  try {
    const csv = multi ? "period,actual,plan,forecast,budget,benchmark,target,prior,capacity\nJan,100,120,80,95,70,90,110,130\nFeb,-40,80,30,65,90,100,120,110\nMar,60,,70,45,80,110,90,130\nApr,120,140,100,85,90,110,130,100\n" : wide ? "period,actual,plan\n" + Array.from({ length: 45 }, (_, i) => `P${i + 1},${i % 8 - 3},${i % 9}\n`).join("") : "period,actual,plan\nJan,100,120\nFeb,-40,80\nMar,60,\nApr,120,140\n";
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "combo.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Plan and actual", dimensions: [profile.fields[0].field_id], measures: [{ name: "Actual", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    graph.result_catalog.outputs[0].node_id = graph.nodes.find((n: { type: string }) => n.type === "dataset_source").id;
    expect((await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByRole("combobox", { name: "Visualization type", exact: true }).selectOption("combo_chart");
    await page.getByLabel("Combination category", { exact: true }).selectOption(profile.fields[0].field_id);
    for (let i = 1; i <= (multi ? 8 : 2); i++) {
      if (i > 2) await page.getByRole("button", { name: "Add series", exact: true }).click();
      await page.getByLabel(`Combination field ${i}`, { exact: true }).selectOption(profile.fields[i].field_id);
      if (i > 2) await page.getByLabel(`Series style ${i}`, { exact: true }).selectOption(i <= 5 ? "bar" : "line");
    }
    if (!wide && !multi) await page.getByLabel("Series name 1", { exact: true }).fill("Actual_Revenue_Regional_Manufacturing_Operations_Division_001");
    await page.getByRole("tab", { name: "Appearance", exact: true }).click();
    await page.getByLabel("Show labels", { exact: true }).check();
    await page.getByRole("button", { name: "Apply visualization", exact: true }).click();
    const chart = page.getByRole("img", { name: "Plan and actual", exact: true });
    await expect(chart.locator("canvas").first()).toBeVisible();
    const assertFits = async () => {
      await expect.poll(async () => { const box = await chart.boundingBox(), widget = await page.locator(".react-grid-item").first().boundingBox(); return !!box && !!widget && box.y + box.height <= widget.y + widget.height + 1; }).toBe(true);
    };
    await assertFits();
    await page.screenshot({ path: testInfo.outputPath("combo-light.png"), animations: "disabled" });
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    await activateByKeyboard(page, page.getByRole("button", { name: "Data table", exact: true }));
    await expect(page.getByRole("rowheader", { name: wide ? "P45" : "Mar", exact: true })).toBeVisible();
    if (!wide) await expect(page.getByRole("cell", { name: "—", exact: true })).toHaveCount(1);
    if (multi) expect((await page.getByRole("rowheader", { name: "Jan", exact: true }).locator("..").getByRole("cell").allTextContents()).slice(0, 8)).toEqual(["100", "120", "80", "95", "70", "90", "110", "130"]);
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByLabel("Enable secondary axis", { exact: true }).check();
    await page.getByLabel("Series axis 2", { exact: true }).selectOption("secondary");
    await page.getByRole("button", { name: "Apply visualization", exact: true }).click();
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    await expect(page.getByText("Two independent scales: compare each series with its assigned axis, not with the height of another series.", { exact: true })).toBeVisible();
    const result = await (await request.post(`${api}/api/v1/visualizations/${ids.visualization_id}/result`, { data: { limit: 1 } })).json();
    expect(result.rows).toHaveLength(wide ? 45 : 4);
    expect(result.spec.secondary_axis).toBe(true);
    expect(result.spec.series[1].axis).toBe("secondary");
    if (multi) expect(result.spec.series).toHaveLength(8);
    if (wide) {
      await activateByKeyboard(page, page.getByRole("button", { name: "Show 20 categories", exact: true }));
      await activateByKeyboard(page, page.getByRole("button", { name: "Next categories", exact: true }));
      await expect(page.getByText("21–40 / 45", { exact: true })).toBeVisible();
    } else expect(result.combo.observations[2].positions[1]).toBeNull();
    await page.context().addCookies([{ name: "nodebi-theme", value: "dark", domain: new URL(page.url()).hostname, path: "/" }]);
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    if (wide) {
      await activateByKeyboard(page, page.getByRole("button", { name: "Show 20 categories", exact: true }));
      await activateByKeyboard(page, page.getByRole("button", { name: "Next categories", exact: true }));
      await expect(page.getByText("21–40 / 45", { exact: true })).toBeVisible();
    }
    await assertFits();
    await page.screenshot({ path: testInfo.outputPath("combo-dark.png"), animations: "disabled" });
    if (!wide && !multi) {
      await page.setViewportSize({ width: 420, height: 1000 });
      for (const theme of ["light", "dark"]) {
        await page.locator("select").filter({ has: page.locator('option[value="dark"]') }).selectOption(theme);
        await chart.scrollIntoViewIfNeeded();
        const canvas = chart.locator("canvas").first();
        await expect(canvas).toBeVisible();
        const box = (await canvas.boundingBox())!;
        await expect.poll(() => canvas.evaluate(el => (el as HTMLCanvasElement).width / window.devicePixelRatio)).toBeCloseTo(box.width, 0);
        await page.mouse.move(box.x + 90 + (box.width - 180) / 8, box.y + 28 + (box.height - 88) * 0.44);
        const tooltip = page.getByRole("tooltip");
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText("Actual_Revenue_Regional_Manufacturing_Operations_Division_001");
        await expect(tooltip).toContainText("Left axis: 100");
        await expectTooltipContrast(tooltip);
        const bounds = (await tooltip.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(420);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(1000);
        await page.screenshot({ path: testInfo.outputPath(`combo-tooltip-${theme}.png`), animations: "disabled" });
        await page.mouse.move(0, 0);
      }
      await page.setViewportSize({ width: 1600, height: 1000 });
      await page.route(`**/api/v1/visualizations/${ids.visualization_id}/result`, async route => {
        const response = await route.fetch();
        await route.fulfill({ response, json: { ...await response.json(), highlight_field: result.category_field, highlight_value: "Jan" } });
      });
      for (const theme of ["light", "dark"]) {
        await page.context().addCookies([{ name: "nodebi-theme", value: theme, domain: new URL(page.url()).hostname, path: "/" }]);
        await page.reload();
        await expectOpaqueChartLabels(page, ["-40", "80"], theme);
        await page.screenshot({ path: testInfo.outputPath(`combo-muted-labels-${theme}.png`), animations: "disabled" });
      }
      await page.unroute(`**/api/v1/visualizations/${ids.visualization_id}/result`);
    }
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
}
