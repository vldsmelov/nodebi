import { test, expect } from "@playwright/test";
import { expectTooltipContrast } from "./tooltip-contrast";

const api = process.env.NODEBI_E2E_API ?? "http://localhost:8000";
type MarkCanvas = HTMLCanvasElement & { marks?: { x: number; y: number }[] };

for (const type of ["line_chart", "area_chart", "scatter_chart", "pie_chart", "donut_chart"]) {
  test(`${type} actual hover text has readable contrast in both themes`, async ({ page, request }, testInfo) => {
    // Observe real drawing coordinates; do not dispatch synthetic ECharts tooltip actions.
    await page.addInitScript(() => {
      const arc = CanvasRenderingContext2D.prototype.arc;
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function (x, y, width, height) {
        if (width >= this.canvas.width && height >= this.canvas.height) (this.canvas as MarkCanvas).marks = [];
        clear.call(this, x, y, width, height);
      };
      CanvasRenderingContext2D.prototype.arc = function (...args: Parameters<typeof arc>) {
        if (this.canvas.closest('[role="img"]') && args[2] <= 12) {
          const point = new DOMPoint(args[0], args[1]).matrixTransform(this.getTransform());
          ((this.canvas as MarkCanvas).marks ??= []).push({ x: point.x / devicePixelRatio, y: point.y / devicePixelRatio });
        }
        return arc.apply(this, args);
      };
    });
    const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Tooltip contrast acceptance" } })).json();
    try {
      const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "values.csv", mimeType: "text/csv", buffer: Buffer.from("category,value\n1,20\n2,20\n3,20\n") } } })).json();
      const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
      expect((await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).ok()).toBeTruthy();
      const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Tooltip" } })).json();
      const sourceId = crypto.randomUUID(), chartId = crypto.randomUUID();
      expect((await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: { name: "Tooltip", expected_revision: 1,
        nodes: [{ id: sourceId, type: "dataset_source", version: 1, position: { x: 0, y: 0 }, config: { source_id: source.id, resource_id: "table" } },
          { id: chartId, type, version: 1, position: { x: 300, y: 0 }, config: { title: type, category_column_id: profile.fields[0].field_id, value_column_id: profile.fields[1].field_id } }],
        edges: [{ id: crypto.randomUUID(), source_node_id: sourceId, source_port: "dataset", target_node_id: chartId, target_port: "input" }],
      } })).ok()).toBeTruthy();
      const graph = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
      const board = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Tooltip" } })).json();
      expect((await request.put(`${api}/api/v1/dashboards/${board.id}`, { data: { name: "Tooltip", expected_revision: 1,
        widgets: [{ id: crypto.randomUUID(), visualization_id: chartId, x: 0, y: 0, width: 6, height: 12 }],
      } })).ok()).toBeTruthy();
      await page.goto(`/projects/${project.id}/dashboard`);
      for (const theme of ["light", "dark"]) {
        await page.getByLabel("Theme", { exact: true }).selectOption(theme);
        await page.reload();
        const canvas = page.getByRole("img", { name: type, exact: true }).locator("canvas");
        await expect(canvas).toBeVisible();
        let previous = "", stable = 0;
        await expect.poll(async () => {
          const pixels = await canvas.evaluate(el => (el as HTMLCanvasElement).toDataURL());
          stable = previous === pixels ? stable + 1 : 0; previous = pixels;
          return stable;
        }, { intervals: [100, 200, 300] }).toBeGreaterThanOrEqual(3);
        const box = (await canvas.boundingBox())!;
        const points = type === "pie_chart" || type === "donut_chart"
          ? [{ x: box.width / 2 + Math.min(box.width, box.height) * 0.26, y: box.height / 2 }]
          : await canvas.evaluate(el => (el as MarkCanvas).marks ?? []);
        expect(points.length).toBeGreaterThan(0);
        const tooltip = page.getByRole("tooltip");
        for (const point of points) {
          await page.mouse.move(box.x + point.x, box.y + point.y);
          if (await tooltip.isVisible()) break;
        }
        await expect(tooltip).toContainText("20");
        await expectTooltipContrast(tooltip);
        await page.screenshot({ path: testInfo.outputPath(`${type}-${theme}-hover.png`) });
        await page.mouse.move(0, 0);
      }
      expect(await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json()).toEqual(graph);
    } finally {
      await page.goto("about:blank");
      expect((await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    }
  });
}
