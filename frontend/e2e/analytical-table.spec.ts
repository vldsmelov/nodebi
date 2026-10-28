import { test, expect, request as createRequest } from "@playwright/test";
import { activateByKeyboard } from "./keyboard-navigation";
import { contrastSamples } from "./computed-contrast";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("analytical table pins columns, formats exact rules and pages complete totals after reload", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Analytical table acceptance" } })).json();
  try {
    const csv = "region,branch,amount\n" + Array.from({ length: 105 }, (_, i) => `North,B${i},${i - 10}\n`).join("") + "South,C,\n";
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "table.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Regional totals", dimensions: [profile.fields[0].field_id], measures: [{ name: "Amount", operation: "sum", column_id: profile.fields[2].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    const sourceNode = graph.nodes.find((n: { type: string }) => n.type === "dataset_source");
    const rollup = { id: crypto.randomUUID(), type: "table_rollup", version: 1, position: { x: 400, y: 300 }, config: { dimensions: profile.fields.slice(0, 2).map((f: { field_id: string }) => f.field_id), measures: ["sum", "average", "max"].map((operation, i) => ({ output_id: crypto.randomUUID(), name: ["Total", "Mean", "Maximum"][i], operation, column_id: profile.fields[2].field_id, scale: 2 })) } };
    graph.nodes.push(rollup);
    graph.edges.push({ id: crypto.randomUUID(), source_node_id: sourceNode.id, source_port: "dataset", target_node_id: rollup.id, target_port: "input" });
    graph.result_catalog.outputs[0].node_id = rollup.id;
    expect((await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByRole("combobox", { name: "Visualization type", exact: true }).selectOption("analytical_table");
    await page.getByRole("tab", { name: "Appearance", exact: true }).click();
    await page.getByLabel("Pinned data columns", { exact: true }).selectOption("1");
    await page.getByLabel("Table density", { exact: true }).selectOption("compact");
    await page.getByRole("button", { name: "Add formatting rule", exact: true }).click();
    await page.getByLabel("Rule label", { exact: true }).fill("Negative balance");
    await page.getByLabel("Rule tone", { exact: true }).selectOption("negative");
    for (const [label, tone, condition, threshold] of [["Healthy balance", "positive", "gte", "50"], ["Review balance", "warning", "gte", "0"], ["Missing measure", "neutral", "is_empty", ""]]) {
      await page.getByRole("button", { name: "Add formatting rule", exact: true }).click();
      await page.getByLabel("Rule label", { exact: true }).last().fill(label);
      await page.getByLabel("Rule tone", { exact: true }).last().selectOption(tone);
      await page.getByLabel("Condition", { exact: true }).last().selectOption(condition);
      if (threshold) await page.getByLabel("Exact threshold", { exact: true }).last().fill(threshold);
      else await page.getByLabel("Measure", { exact: true }).last().selectOption({ label: "Mean" });
    }
    await page.getByRole("button", { name: "Apply visualization", exact: true }).click();
    const table = page.getByTestId("analytical-table"), region = table.getByRole("region", { name: "Analytical table", exact: true });
    await expect(table.getByText("Negative balance", { exact: true }).first()).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "row_id", exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 1000, height: 1000 });
    const pin = table.getByRole("columnheader", { name: "region", exact: true });
    // The grid animates its responsive position. Pinning is relative to its scroll region,
    // not the viewport position captured midway through that transition.
    const pinnedOffset = async () => (await pin.boundingBox())!.x - (await region.boundingBox())!.x;
    await expect.poll(pinnedOffset).toBeCloseTo(160, 0);
    await region.evaluate(el => { el.scrollLeft = 250; });
    expect(await region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    await expect.poll(pinnedOffset).toBeCloseTo(160, 0);
    await region.evaluate(el => { el.scrollLeft = 0; });
    await page.screenshot({ path: testInfo.outputPath("analytical-light.png"), animations: "disabled" });
    await page.reload();
    await expect(table.getByText("Negative balance", { exact: true }).first()).toBeVisible();
    await activateByKeyboard(page, table.getByRole("button", { name: "Last page", exact: true }));
    await expect(table.getByText("Grand total", { exact: true })).toBeVisible();
    await region.evaluate(el => { el.scrollTop = el.scrollHeight; });
    const totalCells = table.getByRole("cell").filter({ has: page.getByText("4410", { exact: true }) });
    await expect(totalCells).toHaveCount(2);
    await expect(table.getByRole("cell").filter({ has: page.getByText("Empty value", { exact: true }) }).first()).toBeVisible();
    await expect(table.getByRole("button", { name: "Next page", exact: true })).toBeDisabled();
    const saved = await (await request.post(`${api}/api/v1/visualizations/${ids.visualization_id}/result`, { data: { offset: 100 } })).json();
    expect(saved.total_rows).toBe(109);
    expect(saved.spec.density).toBe("compact");
    expect(saved.spec.rules[0].threshold).toBe("0");
    await page.context().addCookies([{ name: "nodebi-theme", value: "dark", domain: new URL(page.url()).hostname, path: "/" }]);
    await page.reload();
    await activateByKeyboard(page, table.getByRole("button", { name: "Last page", exact: true }));
    await expect(table.getByText("Grand total", { exact: true })).toBeVisible();
    await region.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.screenshot({ path: testInfo.outputPath("analytical-dark.png"), animations: "disabled" });
    await expect(table.getByRole("table")).toHaveCSS("font-size", "14px");
    for (const value of await totalCells.all()) {
      await expect(value).toHaveCSS("text-align", "right");
      await expect(value).toHaveCSS("font-variant-numeric", "tabular-nums");
    }
    await page.setViewportSize({ width: 420, height: 1000 });
    await expect(table.getByText("Some columns are temporarily unpinned to keep values visible. Widen the table to restore pinning.")).toBeVisible();
    // The responsive grid animates width; scroll only after its active transitions finish.
    await table.locator("xpath=ancestor::*[@data-widget-id]").evaluate(async widget => {
      await Promise.all(widget.getAnimations().map(animation => animation.finished.catch(() => undefined)));
    });
    await region.evaluate(el => { el.scrollLeft = el.scrollWidth; el.scrollTop = el.scrollHeight; });
    const finalTotal = totalCells.last();
    await expect.poll(() => finalTotal.evaluate(cell => {
      const scroller = cell.closest('[role="region"]')!;
      cell.scrollIntoView({ block: "nearest", inline: "end" });
      const bounds = cell.getBoundingClientRect(), viewport = scroller.getBoundingClientRect();
      const x = Math.min(bounds.right, viewport.right) - 8;
      const y = (bounds.top + bounds.bottom) / 2;
      return bounds.left >= viewport.left && bounds.right <= viewport.right
        && cell.contains(document.elementFromPoint(x, y));
    })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("analytical-narrow-unpinned.png") });
    await expect.poll(() => finalTotal.evaluate(cell => {
      const bounds = cell.getBoundingClientRect(), viewport = cell.closest('[role="region"]')!.getBoundingClientRect();
      return bounds.left >= viewport.left && bounds.right <= viewport.right ? "visible" : JSON.stringify({ left: bounds.left, right: bounds.right, regionLeft: viewport.left, regionRight: viewport.right, scroll: cell.closest('[role="region"]')!.scrollLeft, active: document.activeElement?.tagName });
    })).toBe("visible");
    await page.setViewportSize({ width: 1000, height: 1000 });
    await expect.poll(pinnedOffset).toBeCloseTo(160, 0);
    await expect(table.getByText("Some columns are temporarily unpinned to keep values visible. Widen the table to restore pinning.")).toHaveCount(0);
    const afterResize = await (await request.post(`${api}/api/v1/visualizations/${ids.visualization_id}/result`, { data: { offset: 100 } })).json();
    expect(afterResize.spec.pinned_columns).toBe(1);
    // Text enlargement changes rem-based padding/font sizes, not the fixed-column geometry.
    await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
    await expect(table.getByRole("table")).toHaveCSS("font-size", "28px");
    await expect.poll(async () => (await table.getByRole("columnheader", { name: "Row level", exact: true }).boundingBox())!.width).toBeCloseTo(160, 0);
    await expect.poll(pinnedOffset).toBeCloseTo(160, 0);
    await page.evaluate(() => { document.documentElement.style.removeProperty("font-size"); });
    await expect(table.getByRole("table")).toHaveCSS("font-size", "14px");
    // Validate actual composited badge colours, including translucent fills on total rows.
    for (const theme of ["light", "dark"]) {
      const contrastEvidence: Awaited<ReturnType<typeof contrastSamples>> = [];
      await page.context().addCookies([{ name: "nodebi-theme", value: theme, domain: new URL(page.url()).hostname, path: "/" }]);
      await page.reload();
      for (const [label, symbol] of [["Negative balance", "−"], ["Healthy balance", "+"], ["Review balance", "!"]]) {
        const badge = table.getByRole("cell").getByText(label, { exact: true }).first().locator("..");
        await badge.scrollIntoViewIfNeeded();
        await expect(badge.locator('[aria-hidden="true"]')).toHaveText(symbol);
        const samples = await contrastSamples(badge);
        contrastEvidence.push(...samples);
        expect(samples).toHaveLength(2);
        expect(samples.filter(sample => sample.ratio < 4.5)).toEqual([]);
      }
      await activateByKeyboard(page, table.getByRole("button", { name: "Last page", exact: true }));
      const missing = table.getByRole("cell").getByText("Missing measure", { exact: true }).first().locator("..");
      await missing.scrollIntoViewIfNeeded();
      await expect(missing.locator('[aria-hidden="true"]')).toHaveText("•");
      const missingSamples = await contrastSamples(missing);
      expect(missingSamples).toHaveLength(2);
      contrastEvidence.push(...missingSamples);
      expect(missingSamples.filter(sample => sample.ratio < 4.5)).toEqual([]);
      const totalCell = table.getByRole("row").filter({ has: page.getByRole("rowheader").filter({ hasText: "Grand total" }) }).getByRole("cell").filter({ hasText: "Healthy balance" });
      await totalCell.scrollIntoViewIfNeeded();
      await expect(totalCell).toContainText("4410");
      const totalSamples = await contrastSamples(totalCell);
      contrastEvidence.push(...totalSamples);
      expect(totalSamples.length).toBeGreaterThanOrEqual(3);
      expect(totalSamples.filter(sample => sample.ratio < 4.5)).toEqual([]);
      await testInfo.attach(`analytical-rule-contrast-${theme}`, { body: JSON.stringify(contrastEvidence, null, 2), contentType: "application/json" });
      await page.screenshot({ path: testInfo.outputPath(`analytical-rules-${theme}.png`), animations: "disabled" });
    }
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
