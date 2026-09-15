import { expect, test } from "@playwright/test";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("find distant nodes by name and identity without saving selection or losing drafts", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Node finder acceptance" } })).json();
  try {
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Large canvas" } })).json();
    const nodes = [crypto.randomUUID(), crypto.randomUUID()].map((id, index) => ({ id, type: "calculated_column", version: 1, position: { x: index * 50000, y: index * 50000 }, config: { name: "Repeated name", expression: "1" }, ui: {} }));
    const saved = await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: { name: workflow.name, nodes, edges: [], parameters: [], expected_revision: workflow.revision } });
    expect(saved.ok(), await saved.text()).toBeTruthy(); const baseline = await saved.json();
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByLabel("Find workflow node", { exact: true }).fill("REPEATED NAME");
    await expect(page.getByLabel("Edit workflow node").locator("option")).toHaveCount(3);
    await page.getByLabel("Edit workflow node").selectOption(nodes[1].id);
    await expect(page.getByLabel("Output field name", { exact: true })).toHaveValue("Repeated name");
    await expect(page.locator(`.react-flow__node[data-id="${nodes[1].id}"]`)).toBeInViewport();
    expect((await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json()).revision).toBe(baseline.revision);
    await page.getByLabel("Output field name", { exact: true }).fill("Changed through finder");
    await page.getByLabel("Find workflow node", { exact: true }).fill(nodes[0].id);
    await page.getByLabel("Edit workflow node").selectOption(nodes[0].id);
    await expect(page.locator(`.react-flow__node[data-id="${nodes[0].id}"]`)).toBeInViewport();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const changed = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    expect(changed.nodes.find((node: { id: string }) => node.id === nodes[1].id).config.name).toBe("Changed through finder");
    expect(changed.nodes.map((node: { position: object }) => node.position)).toEqual(nodes.map(node => node.position));
  } finally {
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});
