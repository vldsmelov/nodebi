import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { observeChartLabels, expectOpaqueChartLabels } from "./chart-label-ink";
import { activateByKeyboard, tabTo } from "./keyboard-navigation";
import { contrastSamples } from "./computed-contrast";

const api = process.env.NODEBI_E2E_API ?? "http://localhost:8000";
type PaintedCanvas = HTMLCanvasElement & { paintedText?: string[]; legendText?: { text: string; x: number; y: number }[] };

for (const type of ["bar_chart", "line_chart"]) test(`${type} eight series render in both themes and survive reload`, async ({ page, request }, testInfo) => {
  await observeChartLabels(page, ["80.00"]);
  await page.addInitScript(() => {
    const fill = CanvasRenderingContext2D.prototype.fillText;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, width, height) {
      if (width >= this.canvas.width && height >= this.canvas.height) (this.canvas as PaintedCanvas).paintedText = [];
      clear.call(this, x, y, width, height);
    };
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof fill>) {
      ((this.canvas as PaintedCanvas).paintedText ??= []).push(args[0]);
      if (/^Measure [1-8]$/.test(args[0])) {
        const point = new DOMPoint(args[1], args[2]).matrixTransform(this.getTransform());
        const canvas = this.canvas as PaintedCanvas;
        canvas.legendText = [...(canvas.legendText ?? []).filter(item => item.text !== args[0]), { text: args[0], x: point.x / devicePixelRatio, y: point.y / devicePixelRatio }];
      }
      return fill.apply(this, args);
    };
  });
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Basic series acceptance" } })).json();
  try {
    const csv = "period,m1,m2,m3,m4,m5,m6,m7,m8\nJan,10,20,30,40,50,60,70,80\nFeb,15,25,35,45,55,65,75,85\nMar,5,15,25,35,45,55,65,75\n";
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "series.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    expect((await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: randomUUID() } })).ok()).toBeTruthy();
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Series" } })).json();
    const sourceId = randomUUID(), chartId = randomUUID();
    const config = { title: type, show_labels: true, primary_series_name: "Measure 1", value_column_id: profile.fields[1].field_id, category_column_id: profile.fields[0].field_id,
      additional_series: profile.fields.slice(2).map((field: { field_id: string }, index: number) => ({ column_id: field.field_id, name: `Measure ${index + 2}` })) };
    const saved = await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: { name: "Series", expected_revision: 1,
      nodes: [{ id: sourceId, type: "dataset_source", version: 1, position: { x: 0, y: 0 }, config: { source_id: source.id, resource_id: "table" } },
        { id: chartId, type, version: 1, position: { x: 300, y: 0 }, config }],
      edges: [{ id: randomUUID(), source_node_id: sourceId, source_port: "dataset", target_node_id: chartId, target_port: "input" }],
    } });
    expect(saved.ok(), await saved.text()).toBeTruthy();
    const dashboard = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Eight measures" } })).json();
    expect((await request.put(`${api}/api/v1/dashboards/${dashboard.id}`, { data: { name: dashboard.name, expected_revision: 1,
      widgets: [{ id: randomUUID(), visualization_id: chartId, x: 0, y: 0, width: 12, height: 16 }],
    } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/dashboard`);
    for (const theme of ["light", "dark"]) {
      await page.getByLabel("Theme", { exact: true }).selectOption(theme);
      await page.reload();
      const chart = page.getByRole("img", { name: type, exact: true }), canvas = chart.locator("canvas");
      await expect(canvas).toBeVisible();
      await expectOpaqueChartLabels(page, ["80.00"], theme);
      await expect.poll(() => canvas.evaluate(el => (el as PaintedCanvas).legendText?.length ?? 0)).toBe(8);
      const settle = async () => {
        let previous = "", same = 0;
        await expect.poll(async () => {
          const pixels = await canvas.evaluate(el => (el as HTMLCanvasElement).toDataURL());
          same = pixels === previous ? same + 1 : 0;
          previous = pixels;
          return same;
        }, { intervals: [100, 200, 300] }).toBeGreaterThanOrEqual(3);
      };
      await settle();
      await chart.screenshot({ path: testInfo.outputPath(`${type}-${theme}.png`) });
      const legend = (await canvas.evaluate(el => (el as PaintedCanvas).legendText!)).find(item => item.text === "Measure 8")!;
      const box = (await canvas.boundingBox())!;
      const controls = chart.locator("..");
      const disclosure = controls.getByText("Series visibility", { exact: true });
      await activateByKeyboard(page, disclosure);
      const toggle = controls.getByRole("button", { name: "Measure 8", exact: true });
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      await tabTo(page, toggle);
      const menu = controls.getByRole("group", { name: `Series visibility · ${type}`, exact: true });
      const samples = await contrastSamples(menu);
      expect(samples.length).toBeGreaterThan(0);
      for (const sample of samples) expect(sample.ratio).toBeGreaterThanOrEqual(sample.minimum);
      const target = (await toggle.boundingBox())!;
      expect(target.width).toBeGreaterThanOrEqual(24);
      expect(target.height).toBeGreaterThanOrEqual(24);
      await menu.screenshot({ path: testInfo.outputPath(`${type}-${theme}-legend-controls.png`) });
      await page.keyboard.press("Space");
      await expect(toggle).toHaveAttribute("aria-pressed", "false");
      await page.keyboard.press("Escape");
      await expect(disclosure).toBeFocused();
      await page.mouse.move(0, 0);
      await expect.poll(() => canvas.evaluate(el => (el as PaintedCanvas).paintedText?.includes("80.00") ?? false)).toBe(false);
      await settle();
      await chart.screenshot({ path: testInfo.outputPath(`${type}-${theme}-hidden.png`) });
      await page.mouse.click(box.x + legend.x + 5, box.y + legend.y);
      await expect.poll(() => canvas.evaluate(el => (el as PaintedCanvas).paintedText?.includes("80.00") ?? false)).toBe(true);
      await activateByKeyboard(page, disclosure);
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Data table", exact: true }).click();
      const row = page.getByRole("cell", { name: "Jan", exact: true }).locator("..");
      expect((await row.getByRole("cell").allTextContents()).slice(0, 9)).toEqual(["Jan", "10", "20", "30", "40", "50", "60", "70", "80"]);
      await page.getByRole("button", { name: "Chart", exact: true }).click();
    }
    const restored = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    expect(restored.nodes.find((node: { id: string }) => node.id === chartId).config.additional_series).toEqual(config.additional_series);
  } finally {
    expect((await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
  }
});
