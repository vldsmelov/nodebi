import { test, expect, request as createRequest } from "@playwright/test";
import { activateByKeyboard } from "./keyboard-navigation";
import { expectTooltipContrast } from "./tooltip-contrast";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";
type AxisCanvas = HTMLCanvasElement & { numericLabels?: { x: number; top: number; bottom: number; text: string }[] };

for (const zero of [false, true]) test(`Pareto ${zero ? "zero population" : "ranked pages"} persists graph roles and chart reference`, async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const fill = CanvasRenderingContext2D.prototype.fillText, clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, width, height) {
      if (width >= this.canvas.width && height >= this.canvas.height) (this.canvas as AxisCanvas).numericLabels = [];
      clear.call(this, x, y, width, height);
    };
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof fill>) {
      if (this.canvas.closest('[role="img"]') && /^\d+(\.\d+)?$/.test(args[0])) {
        const metrics = this.measureText(args[0]), matrix = this.getTransform();
        const top = new DOMPoint(args[1], args[2] - metrics.actualBoundingBoxAscent).matrixTransform(matrix);
        const bottom = new DOMPoint(args[1], args[2] + metrics.actualBoundingBoxDescent).matrixTransform(matrix);
        ((this.canvas as AxisCanvas).numericLabels ??= []).push({ x: top.x / devicePixelRatio, top: top.y / devicePixelRatio, bottom: bottom.y / devicePixelRatio, text: args[0] });
      }
      return fill.apply(this, args);
    };
  });
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Pareto acceptance" } })).json();
  try {
    const count = zero ? 3 : 201;
    const csv = `key,value\n${Array.from({ length: count }, (_, i) => `K${String(i).padStart(3, "0")},${zero ? 0 : 1}\n`).reverse().join("")}`;
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "contributions.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Pareto contributions", dimensions: [profile.fields[0].field_id], measures: [{ name: "Amount", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    const upstream = graph.nodes.find((n: { type: string }) => n.type === "dataset_source");
    const node = { id: crypto.randomUUID(), type: "pareto", version: 1, position: { x: 400, y: 300 }, config: {} };
    graph.nodes.push(node);
    graph.edges.push({ id: crypto.randomUUID(), source_node_id: upstream.id, source_port: "dataset", target_node_id: node.id, target_port: "input" });
    graph.result_catalog.outputs[0].node_id = node.id;
    expect((await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/workflow?workflow=${ids.workflow_id}&node=${node.id}`);
    await page.getByLabel("Pareto category", { exact: true }).selectOption(profile.fields[0].field_id);
    await page.getByLabel("Pareto contribution", { exact: true }).selectOption(profile.fields[1].field_id);
    await expect.poll(async () => (await (await request.get(url)).json()).nodes.find((n: { id: string }) => n.id === node.id).config).toEqual({ category_column_id: profile.fields[0].field_id, value_column_id: profile.fields[1].field_id });
    await page.reload();
    await expect(page.getByLabel("Pareto contribution", { exact: true })).toHaveValue(profile.fields[1].field_id);
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.getByRole("cell", { name: "K000", exact: true })).toBeVisible();
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByRole("combobox", { name: "Visualization type", exact: true }).selectOption("pareto_chart");
    await page.getByRole("tab", { name: "Appearance", exact: true }).click();
    await page.getByLabel("Cumulative share reference (%)", { exact: true }).fill("90");
    await page.getByRole("button", { name: "Apply visualization", exact: true }).click();
    const chart = page.getByRole("img", { name: "Pareto contributions", exact: true });
    await expect(chart.locator("canvas").first()).toBeVisible();
    if (!zero) {
      for (const theme of ["light", "dark"]) {
        await page.getByLabel("Theme", { exact: true }).selectOption(theme);
        const canvas = chart.locator("canvas").first();
        await expect(canvas).toBeVisible();
        const tooltip = page.getByRole("tooltip");
        await expect.poll(async () => {
          const box = (await canvas.boundingBox())!;
          await page.mouse.move(0, 0);
          await page.mouse.move(box.x + 90 + (box.width - 180) / 200, box.y + 22 + (box.height - 67) * 0.6);
          return tooltip.isVisible();
        }).toBe(true);
        await expect(tooltip).toContainText("K000");
        await expect(tooltip).toContainText("Contribution");
        await expectTooltipContrast(tooltip);
        await page.screenshot({ path: testInfo.outputPath(`pareto-${theme}-hover.png`) });
        await page.mouse.move(0, 0);
      }
      await page.getByLabel("Theme", { exact: true }).selectOption("light");
    }
    const assertFits = async () => {
      await expect.poll(async () => {
        const drawing = await chart.boundingBox(), widget = await page.locator(".react-grid-item").first().boundingBox();
        const navigation = await page.getByRole("button", { name: "Next page", exact: true }).boundingBox();
        return !!drawing && !!widget && !!navigation && drawing.height > 70 && drawing.y + drawing.height <= navigation.y + 1 && navigation.y + navigation.height <= widget.y + widget.height;
      }).toBe(true);
      await expect.poll(() => chart.locator("canvas").first().evaluate((element, zero) => {
        const canvas = element as AxisCanvas, middle = canvas.width / devicePixelRatio / 2;
        const labels = canvas.numericLabels ?? [];
        return [labels.filter(label => label.x < middle), labels.filter(label => label.x >= middle)].every((axis, index) => {
          axis.sort((a, b) => a.top - b.top);
          // A zero-total contribution scale correctly has one exact zero tick.
          if (zero && index === 0) return axis.length === 1 && axis[0].text === "0";
          return axis.length >= 2 && axis.every((label, index) => index === 0 || label.top >= axis[index - 1].bottom + 2);
        });
      }, zero)).toBe(true);
    };
    await assertFits();
    if (!zero) {
      const canvas = chart.locator("canvas").first();
      const labelCount = () => canvas.evaluate(element => (element as AxisCanvas).numericLabels?.length ?? 0);
      const shortCount = await labelCount();
      const widget = page.locator(".react-grid-item").first();
      // Resize the actual container without authoring/saving a different dashboard layout.
      const previousHeight = await widget.evaluate(element => {
        const previous = (element as HTMLElement).style.height;
        (element as HTMLElement).style.height = `${element.getBoundingClientRect().height + 180}px`;
        return previous;
      });
      await expect.poll(labelCount).toBeGreaterThan(shortCount);
      await assertFits();
      await widget.evaluate((element, height) => { (element as HTMLElement).style.height = height; }, previousHeight);
      await expect.poll(labelCount).toBe(shortCount);
      await assertFits();
    }
    await page.screenshot({ path: testInfo.outputPath("pareto-light.png"), animations: "disabled" });
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    if (zero) await expect(page.getByText("The total is zero: cumulative share and its reference line are undefined.", { exact: true })).toBeVisible();
    else await expect(page.getByText("Only the current page is drawn; scales and counts use the complete selected dataset.", { exact: true })).toBeVisible();
    await activateByKeyboard(page, page.getByRole("button", { name: "Data table", exact: true }));
    await expect(page.getByRole("rowheader", { name: "K000", exact: true })).toBeVisible();
    if (!zero) {
      await expect(page.getByRole("cell", { name: "1/201", exact: true }).first()).toBeVisible();
      await activateByKeyboard(page, page.getByRole("button", { name: "Next page", exact: true }));
      await expect(page.getByRole("rowheader", { name: "K100", exact: true })).toBeVisible();
      await activateByKeyboard(page, page.getByRole("button", { name: "Next page", exact: true }));
      await expect(page.getByRole("rowheader", { name: "K200", exact: true })).toBeVisible();
    }
    const result = await (await request.post(`${api}/api/v1/visualizations/${ids.visualization_id}/result`, { data: { offset: count - 1, limit: 1 } })).json();
    expect(result.spec.threshold_percent).toBe(90);
    expect(result.combo.observations[0].positions).toEqual(zero ? [0, null] : [1, 1]);
    await activateByKeyboard(page, page.getByRole("button", { name: "Chart", exact: true }));
    await page.context().addCookies([{ name: "nodebi-theme", value: "dark", domain: new URL(page.url()).hostname, path: "/" }]);
    await page.setViewportSize({ width: 700, height: 1000 });
    await page.reload();
    await expect(chart.locator("canvas").first()).toBeVisible();
    await assertFits();
    await page.screenshot({ path: testInfo.outputPath("pareto-narrow-dark.png"), animations: "disabled" });
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
