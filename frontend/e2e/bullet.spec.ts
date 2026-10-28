import { test, expect, request as createRequest } from "@playwright/test";
import { expectTooltipContrast } from "./tooltip-contrast";
import { activateByKeyboard } from "./keyboard-navigation";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

for (const wide of [false, true]) test(`bullet chart ${wide ? "pages and indicator windows" : "signed actual, target and missing values"} survives reload`, async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Bullet acceptance" } })).json();
  try {
    const csv = "key,actual,target\n" + (wide ? Array.from({ length: 201 }, (_, i) => `P${i},${i % 100},80\n`).join("") : "Negative,-50,80\nZero,0,\nMissing,,0\nMaximum,100,100\n");
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "bullet.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    for (const field of profile.fields.slice(1)) Object.assign(field, { logical_type: "decimal", precision: 38, scale: 2 });
    const applied = await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } });
    expect(applied.ok()).toBeTruthy();
    const snapshot = await applied.json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Bullet analysis", dimensions: [profile.fields[0].field_id], measures: [{ name: "Actual", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    graph.result_catalog.outputs[0].node_id = graph.nodes.find((n: { type: string }) => n.type === "dataset_source").id;
    expect((await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByRole("combobox", { name: "Visualization type", exact: true }).selectOption("bullet_chart");
    for (const [index, role] of ["Bullet category", "Actual field", "Target field"].entries()) await page.getByLabel(role, { exact: true }).selectOption(profile.fields[index].field_id);
    await page.getByLabel("Scale minimum", { exact: true }).fill(wide ? "0" : "-100");
    await page.getByLabel("Range label 1", { exact: true }).fill("At least target");
    await page.getByLabel("Range tone 1", { exact: true }).selectOption("positive");
    await page.getByRole("button", { name: "Add range", exact: true }).click();
    await page.getByLabel("Range label 1", { exact: true }).fill("Below target");
    await page.getByLabel("Range upper bound 1", { exact: true }).fill("80");
    await page.reload();
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
    await expect(page.getByLabel("Range upper bound 1", { exact: true })).toHaveValue("80");
    await page.getByRole("tab", { name: "Appearance", exact: true }).click();
    await page.getByLabel("Show labels", { exact: true }).check();
    await page.getByRole("button", { name: "Apply visualization", exact: true }).click();
    const chart = page.getByRole("img", { name: "Bullet analysis", exact: true });
    await expect(chart.locator("canvas").first()).toBeVisible();
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    const resultUrl = `${api}/api/v1/visualizations/${ids.visualization_id}/result`;
    const first = await (await request.post(resultUrl, { data: {} })).json();
    expect(first.spec.type).toBe("bullet_chart");
    if (wide) {
      await expect(page.getByText(/^Indicators 1–[1-5]$/)).toBeVisible();
      const initialWindow = await page.getByText(/^Indicators 1–[1-5]$/).textContent();
      const count = Number(initialWindow!.split("–")[1]);
      await activateByKeyboard(page, page.getByRole("button", { name: "Next indicators", exact: true }));
      await expect(page.getByText(`Indicators ${count + 1}–${count * 2}`, { exact: true })).toBeVisible();
    }
    await activateByKeyboard(page, page.getByRole("button", { name: "Data table", exact: true }));
    if (wide) {
      await activateByKeyboard(page, page.getByRole("button", { name: "Next page", exact: true }));
      await expect(page.getByText("Rows 101–200 of 201", { exact: true })).toBeVisible();
      await activateByKeyboard(page, page.getByRole("button", { name: "Next page", exact: true }));
      await expect(page.getByRole("rowheader", { name: "P200", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Next page", exact: true })).toBeDisabled();
      const tail = await (await request.post(resultUrl, { data: { offset: 200 } })).json();
      expect(tail.bullet.band_ends).toEqual(first.bullet.band_ends);
      expect(tail.bullet.input_count).toBe(201);
      await activateByKeyboard(page, page.getByRole("button", { name: "Previous page", exact: true }));
      await activateByKeyboard(page, page.getByRole("button", { name: "Previous page", exact: true }));
    } else {
      await expect(page.getByRole("cell", { name: "-50.00", exact: true })).toBeVisible();
      await expect(page.getByRole("cell", { name: "Missing actual", exact: true })).toBeVisible();
      expect(first.bullet.points.map((p: { actual_zero: boolean }) => p.actual_zero)).toEqual([false, true, false, false]);
      expect(first.bullet.points[0].actual).toBe(0.25);
      expect(first.bullet.missing_actual_count).toBe(1);
      expect(first.bullet.missing_target_count).toBe(1);
    }
    await activateByKeyboard(page, page.getByRole("button", { name: "Chart", exact: true }));
    await expect(chart.locator("canvas").first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("bullet-light.png"), animations: "disabled" });
    await page.context().addCookies([{ name: "nodebi-theme", value: "dark", domain: new URL(page.url()).hostname, path: "/" }]);
    await page.setViewportSize({ width: 420, height: 900 });
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    await expect.poll(() => chart.evaluate(element => {
      const canvas = element.querySelector("canvas");
      return canvas ? Math.abs(canvas.getBoundingClientRect().width - element.clientWidth) + Math.abs(canvas.getBoundingClientRect().height - element.clientHeight) : 999;
    })).toBeLessThanOrEqual(2);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.screenshot({ path: testInfo.outputPath("bullet-dark-narrow.png"), animations: "disabled" });
    if (!wide) for (const theme of ["light", "dark"]) {
      await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption(theme);
      await chart.scrollIntoViewIfNeeded();
      const canvas = chart.locator("canvas").first(), box = (await canvas.boundingBox())!;
      await expect.poll(() => canvas.evaluate(e => (e as HTMLCanvasElement).width / devicePixelRatio)).toBeCloseTo(box.width, 0);
      await page.mouse.move(box.x + 110 + (box.width - 134) * 0.375, box.y + 15 + (box.height - 43) / 2);
      await page.screenshot({ path: testInfo.outputPath(`bullet-tooltip-${theme}.png`), animations: "disabled" });
      const tooltip = page.getByRole("tooltip");
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText("Actual: -50.00");
      await expect(tooltip).toContainText("Target: 80.00");
      await expect(tooltip).toContainText("Below target");
      await expectTooltipContrast(tooltip);
      const bounds = (await tooltip.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(420);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(900);
      await page.mouse.move(0, 0);
    }
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
