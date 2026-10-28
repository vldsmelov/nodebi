import { expect, request as createRequest, test } from "@playwright/test";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

for (const theme of ["light", "dark"]) {
  test(`graph search keeps visible sequential keyboard focus in ${theme}`, async ({ page, request }) => {
    const created = await request.post(`${api}/api/v1/projects`, { data: { name: "Graph focus acceptance" } });
    expect(created.ok()).toBeTruthy();
    const project = await created.json();
    try {
      const workflow = await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Keyboard graph" } });
      expect(workflow.ok()).toBeTruthy();
      const savedWorkflow = await workflow.json();
      await page.goto(`/projects/${project.id}/workflow`);
      await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption(theme);
      const search = page.getByRole("textbox", { name: "Search nodes", exact: true });
      await expect(search).toBeVisible();
      // Start a document traversal, then use Tab rather than focusing the search directly.
      await page.getByRole("combobox", { name: "Theme", exact: true }).focus();
      for (let step = 0; step < 60 && !await search.evaluate(element => element === document.activeElement); step++) {
        await page.keyboard.press("Tab");
      }
      await expect(search).toBeFocused();
      await expect(search).toHaveCSS("outline-style", "solid");
      await expect(search).toHaveCSS("outline-width", "2px");
      await expect(search).toHaveCSS("outline-offset", "3px");
      await expect(search).toHaveCSS("outline-color", theme === "dark" ? "rgb(147, 180, 255)" : "rgb(49, 92, 186)");
      await page.keyboard.type("Select Columns");
      await expect(search).toBeFocused();
      await expect(page.getByTitle("Add Select Columns")).toBeVisible();
      await page.screenshot({ path: test.info().outputPath(`search-focus-${theme}.png`), fullPage: true });
      await page.keyboard.press("Tab");
      await expect(page.getByTitle("Add Select Columns")).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator(".react-flow__node")).toHaveCount(1);
      await expect(page.getByText("Saved", { exact: true })).toBeVisible();
      const persisted = await request.get(`${api}/api/v1/workflows/${savedWorkflow.id}`);
      expect(persisted.ok()).toBeTruthy();
      expect((await persisted.json()).nodes.map((node: { type: string }) => node.type)).toEqual(["select_columns"]);
      await page.screenshot({ path: test.info().outputPath(`graph-${theme}.png`), fullPage: true });
    } finally {
      const cleanup = await createRequest.newContext();
      try {
        expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
      } finally { await cleanup.dispose(); }
    }
  });
}
