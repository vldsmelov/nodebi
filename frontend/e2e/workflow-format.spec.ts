import { expect, test } from "@playwright/test";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("v1 editor cannot overwrite v2 and retains its rejected draft", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Format guard" } })).json();
  try {
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Main" } })).json();
    const path = `${api}/api/v1/workflows/${workflow.id}`;
    const upgrade = await request.put(path, { data: { name: "Main", expected_revision: workflow.revision, format_version: 2, nodes: [], edges: [] } });
    expect(upgrade.ok()).toBe(true);
    const saved = await upgrade.json();
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByTitle("Add Select Columns").click();
    await expect(page.getByRole("alert").filter({ hasText: "supports its format" })).toBeVisible();
    expect(await (await request.get(path)).json()).toEqual(saved);
    const pending = await page.evaluate(id => JSON.parse(sessionStorage.getItem(`nodebi:workflow-draft:${id}`)!).draft, workflow.id);
    expect(pending.format_version).toBe(1);
    expect(pending.nodes).toHaveLength(1);
    await page.reload();
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    await expect(page.getByRole("alert").filter({ hasText: "supports its format" })).toBeVisible();
    expect(await (await request.get(path)).json()).toEqual(saved);
  } finally {
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});
