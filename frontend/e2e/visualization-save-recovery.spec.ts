import { expect, test, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_E2E_API ?? "http://localhost:8010";

for (const operation of ["create", "copy"] as const) {
  test(`lost ${operation} response recovers across reload without a duplicate`, async ({ page, request }) => {
    const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Save recovery acceptance" } })).json();
    page.on("dialog", dialog => dialog.accept());
    try {
      const flow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Constant" } })).json();
      const node = crypto.randomUUID(), publication = crypto.randomUUID();
      const graph = { name: flow.name, format_version: 3, expected_revision: 1, nodes: [{ id: node, type: "scalar_constant", version: 1, position: { x: 0, y: 0 }, config: { value: 42 } }], edges: [], result_catalog: { outputs: [{ id: publication, name: "Total", node_id: node, port: "value", kind: "scalar" }] } };
      expect((await request.put(`${api}/api/v1/workflows/${flow.id}`, { data: graph })).ok()).toBeTruthy();
      let original: { id: string; revision: number } | undefined;
      const body = { workflow_id: flow.id, publication_id: publication, expected_workflow_revision: 2, name: "Original", type: "kpi", config: {} };
      if (operation === "copy") original = await (await request.post(`${api}/api/v1/projects/${project.id}/visualizations`, { data: body })).json();
      const path = original ? `/api/v1/visualizations/${original.id}/copy` : `/api/v1/projects/${project.id}/visualizations`;
      const attempts: unknown[] = [];
      let committed: { id: string } | undefined;
      await page.route(`${api}${path}`, async route => {
        if (route.request().method() !== "POST") { await route.continue(); return; }
        attempts.push(route.request().postDataJSON());
        if (attempts.length === 1) {
          const response = await route.fetch();
          expect(response.status()).toBe(201);
          committed = await response.json();
          await route.abort("connectionreset");
        } else await route.continue();
      });
      await page.goto(`/projects/${project.id}/visualizations`);
      const open = () => operation === "create"
        ? page.getByRole("button", { name: "Create visualization", exact: true }).click()
        : page.locator("section").filter({ has: page.getByRole("heading", { name: /Original/ }) }).getByRole("button", { name: "Independent copy", exact: true }).click();
      await open();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Visualization name", { exact: true }).fill("Recovered result");
      await dialog.getByRole("button", { name: "Save visualization", exact: true }).click();
      await expect(dialog.getByRole("alert")).toBeVisible();
      await expect(dialog.getByLabel("Visualization name", { exact: true })).toBeDisabled();
      expect(committed?.id).toBeTruthy();
      // Metadata and the copied source may change after the successful commit.
      if (original) expect((await request.put(`${api}/api/v1/visualizations/${original.id}`, { data: { ...body, expected_revision: original.revision, name: "Original updated" } })).ok()).toBeTruthy();
      expect((await request.put(`${api}/api/v1/workflows/${flow.id}`, { data: { ...graph, expected_revision: 2, name: "Renamed calculation" } })).ok()).toBeTruthy();
      await page.reload();
      await open();
      await dialog.getByRole("button", { name: "Restore local draft", exact: true }).click();
      await expect(dialog.getByLabel("Visualization name", { exact: true })).toBeDisabled();
      await dialog.getByRole("button", { name: "Save visualization", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      expect(attempts).toHaveLength(2); expect(attempts[0]).toEqual(attempts[1]);
      const items = (await (await request.get(`${api}/api/v1/projects/${project.id}/visualizations`)).json()).items;
      expect(items).toHaveLength(operation === "copy" ? 2 : 1);
      expect(items.filter((item: { id: string }) => item.id === committed?.id)).toHaveLength(1);
      expect(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith("nodebi:visualization-draft:")))).toEqual([]);
    } finally {
      const cleanup = await createRequest.newContext();
      expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
      await cleanup.dispose();
    }
  });
}
