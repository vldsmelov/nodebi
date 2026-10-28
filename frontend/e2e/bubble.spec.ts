import { test, expect, request as createRequest } from "@playwright/test";
import { expectTooltipContrast } from "./tooltip-contrast";
import { activateByKeyboard } from "./keyboard-navigation";
import { observeChartLabels, expectOpaqueChartLabels } from "./chart-label-ink";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

for (const wide of [false, true]) test(`bubble chart ${wide ? "full-scale pages" : "exact area and missing values"} survives reload`, async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  if (!wide) await observeChartLabels(page, ["A", "B"]);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Bubble acceptance" } })).json();
  try {
    const keyName = wide ? "key" : "Observation_Regional_Manufacturing_Operations_Division_001";
    const csv = `${keyName},x,y,size\n` + (wide ? Array.from({ length: 201 }, (_, i) => `P${i},${i},${200 - i},${i}\n`).join("") : "A,9007199254740993.01,1,1\nB,9007199254740993.02,2,4\nC,9007199254740993.01,1,0\nD,,2,4\n");
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "bubble.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    for (const field of profile.fields.slice(1)) Object.assign(field, { logical_type: "decimal", precision: 38, scale: 2 });
    const applied = await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } });
    expect(applied.ok()).toBeTruthy();
    const snapshot = await applied.json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Bubble analysis", dimensions: [profile.fields[0].field_id], measures: [{ name: "X", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    graph.result_catalog.outputs[0].node_id = graph.nodes.find((n: { type: string }) => n.type === "dataset_source").id;
    expect((await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByRole("combobox", { name: "Visualization type", exact: true }).selectOption("bubble_chart");
    for (const [index, role] of ["Observation key", "X measure", "Y measure", "Bubble area"].entries()) await page.getByLabel(role, { exact: true }).selectOption(profile.fields[index].field_id);
    if (!wide) await page.getByLabel("Colour group", { exact: true }).selectOption(profile.fields[0].field_id);
    // Draft recovery must recognize the new chart type before it has ever been saved.
    await page.reload();
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
    await expect(page.getByLabel("Bubble area", { exact: true })).toHaveValue(profile.fields[3].field_id);
    if (!wide) {
      await page.getByRole("tab", { name: "Appearance", exact: true }).click();
      await page.getByLabel("Show labels", { exact: true }).check();
    }
    await page.getByRole("button", { name: "Apply visualization", exact: true }).click();
    const chart = page.getByRole("img", { name: "Bubble analysis", exact: true });
    await expect(chart.locator("canvas").first()).toBeVisible();
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    const resultUrl = `${api}/api/v1/visualizations/${ids.visualization_id}/result`;
    const first = await (await request.post(resultUrl, { data: {} })).json();
    expect(first.spec.type).toBe("bubble_chart");
    await activateByKeyboard(page, page.getByRole("button", { name: "Data table", exact: true }));
    if (wide) {
      await expect(page.getByText("Only the current page is drawn; scales and counts use the complete selected dataset.", { exact: true })).toBeVisible();
      let release!: () => void;
      const delayed = new Promise<void>(resolve => { release = resolve; });
      await page.route(`**/visualizations/${ids.visualization_id}/result*`, async route => {
        await delayed;
        await route.continue();
      });
      await activateByKeyboard(page, page.getByRole("button", { name: "Next page", exact: true }));
      const previousNotice = page.getByRole("status").filter({ hasText: "Showing previous result. Waiting for updated data." });
      try {
        await expect(previousNotice).toBeVisible();
        await expect(previousNotice).not.toHaveClass(/sr-only/);
        await expect(page.getByRole("rowheader", { name: "P0", exact: true })).toBeVisible();
      } finally { release(); }
      await expect(page.getByText("Rows 101–200 of 201", { exact: true })).toBeVisible();
      await expect(previousNotice).toHaveCount(0);
      await page.unroute(`**/visualizations/${ids.visualization_id}/result*`);
      await activateByKeyboard(page, page.getByRole("button", { name: "Next page", exact: true }));
      await expect(page.getByRole("rowheader", { name: "P200", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Next page", exact: true })).toBeDisabled();
      const tail = await (await request.post(resultUrl, { data: { offset: 200 } })).json();
      expect(tail.bubble.x_axis).toEqual(first.bubble.x_axis);
      expect(tail.bubble.size_maximum).toBe("200");
    } else {
      await expect(page.getByRole("cell", { name: "9007199254740993.01", exact: true }).first()).toBeVisible();
      await expect(page.getByRole("cell", { name: "Zero area", exact: true })).toBeVisible();
      await expect(page.getByRole("cell", { name: "Missing values", exact: true })).toBeVisible();
      expect(first.bubble.points.map((p: { state: string }) => p.state)).toEqual(["visible", "visible", "zero_size", "missing"]);
      expect(first.bubble.points[0].radius_ratio).toBe(0.5);
      expect(first.bubble.x_axis.label_offset).toBe("9007199254740993.01");
      await expect(page.getByText("X = 9007199254740993.01 + axis label", { exact: true })).toBeVisible();
    }
    await activateByKeyboard(page, page.getByRole("button", { name: "Chart", exact: true }));
    await expect(chart.locator("canvas").first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("bubble-light.png"), animations: "disabled" });
    await page.context().addCookies([{ name: "nodebi-theme", value: "dark", domain: new URL(page.url()).hostname, path: "/" }]);
    await page.setViewportSize({ width: 420, height: 900 });
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("bubble-dark-narrow.png"), animations: "disabled" });
    if (!wide) {
      // Isolate observation text from identical legend labels; keep real values/radii.
      for (const theme of ["light", "dark"]) {
        await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption(theme);
        await chart.scrollIntoViewIfNeeded();
        const canvas = chart.locator("canvas").first(), box = (await canvas.boundingBox())!;
        await expect.poll(() => canvas.evaluate(e => (e as HTMLCanvasElement).width / devicePixelRatio)).toBeCloseTo(box.width, 0);
        const width = box.width - 136, height = box.height - 118;
        const pad = (pixels: number) => Math.min(2, 27 / Math.max(14, pixels - 54));
        await page.mouse.move(box.x + 100 + width * (1 + pad(width)) / (1 + 2 * pad(width)), box.y + 32 + height * pad(height) / (1 + 2 * pad(height)));
        await page.screenshot({ path: testInfo.outputPath(`bubble-tooltip-${theme}.png`), animations: "disabled" });
        const tooltip = page.getByRole("tooltip");
        await expect(tooltip).toBeVisible();
        for (const detail of [`${keyName}: B`, "x: 9007199254740993.02", "y: 2.00", "size: 4.00"]) await expect(tooltip).toContainText(detail);
        await expectTooltipContrast(tooltip);
        const bounds = (await tooltip.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(420);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(900);
        await page.mouse.move(0, 0);
      }
      await page.route(`**/visualizations/${ids.visualization_id}/result*`, async route => {
        const response = await route.fetch();
        await route.fulfill({ response, json: { ...await response.json(), show_legend: false, highlight_field: first.category_field, highlight_value: "B" } });
      });
      for (const theme of ["light", "dark"]) {
        await page.context().addCookies([{ name: "nodebi-theme", value: theme, domain: new URL(page.url()).hostname, path: "/" }]);
        await page.reload();
        await expectOpaqueChartLabels(page, ["A", "B"], theme);
        await page.screenshot({ path: testInfo.outputPath(`bubble-muted-labels-${theme}.png`), animations: "disabled" });
      }
      await page.unroute(`**/visualizations/${ids.visualization_id}/result*`);
    }
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
