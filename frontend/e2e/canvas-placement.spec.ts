import { expect, request as createRequest, test } from "@playwright/test";
const api = process.env.NODEBI_E2E_API ?? "http://localhost:8000";

for (const version of [1, 3]) {
  test(`graph v${version} button and keyboard movement preserves calculation and undo`, async ({ page, request }) => {
    const projectResponse = await request.post(`${api}/api/v1/projects`, { data: { name: "Canvas placement acceptance" } });
    expect(projectResponse.ok()).toBeTruthy();
    const project = await projectResponse.json();
    try {
      const created = await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Positions" } });
      expect(created.ok()).toBeTruthy();
      const workflow = await created.json(), id = crypto.randomUUID(), publicationId = crypto.randomUUID();
      const configured = await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: {
        name: workflow.name, expected_revision: workflow.revision, format_version: version,
        nodes: [{ id, type: "select_columns", version: 1, position: { x: 100, y: 100 }, config: {}, ui: { label: "Prepared table" } }], edges: [],
        ...(version === 3 ? { result_catalog: { outputs: [{ id: publicationId, name: "Prepared result", node_id: id, port: "dataset", kind: "dataset", context_ids: [] }], contexts: [] } } : {}),
      } });
      expect(configured.ok()).toBeTruthy();
      const before = await configured.json();
      await page.setViewportSize({ width: 420, height: 900 });
      await page.goto(`/projects/${project.id}/workflow?workflow=${workflow.id}${version === 3 ? "&mode=fields" : ""}`);
      await page.getByText("Move without dragging", { exact: true }).click();
      const choice = page.getByRole("combobox", { name: "Layout item", exact: true });
      await choice.selectOption(id);
      await choice.focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Move item left", exact: true })).toBeFocused();
      await page.keyboard.press("Enter");
      const saved = async () => (await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json());
      await expect.poll(async () => (await saved()).nodes[0].position).toEqual({ x: 80, y: 100 });
      await page.getByRole("button", { name: version === 1 ? "Undo graph change" : "Undo", exact: true }).click();
      await expect.poll(async () => (await saved()).nodes[0].position).toEqual({ x: 100, y: 100 });
      await page.getByRole("button", { name: "Move item down", exact: true }).click();
      await expect.poll(async () => (await saved()).nodes[0].position).toEqual({ x: 100, y: 120 });
      const after = await saved();
      expect(after.nodes).toEqual([{ ...before.nodes[0], position: { x: 100, y: 120 } }]);
      expect(after.edges).toEqual(before.edges);
      await page.reload();
      await page.getByText("Move without dragging", { exact: true }).click();
      await choice.selectOption(id);
      await expect(page.getByRole("status").filter({ hasText: "Position: 100, 120" })).toBeVisible();
      expect((await saved()).nodes).toEqual(after.nodes);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath("button-placement.png"), fullPage: true });
      if (version === 3) {
        const original = (await saved()).presentation.results[0].position;
        await choice.selectOption(`publication:${publicationId}`);
        await page.getByRole("button", { name: "Move item right", exact: true }).click();
        await expect.poll(async () => (await saved()).presentation.results[0].position).toEqual({ x: original.x + 20, y: original.y });
        const moved = await saved();
        expect(moved.nodes).toEqual(after.nodes);
        expect(moved.result_catalog).toEqual(after.result_catalog);
      }
    } finally {
      await page.goto("about:blank");
      const cleanup = await createRequest.newContext();
      try { expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); }
      finally { await cleanup.dispose(); }
    }
  });
}
