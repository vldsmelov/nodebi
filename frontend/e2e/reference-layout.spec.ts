import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const enabled = process.env.NODEBI_REFERENCE_LAYOUT === "1";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("arrange retained reference detail dashboards using resize and drag controls", async ({ page, request }) => {
  test.skip(!enabled, "Opt-in retained reference layout authoring");
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1600, height: 2200 });
  const oracle = JSON.parse(readFileSync(resolve("../.backups/opop-expected.json"), "utf8"));
  const plans = [
    { artifact: "class", layout: [[0, 0, 12, 4], [0, 4, 2, 5], [2, 4, 3, 5], [5, 4, 2, 5], [7, 4, 2, 5], [9, 4, 3, 5], [0, 9, 4, 11], [4, 9, 8, 11], [0, 20, 12, 13]] },
    { artifact: "service", layout: [[0, 0, 12, 5], [0, 5, 3, 5], [3, 5, 3, 5], [6, 5, 3, 5], [9, 5, 3, 5], [0, 10, 7, 13], [7, 10, 5, 13], [0, 23, 12, 12]] },
  ];
  for (const plan of plans) {
    const project = JSON.parse(readFileSync(resolve(`../.backups/reference-${plan.artifact}-project.json`), "utf8"));
    expect(project.completed).toBe(true);
    const values: Record<string, string | number> = { class_name: oracle.navigation.class_rows[0].name };
    if (plan.artifact === "service") {
      const base = project.graph.nodes.find((node: { config: { name?: string } }) => node.config.name === "Итого");
      const preview = await (await request.post(`${api}/api/v1/workflows/${project.workflowId}/nodes/${base.id}/preview`, { data: { limit: 100 } })).json();
      values.service_id = preview.rows.find((row: Record<string, unknown>) => row["Класс"] === values.class_name).__source_row__;
    }
    await page.goto(`/projects/${project.projectId}/dashboard?dashboard=${project.dashboardId}&parameters=${encodeURIComponent(JSON.stringify(values))}`);
    await expect(page.locator("[data-widget-id]")).toHaveCount(plan.layout.length);
    const before = await (await request.get(`${api}/api/v1/dashboards/${project.dashboardId}`)).json();
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
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const stored = await (await request.get(`${api}/api/v1/dashboards/${project.dashboardId}`)).json();
    expect(stored.configuration).toEqual(before.configuration);
    for (const [index, [x, y, width, height]] of plan.layout.entries()) {
      const oldWidget = before.widgets.find((item: { visualization_id: string }) => item.visualization_id === project.widgets[index].id);
      expect(stored.widgets.find((item: { id: string }) => item.id === oldWidget.id)).toMatchObject({ x, y, width, height, visualization_id: oldWidget.visualization_id, config: oldWidget.config });
    }
    await page.reload();
    await expect(page.getByText("Loading visualization…", { exact: true })).toHaveCount(0);
    await expect(page.locator('[data-testid="kpi-value"]')).toHaveCount(plan.artifact === "class" ? 6 : 5);
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    await page.screenshot({ path: resolve(`../.backups/reference-${plan.artifact}-layout.png`), fullPage: true });
  }
});
