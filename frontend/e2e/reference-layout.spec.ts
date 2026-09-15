import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const enabled = process.env.NODEBI_REFERENCE_LAYOUT === "1";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
test.use({ actionTimeout: 20000 });

test("arrange retained reference detail dashboards using resize and drag controls", async ({ page, request }) => {
  test.skip(!enabled, "Opt-in retained reference layout authoring");
  test.setTimeout(300000);
  await page.setViewportSize({ width: 1600, height: 2200 });
  const oracle = JSON.parse(readFileSync(resolve("../.backups/opop-expected.json"), "utf8"));
  const plans = [
    { artifact: "overview", kpi: 5, tables: 2, layout: [[0, 0, 2, 5], [2, 0, 2, 5], [4, 0, 3, 5], [7, 0, 3, 5], [10, 0, 2, 5], [0, 5, 6, 10], [0, 15, 6, 12], [6, 5, 6, 10], [6, 15, 6, 12]] },
    { artifact: "class", kpi: 6, tables: 1, layout: [[0, 0, 12, 4], [0, 4, 2, 5], [2, 4, 3, 5], [5, 4, 2, 5], [7, 4, 2, 5], [9, 4, 3, 5], [0, 9, 4, 11], [4, 9, 8, 11], [0, 20, 12, 13]] },
    { artifact: "service", kpi: 5, tables: 2, layout: [[0, 0, 12, 5], [0, 5, 3, 5], [3, 5, 3, 5], [6, 5, 3, 5], [9, 5, 3, 5], [0, 10, 7, 13], [7, 10, 5, 13], [0, 23, 12, 12]] },
    { artifact: "cost", kpi: 5, tables: 2, layout: [[0, 0, 12, 4], [0, 4, 3, 6], [3, 4, 3, 6], [6, 4, 3, 6], [9, 4, 3, 6], [0, 10, 4, 12], [4, 10, 8, 12], [0, 22, 6, 13], [6, 22, 6, 13], [0, 35, 12, 12]] },
    { artifact: "cost-class", kpi: 5, tables: 2, layout: [[0, 0, 4, 6], [4, 0, 2, 6], [6, 0, 2, 6], [8, 0, 2, 6], [10, 0, 2, 6], [0, 6, 7, 12], [0, 18, 7, 13], [7, 18, 5, 13], [7, 6, 5, 12]] },
    { artifact: "cost-service", kpi: 6, tables: 2, layout: [[0, 0, 12, 5], [0, 5, 3, 6], [3, 5, 3, 6], [6, 5, 2, 6], [8, 5, 2, 6], [10, 5, 2, 6], [0, 11, 7, 12], [0, 23, 7, 13], [7, 23, 5, 13], [7, 11, 5, 12]] },
  ];
  for (const plan of plans) {
    const project = JSON.parse(readFileSync(resolve(`../.backups/reference-${plan.artifact}-project.json`), "utf8"));
    expect(project.completed ?? plan.artifact === "overview").toBe(true);
    const dashboardId = project.dashboardId ?? project.dashboards.items[0].id;
    const values: Record<string, string | number> = ["cost", "overview"].includes(plan.artifact) ? {} : { class_name: oracle.navigation.class_rows[0].name };
    if (plan.artifact.startsWith("cost")) values.cost_type = oracle.screens.cost[0].cost_meta.title;
    if (plan.artifact === "service" || plan.artifact === "cost-service") {
      const base = project.graph.nodes.find((node: { config: { name?: string } }) => node.config.name === "Итого");
      const preview = await (await request.post(`${api}/api/v1/workflows/${project.workflowId}/nodes/${base.id}/preview`, { data: { limit: 100 } })).json();
      values.service_id = preview.rows.find((row: Record<string, unknown>) => row["Класс"] === values.class_name).__source_row__;
    }
    await page.goto(`/projects/${project.projectId}/dashboard?dashboard=${dashboardId}&parameters=${encodeURIComponent(JSON.stringify(values))}`);
    await expect(page.locator("[data-widget-id]")).toHaveCount(plan.layout.length);
    const before = await (await request.get(`${api}/api/v1/dashboards/${dashboardId}`)).json();
    for (const [index, [x, y, width, height]] of plan.layout.entries()) {
      const storedWidget = before.widgets.find((item: { visualization_id: string }) => item.visualization_id === project.widgets[index].id);
      const tile = page.locator(`[data-widget-id="${storedWidget.id}"]`);
      await tile.evaluate(element => element.scrollIntoView({ block: "start" }));
      const step = ((await page.locator(".react-grid-layout").boundingBox())!.width - 12) / 12;
      for (let attempt = 0; attempt < 4; attempt++) {
        await tile.locator(".react-resizable-handle").hover();
        const bounds = (await tile.boundingBox())!, resize = (await tile.locator(".react-resizable-handle").boundingBox())!;
        if (Math.abs(bounds.height - (height * 42 - 12)) < 1 && Math.abs(bounds.width - (width * step - 12)) < 1) break;
        await page.mouse.move(resize.x + 5, resize.y + 5); await page.mouse.down();
        await page.mouse.move(resize.x + 5 + width * step - 12 - bounds.width, resize.y + 5 + height * 42 - 12 - bounds.height, { steps: 8 }); await page.mouse.up();
      }
      await expect.poll(async () => Math.round((await tile.boundingBox())!.height)).toBe(height * 42 - 12);
      const gridTop = await page.locator(".react-grid-layout").evaluate(element => element.getBoundingClientRect().top + window.scrollY);
      await page.evaluate(top => window.scrollTo(0, Math.max(0, top - 90)), gridTop + 12 + y * 42);
      const handle = (await tile.locator(".widget-handle").boundingBox())!, current = (await tile.boundingBox())!, updatedGrid = (await page.locator(".react-grid-layout").boundingBox())!;
      await page.mouse.move(handle.x + 20, handle.y + 10); await page.mouse.down();
      await page.mouse.move(handle.x + 20 + updatedGrid.x + 12 + x * step - current.x, handle.y + 10 + updatedGrid.y + 12 + y * 42 - current.y, { steps: 8 }); await page.mouse.up();
    }
    const save = page.getByRole("button", { name: "Save dashboard", exact: true });
    if (await save.isEnabled()) await save.click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const stored = await (await request.get(`${api}/api/v1/dashboards/${dashboardId}`)).json();
    expect(stored.configuration).toEqual(before.configuration);
    for (const [index, [x, y, width, height]] of plan.layout.entries()) {
      const oldWidget = before.widgets.find((item: { visualization_id: string }) => item.visualization_id === project.widgets[index].id);
      expect(stored.widgets.find((item: { id: string }) => item.id === oldWidget.id)).toMatchObject({ x, y, width, height, visualization_id: oldWidget.visualization_id, config: oldWidget.config });
    }
    await page.reload();
    await expect(page.locator('[data-testid="kpi-value"]')).toHaveCount(plan.kpi);
    await expect(page.getByRole("table")).toHaveCount(plan.tables);
    await expect(page.getByText(/Loading visualization/)).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    await page.screenshot({ path: resolve(`../.backups/reference-${plan.artifact}-layout.png`), fullPage: true });
  }
});
