import { test, expect } from "@playwright/test";
import { activateByKeyboard, tabTo } from "./keyboard-navigation";
const api = process.env.NODEBI_E2E_API ?? "http://localhost:8000";
type PieCanvas = HTMLCanvasElement & { activeLegend?: { x: number; y: number } };

for (const type of ["pie_chart", "donut_chart"]) for (const mode of ["zero", "categories"]) test(`${type} ${mode} preserves category meaning after legend filtering and reload`, async ({ page, request }, testInfo) => {
  await page.addInitScript(() => {
    const paint = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof paint>) {
      if (args[0] === "Active") {
        const point = new DOMPoint(args[1], args[2]).matrixTransform(this.getTransform());
        (this.canvas as PieCanvas).activeLegend = { x: point.x / devicePixelRatio, y: point.y / devicePixelRatio };
      }
      return paint.apply(this, args);
    };
  });
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Zero share acceptance" } })).json();
  try {
    const csv = mode === "zero" ? "category,value\nActive,10\nZero,0\nMissing,\n" : "category,value\n" + Array.from({ length: 8 }, (_, i) => `Category ${i + 1},10\n`).join("");
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "shares.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    expect((await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).ok()).toBeTruthy();
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Shares" } })).json();
    const sourceId = crypto.randomUUID(), chartId = crypto.randomUUID();
    const saved = await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: { name: "Shares", expected_revision: 1,
      nodes: [{ id: sourceId, type: "dataset_source", version: 1, position: { x: 0, y: 0 }, config: { source_id: source.id, resource_id: "table" } },
        { id: chartId, type, version: 1, position: { x: 300, y: 0 }, config: { title: "Shares", value_column_id: profile.fields[1].field_id, category_column_id: profile.fields[0].field_id } }],
      edges: [{ id: crypto.randomUUID(), source_node_id: sourceId, source_port: "dataset", target_node_id: chartId, target_port: "input" }],
    } });
    expect(saved.ok(), await saved.text()).toBeTruthy();
    const graph = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    const dashboard = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Shares" } })).json();
    expect((await request.put(`${api}/api/v1/dashboards/${dashboard.id}`, { data: { name: "Shares", expected_revision: 1,
      widgets: [{ id: crypto.randomUUID(), visualization_id: chartId, x: 0, y: 0, width: 6, height: 12 }],
    } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/dashboard`);
    for (const theme of ["light", "dark"]) {
      await page.getByLabel("Theme", { exact: true }).selectOption(theme);
      await page.reload();
      const chart = page.getByRole("img", { name: "Shares", exact: true }), canvas = chart.locator("canvas");
      await expect(canvas).toBeVisible();
      if (mode === "categories") {
        let previous = "", stable = 0;
        await expect.poll(async () => {
          const pixels = await canvas.evaluate(el => (el as HTMLCanvasElement).toDataURL());
          stable = pixels === previous ? stable + 1 : 0; previous = pixels;
          return stable;
        }, { intervals: [100, 200, 300] }).toBeGreaterThanOrEqual(3);
        await page.screenshot({ path: testInfo.outputPath(`${type}-${theme}-categories.png`) });
        await page.getByRole("button", { name: "Data table", exact: true }).click();
        await expect(page.getByRole("cell", { name: "10", exact: true })).toHaveCount(8);
        for (let i = 1; i <= 8; i++) await expect(page.getByRole("cell", { name: `Category ${i}`, exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Chart", exact: true }).click();
        continue;
      }
      const sliceAlpha = () => canvas.evaluate(el => {
        const canvas = el as HTMLCanvasElement;
        const x = canvas.width / 2 + Math.min(canvas.width, canvas.height) * 0.26, y = canvas.height / 2;
        return canvas.getContext("2d")!.getImageData(Math.floor(x), Math.floor(y), 1, 1).data[3];
      });
      await expect.poll(sliceAlpha).toBe(255);
      await expect.poll(() => canvas.evaluate(el => !!(el as PieCanvas).activeLegend)).toBe(true);
      const legend = (await canvas.evaluate(el => (el as PieCanvas).activeLegend))!, box = (await canvas.boundingBox())!;
      await page.mouse.click(box.x + legend.x + 5, box.y + legend.y);
      await page.mouse.move(0, 0);
      await expect.poll(sliceAlpha).toBe(0);
      await expect(page.getByText("Zero and missing values do not form slices.", { exact: false })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`${type}-${theme}-zero.png`) });
      const controls = chart.locator("..");
      await activateByKeyboard(page, controls.getByText("Series visibility", { exact: true }));
      const toggle = controls.getByRole("button", { name: "Active", exact: true });
      await expect(toggle).toHaveAttribute("aria-pressed", "false");
      await tabTo(page, toggle);
      await page.keyboard.press("Space");
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      await page.keyboard.press("Escape");
      await page.mouse.move(0, 0);
      await expect.poll(sliceAlpha).toBe(255);
      await page.getByRole("button", { name: "Data table", exact: true }).click();
      await expect(page.getByRole("cell", { name: "0", exact: true })).toBeVisible();
      await expect(page.getByRole("cell", { name: "—", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Chart", exact: true }).click();
    }
    expect(await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json()).toEqual(graph);
  } finally {
    await page.goto("about:blank");
    expect((await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
  }
});
