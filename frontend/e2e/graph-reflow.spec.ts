import { expect, request as createRequest, test } from "@playwright/test";
import { showAllOperations } from "./operation-catalog";

const api = process.env.NODEBI_E2E_API ?? "http://localhost:8000";

for (const version of [1, 3]) for (const width of [320, 420, 1280, 1600]) {
  test(`graph v${version} at ${width}px keeps authoring controls reachable and saves unchanged identities`, async ({ page, request }, info) => {
    const response = await request.post(`${api}/api/v1/projects`, { data: { name: "Graph reflow acceptance" } });
    expect(response.ok()).toBeTruthy();
    const project = await response.json();
    try {
      const created = await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Reflow" } });
      expect(created.ok()).toBeTruthy();
      const workflow = await created.json();
      expect((await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: { name: workflow.name, expected_revision: workflow.revision, format_version: version, nodes: [], edges: [] } })).ok()).toBeTruthy();
      await page.setViewportSize({ width, height: 900 });
      if (width === 420) await page.context().addCookies([{ name: "nodebi-theme", value: "dark", domain: new URL(process.env.NODEBI_E2E_URL ?? "http://localhost:3000").hostname, path: "/" }]);
      await page.goto(`/projects/${project.id}/workflow?workflow=${workflow.id}${version === 3 ? "&mode=fields" : ""}`);
      if (width === 1280) await page.addStyleTag({ content: "html { font-size: 32px; }" });
      if (version === 3) await expect(page.getByText("All operations", { exact: true })).toBeVisible();
      await showAllOperations(page);
      const search = page.getByRole("textbox", { name: "Search nodes", exact: true });
      await expect(search).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await search.fill("Select Columns");
      await search.focus();
      await page.keyboard.press("Tab");
      await expect(page.getByTitle("Add Select Columns", { exact: true })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect.poll(async () => (await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json()).nodes.length).toBe(1);
      const label = page.getByRole("textbox", { name: "Node label", exact: true });
      await label.fill("Prepared selection");
      await page.setViewportSize({ width: 1600, height: 900 });
      await expect(label).toHaveValue("Prepared selection");
      await page.setViewportSize({ width, height: 900 });
      await label.scrollIntoViewIfNeeded();
      const box = (await label.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      const canvas = (await page.getByRole("region", { name: "Workflow canvas", exact: true }).boundingBox())!;
      const drawing = (await page.locator(".react-flow").boundingBox())!;
      expect(drawing.y).toBeGreaterThanOrEqual(canvas.y);
      expect(drawing.y + drawing.height).toBeLessThanOrEqual(canvas.y + canvas.height + 1);
      await expect.poll(async () => (await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json()).nodes[0].ui.label).toBe("Prepared selection");
      const saved = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
      await page.screenshot({ path: info.outputPath("graph-reflow.png"), fullPage: true });
      await page.reload();
      if (width === 1280) await page.addStyleTag({ content: "html { font-size: 32px; }" });
      await expect(page.locator(".react-flow__node")).toHaveCount(1);
      expect(await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json()).toEqual(saved);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } catch (error) {
      await page.screenshot({ path: info.outputPath("failure-before-cleanup.png"), fullPage: true });
      console.log(await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
        overflowing: [...document.querySelectorAll("body *")].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && !el.closest(".react-flow")).slice(0, 15).map(el => ({ tag: el.tagName, classes: el.className, right: el.getBoundingClientRect().right })) })));
      throw error;
    } finally {
      await page.goto("about:blank");
      const cleanup = await createRequest.newContext();
      try { expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); }
      finally { await cleanup.dispose(); }
    }
  });
}
