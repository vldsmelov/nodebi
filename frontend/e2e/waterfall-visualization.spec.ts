import { test, expect, request as createRequest } from "@playwright/test";
import { expectTooltipContrast } from "./tooltip-contrast";
import { activateByKeyboard } from "./keyboard-navigation";
import { observeChartLabels, expectOpaqueChartLabels } from "./chart-label-ink";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

for (const wide of [false, true]) test(`waterfall ${wide ? "keyboard window" : "cross-zero chart"} retains exact totals through orientation and reload`, async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  if (!wide) await observeChartLabels(page, ["-150", "40"]);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Waterfall chart acceptance" } })).json();
  try {
    const csv = wide ? `step,value,kind\nOpening,0,initial\n${Array.from({ length: 45 }, (_, i) => `Step${i + 1},1,change\n`).join("")}Closing,,total\n` : "step,value,kind\nOpening,100,initial\nSales,20,change\nCost_Regional_Manufacturing_Operations_Division_001,-150,change\nSubtotal,,subtotal\nRecovery,40,change\nClosing,,total\n";
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "bridge.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Balance bridge", dimensions: [profile.fields[0].field_id], measures: [{ name: "Amount", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    const upstream = graph.nodes.find((n: { type: string }) => n.type === "dataset_source");
    const steps = { id: crypto.randomUUID(), type: "waterfall_steps", version: 1, position: { x: 400, y: 300 }, config: { category_column_id: profile.fields[0].field_id, value_column_id: profile.fields[1].field_id, kind_column_id: profile.fields[2].field_id } };
    graph.nodes.push(steps);
    graph.edges.push({ id: crypto.randomUUID(), source_node_id: upstream.id, source_port: "dataset", target_node_id: steps.id, target_port: "input" });
    graph.result_catalog.outputs[0].node_id = steps.id;
    expect((await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByRole("combobox", { name: "Visualization type", exact: true }).selectOption("waterfall_chart");
    await page.getByRole("tab", { name: "Appearance", exact: true }).click();
    await page.getByLabel("Show labels", { exact: true }).check();
    await page.getByRole("button", { name: "Apply visualization", exact: true }).click();
    const chart = page.getByRole("img", { name: "Balance bridge", exact: true });
    await expect(chart.locator("canvas").first()).toBeVisible();
    const assertFits = async () => {
      await expect.poll(async () => {
        const box = await chart.boundingBox(), widget = await page.locator(".react-grid-item").first().boundingBox();
        return !!box && !!widget && box.y + box.height <= widget.y + widget.height + 1;
      }).toBe(true);
    };
    if (wide) {
      await activateByKeyboard(page, page.getByRole("button", { name: "Show 20 steps", exact: true }));
      await activateByKeyboard(page, page.getByRole("button", { name: "Next steps", exact: true }));
      await expect(page.getByText("Steps 21–40 of 47", { exact: true })).toBeVisible();
    }
    await assertFits();
    await page.screenshot({ path: testInfo.outputPath("waterfall-light.png"), animations: "disabled" });
    if (!wide) {
      await page.setViewportSize({ width: 420, height: 1000 });
      for (const theme of ["light", "dark"]) {
        await page.locator("select").filter({ has: page.locator('option[value="dark"]') }).selectOption(theme);
        await chart.scrollIntoViewIfNeeded();
        const bounds = (await chart.locator("canvas").first().boundingBox())!;
        await page.mouse.move(bounds.x + 90 + (bounds.width - 115) * 2.5 / 6, bounds.y + 18 + (bounds.height - 53) / 2);
        const tooltip = page.getByRole("tooltip");
        await expect(tooltip).toBeVisible();
        for (const text of ["Cost_Regional_Manufacturing_Operations_Division_001", "Contribution or total: -150", "Bar start: 120", "Bar end: -30", "Running balance: -30"]) await expect(tooltip).toContainText(text);
        await expectTooltipContrast(tooltip);
        const box = (await tooltip.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(420);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
        await page.screenshot({ path: testInfo.outputPath(`waterfall-tooltip-${theme}.png`), animations: "disabled" });
        await page.mouse.move(0, 0);
      }
      await page.setViewportSize({ width: 1600, height: 1000 });
    }
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    await activateByKeyboard(page, page.getByRole("button", { name: "Step table", exact: true }));
    await expect(page.getByRole("cell", { name: "Closing", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Final total", exact: true })).toBeVisible();
    if (!wide) await expect(page.getByRole("cell", { name: "-30", exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByRole("tab", { name: "Appearance", exact: true }).click();
    await page.getByLabel("Orientation", { exact: true }).selectOption("horizontal");
    await page.getByRole("button", { name: "Apply visualization", exact: true }).click();
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    const result = await (await request.post(`${api}/api/v1/visualizations/${ids.visualization_id}/result`, { data: { limit: 1 } })).json();
    expect(result.rows).toHaveLength(wide ? 47 : 6);
    expect(result.orientation).toBe("horizontal");
    expect(result.rows.at(-1).balance).toBe(wide ? "45" : "10");
    expect(result.waterfall_scale.minimum).toBe(wide ? "0" : "-30");
    await page.context().addCookies([{ name: "nodebi-theme", value: "dark", domain: new URL(page.url()).hostname, path: "/" }]);
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    if (wide) await activateByKeyboard(page, page.getByRole("button", { name: "Show 20 steps", exact: true }));
    await assertFits();
    await page.screenshot({ path: testInfo.outputPath("waterfall-dark.png"), animations: "disabled" });
    if (!wide) {
      await page.route(`**/api/v1/visualizations/${ids.visualization_id}/result`, async route => {
        const response = await route.fetch();
        await route.fulfill({ response, json: { ...await response.json(), highlight_field: result.category_field, highlight_value: "Opening" } });
      });
      for (const theme of ["light", "dark"]) {
        await page.context().addCookies([{ name: "nodebi-theme", value: theme, domain: new URL(page.url()).hostname, path: "/" }]);
        await page.reload();
        await expectOpaqueChartLabels(page, ["-150", "40"], theme);
        await page.screenshot({ path: testInfo.outputPath(`waterfall-muted-labels-${theme}.png`), animations: "disabled" });
      }
      await page.unroute(`**/api/v1/visualizations/${ids.visualization_id}/result`);
    }
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
