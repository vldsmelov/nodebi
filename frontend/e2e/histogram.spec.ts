import { test, expect, request as createRequest } from "@playwright/test";
import { expectTooltipContrast } from "./tooltip-contrast";
import { expectReadableTable } from "./table-readability";
import { activateByKeyboard } from "./keyboard-navigation";
import { observeChartLabels, expectOpaqueChartLabels } from "./chart-label-ink";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

for (const exact of [false, true]) test(`histogram ${exact ? "large decimal" : "integer"} settings persist and produce exact intervals with visible population accounting`, async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  await observeChartLabels(page, ["2", "3"]);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Histogram acceptance" } })).json();
  try {
    const base = "900719925474099312345678901234";
    const bound = (i: number) => exact ? `${base}.0${i}` : String(i);
    const firstInterval = `[${exact ? base : "0"}; ${bound(2)})`, lastInterval = `[${bound(6)}; ${bound(8)}]`;
    const values = [exact ? "900719925474099312345678901233.99" : "-100", ...Array.from({ length: 8 }, (_, i) => bound(i + 1)), exact ? `${base}.10` : "100"];
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "values.csv", mimeType: "text/csv", buffer: Buffer.from(`group,value\n${values.map(value => `A,${value}\n`).join("")}B,\n`) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    if (exact) Object.assign(profile.fields[1], { logical_type: "decimal", precision: 38, scale: 2 });
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Histogram", dimensions: [profile.fields[0].field_id], measures: [{ name: "Value", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    const upstream = graph.nodes.find((n: { type: string }) => n.type === "dataset_source");
    const stats = { id: crypto.randomUUID(), type: "histogram", version: 1, position: { x: 400, y: 300 }, config: { value_column_id: profile.fields[1].field_id } };
    graph.nodes.push(stats);
    graph.edges.push({ id: crypto.randomUUID(), source_node_id: upstream.id, source_port: "dataset", target_node_id: stats.id, target_port: "input" });
    graph.result_catalog.outputs[0].node_id = stats.id;
    expect((await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/workflow?workflow=${ids.workflow_id}&node=${stats.id}`);
    await expect(page.getByLabel("Interval count", { exact: true })).toHaveValue("20");
    await page.getByLabel("Interval count", { exact: true }).fill("4");
    await page.getByRole("checkbox", { name: "Set histogram range", exact: true }).check();
    await page.getByLabel("Histogram upper bound", { exact: true }).fill(bound(8));
    if (exact) await page.getByLabel("Histogram lower bound", { exact: true }).fill(bound(0));
    await expect.poll(async () => (await (await request.get(url)).json()).nodes.find((n: { id: string }) => n.id === stats.id).config.range_max).toBe(bound(8));
    await page.reload();
    await expect(page.getByLabel("Interval count", { exact: true })).toHaveValue("4");
    await expect(page.getByLabel("Histogram upper bound", { exact: true })).toHaveValue(bound(8));
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByRole("combobox", { name: "Visualization type", exact: true }).selectOption("histogram_chart");
    await page.getByRole("tab", { name: "Appearance", exact: true }).click();
    await page.getByLabel("Show labels", { exact: true }).check();
    await page.getByRole("button", { name: "Apply visualization", exact: true }).click();
    await expect(page.getByRole("img", { name: "Histogram", exact: true }).locator("canvas")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("histogram.png"), animations: "disabled" });
    await page.reload();
    await expect(page.getByText("Included: 8. Missing: 1. Below range: 1. Above range: 1.")).toBeVisible();
    await activateByKeyboard(page, page.getByRole("button", { name: "Histogram intervals", exact: true }));
    await expect(page.getByRole("cell", { name: firstInterval, exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: lastInterval, exact: true })).toBeVisible();
    const result = await (await request.post(`${api}/api/v1/visualizations/${ids.visualization_id}/result`, { data: {} })).json();
    expect(result.rows.map((row: { count: number }) => row.count)).toEqual([1, 2, 2, 3]);
    expect(result.spec.type).toBe("histogram_chart");
    for (const theme of ["light", "dark"]) {
      await page.locator("select").filter({ has: page.locator('option[value="dark"]') }).selectOption(theme);
      await page.setViewportSize({ width: 420, height: 1000 });
      await activateByKeyboard(page, page.getByRole("button", { name: "Chart", exact: true }));
      await expect(page.getByRole("img", { name: "Histogram", exact: true }).locator("canvas")).toBeVisible();
      if (exact) {
        const canvas = page.getByRole("img", { name: "Histogram", exact: true }).locator("canvas");
        await canvas.scrollIntoViewIfNeeded();
        const box = (await canvas.boundingBox())!;
        await expect.poll(() => canvas.evaluate(e => (e as HTMLCanvasElement).width / devicePixelRatio)).toBeCloseTo(box.width, 0);
        // Hover the bar away from its overlaid count label.
        await page.mouse.move(box.x + 70 + (box.width - 95) * 0.82, box.y + 30 + (box.height - 95) * 0.3);
        const tooltip = page.getByRole("tooltip");
        // Resize can still animate bar geometry after the canvas has its final dimensions.
        await expect.poll(async () => {
          await page.mouse.move(0, 0);
          await page.mouse.move(box.x + 70 + (box.width - 95) * 0.82, box.y + 30 + (box.height - 95) * 0.3);
          return tooltip.isVisible();
        }).toBe(true);
        await expect(tooltip).toContainText(lastInterval);
        await expect(tooltip).toContainText("Observations: 3");
        await expectTooltipContrast(tooltip);
        const bounds = (await tooltip.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(420);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(1000);
        await page.screenshot({ path: testInfo.outputPath(`histogram-tooltip-${theme}.png`), animations: "disabled" });
        await page.mouse.move(0, 0);
      }
      await activateByKeyboard(page, page.getByRole("button", { name: "Histogram intervals", exact: true }));
      await expectReadableTable(page, page.getByRole("columnheader").nth(1), page.getByRole("cell", { name: "3", exact: true }));
      await expect(page.getByRole("cell", { name: lastInterval, exact: true })).toHaveText(lastInterval);
      await page.screenshot({ path: testInfo.outputPath(`histogram-table-narrow-${theme}.png`), animations: "disabled" });
    }
    // Renderer-only highlight metadata: the actual server counts and intervals stay intact.
    await page.route(`**/visualizations/${ids.visualization_id}/result*`, async route => {
      const response = await route.fetch();
      await route.fulfill({ response, json: { ...await response.json(), highlight_field: result.category_field, highlight_value: result.rows[0][result.category_field] } });
    });
    for (const theme of ["light", "dark"]) {
      await page.context().addCookies([{ name: "nodebi-theme", value: theme, domain: new URL(page.url()).hostname, path: "/" }]);
      await page.reload();
      await expectOpaqueChartLabels(page, ["2", "3"], theme);
      await page.screenshot({ path: testInfo.outputPath(`histogram-muted-labels-${theme}.png`), animations: "disabled" });
    }
    await page.unroute(`**/visualizations/${ids.visualization_id}/result*`);
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
